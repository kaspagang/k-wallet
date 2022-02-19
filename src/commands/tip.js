const { MessageMentions: { USERS_PATTERN, ROLES_PATTERN, EVERYONE_PATTERN } } = require('discord.js');
const { unlockWallet, userStore, getCustodialAddress, addCustody, getRPCBalance} = require("../lib/users");
const {User, GuildMember, Role, Message} = require("discord.js");
const { KAS_TO_SOMPIS, KATNIP_TX } = require("../constants");

//const TRANSACTION_SPLIT_MAX = 20;
const TRANSACTION_SPLIT_MAX = null;

async function getMentions(interaction, mention) {
    let match;
    let mentions = [];
    let tags = []

    await interaction.guild.members.fetch();
    while ((match = USERS_PATTERN.exec(mention)) !== null){
        tags.push(match[0]);
        mentions.push(interaction.guild.members.cache.get(match[1]))
    }

    await interaction.guild.roles.fetch();
    while ((match = ROLES_PATTERN.exec(mention)) !== null){
        tags.push(match[0]);
        mentions.push(interaction.guild.roles.cache.get(match[1]));
    }

    while ((match = EVERYONE_PATTERN.exec(mention)) !== null){
        tags.push(match[0]);
        mentions.push(interaction.guild.roles.cache.get(interaction.guild.id));
    }

    return {mentions, tags: tags.reduce((a,b) => a+ " "+b)};
}


const parseMentionable = (interaction, who, allowHold) => {
    if (who === null || who === undefined) {
        return [];
    }
    let users = [];

    if (who instanceof User) {
        users.push({user: who, allowHold: (allowHold === null || allowHold === undefined)? true : allowHold});
    } else if (who instanceof GuildMember) {
        users.push({user: who.user, allowHold: (allowHold === null || allowHold === undefined)? true : allowHold})
    } else if (who instanceof Role) {
        users = [...users, ...who.members.map((member) => {
            return {
                user: member.user,
                allowHold: (allowHold === null || allowHold === undefined)? false : allowHold
            };
        }).filter(({user}) => user.id !== interaction.user.id)];
    }
    return users;
}

module.exports = {
    name: "tip",
    short: true,
    builder: (namedCommand) => namedCommand.setDescription('Sends some KAS').addStringOption(
        option => option.setName("who").setDescription("Who to send the tokens (user, channel, ...). Splits the tokens equally").setRequired(true)
    ).addNumberOption(
        option => option.setName("amount").setDescription("Amount of KAS to send").setRequired(true).setAutocomplete(true)
    ).addStringOption(
        option => option.setName("message").setDescription("Message to send alongside the tip")
    ).addBooleanOption(
        option => option.setName("allow-hold").setDescription("Send funds for holding if user does not have wallet (default True for single user, False for roles)")
    ).addBooleanOption(
        option => option.setName("inclusive-fee").setDescription("Fees are deducted from the amount sent")
    ),
    async autocomplete(interaction) {
        // In autocomplete, we get string
        let {name, value} = interaction.options.getFocused(true)
        if (name === "amount") {
            let amount = parseFloat(value);

            let info = await userStore.get(interaction.user.id);
            if (info === undefined) {
                interaction.respond([]);
                return;
            }

            let wallet = await unlockWallet(interaction.user.id);
            let balance = null;
            if (wallet !== null) {
                balance = wallet.balance.available / KAS_TO_SOMPIS;
            } else {
                balance = (await getRPCBalance(info.publicAddress)).balance / KAS_TO_SOMPIS;
            }
            let currentInput = []
            if (!isNaN(amount)) {
                currentInput.push({"name": `${amount}`, "value": amount});
            }
            interaction.respond([
                ...currentInput,
                {"name": `${balance}`, "value": balance}
            ]);
        } else {
            interaction.respond([]);
        }
    },
    async execute(interaction) {
        let amount = interaction.options.getNumber("amount");
        let message = interaction.options.getString("message");
        let allowHold = interaction.options.getBoolean("allow-hold")
        let inclusiveFee = interaction.options.getBoolean("inclusive-fee")
        inclusiveFee = inclusiveFee === null? false : inclusiveFee;
        let who = await getMentions(interaction, interaction.options.getString("who"));

        let users = new Map();
        for (let member of who.mentions) {
            for (let user of parseMentionable(interaction, member, allowHold)){
                let userAllowHold = user.allowHold
                if (users.has(who.id)) {
                    userAllowHold = userAllowHold || users.get(who.id).allowHold;
                }
                users.set(user.user.id, {...user, userAllowHold})
            }
        }
        users = [...users.values()];
        console.log(users)

        users = users.filter(({user}) => !user.bot);
        if (users.length === 0) {
            interaction.reply({content: ":warning: *Sending KAS to bots is not allowed*", ephemeral: true});
            return;
        }

        users = (await Promise.all(users.map( async (user) => {return {...user, userInfo: await userStore.get(user.user.id)}})));

        let nonCustodyUsers = users.filter((u) => u.userInfo !== undefined);
        let custodyUsers = users.filter((u) => u.allowHold && u.userInfo === undefined);
        let totalUsers = nonCustodyUsers.length + custodyUsers.length;
        if (totalUsers === 0) {
            interaction.reply({
                content: `:no_entry_sign:  *${who.tags} did not open a wallet, and implicit wallets are allowed in this setting*`,
                ephemeral: true
            });
            return;
        } else if (totalUsers > 1 && inclusiveFee) {
            interaction.reply({
                content: `:no_entry_sign:  *Inclusive fees are not allowed for multiple targets*`,
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

        const targets = nonCustodyUsers.map(({userInfo}) => {
            let address = userInfo.publicAddress
            if (userInfo.forward && userInfo.forwardAddress !== "") {
                address = userInfo.forwardAddress;
            }
            return {address, amount: Math.floor(userAmount * KAS_TO_SOMPIS)}
        });
        if (custodyUsers.length > 0) {
            targets.push({address: getCustodialAddress(), amount: custodyUsers.length*Math.floor(userAmount*KAS_TO_SOMPIS)})
        }

        console.log(targets);
        let tx = await wallet.submitTransaction({
            targets,
            changeAddrOverride: changeAddress,
            calculateNetworkFee: true,
            inclusiveFee,
            maxSplitting: TRANSACTION_SPLIT_MAX,
        }).catch((e) => {
            console.log(e);
            let message = e.message === undefined ? e : e.message;
            interaction.reply({
                content: `:warning:*Failed submitting transaction:*\n> ${message}`,
                ephemeral: true
            })
        })

        if (tx !== null && tx !== undefined) {
            if (custodyUsers.length > 0) {
                await Promise.all(custodyUsers.map(async ({user}) => {
                    console.log(`Adding ${userAmount} for ${user.id} in custody`)
                    await addCustody(user.id, userAmount)
                }));
            }
            let txLinks = tx.txids.map((txid, i) => (
                (i === (tx.txids.length - 1) && i > 0)? "and " : "") +
                `[here](${KATNIP_TX}${txid})`
            ).reduce((a,b) => a + ", " + b)
            interaction.reply(
                `:moneybag: ${interaction.user} sent ${amount} KAS to ${who.tags} (${txLinks})` +
                (message ? `\n> ${message}` : "")
            )
        }
    },
}
