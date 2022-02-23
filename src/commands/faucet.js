const config = require("config");
if (config.enableFaucet) {
    const {userStore} = require("../lib/users");

    module.exports = {
        name: "faucet",
        short: false,
        builder: (namedCommand) => namedCommand.setDescription('Requesting funds from faucet to tipping wallet'),
        async execute(interaction) {
            const info = await userStore.get(interaction.user.id);
            if (info === undefined) {
                await interaction.reply({
                    content: ":construction: *You did not open a wallet, and implicit wallets are not implemented yet*",
                    ephemeral: true
                });
                return;
            }
            await interaction.reply({
                content: `:potable_water: Request some funds from [faucet](https://faucet.kaspanet.io/) for \`${info.publicAddress}\``,
                ephemeral: true
            });
        },
    }
}