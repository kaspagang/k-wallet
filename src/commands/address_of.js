const { getAddress } = require("../lib/users");

module.exports = {
    name: "address-of",
    short: false,
    builder: (namedCommand) => namedCommand.setDescription('Get the receiving address of a user').addUserOption(
        option => option.setName("user").setDescription("The user to check the address of").setRequired(true)
    ),
    async execute(interaction) {
        const user = interaction.options.getUser("user");
        const address = await getAddress(user.id);
        if (address === null){
            await interaction.reply({content:`:mag_right: *${user} does not have a wallet*`, ephemeral: true});
            return;
        }
        await interaction.reply({content:`:bank: The direct address of ${user} is \`${address}\``, ephemeral: true});
    },
}