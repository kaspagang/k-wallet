Kaspa Discord Wallet Bot

## Run

Clone the `multipe_targets` branch of [tmrlvi/kaspa-wallet](https://github.com/tmrlvi/kaspa-wallet/tree/multiple_targets)
into the parent directory of this repository. Then run,

```shell
npm install
npm run start
```

## Settings

The settings are in a `.env` file, containing the follwoing:

```
DISCORD_BOT_TOKEN=<BOT_TOKEN>
DISCORD_CLIENT_ID=<BOT_CLIENT_ID>  
DISCORD_GUILD_ID=<GUILD_ID>        # needed for deployment
KASPAD_ADDRESS=<ADDRESS>
OFFLINE=no                         # In case we have problem, and want a neat message explaining things
CUSTODIAL=<MNEMONIC>
```