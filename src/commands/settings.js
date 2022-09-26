const config = require("../config");
const { updateUser, lockWallet, userStore} = require("../lib/users");
const {MessageEmbed, MessageActionRow, MessageButton} = require("discord.js");

const BUTTON_TIMEOUT = 10000;

module.exports = {
    name: "settings",
    short: false,
    builder: (namedCommand) => {
        let command = namedCommand.setDescription('Set and get the settings for the discord wallet').addStringOption(
            option => option.setName('secret').setDescription("Set or change wallet password (require unlock first)")
        ).addStringOption(
            option => option.setName('withdraw-address').setDescription("Address for withdrawing funds quickly")
        ).addIntegerOption(
            option => option.setName('unlock-timeout').setDescription("How long to keeps keys in memory")
        )
        if (config.enableAutoForward) {
            command.addBooleanOption(
                option => option.setName('auto-withdraw').setDescription("Forward all tips directly to the withdraw address")
            )
        }
        return command
    },
    async execute(interaction) {
        let secret = interaction.options.getString("secret");
        let address = interaction.options.getString("withdraw-address");
        let forward = null;
        if (config.enableAutoForward) {
            forward = interaction.options.getBoolean("auto-withdraw");
        }
        let unlockTimeout = interaction.options.getInteger("unlock-timeout");
        let result = await updateUser(interaction.user.id, secret, address, forward, unlockTimeout).catch(async (e) => {
            await interaction.reply({content: `:warning: *Failed changing settings:*\n> ${e.message}`, ephemeral: true});
        });
        if (result !== null && result !== undefined) {
            const row = new MessageActionRow()
                .addComponents(
                    new MessageButton()
                        .setCustomId('delete_wallet')
                        .setLabel('Delete Wallet')
                        .setStyle('DANGER')
                        //.setDisabled(true),
                );

            const fields = [
                { name: 'Withdraw Address', value: result.forwardAddress ?  result.forwardAddress : "*Not set*"},
                { name: 'Unlock Timeout', value: `${(result.unlockTimeout / 60000).toFixed(2)} Minutes`, inline: true},
            ];
            if (config.enableAutoForward) {
                fields.push({ name: 'Auto Forward', value: result.forward? ":arrow_up: Yes" : ':no_entry: No', inline: true});
            }
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
        if (interaction.customId === 'delete_wallet') {
            if (interaction.createdAt - interaction.message.createdAt > BUTTON_TIMEOUT) {
                const row = new MessageActionRow()
                    .addComponents(
                        new MessageButton()
                            .setCustomId('delete_wallet')
                            .setLabel('Delete Wallet')
                            .setStyle('DANGER')
                            .setDisabled(true),
                    );
                interaction.update({content: ":timer: *Button timed out*", components: [row]});
                return;
            }
            const row = new MessageActionRow()
                .addComponents(
                    new MessageButton()
                        .setCustomId('delete_wallet_approved')
                        .setLabel('Approve')
                        .setStyle('DANGER')
                    //.setDisabled(true),
                );
            interaction.update({ content: ":warning:  **YOU WILL LOSE ACCESS TO YOUR DISCORD WALLET AND ALL FUNDS. ALL SETTINGS WILL BE RESET. :warning:  This action cannot be undone**.\nDismiss message to cancel. Click approve to continue", embeds: [], components: [row] });
        } else if (interaction.customId === 'delete_wallet_approved') {
            if (interaction.createdAt - interaction.message.createdAt > BUTTON_TIMEOUT) {
                const row = new MessageActionRow()
                    .addComponents(
                        new MessageButton()
                            .setCustomId('delete_wallet_approved')
                            .setLabel('Approve')
                            .setStyle('DANGER')
                            .setDisabled(true),
                    );
                interaction.update({content: ":timer: *Button timed out*", components: [row]});
                return;
            }
            lockWallet(interaction.user.id);
            await userStore.delete(interaction.user.id);
            interaction.update({ content: ":broken_heart:  *Wallet Deleted*", embeds: [], components: [] });
        }
    }
}
