const {unlockWallet, checkUser} = require("../lib/users");

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
        try {
            let wallet = await unlockWallet(interaction.user.id, secret);
            await interaction.reply({content:":unlock: *Wallet unlock successfully!*", ephemeral: true});
            if (!regUser) {
                const button = new MessageActionRow()
                    .addComponents(
                        new MessageButton()
                            .setCustomId('deleteMsg')
                            .setLabel('Delete message')
                            .setStyle('DANGER')
                            .setDisabled(false),
                    );
                await interaction.user.send({content:`:key: This is your memonic: ||${wallet.mnemonic}|| please keep it safe`, components: [button]});
            }
        } catch {
            await interaction.reply({content:":warning: *Failed to unlock wallet. Try a different password*", ephemeral: true});
        }
    },
    async onButton(interaction) {
        await interaction.message.delete();
    },
}
