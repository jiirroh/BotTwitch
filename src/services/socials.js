const Parser = require('rss-parser');
const https = require('https');
const { EmbedBuilder } = require('discord.js');
const supabase = require('../config/supabase');
require('dotenv').config();

// Parser with SSL validation disabled to allow third-party RSS instances
const parser = new Parser({
    requestOptions: {
        agent: new https.Agent({ rejectUnauthorized: false })
    }
});

/**
 * Checks for a new YouTube video and posts it to Discord.
 * @param {import('discord.js').Client} client
 */
async function checkNewYouTubeVideo(client) {
    try {
        const channelId = process.env.YOUTUBE_CHANNEL_ID;
        const discordChannelId = process.env.YOUTUBE_NOTIFICATION_CHANNEL_ID;
        if (!channelId || !discordChannelId) return;

        const feed = await parser.parseURL(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);
        if (!feed.items || feed.items.length === 0) return;

        // The first item is the most recent
        const latestVideo = feed.items[0];
        const videoId = latestVideo.id; // Usually something like "yt:video:VIDEO_ID"

        // Check if we already processed this video
        const { data: configData, error: fetchError } = await supabase
            .from('config')
            .select('value')
            .eq('key', 'last_youtube_video_id')
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            console.error('Error fetching last_youtube_video_id from Supabase:', fetchError);
            return;
        }

        const lastVideoId = configData ? configData.value : null;

        if (videoId === lastVideoId) {
            // No new video
            return;
        }

        console.log(`New YouTube video detected: ${latestVideo.title}`);

        // Update database with new video ID
        const { error: upsertError } = await supabase
            .from('config')
            .upsert({ key: 'last_youtube_video_id', value: videoId }, { onConflict: 'key' });

        if (upsertError) {
            console.error('Error updating last_youtube_video_id in Supabase:', upsertError);
        }

        // Send to Discord
        const discordChannel = await client.channels.fetch(discordChannelId).catch(() => null);
        if (!discordChannel) {
            console.error(`Could not fetch YouTube notification channel: ${discordChannelId}`);
            return;
        }

        const rolePing = process.env.YOUTUBE_ROLE_ID ? `<@&${process.env.YOUTUBE_ROLE_ID}>` : '';

        const embed = new EmbedBuilder()
            .setTitle(latestVideo.title)
            .setURL(latestVideo.link)
            .setAuthor({ name: feed.title || 'YouTube', iconURL: 'https://cdn-icons-png.flaticon.com/512/1384/1384060.png' })
            .setDescription(`Une nouvelle vidéo est disponible sur YouTube !`)
            .setColor('#FF0000')
            .setTimestamp(new Date(latestVideo.pubDate));

        await discordChannel.send({
            content: `${rolePing} Nouvelle vidéo de **${feed.title || 'Dyyuzzer'}** !`,
            embeds: [embed]
        });

    } catch (error) {
        console.error('Error in checkNewYouTubeVideo:', error.message);
    }
}

/**
 * Checks for a new TikTok video and posts it to Discord.
 * @param {import('discord.js').Client} client
 */
async function checkNewTikTokVideo(client) {
    try {
        const discordChannelId = process.env.TIKTOK_NOTIFICATION_CHANNEL_ID;
        const username = process.env.TIKTOK_USERNAME;
        if (!username || !discordChannelId) return;

        // Liste des instances ProxiTok publiques en cas de panne de l'une d'entre elles
        const fallbackInstances = [
            process.env.TIKTOK_RSS_URL, // Celle définie dans le .env en priorité
            `https://proxitok.pabloferreiro.es/@${username}/rss`,
            `https://tok.artemislena.eu/@${username}/rss`,
            `https://proxitok.kyun.li/@${username}/rss`,
            `https://proxitok.privacydev.net/@${username}/rss`
        ].filter(url => url); // Enlever les null/undefined

        let feed = null;
        for (const url of fallbackInstances) {
            try {
                feed = await parser.parseURL(url);
                if (feed && feed.items && feed.items.length > 0) {
                    break; // On a trouvé un flux valide, on sort de la boucle
                }
            } catch (err) {
                // Ignore l'erreur et essaie l'instance suivante
                continue;
            }
        }

        if (!feed || !feed.items || feed.items.length === 0) {
            return; // Aucune instance n'a fonctionné ou aucun item trouvé
        }

        // The first item is the most recent
        const latestVideo = feed.items[0];
        const videoId = latestVideo.guid || latestVideo.link; // Guid is preferred, fallback to link

        // Check if we already processed this video
        const { data: configData, error: fetchError } = await supabase
            .from('config')
            .select('value')
            .eq('key', 'last_tiktok_video_id')
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            console.error('Error fetching last_tiktok_video_id from Supabase:', fetchError);
            return;
        }

        const lastVideoId = configData ? configData.value : null;

        if (videoId === lastVideoId) {
            // No new video
            return;
        }

        console.log(`New TikTok video detected: ${latestVideo.title}`);

        // Update database with new video ID
        const { error: upsertError } = await supabase
            .from('config')
            .upsert({ key: 'last_tiktok_video_id', value: videoId }, { onConflict: 'key' });

        if (upsertError) {
            console.error('Error updating last_tiktok_video_id in Supabase:', upsertError);
        }

        // Send to Discord
        const discordChannel = await client.channels.fetch(discordChannelId).catch(() => null);
        if (!discordChannel) {
            console.error(`Could not fetch TikTok notification channel: ${discordChannelId}`);
            return;
        }

        const rolePing = process.env.TIKTOK_ROLE_ID ? `<@&${process.env.TIKTOK_ROLE_ID}>` : '';

        const embed = new EmbedBuilder()
            .setTitle('Nouveau TikTok !')
            .setURL(latestVideo.link)
            .setAuthor({ name: feed.title || 'TikTok', iconURL: 'https://cdn-icons-png.flaticon.com/512/3046/3046121.png' })
            .setDescription(latestVideo.title || 'Viens voir la nouvelle vidéo !')
            .setColor('#000000')
            .setTimestamp(new Date(latestVideo.pubDate || Date.now()));

        await discordChannel.send({
            content: `${rolePing} Nouveau TikTok de **${process.env.TIKTOK_USERNAME || 'Dyyuzzer'}** !`,
            embeds: [embed]
        });

    } catch (error) {
        console.error('Error in checkNewTikTokVideo:', error.message);
    }
}

/**
 * Démarre le polling pour YouTube et TikTok
 */
function startSocialsPolling(client) {
    console.log('Démarrage du polling pour YouTube et TikTok...');
    
    // Vérification initiale
    checkNewYouTubeVideo(client);
    checkNewTikTokVideo(client);

    // Vérification toutes les 15 minutes (900 000 ms)
    setInterval(() => checkNewYouTubeVideo(client), 15 * 60 * 1000);
    setInterval(() => checkNewTikTokVideo(client), 15 * 60 * 1000);
}

module.exports = {
    checkNewYouTubeVideo,
    checkNewTikTokVideo,
    startSocialsPolling
};
