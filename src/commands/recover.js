const {checkUser, UNLOCK_TIMEOUT, updateUser} = require("../lib/users");

module.exports = {
    name: "recover",
    short: false,
    builder: (namedCommand) => namedCommand.setDescription('Recover wallet from mnemonic').addStringOption(
        option => option.setName("mnemonics").setDescription("The 12 seed key of your wallet").setRequired(true)
    ).addStringOption(
        option => option.setName("new-secret").setDescription("Secret used to encrypted keys").setRequired(true)
    ),

    async execute(interaction) {
        if (await checkUser(interaction.user.id)) {
            await interaction.reply({content:":exclamation: Please delete your existing wallet though `/kwallet settings` before restoring a wallet", ephemeral: true});
            return;
        }

        let secret = interaction.options.getString("new-secret");
        let mnemonics = interaction.options.getString("mnemonics");
        let mnemonics_len = mnemonics.split(" ").length;
        if (mnemonics_len !== 12) {
            await interaction.reply({content:`:warning: *Mnemonic list needs to be exactly 12 words (you supplied ${mnemonics_len})*`, ephemeral: true});
            return;
        }

        try {
            let userInfo = await updateUser(interaction.user.id, secret, "", false, UNLOCK_TIMEOUT, mnemonics)
            await interaction.reply({content:`:unlock: *Wallet successfully recovered! Your address is \`${userInfo.publicAddress}\`*`, ephemeral: true});
        } catch(error) {
            if (error.message !== null && error.message !== undefined) {
                error = error.message;
            }
            await interaction.reply({content:`:warning: *Failed to recover wallet:*\n> \`${error}\``, ephemeral: true});
        }
    },
}
