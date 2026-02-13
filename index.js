const { 
    Client, 
    GatewayIntentBits, 
    Events, 
    REST, 
    Routes, 
    SlashCommandBuilder,
    ChannelType
} = require('discord.js');

const TOKEN = process.env.TOKEN;

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});


// 🔹 READY (quando o bot liga)
client.once(Events.ClientReady, async () => {

    console.log(`Bot online como ${client.user.tag}`);

    const commands = [
        new SlashCommandBuilder()
            .setName('criarpasta')
            .setDescription('Cria uma pasta com canais automáticos')
            .toJSON()
    ];

    const rest = new REST({ version: '10' }).setToken(TOKEN);

    await rest.put(
        Routes.applicationGuildCommands(client.user.id, '1347665144808865953'),
        { body: commands }
    );

    console.log('Comando registrado automaticamente!');
});


// 🔹 AQUI FICA O interactionCreate 👇
client.on(Events.InteractionCreate, async interaction => {

    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'criarpasta') {

        await interaction.deferReply({ ephemeral: true });

        try {

            const categoria = await interaction.guild.channels.create({
                name: "Nova Pasta",
                type: ChannelType.GuildCategory
            });

            await interaction.guild.channels.create({
                name: '📌・informações',
                type: ChannelType.GuildText,
                parent: categoria.id
            });

            await interaction.guild.channels.create({
                name: '💬・chat',
                type: ChannelType.GuildText,
                parent: categoria.id
            });

            await interaction.editReply({
                content: "✅ Pasta criada com sucesso!"
            });

        } catch (error) {
            console.error(error);
            await interaction.editReply({
                content: "❌ Ocorreu um erro ao criar a pasta."
            });
        }
    }
});


client.login(TOKEN);
