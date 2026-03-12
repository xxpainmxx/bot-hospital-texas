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

const config = require('./config.json');

const TOKEN = process.env.TOKEN;

const {
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

const client = new Client({
intents: [
GatewayIntentBits.Guilds,
GatewayIntentBits.GuildMembers
]
});

const solicitacoes = new Map();


// ================= LOG =================

async function enviarLog(guild, mensagem){

const canal = guild.channels.cache.get(CANAL_LOG_ID);
if(!canal) return;

const embed = new EmbedBuilder()
.setTitle("📊 Log do Sistema")
.setDescription(mensagem)
.setColor("Blue")
.setTimestamp();

canal.send({embeds:[embed]});

}


// ================= ANTI PASTA DUPLICADA =================

async function verificarPasta(guild,userId){

const canais = await guild.channels.fetch();

const pasta = canais.find(c=>{

if(!c) return false;

if(c.parentId !== CATEGORIA_ID) return false;

const perm = c.permissionOverwrites?.cache?.get(userId);

return perm ? true : false;

});

return pasta ? true : false;

}


// ================= SLASH COMMAND =================

const commands=[

new SlashCommandBuilder()
.setName('enviar-painel')
.setDescription('Enviar painel de solicitação')
.toJSON()

];

const rest=new REST({version:'10'}).setToken(TOKEN);

(async()=>{

await rest.put(
Routes.applicationGuildCommands(CLIENT_ID,GUILD_ID),
{body:commands}
);

})();


// ================= BOT ONLINE =================

client.once(Events.ClientReady,()=>{

console.log(`✅ Bot online ${client.user.tag}`);

});


// ================= INTERAÇÕES =================

client.on(Events.InteractionCreate,async interaction=>{

try{


// ================= PAINEL =================

if(interaction.isChatInputCommand()){

if(!interaction.member.roles.cache.has(STAFF_ROLE_ID)){

return interaction.reply({
content:'❌ Apenas staff.',
flags:64
});

}

const canal=interaction.guild.channels.cache.get(CANAL_PAINEL_ID);

const embed=new EmbedBuilder()
.setTitle("📋 Solicitação")
.setDescription("Clique no botão abaixo para solicitar aprovação.")
.setColor("Blue");

const row=new ActionRowBuilder().addComponents(

new ButtonBuilder()
.setCustomId("abrir_formulario")
.setLabel("Solicitar")
.setStyle(ButtonStyle.Primary)

);

await canal.send({

embeds:[embed],
components:[row]

});

return interaction.reply({

content:"✅ Painel enviado",
flags:64

});

}


// ================= ABRIR FORM =================

if(interaction.isButton() && interaction.customId==="abrir_formulario"){

const modal=new ModalBuilder()
.setCustomId("modal")
.setTitle("Solicitação");

const nome=new TextInputBuilder()
.setCustomId("nome")
.setLabel("Nome")
.setStyle(TextInputStyle.Short)
.setRequired(true);

const pombo=new TextInputBuilder()
.setCustomId("pombo")
.setLabel("Pombo")
.setStyle(TextInputStyle.Short)
.setRequired(true);

const periodo=new TextInputBuilder()
.setCustomId("periodo")
.setLabel("Período")
.setStyle(TextInputStyle.Short)
.setRequired(true);

modal.addComponents(

new ActionRowBuilder().addComponents(nome),
new ActionRowBuilder().addComponents(pombo),
new ActionRowBuilder().addComponents(periodo)

);

return interaction.showModal(modal);

}


// ================= FORM ENVIADO =================

if(interaction.isModalSubmit()){

const nome=interaction.fields.getTextInputValue("nome");
const pombo=interaction.fields.getTextInputValue("pombo");
const periodo=interaction.fields.getTextInputValue("periodo");

const nomeFormatado=nome.toLowerCase().replace(/[^a-z0-9]/g,"-");

const nomeFinal=`${nomeFormatado}-${pombo}`;

const nomeCanal=`pasta-${nomeFinal}`;

solicitacoes.set(interaction.user.id,{

nomeCanal,
nomeFinal

});

const canalStaff=interaction.guild.channels.cache.get(CANAL_STAFF_ID);

const embed=new EmbedBuilder()
.setTitle("📩 Nova solicitação")
.setColor("Yellow")
.addFields(

{name:"Nome",value:nome},
{name:"Pombo",value:pombo},
{name:"Periodo",value:periodo}

);

const row=new ActionRowBuilder().addComponents(

new ButtonBuilder()
.setCustomId(`aprovar_${interaction.user.id}`)
.setLabel("Aprovar")
.setStyle(ButtonStyle.Success),

new ButtonBuilder()
.setCustomId(`reprovar_${interaction.user.id}`)
.setLabel("Reprovar")
.setStyle(ButtonStyle.Danger)

);

await canalStaff.send({

embeds:[embed],
components:[row]

});

return interaction.reply({

content:"📨 Solicitação enviada",
flags:64

});

}


// ================= APROVAR =================

if(interaction.isButton() && interaction.customId.startsWith("aprovar_")){

const userId=interaction.customId.split("_")[1];

const member=await interaction.guild.members.fetch(userId);

const dados=solicitacoes.get(userId);


// ANTI DUPLICAÇÃO

const pastaExiste=await verificarPasta(interaction.guild,userId);

if(pastaExiste){

return interaction.reply({

content:"⚠️ Este usuário já possui uma pasta.",
flags:64

});

}


// ADD CARGOS

await member.roles.add([

ROLE_1_ID,
ROLE_2_ID,
ROLE_3_ID

]).catch(()=>{});


// NICK

await member.setNickname(dados.nomeFinal).catch(()=>{});


// CRIAR PASTA

const canal=await interaction.guild.channels.create({

name:dados.nomeCanal,

type:ChannelType.GuildText,

parent:CATEGORIA_ID,

permissionOverwrites:[

{
id:interaction.guild.id,
deny:[PermissionsBitField.Flags.ViewChannel]
},

{
id:userId,
allow:[
PermissionsBitField.Flags.ViewChannel,
PermissionsBitField.Flags.SendMessages
]
}

]

});


canal.send(`📁 Pasta criada para <@${userId}>`);

await enviarLog(

interaction.guild,
`✅ ${member.user.tag} aprovado e pasta criada`

);

solicitacoes.delete(userId);

interaction.update({

content:`✅ ${member} aprovado`,
components:[]

});

}


// ================= REPROVAR =================

if(interaction.isButton() && interaction.customId.startsWith("reprovar_")){

const userId=interaction.customId.split("_")[1];

const member=await interaction.guild.members.fetch(userId);

await member.send("❌ Sua solicitação foi reprovada").catch(()=>{});

await enviarLog(

interaction.guild,
`❌ ${member.user.tag} reprovado`

);

solicitacoes.delete(userId);

interaction.update({

content:`❌ ${member} reprovado`,
components:[]

});

}

}catch(err){

console.log(err);

}

});


client.login(TOKEN);
