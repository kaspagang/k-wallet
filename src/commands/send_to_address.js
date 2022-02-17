const { unlockWallet, userStore} = require("../lib/users");
const {User, GuildMember, Role} = require("discord.js");

const KAS_TO_SOMPIS = 100000000;
const KATNIP_TX = "http://katnip.kaspanet.org/tx/";

module.exports = {
    name: "send-to-address",
    short: false,
    builder: (namedCommand) => namedCommand.setDescription('Move KAS to a kaspa address').addNumberOption(
        option => option.setName("amount").setDescription("Amount of KAS to send").setRequired(true)
    ).addStringOption(
        option => option.setName("address").setDescription("Destination address").setRequired(true)
    ),
  
    async execute(interaction) {
        let amount = interaction.options.getNumber("amount");
        let info = await userStore.get(interaction.user.id);
        let address = interaction.options.getString("address");

        if (info === undefined) {
            await interaction.reply({content: ":construction: *You do not have a wallet. Call `/kwallet unlock` to    create one*", ephemeral: true});
            return;
        }

        let wallet = await unlockWallet(interaction.user.id);
        if (wallet === null){
            interaction.reply({content: ":warning: *Wallet is locked*", ephemeral: true});
            return;
        }

        await wallet.submitTransaction({
            targets: [{address: address, amount: Math.floor(amount*KAS_TO_SOMPIS)}],
            changeAddrOverride: info.publicAddress,
            calculateNetworkFee: true
        }).catch((e) => {
            console.log(e);
            let message = e.message === undefined? e : e.message;
            interaction.reply({content: `:warning:*Failed submitting transaction:*\n> ${message}`, ephemeral: true})
        }).then((tx) => {
            if (tx !== null && tx !== undefined) {
                interaction.reply(`:moneybag: ${interaction.user} sent ${amount} KAS to ${address} in [${tx.txid}](${KATNIP_TX}${tx.txid})`)
            }
        });
    },
}
