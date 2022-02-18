const { updateUser, lockWallet, userStore} = require("../lib/users");
const {MessageEmbed, MessageActionRow, MessageButton} = require("discord.js");

module.exports = {
    name: "settings",
    short: false,
    builder: (namedCommand) => namedCommand.setDescription('Set and get the settings for the discord wallet').addStringOption(
        option => option.setName('secret').setDescription("Set or change wallet password (require unlock first)")
    ).addStringOption(
        option => option.setName('forward-address').setDescription("Address for tip forwarding")
    ).addBooleanOption(
        option => option.setName('auto-forward').setDescription("Forward all tips directly to another address")
    ).addIntegerOption(
        option => option.setName('unlock-timeout').setDescription("How long to keeps keys in memory")
    ),
    async execute(interaction) {
        let secret = interaction.options.getString("secret");
        let address = interaction.options.getString("forward-address");
        let forward = interaction.options.getBoolean("auto-forward");
        let unlockTimeout = interaction.options.getInteger("unlock-timeout");
        let result = await updateUser(interaction.user.id, secret, address, forward, unlockTimeout).catch(async (e) => {
            await interaction.reply({content: `:warning: *Failed changing settings:*\n> ${e.message}`, ephemeral: true});
            return;
        });
        if (result !== null) {
            const row = new MessageActionRow()
                .addComponents(
                    new MessageButton()
                        .setCustomId('delete')
                        .setLabel('Delete Wallet')
                        .setStyle('DANGER')
                        //.setDisabled(true),
                );

            const fields = [
                { name: 'Forward Address', value: result.forwardAddress ?  result.forwardAddress : "*Not set*"},
                { name: 'Auto Forward', value: result.forward? ":arrow_up: Yes" : ':no_entry: No', inline: true},
                { name: 'Unlock Timeout', value: `${(result.unlockTimeout / 60000).toFixed(2)} Minutes`, inline: true},
            ];
            await interaction.reply({
                embeds: [
                    new MessageEmbed()
                        .setTitle(`Wallet Settings`)
                        .addFields(
                            fields
                        )
                        .setTimestamp()
                ],
                components: [ row ],
                ephemeral: true
            });
        }
    },
    async onButton(interaction) {
        if (interaction.customId === 'delete') {
            const row = new MessageActionRow()
                .addComponents(
                    new MessageButton()
                        .setCustomId('delete_approved')
                        .setLabel('Approve')
                        .setStyle('DANGER')
                    //.setDisabled(true),
                );
            interaction.update({ content: ":warning:  **YOU WILL LOSE ACCESS TO YOUR DISCORD WALLET AND ALL FUNDS. ALL SETTINGS WILL BE RESET. :warning:  This action cannot be undone**.\nDismiss message to cancel. Click approve to continue", embeds: [], components: [row] });
        }
        if (interaction.customId === 'delete_approved') {
            lockWallet(interaction.user.id);
            await userStore.delete(interaction.user.id);
            interaction.update({ content: ":broken_heart:  *Wallet Deleted*", embeds: [], components: [] });
        }
    }
}
