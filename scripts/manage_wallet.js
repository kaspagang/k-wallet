const { Wallet, initKaspaFramework } = require('@kaspa/wallet');
const { RPC } = require('@kaspa/grpc-node');
const Keyv = require('keyv');
const prompt = require('prompt');

if (process.argv.length < 3 || process.argv.length > 4) {
  console.log("Usage: node manage_wallet.js <user_id> <action>")
  process.exit(1)
}

async function main() {
  const args = process.argv.slice(2);
  const userId = args[0];
  const action = args[1];

  const userStore = new Keyv('sqlite://users.db');

  const network = "kaspa";
  const {port} = Wallet.networkTypes[network];
  const rpc = new RPC({clientConfig: {host: '127.0.0.1:' + port}});
  rpc.onConnect(async () => {
    await initKaspaFramework();

    const userInfo = await userStore.get(userId);
    if (userInfo === undefined) {
      console.log(`Error: user not found ${userId}`)
      process.exit(1)
    }

    prompt.start();
    await prompt.get([{name: 'password', hidden: true}], async function (err, result) {
      if (err) {
        console.log(err);
        rpc.disconnect();
        return 1;
      }
      const password = result.password;
      let wallet = null;
      try {
        wallet = await Wallet.import(password, userInfo.mnemonic, {
          network,
          rpc
        }, {disableAddressDerivation: false, syncOnce: true});
      } catch (err) {
        console.log("Failed opening wallet. Try a different password")
        rpc.disconnect();
        return 1;
      }
      await wallet.sync(true);
      await wallet.sync(true);
      if (action === "compound") {
        try {
          await compound(wallet, userInfo.publicAddress);
        } catch (e) {
          console.log("Failed compounding")
          console.log(e)
          rpc.disconnect();
          return 1;
        }
      } else {
        if (action !== undefined && action !== "balance") console.log(`Unknown action ${action}. Showing balance instead`);
        console.log(`Balance: ${JSON.stringify(wallet.balance)}`);
      }
      rpc.disconnect();
      return 0;
    })
  });
}

async function compound(wallet, publicAddress){
  let txParamsArg = {
    targets: [{address: publicAddress, amount: -1}],
    changeAddrOverride: publicAddress,
    fee: 0,
    networkFeeMax: 0,
    compoundingUTXO:true,
  }
  let res = await wallet.submitTransaction(txParamsArg);
}

main();
