const { Events, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { startTwitchPolling } = require('../services/twitch');
const { startSocialsPolling } = require('../services/socials');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`Prêt ! Connecté en tant que ${client.user.tag}`);

        // Déployer les commandes slash automatiquement
        const commands = [];
        const commandsPath = path.join(__dirname, '../commands');
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            const command = require(path.join(commandsPath, file));
            commands.push(command.data.toJSON());
        }

        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

        try {
            console.log(`Début du rafraîchissement de ${commands.length} commandes d'application (/)`);
            await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                { body: commands },
            );
            console.log(`Commandes d'application (/) rechargées avec succès.`);
        } catch (error) {
            console.error(error);
        }

        // Lancer le polling Twitch et Réseaux sociaux
        startTwitchPolling(client);
        startSocialsPolling(client);
    },
};
