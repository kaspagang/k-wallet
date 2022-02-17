const { unlockWallet, userStore} = require("../lib/users");
const {User, GuildMember, Role} = require("discord.js");

const KAS_TO_SOMPIS = 100000000;
const KATNIP_TX = "http://katnip.kaspanet.org/tx/";

module.exports = {
    name: "withdraw",
    short: false,
    builder: (namedCommand) => namedCommand.setDescription('Move KAS to the forward address').addNumberOption(
        option => option.setName("amount").setDescription("Amount of KAS to send").setRequired(true)
    ).addStringOption(
        option => option.setName("address").setDescription("Destination address for the withdrawel (default: forward-address specified in `settings`)").setRequired(false)
    ),
    
    async execute(interaction) {
        let amount = interaction.options.getNumber("amount");
        let address = interaction.options.getString("address");
        let info = await userStore.get(interaction.user.id);
        
        if (info === undefined) {
            await interaction.reply({content: ":construction: *You do not have a wallet. Call `/kwallet unlock` to create one*", ephemeral: true});
            return;
        } else if (address === null || address === undefined) {
            if (!info.forwardAddress) {
                await interaction.reply({content: ":warning: *You did not specify a withdrawel address, or set up a forward address. Please specify a address, or Call `/kwallet settings` and set the forward address*", ephemeral: true});
                return;
            } else {
                address = info.forwardAddress;
            }
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
                interaction.reply({content: `:moneybag: ${interaction.user} withdrew ${amount} KAS to ${address} in [${tx.txid}](${KATNIP_TX}${tx.txid})`, ephemeral: true})
            }
        });
    },
}
