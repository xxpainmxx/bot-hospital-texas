const { 
    Client, 
    GatewayIntentBits, 
    Events,
    REST,
    Routes,
    SlashCommandBuilder,
    ChannelType,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder
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

    // Quando usar /criarpasta
    if (interaction.isChatInputCommand()) {

        if (interaction.commandName === 'criarpasta') {

            const modal = new ModalBuilder()
                .setCustomId('modal_pasta')
                .setTitle('Criar Nova Pasta');

            const nomeInput = new TextInputBuilder()
                .setCustomId('nome_pasta')
                .setLabel('Qual será o nome da pasta?')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const row = new ActionRowBuilder().addComponents(nomeInput);
            modal.addComponents(row);

            await interaction.showModal(modal);
        }
    }

    // Quando enviar o nome
    if (interaction.isModalSubmit()) {

        if (interaction.customId === 'modal_pasta') {

            await interaction.deferReply({ ephemeral: true });

            const nome = interaction.fields.getTextInputValue('nome_pasta');

            const categoria = await interaction.guild.channels.create({
                name: nome,
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
                content: `✅ Pasta **${nome}** criada com sucesso!`
            });
        }
    }
});
});


client.login(TOKEN);


