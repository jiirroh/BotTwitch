require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { updateLiveMessage, sendGhostPing, getOfflineThumbnail, updateChannelName } = require('../src/services/twitch');

async function runDemo() {
    console.log("Connexion du bot pour la simulation de live...");
    
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages
        ]
    });

    await client.login(process.env.DISCORD_TOKEN);

    console.log("Connecté ! Préparation de la simulation de live...");

    const liveChannelId = process.env.LIVE_NOTIFICATION_CHANNEL_ID;
    let channel = null;
    if (liveChannelId) {
        try {
            channel = await client.channels.fetch(liveChannelId);
        } catch (e) {}
    }

    // Récupérer une image de miniature (VOD ou placeholder de stream)
    const offlineImg = await getOfflineThumbnail();
    const demoThumbnail = offlineImg || 'https://static-cdn.jtvnw.net/ttv-static/404_preview-{width}x{height}.jpg';

    const fakeStreamInfo = {
        title: "🔴 [DÉMO] Session Live & Chill | On teste les fonctionnalités du bot !",
        user_name: process.env.TWITCH_CHANNEL_NAME || "Dyyuzzer__",
        game_name: "Just Chatting",
        viewer_count: 128,
        thumbnail_url: demoThumbnail
    };

    console.log("1. Mise à jour du message Discord en mode LIVE...");
    const updated = await updateLiveMessage(client, true, fakeStreamInfo);

    if (updated) {
        console.log("✅ Message permanent mis à jour en mode LIVE sur Discord !");
    } else {
        console.error("❌ Impossible de trouver ou mettre à jour le message live.");
    }

    console.log("2. Renommage du salon en direct...");
    if (channel) {
        await updateChannelName(channel, true);
    }

    console.log("3. Envoi du Ghost Ping...");
    await sendGhostPing(client);
    console.log("✅ Ghost Ping envoyé et supprimé instantanément !");

    console.log("\nSimulation terminée avec succès !");
    process.exit(0);
}

runDemo().catch(err => {
    console.error("Erreur lors de la simulation:", err);
    process.exit(1);
});
