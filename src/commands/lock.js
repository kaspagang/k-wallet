const { lockWallet} = require("../lib/users");

module.exports = {
    name: "lock",
    short: false,
    builder: (namedCommand) => namedCommand.setDescription('Locks the wallet, disabling spending'),
    async execute(interaction) {
        if (lockWallet(interaction.user.id)) {
            interaction.reply({content: ":lock: *Wallet locked successfully*", ephemeral: true});
        } else {
            interaction.reply({content: ":lock_with_ink_pen: *Wallet already locked*", ephemeral: true});
        }
    },
}