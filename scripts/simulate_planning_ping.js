require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { sendPlanningGhostPing } = require('../src/services/schedule');

async function runDemo() {
    console.log("Connexion du bot pour la simulation de ghost ping planning...");
    
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages
        ]
    });

    await client.login(process.env.DISCORD_TOKEN);
    console.log("Connecté ! Envoi du Ghost Ping dans le salon planning...");

    const success = await sendPlanningGhostPing(client);
    if (success) {
        console.log("✅ Ghost Ping planning envoyé et supprimé instantanément !");
    } else {
        console.error("❌ Échec de l'envoi du Ghost Ping planning. Vérifiez vos variables d'environnement.");
    }

    setTimeout(() => {
        client.destroy();
        process.exit(0);
    }, 1000);
}

runDemo().catch(err => {
    console.error("Erreur:", err);
    process.exit(1);
});
