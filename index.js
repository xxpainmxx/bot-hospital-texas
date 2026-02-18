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
    CATEGORIA_ID,
    CANAL_LOG_ID
} = process.env;

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
    console.error("❌ Variáveis principais não definidas.");
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
// 🗂️ MEMÓRIA TEMPORÁRIA
// ===============================
const solicitacoes = new Map();
const nickAntigo = new Map();

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

client.once(Events.ClientReady, () => {
    console.log(`✅ Bot online como ${client.user.tag}`);
});

// ===============================
// 🎛 INTERAÇÕES
// ===============================
client.on(Events.InteractionCreate, async interaction => {

    try {

        // ===============================
        // 📌 ENVIAR PAINEL
        // ===============================
        if (interaction.isChatInputCommand()) {

            if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
                return interaction.reply({ content: '❌ Apenas staff.', ephemeral: true });
            }

            const canal = interaction.guild.channels.cache.get(CANAL_PAINEL_ID);
            if (!canal) {
                return interaction.reply({ content: '❌ Canal não encontrado.', ephemeral: true });
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

            await canal.send({
                embeds: [embed],
                components: [row]
            });

            return interaction.reply({ content: '✅ Painel enviado.', ephemeral: true });
        }

        // ===============================
        // 📝 ABRIR FORMULÁRIO
        // ===============================
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

        // ===============================
        // 📨 ENVIO DO MODAL
        // ===============================
        if (interaction.isModalSubmit() && interaction.customId === 'modal_solicitacao') {

            const nome = interaction.fields.getTextInputValue('nome');
            const pombo = interaction.fields.getTextInputValue('pombo');
            const periodo = interaction.fields.getTextInputValue('periodo');

            const nomeFormatado = nome
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '-');

            const nomeFinal = `${nomeFormatado}-${pombo}`;
            const nomeCanal = `📁-${nomeFinal}`;

            solicitacoes.set(interaction.user.id, {
                nomeCanal,
                nomeFinal
            });

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

            return interaction.reply({
                content: '📨 Solicitação enviada para staff.',
                ephemeral: true
            });
        }

        // ===============================
        // ✅ APROVAR / ❌ REPROVAR
        // ===============================
        if (interaction.isButton() &&
            (interaction.customId.startsWith('aprovar_') || interaction.customId.startsWith('reprovar_'))) {

            const userId = interaction.customId.split('_')[1];
            const member = await interaction.guild.members.fetch(userId).catch(() => null);
            if (!member) return;

            if (interaction.customId.startsWith('aprovar_')) {

                const dados = solicitacoes.get(userId);
                if (!dados) {
                    return interaction.reply({ content: '❌ Dados não encontrados.', ephemeral: true });
                }

                await member.roles.add([ROLE_1_ID, ROLE_2_ID]).catch(() => {});

                // Salvar nick antigo
                nickAntigo.set(userId, member.nickname || member.user.username);

                // Alterar nickname (SEM emoji)
                try {
                    await member.setNickname(dados.nomeFinal);
                } catch (err) {
                    console.log("Erro ao alterar nickname.");
                }

                // DM aprovação
                try {
                    await member.send(
                        `✅ Sua solicitação foi APROVADA!\n\nSeu nome no servidor agora é: ${dados.nomeFinal}`
                    );
                } catch {}

                // Criar canal com emoji
                const novoCanal = await interaction.guild.channels.create({
                    name: dados.nomeCanal,
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

                await novoCanal.send(`📁 Pasta do(a) Dr ${member}. criada com sucesso. Todos os registros, relatórios e documentos deverão ser organizados aqui conforme o protocolo interno.`);

                solicitacoes.delete(userId);

                await interaction.update({
                    content: `✅ ${member} aprovado, nick alterado e pasta criada.`,
                    components: []
                });

            } else {

                try {
                    await member.send(
                        `❌ Sua solicitação foi REPROVADA.\n\nPara mais informações fale com a staff.`
                    );
                } catch {}

                solicitacoes.delete(userId);

                await interaction.update({
                    content: `❌ ${member} foi reprovado.`,
                    components: []
                });
            }
        }

    } catch (error) {
        console.error("Erro na interação:", error);
    }
});

client.login(TOKEN);

