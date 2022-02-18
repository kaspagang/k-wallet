const { unlockWallet, userStore} = require("../lib/users");
const {User, GuildMember, Role} = require("discord.js");

const KAS_TO_SOMPIS = 100000000;
const KATNIP_TX = "http://katnip.kaspanet.org/tx/";
const KATNIP_ADDR = "http://katnip.kaspanet.org/addr/";

module.exports = {
    name: "withdraw",
    short: false,
    builder: (namedCommand) => namedCommand.setDescription('Withdraw KAS').addNumberOption(
        option => option.setName("amount").setDescription("Amount of KAS to Withdraw").setRequired(true).setAutocomplete(true)
    ).addStringOption(
        option => option.setName("address").setDescription("Destination address for the withdrawel (default: forward-address specified in `settings`)").setRequired(true).setAutocomplete(true)
    ),
    
    async autocomplete(interaction) {
        // In autocomplete, we get string
        let currentOption =  interaction.options.getFocused(true);

        if (currentOption.name === "amount") { 
            let amount = parseFloat(interaction.options.getNumber("amount"));

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
    } else if (currentOption.name === "address") {
            let info = await userStore.get(interaction.user.id);
       
            if (info === undefined || !info.forwardAddress) {
                interaction.respond([]);
                return;
            }
            interaction.respond([{"name" : info.forwardAddress, "value" : info.forwardAddress}])
    } 
},
    
    async execute(interaction) {
        let amount = interaction.options.getNumber("amount");
        let address = interaction.options.getString("address");
        let info = await userStore.get(interaction.user.id);
        
        if (info === undefined) {
            await interaction.reply({content: ":construction: *You do not have a wallet. Call `/kwallet unlock` to create one*", ephemeral: true});
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
                interaction.reply({content: `:moneybag: ${interaction.user} withdrew ${amount} KAS to [${address}](${KATNIP_ADDR}${address}) in [${tx.txids[0]}](${KATNIP_TX}${tx.txids[0]})`, ephemeral: true})
            }
        });
    },
}
