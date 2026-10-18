require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { updateLiveMessage, getOfflineThumbnail, updateChannelName } = require('../src/services/twitch');

async function resetToOffline() {
    console.log("Connexion du bot pour restaurer l'état hors ligne...");
    
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages
        ]
    });

    await client.login(process.env.DISCORD_TOKEN);

    console.log("Connecté ! Récupération de la miniature hors ligne...");
    const offlineImg = await getOfflineThumbnail();

    const liveChannelId = process.env.LIVE_NOTIFICATION_CHANNEL_ID;
    let channel = null;
    if (liveChannelId) {
        try {
            channel = await client.channels.fetch(liveChannelId);
        } catch (e) {}
    }

    console.log("1. Mise à jour du message Discord en mode OFFLINE...");
    const updated = await updateLiveMessage(client, false, null, offlineImg);

    if (updated) {
        console.log("✅ Message permanent restauré en mode OFFLINE !");
    } else {
        console.error("❌ Impossible de trouver ou mettre à jour le message.");
    }

    console.log("2. Renommage du salon en mode offline...");
    if (channel) {
        await updateChannelName(channel, false);
    }

    process.exit(0);
}

resetToOffline().catch(err => {
    console.error("Erreur :", err);
    process.exit(1);
});
