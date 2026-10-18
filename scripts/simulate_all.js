const { execSync } = require('child_process');

const scripts = [
    { name: 'Twitch - Live', command: 'npm run test:live' },
    { name: 'Twitch - Offline', command: 'npm run test:offline' },
    { name: 'Twitch - VOD', command: 'npm run test:vod' },
    { name: 'YouTube - Nouvelle vidéo', command: 'npm run test:youtube' },
    { name: 'TikTok - Nouveau TikTok', command: 'npm run test:tiktok' }
];

console.log('🚀 Démarrage de la simulation globale...\n');

for (const script of scripts) {
    console.log(`⏳ Exécution de : ${script.name}...`);
    try {
        // Exécute le script de manière synchrone, hérite de l'affichage standard
        execSync(script.command, { stdio: 'inherit' });
        console.log(`✅ Succès : ${script.name}\n`);
    } catch (error) {
        console.error(`❌ Échec : ${script.name}`);
        console.error(error.message);
        console.log('\n');
    }
    
    // Petite pause de 2 secondes entre chaque test pour ne pas spammer brutalement l'API Discord
    const waitTime = 2000;
    const start = Date.now();
    while (Date.now() - start < waitTime) {
        // Active wait (blocking) to simulate a real pause in synchronous flow
    }
}

console.log('🎉 Tous les tests ont été exécutés !');
