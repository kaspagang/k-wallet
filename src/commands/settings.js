const { updateUser } = require("../lib/users");
const {MessageEmbed} = require("discord.js");

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
        let result = await updateUser(interaction.user.id, secret, address, forward, unlockTimeout, hideAddress).catch(async (e) => {
            await interaction.reply({content: `:warning: *Failed chaning settings:*\n> ${e.message}`, ephemeral: true});
        });
        if (result !== null) {
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
                ephemeral: true
            });
        }
    },
}
