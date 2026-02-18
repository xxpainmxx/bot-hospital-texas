require('dotenv').config();

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

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

// ====== VARIÁVEIS RAILWAY ======
const TOKEN = process.env.TOKEN;
const STAFF_ROLE_ID = process.env.STAFF_ROLE_ID;
const ROLE_1_ID = process.env.ROLE_1_ID;
const ROLE_2_ID = process.env.ROLE_2_ID;
const CANAL_PAINEL_ID = process.env.CANAL_PAINEL_ID;
const CANAL_STAFF_ID = process.env.CANAL_STAFF_ID;
const CATEGORIA_ID = process.env.CATEGORIA_ID;
// ===============================

// Registrar comando
const commands = [
    new SlashCommandBuilder()
        .setName('enviar-painel')
        .setDescription('Enviar painel de solicitação')
        .toJSON()
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
    await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands }
    );
})();

client.once(Events.ClientReady, () => {
    console.log(`✅ Bot online como ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {

    // ===== ENVIAR PAINEL =====
    if (interaction.isChatInputCommand()) {

        if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
            return interaction.reply({ content: '❌ Apenas staff.', ephemeral: true });
        }

        const canal = interaction.guild.channels.cache.get(CANAL_PAINEL_ID);

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

    // ===== BOTÃO USUÁRIO =====
    if (interaction.isButton()) {

        if (interaction.customId === 'abrir_formulario') {

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

        // ===== STAFF APROVA / REPROVA =====
        if (interaction.customId.startsWith('aprovar_') || interaction.customId.startsWith('reprovar_')) {

            if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
                return interaction.reply({ content: '❌ Apenas staff.', ephemeral: true });
            }

            const userId = interaction.customId.split('_')[1];
            const member = await interaction.guild.members.fetch(userId);

            // ===== APROVAR =====
            if (interaction.customId.startsWith('aprovar_')) {

                await member.roles.add([ROLE_1_ID, ROLE_2_ID]);

                // 🔥 CRIAR PASTA AUTOMÁTICA
                const nomeServidor = member.displayName
                    .toLowerCase()
                    .replace(/[^a-z0-9]/gi, "-");

                const nomeCanal = `📂-${nomeServidor}`;

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

                await novoCanal.send({
                    content: `👋 Olá ${member}!\n\nSua pasta foi criada automaticamente.\nUse este espaço para enviar seus atendimentos.`
                });

                await interaction.update({
                    content: `✅ ${member} aprovado e pasta criada.`,
                    components: []
                });

                try {
                    await member.send(
                        `🎉 Você foi APROVADO!\n\nSua pasta privada já foi criada no servidor.`
                    );
                } catch {}

            }
            // ===== REPROVAR =====
            else {

                await interaction.update({
                    content: `❌ ${member} foi reprovado.`,
                    components: []
                });

                try {
                    await member.send(
                        `❌ Sua solicitação foi REPROVADA.\n\nProcure a staff para mais informações.`
                    );
                } catch {}
            }
        }
    }

    // ===== ENVIO DO FORMULÁRIO =====
    if (interaction.isModalSubmit()) {

        if (interaction.customId === 'modal_solicitacao') {

            const nome = interaction.fields.getTextInputValue('nome');
            const pombo = interaction.fields.getTextInputValue('pombo');
            const periodo = interaction.fields.getTextInputValue('periodo');

            const canalStaff = interaction.guild.channels.cache.get(CANAL_STAFF_ID);

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
    }
});

client.login(process.env.TOKEN);

