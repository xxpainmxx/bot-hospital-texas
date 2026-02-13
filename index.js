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
            .setDescription('Envia o painel para criar sua pasta privada'),

        new SlashCommandBuilder()
            .setName('deletar')
            .setDescription('Deleta sua pasta privada')
    ].map(cmd => cmd.toJSON());

    const rest = new REST({ version: '10' }).setToken(TOKEN);

    await rest.put(
        Routes.applicationGuildCommands(client.user.id, GUILD_ID),
        { body: commands }
    );

    console.log('Comandos registrados!');
});

client.on(Events.InteractionCreate, async interaction => {

    // ========================
    // SLASH COMMANDS
    // ========================

    if (interaction.isChatInputCommand()) {

        if (interaction.commandName === 'painel') {

            const botao = new ButtonBuilder()
                .setCustomId('criar_sala')
                .setLabel('⚙️ Criar Minha Pasta')
                .setStyle(ButtonStyle.Primary);

            const row = new ActionRowBuilder().addComponents(botao);

            await interaction.reply({
                content: "Clique no botão abaixo para criar sua pasta privada:",
                components: [row]
            });
        }

        if (interaction.commandName === 'deletar') {

            const userId = interaction.user.id;
            const guild = interaction.guild;

            const canal = guild.channels.cache.find(channel => {
                if (channel.parentId !== CATEGORIA_ID) return false;

                const perm = channel.permissionOverwrites.cache.get(userId);
                return perm && perm.allow.has(PermissionsBitField.Flags.ViewChannel);
            });

            if (!canal) {
                return interaction.reply({
                    content: "❌ Você não possui pasta para deletar.",
                    ephemeral: true
                });
            }

            await canal.delete();

            await interaction.reply({
                content: "🗑️ Sua pasta foi deletada com sucesso!",
                ephemeral: true
            });
        }
    }

    // ========================
    // BOTÃO
    // ========================

    if (interaction.isButton()) {

        if (interaction.customId === 'criar_sala') {

            await interaction.deferReply({ ephemeral: true });

            const userId = interaction.user.id;
            const guild = interaction.guild;

            // 🔒 Verifica se já existe pasta para o usuário
            const canalExistente = guild.channels.cache.find(channel => {
                if (channel.parentId !== CATEGORIA_ID) return false;

                const perm = channel.permissionOverwrites.cache.get(userId);
                return perm && perm.allow.has(PermissionsBitField.Flags.ViewChannel);
            });

            if (canalExistente) {
                return interaction.editReply({
                    content: "❌ Você já possui uma pasta criada."
                });
            }

            // 🔥 Nome usando nickname do servidor
            const nomeServidor = interaction.member.displayName
                .toLowerCase()
                .replace(/[^a-z0-9]/gi, "-");

            const nomeCanal = `📂-${nomeServidor}`;

            await guild.channels.create({
                name: nomeCanal,
                type: ChannelType.GuildText,
                parent: CATEGORIA_ID,
                permissionOverwrites: [
                    {
                        id: guild.id,
                        deny: [PermissionsBitField.Flags.ViewChannel]
                    },
                    {
                        id: userId,
                        allow: [
                            PermissionsBitField.Flags.ViewChannel,
                            PermissionsBitField.Flags.SendMessages,
                            PermissionsBitField.Flags.ReadMessageHistory
                        ]
                    }
                ]
            });

            await interaction.editReply({
                content: "✅ Sua pasta privada foi criada com sucesso!"
            });

            // 🗑️ Apaga a mensagem do painel
            try {
                await interaction.message.delete();
            } catch (err) {
                console.log("Não foi possível apagar a mensagem do painel.");
            }
        }
    }
});

client.login(TOKEN);
