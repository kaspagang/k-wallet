const config = require("../config");
const { MessageEmbed } = require('discord.js');
const { userStore, unlockWallet, getRPCBalance, getNodeStatus } = require("../lib/users");
const { KAS_TO_SOMPIS } = require("../constants");

module.exports = {
    name: "info",
    short: false,
    builder: (namedCommand) => namedCommand.setDescription('Shows public address and balance of current user').addBooleanOption(
            option => option.setName("show-secret").setDescription("Show the mnemonic phrase")
        )
    ,
    async execute(interaction) {
        let showSecret = interaction.options.getBoolean("show-secret");
        let info = await userStore.get(interaction.user.id);
        if (info === undefined) {
            await interaction.reply({content: ":construction: *You do not have a wallet. Call `/kwallet unlock` to create one*", ephemeral: true});
            return;
        }
        let locked = true;
        let wallet = await unlockWallet(interaction.user.id);
        let balance = ":tools: Failed to calculate.";
        let utxoCount = ":tools: Failed to calculate.";
        let mnemonic = ":lock: *Wallet is locked*"
        if (wallet !== null) {
            balance = `${wallet.balance.available / KAS_TO_SOMPIS} KAS (${wallet.balance.pending / KAS_TO_SOMPIS} Pending)`;
            utxoCount = `${wallet.utxoSet.utxos.confirmed.size} (${wallet.utxoSet.utxos.pending.size} Pending)`
            if (showSecret) {
                mnemonic = wallet.mnemonic
            }
        } else {
            let res = await getRPCBalance(info.publicAddress);
            if (res.error) {
                balance = `:warning: *Error fetching balance*:\n> ${res.error}`
                utxoCount = `:warning: *Error fetching UTXO count*:\n> ${res.error}`
            } else {
                balance = `${res.balance / KAS_TO_SOMPIS} KAS`
                utxoCount = `${res.utxoCount}`
            }
            locked = false;
        }

        let fields = [
            { name: 'Wallet status', value: locked? ":unlock:" : ":lock:", inline: true },
            { name: 'Balance', value: balance, inline: true },
            { name: 'UTXO Count', value: utxoCount, inline: true },
            { name: 'Tipper Public Address', value: `[${info.publicAddress}](${config.explorer_addr}${info.publicAddress})` },
        ]
        if (config.enableAutoForward) {
            const tipAddress = info.forward? info.forwardAddress : info.publicAddress;
            fields.push({ name: 'Tip Destination', value: `[${tipAddress}](${config.explorer_addr}${tipAddress})` })
        }
        if (info.forwardAddress) {
            fields.push(
                { name: 'Withdraw Address', value: `[${info.forwardAddress}](${config.explorer_addr}${info.forwardAddress})`},
            )
        } else {
            fields.push(
                { name: 'Withdraw Address', value: ':no_entry_sign:'},
            )
        }
        if (showSecret) {
            fields.push({name: 'Mnemonic', value: mnemonic},)
        }
        // TODO: get balance by public key
        let preabmle = "";
        await interaction.reply({
            embeds: [
                new MessageEmbed()
                    .setTitle(`Wallet Information`)
                    .addFields(
                        fields
                    )
                    .setTimestamp()
            ],
            ephemeral: true});
    },
}
