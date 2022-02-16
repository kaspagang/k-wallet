const fs = require('fs');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const dotenv = require('dotenv');
const {SlashCommandBuilder} = require("@discordjs/builders");

dotenv.config();

let mainCommand = new SlashCommandBuilder().setName('kwallet').setDescription('Kaspa tipper and wallet manager');
const commands = [];
const commandFiles = fs.readdirSync('./src/commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`../src/commands/${file}`);

    if (command.builder !== undefined) {
        if (command.short)  {
            commands.push(
                command.builder(new SlashCommandBuilder().setName("k"+command.name))
                    .toJSON()
            );
        }
        mainCommand = mainCommand.addSubcommand(
            (subcommand) =>
                command.builder(subcommand.setName(command.name))
        );
    }
}

const rest = new REST({ version: '9' }).setToken(process.env.DISCORD_BOT_TOKEN);

rest.put(
    Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID),
    //Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), // for production
    { body: [mainCommand.toJSON(), ...commands] }
).then(
    () => console.log('Successfully registered application commands.')
).catch(console.error);
