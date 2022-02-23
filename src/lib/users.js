const config = require("../config");
const { Wallet, initKaspaFramework } = require('@kaspa/wallet');
const { RPC } = require('@kaspa/grpc-node');
const Keyv = require('keyv');
const {KAS_TO_SOMPIS} = require("../constants");

const walletModule = require.cache[require.resolve('@kaspa/wallet')];
const {Address} = walletModule.require('@kaspa/core-lib')

const UNLOCK_TIMEOUT = 600000;

const userStore = new Keyv('sqlite://users.db');
const custodyStore = new Keyv('sqlite://custody.db');
const openWallets = new Map();
let awaitingBlockCallbacks = [];
let awaitingDaaScoreCallbacks = []

const network = "kaspa";
const { port } = Wallet.networkTypes[network];
let rpc = null;
const custodialWallet = {publicAddress: null, wallet: null};

userStore.on('error', err => console.error('Keyv connection error:', err));


const getRPCBalance = async (address) => {
    if (rpc === null) throw new Error("RPC not initialized");
    let res = await rpc.getUtxosByAddresses([address]);
    if (res.error) {
        return {balance: null, utxoCount: null, error: res.error.message};
    }
    let balance = 0
    for (let utxo of res.entries) {
        balance += parseInt(utxo.utxoEntry.amount);
    }
    return {balance, utxoCount: res.entries.length, error: null};
}

const walletInit = async (address, custodialMnemonic) => {
    rpc = new RPC({ clientConfig: { host: address + ":" + port }})
    await initKaspaFramework();

    custodialWallet.wallet = Wallet.fromMnemonic(custodialMnemonic, {network, rpc}, {disableAddressDerivation: true, syncOnce: false});
    custodialWallet.publicAddress = custodialWallet.wallet.receiveAddress;
    await custodialWallet.wallet.sync(true);
    await custodialWallet.wallet.sync();
    console.log(`Custodial public address: ${custodialWallet.publicAddress}. Balance: ${JSON.stringify(custodialWallet.wallet.balance)}`)

    rpc.subscribeBlockAdded(async ({block}) => {
        awaitingBlockCallbacks = (await Promise.all(
            awaitingBlockCallbacks.map(async (callback) => ({callback, result: await callback(block)}))
        )).filter(({result}) => result).map(({callback}) => callback);
    })

    rpc.subscribeVirtualDaaScoreChanged(async ({virtualDaaScore}) => {
        awaitingDaaScoreCallbacks = (await Promise.all(
            awaitingDaaScoreCallbacks.map(async (callback) => ({callback, result: await callback(virtualDaaScore)}))
        )).filter(({result}) => result).map(({callback}) => callback);
    })

    setInterval(() => {
        let time = Date.now();
        for (let user of openWallets.keys()){
            let { wallet, lastAccess, timeout } = openWallets.get(user);
            if (time - lastAccess > timeout ){
                openWallets.delete(user);
            }
        }
    }, 5000)
    console.log("Ready!");
}

const addBlockCallback = (callback) => {
    awaitingBlockCallbacks.push(callback);
}

const addDaaScoreCallback = (callback) => {
    awaitingDaaScoreCallbacks.push(callback);
}

const getCustodialAddress = () => {
    return custodialWallet.publicAddress;
}

const addCustody = async (user, amount) => {
    const userAmount = await custodyStore.get(user)
    await custodyStore.set(user, userAmount? userAmount + amount : amount);
}

const checkCustody = async (user) => {
    let custodial = await custodyStore.get(user);
    if (custodial !== undefined){
        console.log(`Giving away ${custodial} KAS from custody`);
        let res = await custodialWallet.wallet.submitTransaction({
            targets: [{address: await getAddress(user), amount: Math.floor(custodial*KAS_TO_SOMPIS)}],
            changeAddrOverride: custodialWallet.publicAddress,
            calculateNetworkFee: true,
            inclusiveFee: true
        }).catch((e) => {
            console.log(e)
        });
        if (res !== null && res !==undefined){
            await custodyStore.delete(user);
            return true;
        }
        return false;
    }
    return false;
}

const unlockWallet = async (user, password) => {
    checkCustody(user).then(() => console.log("Successfully ran checkCustody"));
    if (openWallets.has(user)) {
        let opened = openWallets.get(user);
        // TODO: bug workaround
        //opened.wallet.setRPC(rpc)
        opened.wallet = Wallet.fromMnemonic(opened.wallet.mnemonic, {network, rpc}, {disableAddressDerivation: true, syncOnce: true})
        await opened.wallet.update()
        await opened.wallet.update()
        opened.lastAccess = Date.now();
        return opened.wallet;
    }

    if (password === undefined || password == null){
        return null;
    }

    let userInfo = await userStore.get(user);
    if (userInfo === undefined) {
        userInfo = await updateUser(user, password, "", false, UNLOCK_TIMEOUT);
    }
    let wallet = await Wallet.import(password, userInfo.mnemonic, {network, rpc}, {disableAddressDerivation: true, syncOnce: true});
    await wallet.sync(true);
    await wallet.sync(true);

    openWallets.set(user, {
        wallet,
        lastAccess: Date.now(),
        timeout: userInfo.unlockTimeout
    });
    return wallet;
}

const lockWallet = (user) => {
    if (openWallets.has(user)) {
        openWallets.delete(user)
        return true;
    }
    return false;
}

const getAddress = async (user) => {
    let userInfo = await userStore.get(user);
    if (userInfo === undefined){
        return null;
    } else if (config.enableAutoForward && userInfo.forward && userInfo.forwardAddress !== "") {
        return userInfo.forwardAddress
    }
    return userInfo.publicAddress
}

const updateUser = async (user, password, address, forward, unlockTimeout) => {
    //wallet = new Wallet(null, null, {network, rpc}, {disableAddressDerivation: true});
    let userInfo = await userStore.get(user);
    if (userInfo === undefined) {
        if (password === null || password === undefined) {
            throw new Error("No password provided to encrypt wallet")
        }
        if (address === null || address === undefined || Address.getValidationError(address)) {
            address = "";
        }
        if (forward === null || forward === undefined) {
            forward = false;
        }
        if (unlockTimeout === null || unlockTimeout === undefined) {
            unlockTimeout = UNLOCK_TIMEOUT;
        }
        let wallet = new Wallet(null, null, {network, rpc}, {disableAddressDerivation: true, syncOnce: true});
        await wallet.sync(true); // Duplicate to mitigate wallet bug
        await wallet.sync(true);
        userInfo = {
            mnemonic: await wallet.export(password),
            publicAddress: wallet.receiveAddress,
            forwardAddress: address,
            forward: config.enableAutoForward && forward,
            unlockTimeout: unlockTimeout,
        };
        openWallets.set(user, {
            wallet,
            lastAccess: Date.now(),
            timeout: userInfo.unlockTimeout
        });
    } else {
        if (password !== null && password !== undefined){
            let wallet = await unlockWallet(user);
            if (wallet === null) {
                throw new Error('Wallet is locked - cannot change password')
            } else {
                userInfo.mnemonic = await wallet.export(password);
            }
        }
        if (address !== null && address !== undefined) {
            if (Address.getValidationError(address)) {
                address = ""
            }
            userInfo.forwardAddress = address;
        }
        if (forward !== null && forward !== undefined) {
            userInfo.forward = config.enableAutoForward && forward;
        }
        if (unlockTimeout !== null && unlockTimeout !== undefined){
            userInfo.unlockTimeout = unlockTimeout;
        }
    }
    await userStore.set(user, userInfo)
    return userInfo
}

module.exports = {
    getRPCBalance, userStore, walletInit, unlockWallet, lockWallet, getAddress, updateUser, getCustodialAddress, addCustody, addBlockCallback, addDaaScoreCallback
}