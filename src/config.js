const dotenv = require('dotenv');
dotenv.config();

module.exports = require(process.env.CONFIG_PATH)
