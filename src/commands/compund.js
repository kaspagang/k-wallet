const { userStore, unlockWallet } = require("../lib/users");
const {KATNIP_TX} = require("../constants");

module.exports = {
    name: "compound",
    short: false,
    builder: (namedCommand) => namedCommand.setDescription('Compound transactions'),
    async execute(interaction) {
        const wallet = await unlockWallet(interaction.user.id);
        if (!wallet) {
            await interaction.reply({content: ":warning: *Wallet is locked*", ephemeral: true})
            return;
        }
        interaction.deferReply({ephemeral: true});

        let txParamsArg = {
            targets: [{address: publicAddress, amount: -1}],
            changeAddrOverride: publicAddress,
            fee: 0,
            networkFeeMax: 0,
            compoundingUTXO:true,
        }
        wallet.submitTransaction(txParamsArg).then((tx) => {
            interaction.editReply({content: `:dollar: Compounding successful ([here](${KATNIP_TX}${tx.txids[0]}))`})
        }).catch((e) => {
            interaction.editReply({content: `:warning: *Compounding failed.* \n> ${e}`})
        });
    },
}