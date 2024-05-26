const dotenv = require('dotenv');
dotenv.config();

module.exports = {
    kaspad_address: process.env.KASPAD_ADDRESS,
    custodial: process.env.CUSTODIAL,
    offline: process.env.OFFLINE,
    admin: process.env.ADMIN,
    discord_token: process.env.DISCORD_BOT_TOKEN,
    enableAutoForward: false,
    enableFaucet: false,
    minAllowedMulticast: 1.,
}
