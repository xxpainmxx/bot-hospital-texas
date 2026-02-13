const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = '1471849314979676282';
const GUILD_ID = '1347665144808865953';

const commands = [
    new SlashCommandBuilder()
        .setName('criarpasta')
        .setDescription('Cria uma pasta com nome personalizado')
        .toJSON()
];

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        console.log('Registrando comandos...');

        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands }
        );

        console.log('Comando registrado com sucesso!');
    } catch (error) {
        console.error(error);
    }
})();