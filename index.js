const { 
    Client, 
    GatewayIntentBits, 
    Partials, 
    Events, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder, 
    SlashCommandBuilder 
} = require('discord.js');

const TOKEN = process.env.TOKEN;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds
    ],
    partials: [Partials.Channel]
});

client.once(Events.ClientReady, () => {
    console.log(`Bot online como ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {

    // Quando usar o comando /criarpasta
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'criarpasta') {

            const modal = new ModalBuilder()
                .setCustomId('modal_pasta')
                .setTitle('Criar Nova Pasta');

            const nomeInput = new TextInputBuilder()
                .setCustomId('nome_pasta')
                .setLabel("Qual o nome da pasta?")
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const row = new ActionRowBuilder().addComponents(nomeInput);
            modal.addComponents(row);

            await interaction.showModal(modal);
        }
    }

    // Quando enviar o nome no modal
 const { ChannelType } = require('discord.js');

if (interaction.isModalSubmit()) {
    if (interaction.customId === 'modal_pasta') {

        const nome = interaction.fields.getTextInputValue('nome_pasta');

        // Criar categoria
        const categoria = await interaction.guild.channels.create({
            name: nome,
            type: ChannelType.GuildCategory
        });

        // Criar canais dentro da categoria
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

        await interaction.guild.channels.create({
            name: '🎙️・voz',
            type: ChannelType.GuildVoice,
            parent: categoria.id
        });

        await interaction.reply({
            content: `✅ Pasta **${nome}** criada com canais automáticos!`,
            ephemeral: true
        });
    }
}
});


client.login(TOKEN);

