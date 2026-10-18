const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const supabase = require('../config/supabase');

const DAYS = [
    { id: 'monday', label: 'Lundi' },
    { id: 'tuesday', label: 'Mardi' },
    { id: 'wednesday', label: 'Mercredi' },
    { id: 'thursday', label: 'Jeudi' },
    { id: 'friday', label: 'Vendredi' },
    { id: 'saturday', label: 'Samedi' },
    { id: 'sunday', label: 'Dimanche' }
];

let cachedPublicScheduleMessageId = null;

/**
 * Récupère le message ID du planning public depuis la BD ou par recherche dans le salon
 */
async function getPublicScheduleMessageId(channel = null, client = null) {
    if (cachedPublicScheduleMessageId) return cachedPublicScheduleMessageId;

    try {
        const { data, error } = await supabase
            .from('config')
            .select('value')
            .eq('key', 'public_schedule_message_id')
            .single();
        
        if (!error && data && data.value) {
            cachedPublicScheduleMessageId = data.value;
            return cachedPublicScheduleMessageId;
        }
    } catch (e) {}

    // Fallback: recherche automatique du message du bot dans le salon public
    if (channel && client) {
        try {
            const messages = await channel.messages.fetch({ limit: 10 });
            const botMessage = messages.find(m => m.author.id === client.user.id);
            if (botMessage) {
                cachedPublicScheduleMessageId = botMessage.id;
                return cachedPublicScheduleMessageId;
            }
        } catch (err) {
            console.error("Erreur fallback recherche planning public:", err);
        }
    }

    return null;
}

/**
 * Sauvegarde le message ID du planning public dans la BD
 */
async function setPublicScheduleMessageId(messageId) {
    cachedPublicScheduleMessageId = messageId;
    try {
        await supabase
            .from('config')
            .upsert({ key: 'public_schedule_message_id', value: messageId }, { onConflict: 'key' });
    } catch (e) {}
}

/**
 * Génère l'embed du planning public à partir des données Supabase
 */
async function generatePublicScheduleEmbed() {
    let scheduleData = [];
    try {
        const { data, error } = await supabase
            .from('schedule')
            .select('*');
        if (!error && data) {
            scheduleData = data;
        }
    } catch (err) {
        console.error("Erreur Supabase planning:", err);
    }

    const embed = new EmbedBuilder()
        .setTitle('📅 Planning de la Semaine')
        .setColor('#2F3136')
        .setDescription('Voici le programme des streams pour cette semaine !')
        .setTimestamp();

    let imageToDisplay = null;

    for (const day of DAYS) {
        const dayRecord = scheduleData.find(d => d.day_id === day.id);
        const title = dayRecord && dayRecord.title ? dayRecord.title : 'OFF';
        const startTime = dayRecord && dayRecord.start_time ? dayRecord.start_time : '-';
        
        embed.addFields({
            name: `${day.label}`,
            value: `**${title}**\n🕒 ${startTime}`,
            inline: false
        });

        if (dayRecord && dayRecord.image_url && !imageToDisplay && dayRecord.image_url.startsWith('http')) {
            imageToDisplay = dayRecord.image_url;
        }
    }

    if (imageToDisplay) {
        embed.setImage(imageToDisplay);
    }

    return embed;
}

/**
 * Met à jour le message public sur Discord
 */
async function updatePublicScheduleMessage(client) {
    const channelId = process.env.PLANNING_PUBLIC_CHANNEL_ID;
    if (!channelId) return false;

    try {
        const channel = await client.channels.fetch(channelId);
        if (!channel || !channel.isTextBased()) return false;

        const messageId = await getPublicScheduleMessageId(channel, client);
        if (!messageId) {
            const embed = await generatePublicScheduleEmbed();
            const newMsg = await channel.send({ embeds: [embed] });
            cachedPublicScheduleMessageId = newMsg.id;
            try {
                await setPublicScheduleMessageId(newMsg.id);
            } catch (e) {}
            return true;
        }

        const message = await channel.messages.fetch(messageId);
        if (!message) return false;

        const embed = await generatePublicScheduleEmbed();
        await message.edit({ embeds: [embed] });
        return true;
    } catch (error) {
        console.error("Erreur lors de la mise à jour du message public:", error);
        return false;
    }
}

/**
 * Met à jour un jour dans la base de données
 */
async function updateScheduleDay(dayId, title, startTime, imageUrl) {
    const { error } = await supabase
        .from('schedule')
        .upsert({
            day_id: dayId,
            title: title || 'OFF',
            start_time: startTime || '-',
            image_url: imageUrl || null,
            updated_at: new Date().toISOString()
        }, { onConflict: 'day_id' });

    if (error) {
        console.error("Erreur lors de la mise à jour du jour:", error);
        throw error;
    }
}

/**
 * Génère le composant SelectMenu pour l'administration
 */
function generateAdminSelectMenu() {
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('schedule_select')
        .setPlaceholder('Sélectionnez un jour à modifier...')
        .addOptions(
            DAYS.map(day => ({
                label: day.label,
                description: `Modifier le planning du ${day.label}`,
                value: day.id,
            }))
        );

    return new ActionRowBuilder().addComponents(selectMenu);
}

module.exports = {
    DAYS,
    generatePublicScheduleEmbed,
    updatePublicScheduleMessage,
    updateScheduleDay,
    generateAdminSelectMenu,
    getPublicScheduleMessageId,
    setPublicScheduleMessageId
};
