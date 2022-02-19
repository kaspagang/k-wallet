const { userStore, unlockWallet, getRPCBalance} = require("../lib/users");
const {KATNIP_TX, KAS_TO_SOMPIS} = require("../constants");

DEFAULT_MAX_UTXOS = 500

module.exports = {
    name: "split",
    short: false,
    builder: (namedCommand) => namedCommand.setDescription('Split utxos, so you can spend more at once').addNumberOption(
        (option) => option.setName("amount").setDescription("Amount of KAS to use in the split").setAutocomplete(true).setRequired(true)
    ).addIntegerOption(
        (option) => option.setName("count").setDescription("Number of outputs desired").setMinValue(2).setRequired(true)
    ),
    async autocomplete(interaction) {
        // In autocomplete, we get string
        let {name, value} = interaction.options.getFocused(true)
        if (name === "amount") {
            let amount = parseFloat(value);

            let info = await userStore.get(interaction.user.id);
            if (info === undefined) {
                interaction.respond([]);
                return;
            }

            let wallet = await unlockWallet(interaction.user.id);
            let balance = null;
            if (wallet !== null) {
                balance = wallet.balance.available / KAS_TO_SOMPIS;
            } else {
                balance = (await getRPCBalance(info.publicAddress)).balance / KAS_TO_SOMPIS;
            }
            let currentInput = []
            if (!isNaN(amount)) {
                currentInput.push({"name": `${amount}`, "value": amount});
            }
            interaction.respond([
                ...currentInput,
                {"name": `${balance}`, "value": balance}
            ]);
        } else {
            interaction.respond([]);
        }
    },
    async execute(interaction) {
        let amount = interaction.options.getNumber("amount");
        let count = interaction.options.getInteger("count");

        const info = await userStore.get(interaction.user.id);
        if (info === undefined) {
            await interaction.reply({content:":construction: *You did not open a wallet, so what do you want to split?*", ephemeral: true});
            return;
        }
        const wallet = await unlockWallet(interaction.user.id);
        if (!wallet) {
            await interaction.reply({content: ":warning: *Wallet is locked*", ephemeral: true})
            return;
        }
        await interaction.deferReply({ephemeral: true});

        const amountSompi = Math.floor(amount*KAS_TO_SOMPIS);
        let splitAmount = Math.floor(amountSompi / count);
        let splitRemainder = amountSompi % count
        const targets = []
        for (let i=0; i<count; i++) {
            targets.push({
                address: info.publicAddress,
                amount: splitAmount + Number(i < splitRemainder)
            })
        }

        let txParamsArg = {
            targets: targets,
            changeAddrOverride: info.publicAddress,
            fee: 0,
            networkFeeMax: 0
        }
        wallet.submitTransaction(txParamsArg).then(async (tx) => {
            await interaction.editReply({content: `:dollar: Split successful ([here](${KATNIP_TX}${tx.txids[0]}))`})
        }).catch(async (e) => {
            let message = e.message === undefined ? e : e.message;
            await interaction.editReply({content: `:warning: *Split failed.* \n> ${message}`})
        });
    },
}