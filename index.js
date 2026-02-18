const {
    Client,
    GatewayIntentBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    SlashCommandBuilder,
    REST,
    Routes,
    Events,
    EmbedBuilder,
    ChannelType,
    PermissionsBitField
} = require('discord.js');

// ===============================
// 🔐 VARIÁVEIS DO RAILWAY
// ===============================
const {
    TOKEN,
    CLIENT_ID,
    GUILD_ID,
    STAFF_ROLE_ID,
    ROLE_1_ID,
    ROLE_2_ID,
    CANAL_PAINEL_ID,
    CANAL_STAFF_ID,
    CATEGORIA_ID
} = process.env;

// Validação básica
if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
    console.error("❌ TOKEN, CLIENT_ID ou GUILD_ID não definidos nas Variables do Railway.");
    process.exit(1);
}

// ===============================
// 🤖 CLIENT
// ===============================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

// ===============================
// 📌 REGISTRAR SLASH COMMAND
// ===============================
const commands = [
    new SlashCommandBuilder()
        .setName('enviar-painel')
        .setDescription('Enviar painel de solicitação')
        .toJSON()
];

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands }
        );
        console.log("✅ Slash command registrado.");
    } catch (err) {
        console.error("❌ Erro ao registrar comando:", err);
    }
})();

// ===============================
// ✅ BOT ONLINE
// ===============================
client.once(Events.ClientReady, () => {
    console.log(`✅ Bot online como ${client.user.tag}`);
});

// ===============================
// 🎛 INTERAÇÕES
// ===============================
client.on(Events.InteractionCreate, async interaction => {

    // ===== ENVIAR PAINEL =====
    if (interaction.isChatInputCommand()) {

        if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
            return interaction.reply({ content: '❌ Apenas staff.', ephemeral: true });
        }

        const canal = interaction.guild.channels.cache.get(CANAL_PAINEL_ID);
        if (!canal) {
            return interaction.reply({ content: '❌ Canal do painel não encontrado.', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setTitle('📋 Solicitação de Aprovação')
            .setDescription('Clique no botão abaixo para enviar sua solicitação.')
            .setColor('Blue');

        const button = new ButtonBuilder()
            .setCustomId('abrir_formulario')
            .setLabel('Solicitar Aprovação')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(button);

        const msg = await canal.send({
            embeds: [embed],
            components: [row]
        });

        await msg.pin();

        return interaction.reply({ content: '✅ Painel enviado.', ephemeral: true });
    }

    // ===== ABRIR FORMULÁRIO =====
    if (interaction.isButton() && interaction.customId === 'abrir_formulario') {

        const modal = new ModalBuilder()
            .setCustomId('modal_solicitacao')
            .setTitle('Formulário de Solicitação');

        const nome = new TextInputBuilder()
            .setCustomId('nome')
            .setLabel('Seu Nome')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const pombo = new TextInputBuilder()
            .setCustomId('pombo')
            .setLabel('Pombo')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const periodo = new TextInputBuilder()
            .setCustomId('periodo')
            .setLabel('Período de Trabalho')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(nome),
            new ActionRowBuilder().addComponents(pombo),
            new ActionRowBuilder().addComponents(periodo)
        );

        return interaction.showModal(modal);
    }

    // ===== APROVAR / REPROVAR =====
    if (interaction.isButton() &&
        (interaction.customId.startsWith('aprovar_') || interaction.customId.startsWith('reprovar_'))) {

        if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
            return interaction.reply({ content: '❌ Apenas staff.', ephemeral: true });
        }

        const userId = interaction.customId.split('_')[1];
        const member = await interaction.guild.members.fetch(userId).catch(() => null);
        if (!member) {
            return interaction.reply({ content: '❌ Usuário não encontrado.', ephemeral: true });
        }

        // ===== APROVAR =====
        if (interaction.customId.startsWith('aprovar_')) {

            try {
                await member.roles.add([ROLE_1_ID, ROLE_2_ID]);
            } catch (err) {
                console.error("Erro ao adicionar cargos:", err);
            }

            const nomeCanal = `📂-${member.user.username.toLowerCase().replace(/[^a-z0-9]/gi, '-')}`;

            const novoCanal = await interaction.guild.channels.create({
                name: nomeCanal,
                type: ChannelType.GuildText,
                parent: CATEGORIA_ID,
                permissionOverwrites: [
                    {
                        id: interaction.guild.id,
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

            await novoCanal.send(`👋 Olá ${member}, sua pasta foi criada.`);

            await interaction.update({
                content: `✅ ${member} aprovado e pasta criada.`,
                components: []
            });

        } else {
            await interaction.update({
                content: `❌ ${member} foi reprovado.`,
                components: []
            });
        }
    }

    // ===== ENVIO DO MODAL =====
    if (interaction.isModalSubmit() && interaction.customId === 'modal_solicitacao') {

        const nome = interaction.fields.getTextInputValue('nome');
        const pombo = interaction.fields.getTextInputValue('pombo');
        const periodo = interaction.fields.getTextInputValue('periodo');

        const canalStaff = interaction.guild.channels.cache.get(CANAL_STAFF_ID);
        if (!canalStaff) {
            return interaction.reply({ content: '❌ Canal da staff não encontrado.', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setTitle('📩 Nova Solicitação')
            .setColor('Yellow')
            .addFields(
                { name: 'Nome', value: nome },
                { name: 'Pombo', value: pombo },
                { name: 'Período', value: periodo }
            )
            .setFooter({ text: `Solicitado por ${interaction.user.tag}` });

        const aprovarBtn = new ButtonBuilder()
            .setCustomId(`aprovar_${interaction.user.id}`)
            .setLabel('Aprovar')
            .setStyle(ButtonStyle.Success);

        const reprovarBtn = new ButtonBuilder()
            .setCustomId(`reprovar_${interaction.user.id}`)
            .setLabel('Reprovar')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(aprovarBtn, reprovarBtn);

        await canalStaff.send({
            embeds: [embed],
            components: [row]
        });

        await interaction.reply({
            content: '📨 Solicitação enviada para staff.',
            ephemeral: true
        });
    }
});

// ===============================
// 🚀 LOGIN
// ===============================
client.login(TOKEN);
