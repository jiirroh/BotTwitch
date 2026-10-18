require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const express = require('express');

// ==========================================
// 1. Initialisation du serveur Express (Healthcheck)
// ==========================================
const app = express();
const port = process.env.PORT || 3000;

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});
app.get('/', (req, res) => {
    res.status(200).send('Bot Discord en cours d\'exécution.');
});

app.listen(port, () => {
    console.log(`Serveur Express en écoute sur le port ${port} (Healthcheck)`);
});


// ==========================================
// 2. Initialisation du bot Discord
// ==========================================
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
    ] 
});

client.commands = new Collection();

// Chargement des commandes
const commandsPath = path.join(__dirname, 'commands');
if (!fs.existsSync(commandsPath)) {
    fs.mkdirSync(commandsPath, { recursive: true });
}
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    } else {
        console.warn(`[WARNING] La commande au chemin ${file} manque une propriété "data" ou "execute" requise.`);
    }
}

// Chargement des événements
const eventsPath = path.join(__dirname, 'events');
if (!fs.existsSync(eventsPath)) {
    fs.mkdirSync(eventsPath, { recursive: true });
}
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const event = require(path.join(eventsPath, file));
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
}

client.login(process.env.DISCORD_TOKEN);
