const fs = require('fs');
const { Client, Collection, Intents } = require('discord.js');
const dotenv = require('dotenv');
const {walletInit} = require("./lib/users");

const log = console.log;

console.log = function() {
  log.apply(console, [new Date(), ...arguments]);
}

dotenv.config();

const client = new Client({intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MEMBERS]});

// Loading commands
client.commands = new Collection();
const commandFiles = fs.readdirSync('./src/commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  // Set a new item in the Collection
  // With the key as the command name and the value as the exported module
  if (command.name !== undefined) client.commands.set(command.name, command);
  if (command.onButton !== undefined) {
    client.on('interactionCreate', async interaction => {
      if (!interaction.isButton()) return;
      await command.onButton(interaction);
    });
  }
}

client.on("ready", (client) => {
  walletInit(process.env.KASPAD_ADDRESS, process.env.CUSTODIAL);
});
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand() && !interaction.isAutocomplete()) return;


  let commandName = interaction.commandName === "kwallet"? interaction.options.getSubcommand() : interaction.commandName.substring(1);

  const command = client.commands.get(commandName);

  if (!command) return;

  if (process.env.OFFLINE === "yes" || (process.env.OFFLINE === "admin" && process.env.ADMIN !== interaction.user.id)) {
    await interaction.reply({
      content: ':thunder_cloud_rain: *Bot is down for node maintenance. Please try again later*',
      ephemeral: true
    });
    return;
  }

  if (interaction.isCommand()) {
    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      try {
        if (!interaction.replied) {
          if (!interaction.deferred) {
            await interaction.reply({
              content: ':ambulance: *There was an error while executing this command!*',
              ephemeral: true
            });
          } else {
            await interaction.editReply({
              content: ':ambulance: *There was an error while executing this command!*',
              ephemeral: true
            });
          }
        } else {
          await interaction.followUp({
            content: ':ambulance: *There was an error while executing this command!*',
            ephemeral: true
          });
        }
      } catch (e) {
        console.log("Could not report error to client")
        console.log(e);
      }
    }
  } else if (interaction.isAutocomplete()) {
    try {
      await command.autocomplete(interaction);
    } catch (error) {
      try {
        if (!interaction.responded) {
          await interaction.respond([]);
        }
      } catch (e) {
        console.log("Could not report default values")
        console.log(e);
      }
      console.error(error);
    }
  }
});
client.on("debug", (info) => console.log(`Discord.js DEBUG: ${info}`));
client.on("warn", (info) => console.log(`Discord.js WARN: ${info}`));
client.on("error", (info) => console.log(`Discord.js ERROR: ${info}`));

client.login(process.env.DISCORD_BOT_TOKEN);
