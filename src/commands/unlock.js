const {unlockWallet, checkUser} = require("../lib/users");
const { MessageActionRow, MessageButton } = require('discord.js');

module.exports = {
    name: "unlock",
    short: false,
    builder: (namedCommand) => {
        let command = namedCommand.setDescription('Unlocks the wallet, enabling spending').addStringOption(
        option => option.setName("secret").setDescription("Secret used to encrypted keys").setRequired(true)
        )
        return command
        },

    async execute(interaction) {
        let secret = interaction.options.getString("secret");
        let regUser = await checkUser(interaction.user.id);
        let wallet = null;
        try {
            wallet = await unlockWallet(interaction.user.id, secret);
            await interaction.reply({content:":unlock: *Wallet unlock successfully!*", ephemeral: true});
        } catch {
            await interaction.reply({content:":warning: *Failed to unlock wallet. Try a different password*", ephemeral: true});
        }
        if (wallet !==null && !regUser) {
            const button = new MessageActionRow()
                .addComponents(
                    new MessageButton()
                        .setCustomId('delete_mnemonics')
                        .setLabel('Delete message')
                        .setStyle('DANGER')
                        .setDisabled(false),
                );
            await interaction.user.send({content:`:key: This is your mnemonic: ||${wallet.mnemonic}|| please keep it safe`, components: [button]}).catch(async (e) => {
                await interaction.followUp({ content: ':warning: You should backup your mnemonic phrase. You can view it with `/kwallet info show-secret:True`.', ephemeral: true })
            });
        }
    },
    async onButton(interaction) {
        if (interaction.customId === 'delete_mnemonics') {
            // We have to refresh cache on interactions
            const channel = await interaction.client.channels.fetch(interaction.channelId);
            const message = await channel.messages.fetch(interaction.message.id);
            await message.delete();
        }
    },
}
