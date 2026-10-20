const { EmbedBuilder } = require('discord.js');
const supabase = require('../config/supabase');
require('dotenv').config();

const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
const TWITCH_CHANNEL_NAME = process.env.TWITCH_CHANNEL_NAME;

const CHANNEL_NAME_ONLINE = process.env.LIVE_CHANNEL_NAME_ONLINE || '🔴┆live';
const CHANNEL_NAME_OFFLINE = process.env.LIVE_CHANNEL_NAME_OFFLINE || '⚫┆offline';

let appAccessToken = null;
let isLive = null; // null au démarrage pour forcer la synchronisation initiale
let twitchUserId = null;
let cachedLiveMessageId = null;
let cachedLastVodId = null;

/**
 * Fetch a new App Access Token using Client Credentials Flow
 */
async function getAccessToken() {
    const response = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${TWITCH_CLIENT_ID}&client_secret=${TWITCH_CLIENT_SECRET}&grant_type=client_credentials`, {
        method: 'POST'
    });

    if (!response.ok) {
        throw new Error('Failed to fetch Twitch access token');
    }

    const data = await response.json();
    appAccessToken = data.access_token;
    return appAccessToken;
}

/**
 * Récupère l'ID utilisateur Twitch (nécessaire pour chercher les vidéos)
 */
async function getTwitchUserId() {
    if (twitchUserId) return twitchUserId;
    
    if (!appAccessToken) await getAccessToken();

    const response = await fetch(`https://api.twitch.tv/helix/users?login=${TWITCH_CHANNEL_NAME}`, {
        headers: {
            'Client-ID': TWITCH_CLIENT_ID,
            'Authorization': `Bearer ${appAccessToken}`
        }
    });

    if (response.ok) {
        const data = await response.json();
        if (data.data && data.data.length > 0) {
            twitchUserId = data.data[0].id;
        }
    }
    return twitchUserId;
}

/**
 * Récupère les informations de la dernière VOD Twitch
 */
async function getLatestVOD() {
    const userId = await getTwitchUserId();
    if (!userId) return null;

    try {
        const response = await fetch(`https://api.twitch.tv/helix/videos?user_id=${userId}&type=archive&first=1`, {
            headers: {
                'Client-ID': TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${appAccessToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.data && data.data.length > 0) {
                return data.data[0];
            }
        }
    } catch (error) {
        console.error("Erreur lors de la récupération de la VOD :", error);
    }
    return null;
}

/**
 * Récupère l'image de la dernière VOD (ou l'image offline par défaut)
 */
async function getOfflineThumbnail() {
    try {
        const vod = await getLatestVOD();
        if (vod && vod.thumbnail_url) {
            return vod.thumbnail_url.replace('%{width}', '1280').replace('%{height}', '720');
        }

        // Si aucune VOD trouvée, on retourne la bannière offline de l'utilisateur (s'il en a une)
        if (!appAccessToken) await getAccessToken();
        const userRes = await fetch(`https://api.twitch.tv/helix/users?login=${TWITCH_CHANNEL_NAME}`, {
            headers: {
                'Client-ID': TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${appAccessToken}`
            }
        });
        if (userRes.ok) {
            const userData = await userRes.json();
            if (userData.data && userData.data.length > 0) {
                return userData.data[0].offline_image_url || null;
            }
        }
    } catch (error) {
        console.error("Erreur lors de la récupération de la miniature offline :", error);
    }
    return null;
}

/**
 * Check if the streamer is live
 */
async function checkStreamStatus() {
    if (!appAccessToken) {
        await getAccessToken();
    }

    try {
        const response = await fetch(`https://api.twitch.tv/helix/streams?user_login=${TWITCH_CHANNEL_NAME}`, {
            headers: {
                'Client-ID': TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${appAccessToken}`
            }
        });

        if (response.status === 401) {
            await getAccessToken();
            return await checkStreamStatus();
        }

        if (!response.ok) {
            throw new Error(`Twitch API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.data && data.data.length > 0) {
            const streamInfo = data.data[0];
            return { live: true, streamInfo };
        } else {
            return { live: false, streamInfo: null };
        }

    } catch (error) {
        console.error('Error checking Twitch status:', error);
        return { live: false, streamInfo: null, error };
    }
}

/**
 * Récupère le message ID du live (depuis la mémoire, Supabase ou par recherche dans le salon)
 */
async function getLiveMessageId(channel = null, client = null) {
    if (cachedLiveMessageId) return cachedLiveMessageId;

    try {
        const { data, error } = await supabase
            .from('config')
            .select('value')
            .eq('key', 'live_message_id')
            .single();
        
        if (!error && data && data.value) {
            cachedLiveMessageId = data.value;
            return cachedLiveMessageId;
        }
    } catch (e) {}

    // Fallback : recherche automatique du dernier message posté par le bot dans le salon live
    if (channel && client) {
        try {
            const messages = await channel.messages.fetch({ limit: 10 });
            const botMessage = messages.find(m => m.author.id === client.user.id);
            if (botMessage) {
                cachedLiveMessageId = botMessage.id;
                return cachedLiveMessageId;
            }
        } catch (err) {
            console.error("Erreur fallback recherche message live:", err);
        }
    }

    return null;
}

/**
 * Génère l'embed pour l'état du Live
 */
function generateLiveEmbed(isLiveStatus, streamInfo = null, offlineImageUrl = null) {
    const embed = new EmbedBuilder();
    const cacheBuster = `?t=${Date.now()}`;

    if (isLiveStatus && streamInfo) {
        const thumbnailUrl = streamInfo.thumbnail_url.replace('{width}', '1280').replace('{height}', '720') + cacheBuster;

        embed.setColor('#9146FF')
            .setTitle(`🔴 EN LIVE : ${streamInfo.title || 'Pas de titre'}`)
            .setURL(`https://twitch.tv/${TWITCH_CHANNEL_NAME}`)
            .setAuthor({ name: streamInfo.user_name, iconURL: 'https://pngimg.com/uploads/twitch/twitch_PNG27.png' })
            .addFields(
                { name: 'Catégorie', value: streamInfo.game_name || 'Non définie', inline: true },
                { name: 'Viewers', value: streamInfo.viewer_count.toString(), inline: true }
            )
            .setImage(thumbnailUrl)
            .setFooter({ text: 'Actualisé automatiquement' })
            .setTimestamp();
    } else {
        embed.setColor('#2F3136')
            .setTitle(`⚫ OFFLINE : ${TWITCH_CHANNEL_NAME} n'est pas en direct`)
            .setURL(`https://twitch.tv/${TWITCH_CHANNEL_NAME}`)
            .setDescription(`Retrouvez la chaîne ici : https://twitch.tv/${TWITCH_CHANNEL_NAME}`)
            .setFooter({ text: 'Actualisé automatiquement' })
            .setTimestamp();
            
        if (offlineImageUrl) {
            embed.setImage(offlineImageUrl);
        }
    }
    return embed;
}

/**
 * Renomme le salon selon le statut (Live / Offline)
 */
async function updateChannelName(channel, isLiveStatus) {
    if (!channel) return;
    const targetName = isLiveStatus ? CHANNEL_NAME_ONLINE : CHANNEL_NAME_OFFLINE;
    
    if (channel.name === targetName) return;

    try {
        await channel.setName(targetName);
        console.log(`[Twitch] Salon renommé en : "${targetName}"`);
    } catch (error) {
        console.warn(`[Twitch] Impossible de renommer le salon (vérifiez les permissions "Gérer les salons" ou le rate-limit Discord) :`, error.message);
    }
}

/**
 * Met à jour le message permanent de live sur Discord
 */
async function updateLiveMessage(client, isLiveStatus, streamInfo, offlineImageUrl = null) {
    const channelId = process.env.LIVE_NOTIFICATION_CHANNEL_ID;
    if (!channelId) return false;

    try {
        const channel = await client.channels.fetch(channelId);
        if (!channel || !channel.isTextBased()) return false;

        const messageId = await getLiveMessageId(channel, client);
        if (!messageId) {
            // Si aucun message n'existe encore, on le crée automatiquement
            const embed = generateLiveEmbed(isLiveStatus, streamInfo, offlineImageUrl);
            const newMsg = await channel.send({ embeds: [embed] });
            cachedLiveMessageId = newMsg.id;
            try {
                await supabase.from('config').upsert({ key: 'live_message_id', value: newMsg.id }, { onConflict: 'key' });
            } catch (e) {}
            return true;
        }

        const message = await channel.messages.fetch(messageId);
        if (!message) return false;

        const embed = generateLiveEmbed(isLiveStatus, streamInfo, offlineImageUrl);
        await message.edit({ content: '', embeds: [embed] });
        return true;
    } catch (error) {
        if (error.code === 10008) { // Unknown Message
            cachedLiveMessageId = null;
            try {
                await supabase.from('config').delete().eq('key', 'live_message_id');
            } catch (e) {}
            // Essayer de recréer immédiatement
            return await updateLiveMessage(client, isLiveStatus, streamInfo, offlineImageUrl);
        }
        console.error("Erreur lors de la mise à jour du message de live:", error);
        return false;
    }
}

/**
 * Envoie un "ghost ping" (ping et suppression instantanée)
 */
async function sendGhostPing(client) {
    const channelId = process.env.LIVE_NOTIFICATION_CHANNEL_ID;
    const roleId = process.env.LIVE_ROLE_ID;
    
    if (!channelId) return;

    try {
        const channel = await client.channels.fetch(channelId);
        if (!channel || !channel.isTextBased()) return;

        const pingContent = roleId ? `<@&${roleId}>` : `@everyone`;
        const message = await channel.send(pingContent);
        await message.delete();
    } catch (error) {
        console.error("Erreur lors de l'envoi du ghost ping:", error);
    }
}

// ==========================================
// GESTION DES NOTIFICATIONS DE NOUVELLE VOD
// ==========================================

/**
 * Récupère l'identifiant de la dernière VOD enregistrée
 */
async function getLastRecordedVodId() {
    if (cachedLastVodId) return cachedLastVodId;

    try {
        const { data, error } = await supabase
            .from('config')
            .select('value')
            .eq('key', 'last_vod_id')
            .single();

        if (!error && data && data.value) {
            cachedLastVodId = data.value;
            return cachedLastVodId;
        }
    } catch (e) {}

    return null;
}

/**
 * Enregistre l'ID de la dernière VOD
 */
async function saveLastRecordedVodId(vodId) {
    cachedLastVodId = vodId;
    try {
        await supabase
            .from('config')
            .upsert({ key: 'last_vod_id', value: vodId }, { onConflict: 'key' });
    } catch (e) {}
}

/**
 * Envoie une notification de nouvelle VOD dans le salon dédié
 */
async function sendVodNotification(client, vod) {
    const channelId = process.env.VOD_NOTIFICATION_CHANNEL_ID;
    const roleId = process.env.VOD_ROLE_ID;

    if (!channelId) {
        console.warn("[Twitch VOD] Aucun salon VOD_NOTIFICATION_CHANNEL_ID configuré.");
        return false;
    }

    try {
        const channel = await client.channels.fetch(channelId);
        if (!channel || !channel.isTextBased()) return false;

        const thumbnailUrl = vod.thumbnail_url
            ? vod.thumbnail_url.replace('%{width}', '1280').replace('%{height}', '720')
            : null;

        const embed = new EmbedBuilder()
            .setColor('#9146FF')
            .setTitle(`🎬 ${vod.title || 'Nouvelle Rediffusion'}`)
            .setURL(vod.url)
            .setAuthor({
                name: vod.user_name || TWITCH_CHANNEL_NAME,
                iconURL: 'https://pngimg.com/uploads/twitch/twitch_PNG27.png',
                url: `https://twitch.tv/${TWITCH_CHANNEL_NAME}`
            })
            .addFields(
                { name: '⏱️ Durée', value: vod.duration || 'Inconnue', inline: true },
                { name: '👁️ Vues', value: `${vod.view_count || 0}`, inline: true }
            )
            .setFooter({ text: 'Rediffusion Twitch disponible' });

        if (vod.created_at) {
            const timestamp = Math.floor(new Date(vod.created_at).getTime() / 1000);
            embed.addFields({ name: '📅 Date', value: `<t:${timestamp}:f>`, inline: true });
            embed.setTimestamp(new Date(vod.created_at));
        }

        if (thumbnailUrl) {
            embed.setImage(thumbnailUrl);
        }

        const pingContent = roleId ? `<@&${roleId}>` : `@everyone`;

        await channel.send({
            content: `${pingContent} 🎬 **Une nouvelle rediffusion est disponible sur Twitch !**\n👉 ${vod.url}`,
            embeds: [embed]
        });

        console.log(`[Twitch VOD] Notification envoyée pour la VOD : ${vod.title} (${vod.id})`);
        return true;
    } catch (error) {
        console.error("[Twitch VOD] Erreur lors de l'envoi de la notification VOD:", error);
        return false;
    }
}

/**
 * Vérifie si une nouvelle VOD est parue
 */
async function checkNewVOD(client) {
    if (!process.env.VOD_NOTIFICATION_CHANNEL_ID) return;

    const latestVod = await getLatestVOD();
    if (!latestVod || !latestVod.id) return;

    const lastRecordedId = await getLastRecordedVodId();

    // Lors du tout premier lancement, on mémorise la dernière VOD pour éviter de spammer une ancienne vidéo
    if (lastRecordedId === null) {
        console.log(`[Twitch VOD] Initialisation de la dernière VOD connue : ${latestVod.id}`);
        await saveLastRecordedVodId(latestVod.id);
        return;
    }

    // Si une nouvelle VOD avec un ID différent apparaît
    if (latestVod.id !== lastRecordedId) {
        console.log(`[Twitch VOD] 🚨 Nouvelle VOD détectée ! ID: ${latestVod.id}`);
        const sent = await sendVodNotification(client, latestVod);
        if (sent) {
            await saveLastRecordedVodId(latestVod.id);
        }
    }
}

/**
 * Polling function to start checking stream status regularly
 */
function startTwitchPolling(client) {
    const intervalMs = 3 * 60 * 1000; // 3 minutes

    setTimeout(async () => {
        await poll(client);
        
        setInterval(async () => {
            await poll(client);
        }, intervalMs);
    }, 3000);

    console.log("Twitch polling started.");
}

async function poll(client) {
    if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET || !TWITCH_CHANNEL_NAME) {
        console.warn("Twitch credentials not fully configured. Skipping poll.");
        return;
    }

    const channelId = process.env.LIVE_NOTIFICATION_CHANNEL_ID;
    let liveChannel = null;
    if (channelId) {
        try {
            liveChannel = await client.channels.fetch(channelId);
        } catch (e) {}
    }

    const status = await checkStreamStatus();
    if (status.error) return;

    let offlineImageUrl = null;
    if (!status.live) {
        offlineImageUrl = await getOfflineThumbnail();
    }

    // Toujours mettre à jour le message permanent
    await updateLiveMessage(client, status.live, status.streamInfo, offlineImageUrl);

    // Gestion du changement d'état (Offline <-> Live)
    if (status.live && isLive !== true) {
        // Passage en Live
        isLive = true;
        await sendGhostPing(client);
        if (liveChannel) await updateChannelName(liveChannel, true);
    } else if (!status.live && isLive !== false) {
        // Passage Hors Ligne (ou première initialisation)
        isLive = false;
        if (liveChannel) await updateChannelName(liveChannel, false);
    }

    // Vérifier les nouvelles VODs
    await checkNewVOD(client);
}

module.exports = {
    startTwitchPolling,
    checkStreamStatus,
    generateLiveEmbed,
    getOfflineThumbnail,
    getLatestVOD,
    updateLiveMessage,
    sendGhostPing,
    updateChannelName,
    sendVodNotification,
    checkNewVOD
};
