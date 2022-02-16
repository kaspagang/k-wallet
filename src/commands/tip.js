const { unlockWallet, userStore, getCustodialAddress, addCustody} = require("../lib/users");
const {User, GuildMember, Role} = require("discord.js");
const { KAS_TO_SOMPIS, KATNIP_TX } = require("../constants");

const SAFETY_MARGIN = 1.01
let COUNT = 0;

module.exports = {
    name: "tip",
    short: true,
    builder: (namedCommand) => namedCommand.setDescription('Sends some KAS').addMentionableOption(
        option => option.setName("who").setDescription("Who to send the tokens (user, channel, ...). Splits the tokens equally").setRequired(true)
    ).addNumberOption(
        option => option.setName("amount").setDescription("Amount of KAS to send").setRequired(true)
    ).addStringOption(
        option => option.setName("message").setDescription("Message to send alongside the tip")
    ).addBooleanOption(
        option => option.setName("allow-hold").setDescription("Send funds for holding if user does not have wallet (default True for single user, False for roles)")
    ),
    async execute(interaction) {
        let amount = interaction.options.getNumber("amount");
        let who = interaction.options.getMentionable("who");
        let message = interaction.options.getString("message");
        let allowHold = interaction.options.getBoolean("allow-hold")
        let users = [];
        if (who instanceof User) {
            users.push(who);
            if (allowHold === null || allowHold === undefined) allowHold = true;
        } else if (who instanceof GuildMember) {
            users.push(who.user)
            if (allowHold === null || allowHold === undefined) allowHold = true;
        } else if (who instanceof Role) {
            await who.guild.members.fetch();
            users = [...users, ...who.members.map((member) => member.user).filter((user) => user.id !== interaction.user.id)];
            if (allowHold === null || allowHold === undefined) allowHold = false;
        } else {
            console.log(`Error: Got unknown type of mention ${typeof who}`)
            interaction.reply({content: `:confounded: Sorry, I did not understand who you wanted to sent to`, ephemeral: true});
            return;
        }

        users = users.filter((who) => !who.bot);
        if (users.length === 0) {
            interaction.reply({content: ":warning: *Sending KAS to bots is not allowed*", ephemeral: true});
            return;
        }

        users = (await Promise.all(users.map( async (user) => {return {user, userInfo: await userStore.get(user.id)}})));

        let nonCustodyUsers = users.filter((u) => u.userInfo !== undefined);
        let custodyUsers = users.filter((u) => u.userInfo === undefined);
        let totalUsers = nonCustodyUsers.length + (allowHold? custodyUsers.length : 0);
        if (!allowHold && nonCustodyUsers.length === 0) {
            interaction.reply({
                content: `:construction: *${who} did not open a wallet, and implicit wallets are allowed in this setting*`,
                ephemeral: true
            });
            return;
        }

        let wallet = await unlockWallet(interaction.user.id);
        if (wallet === null) {
            interaction.reply({content: ":warning: *Wallet is locked*", ephemeral: true});
            return;
        }

        let changeAddress = (await userStore.get(interaction.user.id)).publicAddress;

        const userAmount = amount/totalUsers;

        const inputs = nonCustodyUsers.map(({user, userInfo}) => {
            let address = userInfo.publicAddress
            if (userInfo.forward && userInfo.forwardAddress !== "") {
                address = userInfo.forwardAddress;
            }
            return {address, amount: userAmount * KAS_TO_SOMPIS}
        });
        if (allowHold) {
            inputs.push({address: getCustodialAddress(), amount: userAmount*custodyUsers.length*KAS_TO_SOMPIS})
        }

        console.log(inputs);
        let tx = await wallet.submitTransaction({
            targets: inputs,
            changeAddrOverride: changeAddress,
            calculateNetworkFee: true
        }).catch((e) => {
            console.log(e);
            let message = e.message === undefined ? e : e.message;
            interaction.reply({
                content: `:warning:*Failed submitting transaction:*\n> ${message}`,
                ephemeral: true
            })
        })

        if (tx !== null && tx !== undefined) {
            if (allowHold) {
                await Promise.all(custodyUsers.map(async ({user}) => await addCustody(user, userAmount)));
            }
            interaction.reply(
                //`:moneybag: ${interaction.user} sent ${amount} KAS to ${who} in [${tx.txid}](${KATNIP_TX}${tx.txid})` +
                `:moneybag: ${interaction.user} [sent](${KATNIP_TX}${tx.txid}) ${amount} KAS to ${who}` +
                (message ? `\n> ${message}` : "")
            )
        }
    },
}