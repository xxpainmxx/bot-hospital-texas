const {
    Client,
    GatewayIntentBits,
    Events,
    ChannelType,
    PermissionsBitField,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    SlashCommandBuilder,
    REST,
    Routes
} = require('discord.js');

const TOKEN = process.env.TOKEN;
const GUILD_ID = '1347665144808865953';

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});


// 🔥 Quando o bot liga
client.once(Events.ClientReady, async () => {

    console.log(`Bot online como ${client.user.tag}`);

    const commands = [
        new SlashCommandBuilder()
            .setName('painel')
            .setDescription('Envia o painel para criar categoria privada')
            .toJSON()
    ];

    const rest = new REST({ version: '10' }).setToken(TOKEN);

    await rest.put(
        Routes.applicationGuildCommands(client.user.id, GUILD_ID),
        { body: commands }
    );

    console.log('Comando registrado!');
});


// 🔥 Interações
client.on(Events.InteractionCreate, async interaction => {

    // 🔹 Slash command
    if (interaction.isChatInputCommand()) {

        if (interaction.commandName === 'painel') {

            const botao = new ButtonBuilder()
                .setCustomId('criar_categoria')
                .setLabel('⚙️ Criar Minha Categoria')
                .setStyle(ButtonStyle.Primary);

            const row = new ActionRowBuilder().addComponents(botao);

            await interaction.reply({
                content: "Clique no botão para criar sua categoria privada:",
                components: [row]
            });
        }
    }

    // 🔹 Clique no botão
    if (interaction.isButton()) {

        const user = interaction.user;

        // 🔍 Verificar se já existe categoria
        const categoriaExistente = interaction.guild.channels.cache.find(
            c => c.type === ChannelType.GuildCategory && c.name === user.username
        );

        if (interaction.customId === 'criar_categoria') {

            if (categoriaExistente) {
                return interaction.reply({
                    content: "❌ Você já possui uma categoria criada.",
                    ephemeral: true
                });
            }

            await interaction.deferReply({ ephemeral: true });

            const categoria = await interaction.guild.channels.create({
                name: user.username,
                type: ChannelType.GuildCategory,
                permissionOverwrites: [
                    {
                        id: interaction.guild.id,
                        deny: [PermissionsBitField.Flags.ViewChannel]
                    },
                    {
                        id: user.id,
                        allow: [PermissionsBitField.Flags.ViewChannel]
                    },
                    {
                        id: interaction.guild.roles.everyone,
                        deny: [PermissionsBitField.Flags.ViewChannel]
                    }
                ]
            });

            const botaoDelete = new ButtonBuilder()
                .setCustomId('deletar_categoria')
                .setLabel('🗑️ Deletar Minha Categoria')
                .setStyle(ButtonStyle.Danger);

            const rowDelete = new ActionRowBuilder().addComponents(botaoDelete);

            await interaction.editReply({
                content: "✅ Sua categoria foi criada!\nUse o botão abaixo para deletar.",
                components: [rowDelete]
            });
        }

        // 🔥 Deletar categoria
        if (interaction.customId === 'deletar_categoria') {

            const categoria = interaction.guild.channels.cache.find(
                c => c.type === ChannelType.GuildCategory && c.name === user.username
            );

            if (!categoria) {
                return interaction.reply({
                    content: "❌ Categoria não encontrada.",
                    ephemeral: true
                });
            }

            await categoria.delete();

            await interaction.reply({
                content: "🗑️ Sua categoria foi deletada.",
                ephemeral: true
            });
        }
    }
});

client.login(TOKEN);
