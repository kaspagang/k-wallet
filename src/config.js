const dotenv = require('dotenv');
dotenv.config();

defaults = {
    network: "kaspa",
    explorer_tx: "https://explorer.kaspa.org/txs/",
    explorer_addr: "https://explorer.kaspa.org/addresses/",

    offline: "no"
}

module.exports = {...defaults, ...require(process.env.CONFIG_PATH)}
