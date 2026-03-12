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

const config = require('./config.json');

const {
    TOKEN,
    CLIENT_ID,
    GUILD_ID,
    STAFF_ROLE_ID,
    ROLE_1_ID,
    ROLE_2_ID,
    ROLE_3_ID,
    CANAL_PAINEL_ID,
    CANAL_STAFF_ID,
    CATEGORIA_ID,
    CANAL_LOG_ID
} = config;

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
    console.error("❌ Variáveis não definidas no config.json");
    process.exit(1);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

// ===============================
// 📊 SISTEMA DE LOGS
// ===============================
async function enviarLog(guild, mensagem) {
    try {
        const canal = guild.channels.cache.get(CANAL_LOG_ID);
        if (!canal) return;

        const embed = new EmbedBuilder()
            .setTitle("📊 Log do Sistema")
            .setDescription(mensagem)
            .setColor("Blue")
            .setTimestamp();

        canal.send({ embeds: [embed] });

    } catch (err) {
        console.error("Erro ao enviar log:", err);
    }
}

const solicitacoes = new Map();

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
        console.error("Erro ao registrar comando:", err);
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
        // ENVIAR PAINEL
        // ===============================
        if (interaction.isChatInputCommand()) {

            if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
                return interaction.reply({ content: '❌ Apenas staff.', ephemeral: true });
            }

            const canal = interaction.guild.channels.cache.get(CANAL_PAINEL_ID);

            const embed = new EmbedBuilder()
                .setTitle('📋 Solicitação de Aprovação')
                .setDescription('Clique no botão abaixo para enviar sua solicitação.')
                .setColor('Blue');

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('abrir_formulario')
                    .setLabel('Solicitar Aprovação')
                    .setStyle(ButtonStyle.Primary)
            );

            await canal.send({
                embeds: [embed],
                components: [row]
            });

            await enviarLog(interaction.guild, `📋 Painel enviado por ${interaction.user.tag}`);

            return interaction.reply({ content: '✅ Painel enviado.', ephemeral: true });
        }

        // ===============================
        // ABRIR FORMULÁRIO
        // ===============================
        if (interaction.isButton() && interaction.customId === "abrir_formulario") {

            const modal = new ModalBuilder()
                .setCustomId("modal_solicitacao")
                .setTitle("Formulário de Solicitação");

            const nome = new TextInputBuilder()
                .setCustomId("nome")
                .setLabel("Seu Nome")
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const pombo = new TextInputBuilder()
                .setCustomId("pombo")
                .setLabel("Pombo")
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const periodo = new TextInputBuilder()
                .setCustomId("periodo")
                .setLabel("Período de Trabalho")
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
        // ENVIO DO FORMULÁRIO
        // ===============================
        if (interaction.isModalSubmit()) {

            const nome = interaction.fields.getTextInputValue("nome");
            const pombo = interaction.fields.getTextInputValue("pombo");
            const periodo = interaction.fields.getTextInputValue("periodo");

            const nomeFormatado = nome.toLowerCase().replace(/[^a-z0-9]/g, "-");
            const nomeFinal = `${nomeFormatado}-${pombo}`;
            const nomeCanal = `📁-${nomeFinal}`;

            solicitacoes.set(interaction.user.id, {
                nomeCanal,
                nomeFinal
            });

            const canalStaff = interaction.guild.channels.cache.get(CANAL_STAFF_ID);

            const embed = new EmbedBuilder()
                .setTitle("📩 Nova Solicitação")
                .setColor("Yellow")
                .addFields(
                    { name: "Nome", value: nome },
                    { name: "Pombo", value: pombo },
                    { name: "Período", value: periodo }
                );

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`aprovar_${interaction.user.id}`)
                    .setLabel("Aprovar")
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`reprovar_${interaction.user.id}`)
                    .setLabel("Reprovar")
                    .setStyle(ButtonStyle.Danger)
            );

            await canalStaff.send({ embeds: [embed], components: [row] });

            await enviarLog(interaction.guild, `📩 Nova solicitação enviada por ${interaction.user.tag}`);

            return interaction.reply({
                content: "📨 Solicitação enviada para staff.",
                ephemeral: true
            });
        }

        // ===============================
        // APROVAR / REPROVAR
        // ===============================
        if (interaction.isButton()) {

            const userId = interaction.customId.split("_")[1];
            const member = await interaction.guild.members.fetch(userId).catch(() => null);

            if (!member) return;

            if (interaction.customId.startsWith("aprovar_")) {

                const dados = solicitacoes.get(userId);

                await member.roles.add([ROLE_1_ID, ROLE_2_ID]).catch(() => {});

                try {
                    await member.setNickname(dados.nomeFinal);
                } catch {}

                try {
                    await member.send(`✅ Você foi aprovado!\nNome no servidor: ${dados.nomeFinal}`);
                } catch {}

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
                                PermissionsBitField.Flags.SendMessages
                            ]
                        }
                    ]
                });

                await novoCanal.send(`📁 Pasta criada para ${member}.`);

                await enviarLog(interaction.guild,
                    `✅ ${member.user.tag} aprovado por ${interaction.user.tag}\n📁 Pasta criada: ${dados.nomeCanal}`
                );

                solicitacoes.delete(userId);

                await interaction.update({
                    content: `✅ ${member} aprovado.`,
                    components: []
                });

            } else if (interaction.customId.startsWith("reprovar_")) {

                try {
                    await member.send("❌ Sua solicitação foi reprovada.");
                } catch {}

                await enviarLog(interaction.guild,
                    `❌ ${member.user.tag} foi reprovado por ${interaction.user.tag}`
                );

                solicitacoes.delete(userId);

                await interaction.update({
                    content: `❌ ${member} reprovado.`,
                    components: []
                });
            }
        }

    } catch (error) {
        console.error("Erro:", error);

        if (interaction.guild) {
            enviarLog(interaction.guild, `⚠️ Erro no sistema:\n${error.message}`);
        }
    }
});

client.login(TOKEN);

