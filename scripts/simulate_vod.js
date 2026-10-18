require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { getLatestVOD, sendVodNotification } = require('../src/services/twitch');

async function runVodSimulation() {
    console.log("Connexion du bot pour la simulation d'alerte VOD...");

    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages
        ]
    });

    await client.login(process.env.DISCORD_TOKEN);

    console.log("Connecté ! Récupération de la dernière VOD réelle sur Twitch...");

    let vod = await getLatestVOD();

    if (!vod) {
        console.log("Aucune VOD trouvée sur l'API Twitch, création d'une VOD factice pour le test...");
        vod = {
            id: "demo_vod_123456",
            title: "🎬 [DÉMO] Rediffusion - Soirée Découverte & Best Moments !",
            url: `https://twitch.tv/${process.env.TWITCH_CHANNEL_NAME || 'twitch'}`,
            user_name: process.env.TWITCH_CHANNEL_NAME || "Dyyuzzer__",
            duration: "2h 45m 18s",
            view_count: 85,
            created_at: new Date().toISOString(),
            thumbnail_url: "https://static-cdn.jtvnw.net/ttv-static/404_preview-%{width}x%{height}.jpg"
        };
    }

    console.log(`Envoi de la notification VOD dans le salon ${process.env.VOD_NOTIFICATION_CHANNEL_ID}...`);
    const sent = await sendVodNotification(client, vod);

    if (sent) {
        console.log("✅ Notification VOD envoyée avec succès sur Discord !");
    } else {
        console.error("❌ Échec de l'envoi de la notification VOD.");
    }

    process.exit(0);
}

runVodSimulation().catch(err => {
    console.error("Erreur lors de la simulation VOD :", err);
    process.exit(1);
});
