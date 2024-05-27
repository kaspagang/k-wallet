Kaspa Discord Wallet Bot

## Run

### Docker

Build the docker image

```shell 
docker build . --tag k-wallet
```

Create a `config.json` file as described in [#Settings], and run the docker
```shell
docker run -v ./config.json:/app/config.json -e CONFIG_PATH=/app/config.json k-wallet
```

In case of using firestore, map the firestore key file to the desired location configured in `config.json`:
```
docker run -v keyfile.json:/app/firestore.json -v ./config.json:/app/config.json -e CONFIG_PATH=/app/config.json k-wallet
```

### Locally

Clone the `multipe_targets` branch of [tmrlvi/kaspa-wallet](https://github.com/tmrlvi/kaspa-wallet/tree/multiple_targets)
into the parent directory of this repository. Then run,

```shell
npm install
npm run start
```

## Settings

The settings are in a json file, e.g. `config.json`. The path is determined by the environment variable `CONFIG_PATH`.
The file is of the following structure:
```json
{
    "kaspad_address": <kaspad address>,
    "network": <"kaspa" | "kaspatest" | "kaspadev" - determines the key derivation and default port>
    "custodial": <mnemonics for the custodial wallet>,

    "storeType": <"firestore" or "keyv" (direct control)>,
    "storeConfig": {
        "projectId": <firestore project id>,
        "databaseId": <database id>,
	    "keyFilename": <path to service account key file>
    },
    "userStore": <connection string or collection name (for firestore) of the user store>,
    "custodyStore": <connection string or collection name (for firestore) or the custody store>,
  
    "offline": <use "no", "yes" or "admin" enables more debug logging directly in discord>,
    "admin": <user ids which are allowed to see the direct logging if opted to admin>,
    "discord_token": <bot token>,

    "enableAutoForward": false,
    "enableFaucet": false,
    "minAllowedMulticast": 1.0
}
```
