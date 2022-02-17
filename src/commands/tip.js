const { unlockWallet, userStore, getCustodialAddress, addCustody} = require("../lib/users");
const {User, GuildMember, Role} = require("discord.js");
const { KAS_TO_SOMPIS, KATNIP_TX } = require("../constants");

const SAFETY_MARGIN = 1.01
let COUNT = 0;

const parseUsers = async (who) => {
    if (who === null || who === undefined) {
        return [];
    }
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
    }
    return users;
}

module.exports = {
    name: "tip",
    short: true,
    builder: (namedCommand) => namedCommand.setDescription('Sends some KAS').addMentionableOption(
        option => option.setName("who").setDescription("Who to send the tokens (user, channel, ...). Splits the tokens equally").setRequired(true)
    ).addMentionableOption(
        option => option.setName("additional-who2").setDescription("Who to send the tokens (user, channel, ...). Splits the tokens equally").setRequired(true)
    ).addMentionableOption(
        option => option.setName("additional-who3").setDescription("Who to send the tokens (user, channel, ...). Splits the tokens equally").setRequired(true)
    ).addMentionableOption(
        option => option.setName("additional-who4").setDescription("Who to send the tokens (user, channel, ...). Splits the tokens equally").setRequired(true)
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
        let who2 = interaction.options.getMentionable("additional-who2");
        let who3 = interaction.options.getMentionable("additional-who3");
        let who4 = interaction.options.getMentionable("additional-who4");
        let message = interaction.options.getString("message");
        let allowHold = interaction.options.getBoolean("allow-hold")

        let users = [
            ...(await parseUsers(who)),
            ...(await parseUsers(who2)),
            ...(await parseUsers(who3)),
            ...(await parseUsers(who4)),
        ];
        let targstString = `${who}` + [who2, who3, who4].map((who) => {
            if (who !== null && who !== undefined) {
                return `,${who2}`;
            }
            return "";
        }).reduce((a,b) => a+b)


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
                content: `:construction: *${targstString} did not open a wallet, and implicit wallets are allowed in this setting*`,
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

        const targets = nonCustodyUsers.map(({user, userInfo}) => {
            let address = userInfo.publicAddress
            if (userInfo.forward && userInfo.forwardAddress !== "") {
                address = userInfo.forwardAddress;
            }
            return {address, amount: Math.floor(userAmount * KAS_TO_SOMPIS)}
        });
        if (allowHold && custodyUsers.length > 0) {
            targets.push({address: getCustodialAddress(), amount: custodyUsers.length*Math.floor(userAmount*KAS_TO_SOMPIS)})
        }

        console.log(targets);
        let tx = await wallet.submitTransaction({
            targets,
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
            if (allowHold && custodyUsers.length > 0) {
                await Promise.all(custodyUsers.map(async ({user}) => {
                    console.log(`Adding ${userAmount} for ${user.id} in custody`)
                    await addCustody(user.id, userAmount)
                }));
            }
            interaction.reply(
                `:moneybag: ${interaction.user} [sent](${KATNIP_TX}${tx.txid}) ${amount} KAS to ${targstString}` +
                (message ? `\n> ${message}` : "")
            )
        }
    },
}