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
const CATEGORIA_ID = '1347665146553696318';

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

client.once(Events.ClientReady, async () => {

    console.log(`Bot online como ${client.user.tag}`);

    const commands = [
        new SlashCommandBuilder()
            .setName('painel')
            .setDescription('Envia o painel para criar sala privada'),

        new SlashCommandBuilder()
            .setName('deletar')
            .setDescription('Deleta sua sala privada')
    ].map(command => command.toJSON());

    const rest = new REST({ version: '10' }).setToken(TOKEN);

    await rest.put(
        Routes.applicationGuildCommands(client.user.id, GUILD_ID),
        { body: commands }
    );

    console.log('Comandos registrados!');
});

client.on(Events.InteractionCreate, async interaction => {

    if (interaction.isChatInputCommand()) {

        if (interaction.commandName === 'painel') {

            const botao = new ButtonBuilder()
                .setCustomId('criar_sala')
                .setLabel('⚙️ Criar Minha Sala')
                .setStyle(ButtonStyle.Primary);

            const row = new ActionRowBuilder().addComponents(botao);

            await interaction.reply({
                content: "Clique no botão para criar sua sala privada:",
                components: [row]
            });
        }

        if (interaction.commandName === 'deletar') {

            const nomeServidor = interaction.member.displayName
                .toLowerCase()
                .replace(/[^a-z0-9]/gi, "-");

            const canal = interaction.guild.channels.cache.find(
                c => c.parentId === CATEGORIA_ID && c.name === `📂-${nomeServidor}`
            );

            if (!canal) {
                return interaction.reply({
                    content: "❌ Você não possui sala para deletar.",
                    ephemeral: true
                });
            }

            await canal.delete();

            await interaction.reply({
                content: "🗑️ Sua sala foi deletada!",
                ephemeral: true
            });
        }
    }

    if (interaction.isButton()) {

        if (interaction.customId === 'criar_sala') {

            await interaction.deferReply({ ephemeral: true });

            const nomeServidor = interaction.member.displayName
                .toLowerCase()
                .replace(/[^a-z0-9]/gi, "-");

            const nomeCanal = `📂-${nomeServidor}`;

            const canalExistente = interaction.guild.channels.cache.find(
                c => c.parentId === CATEGORIA_ID && c.name === nomeCanal
            );

            if (canalExistente) {
                return interaction.editReply({
                    content: "❌ Você já possui uma sala criada."
                });
            }

            await interaction.guild.channels.create({
                name: nomeCanal,
                type: ChannelType.GuildText,
                parent: CATEGORIA_ID,
                permissionOverwrites: [
                    {
                        id: interaction.guild.id,
                        deny: [PermissionsBitField.Flags.ViewChannel]
                    },
                    {
                        id: interaction.user.id,
                        allow: [
                            PermissionsBitField.Flags.ViewChannel,
                            PermissionsBitField.Flags.SendMessages,
                            PermissionsBitField.Flags.ReadMessageHistory
                        ]
                    }
                ]
            });

            await interaction.editReply({
                content: "✅ Sua sala privada foi criada com seu nome do servidor!"
            });
        }
    }
});

client.login(TOKEN);
