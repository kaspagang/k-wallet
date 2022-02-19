const { userStore, unlockWallet } = require("../lib/users");
const {KATNIP_TX} = require("../constants");

DEFAULT_MAX_UTXOS = 500

module.exports = {
    name: "compound",
    short: false,
    builder: (namedCommand) => namedCommand.setDescription('Compound transactions').addIntegerOption(
        (option) => option.setName("max").setDescription("Maximum amount of UTXOs to compound").setMinValue(2)
    ),
    async execute(interaction) {
        let compoundingUTXOMaxCount = interaction.options.getInteger("max");
        if (compoundingUTXOMaxCount === null) {
            compoundingUTXOMaxCount = DEFAULT_MAX_UTXOS
        }
        const info = await userStore.get(interaction.user.id);
        if (info === undefined) {
            await interaction.reply({content:":construction: *You did not open a wallet, so what do you want to compound?*", ephemeral: true});
            return;
        }
        const wallet = await unlockWallet(interaction.user.id);
        if (!wallet) {
            await interaction.reply({content: ":warning: *Wallet is locked*", ephemeral: true})
            return;
        }
        await interaction.deferReply({ephemeral: true});

        let txParamsArg = {
            targets: [{address: info.publicAddress, amount: -1}],
            changeAddrOverride: info.publicAddress,
            fee: 0,
            networkFeeMax: 0,
            compoundingUTXO:true,
            compoundingUTXOMaxCount
        }
        wallet.submitTransaction(txParamsArg).then(async (tx) => {
            await interaction.editReply({content: `:dollar: Compounding successful ([here](${KATNIP_TX}${tx.txids[0]}))`})
        }).catch(async (e) => {
            let message = e.message === undefined ? e : e.message;
            await interaction.editReply({content: `:warning: *Compounding failed.* \n> ${message}`})
        });
    },
}