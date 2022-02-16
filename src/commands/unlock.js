const { unlockWallet} = require("../lib/users");

module.exports = {
    name: "unlock",
    short: false,
    builder: (namedCommand) => namedCommand.setDescription('Unlocks the wallet, enabling spending').addStringOption(
        option => option.setName("secret").setDescription("Secret used to encrypted keys").setRequired(true)
    ),
    async execute(interaction) {
        let secret = interaction.options.getString("secret");
        try {
            let wallet = await unlockWallet(interaction.user.id, secret);
            await interaction.reply({content:":unlock: *Wallet unlock successfully!*", ephemeral: true});
        } catch {
            await interaction.reply({content:":warning: *Failed to unlock wallet. Try a different password*", ephemeral: true});
        }

    },
}