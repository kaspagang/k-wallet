const { Wallet, initKaspaFramework } = require('@kaspa/wallet');
const { RPC } = require('@kaspa/grpc-node');
const Keyv = require('keyv');

const UNLOCK_TIMEOUT = 600000;

const userStore = new Keyv('sqlite://users.db');
const openWallets = new Map();

const network = "kaspa";
const { port } = Wallet.networkTypes[network];
let rpc = null;

userStore.on('error', err => console.error('Keyv connection error:', err));

const getNodeStatus = async () => {
    rpc.get
    return { online: false, blueHeight: null, synced: false}
}

const getRPCBalance = async (address) => {
    if (rpc === null) throw new Error("RPC not initialized");
    let res = await rpc.getUtxosByAddresses([address]);
    if (res.error) {
        return {balance: null, error: res.error.message};
    }
    let balance = 0
    for (let utxo of res.entries) {
        balance += parseInt(utxo.utxoEntry.amount);
    }
    return {balance, error: null};
}

const walletInit = async (address) => {
    rpc = new RPC({ clientConfig: { host: address + ":" + port }})
    await initKaspaFramework();

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

const unlockWallet = async (user, password) => {
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
    if (userInfo === undefined || userInfo.hideAddress === true){
        return null;
    } else if (userInfo.forward && userInfo.forwardAddress !== "") {
        return userInfo.forwardAddress
    }
    return userInfo.publicAddress
}

const updateUser = async (user, password, address, forward, unlockTimeout, hideAddress) => {
    //wallet = new Wallet(null, null, {network, rpc}, {disableAddressDerivation: true});
    let userInfo = await userStore.get(user);
    if (userInfo === undefined) {
        if (address === null || address === undefined) {
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
            forward: forward,
            unlockTimeout: unlockTimeout,
            hideAddress: false,
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
                userInfo.mnemonic = wallet.export(password);
            }
        }
        if (address !== null && address !== undefined) {
            userInfo.forwardAddress = address;
        }
        if (forward !== null && forward !== undefined) {
            userInfo.forward = forward;
        }
        if (unlockTimeout !== null && unlockTimeout !== undefined){
            userInfo.unlockTimeout = unlockTimeout;
        }
        if (hideAddress !== null && hideAddress !== undefined){
            userInfo.hideAddress = hideAddress;
        }
    }
    userStore.set(user, userInfo)
    return userInfo
}

module.exports = {
    getRPCBalance, userStore, walletInit, unlockWallet, lockWallet, getAddress, updateUser, getNodeStatus
}