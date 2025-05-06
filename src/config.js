const dotenv = require('dotenv');
dotenv.config();

defaults = {
    network: "kaspa",
    explorer_tx: "https://explorer.kaspa.org/txs/",
    explorer_addr: "https://explorer.kaspa.org/addresses/",

    offline: "no"
}

config = {...defaults, ...require(process.env.CONFIG_PATH)};
if (!Array.isArray(config.kaspad_address)) {
    config.kaspad_address = [config.kaspad_address]
}

module.exports = config
