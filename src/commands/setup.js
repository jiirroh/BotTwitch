const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { generateAdminSelectMenu, generatePublicScheduleEmbed, setPublicScheduleMessageId } = require('../services/schedule');
const { generateLiveEmbed, getOfflineThumbnail } = require('../services/twitch');
const { hasAdminPermission } = require('../utils/permissions');
const supabase = require('../config/supabase');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Initialise les panneaux d\'administration, le planning public et le panel live.'),
    
    async execute(interaction) {
        // Vérification des permissions (Administrateur ou Rôle défini dans le .env)
        if (!hasAdminPermission(interaction.member)) {
            return interaction.reply({
                content: '❌ Vous n\'avez pas la permission d\'exécuter cette commande. Vous devez être Administrateur ou posséder le rôle configuré.',
                ephemeral: true
            });
        }

        const adminChannel = interaction.channel;
        const publicChannelId = process.env.PLANNING_PUBLIC_CHANNEL_ID;
        const liveChannelId = process.env.LIVE_NOTIFICATION_CHANNEL_ID;

        if (!publicChannelId || !liveChannelId) {
            return interaction.reply({ 
                content: '❌ Les IDs des salons publics ou live ne sont pas configurés dans le fichier .env.', 
                ephemeral: true 
            });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            // 1. Gérer le salon PLANNING PUBLIC
            const publicChannel = await interaction.client.channels.fetch(publicChannelId);
            if (publicChannel && publicChannel.isTextBased()) {
                const publicEmbed = await generatePublicScheduleEmbed();
                const publicMessage = await publicChannel.send({ embeds: [publicEmbed] });
                await setPublicScheduleMessageId(publicMessage.id);
            }

            // 2. Gérer le salon LIVE NOTIFICATION (Message permanent)
            const liveChannel = await interaction.client.channels.fetch(liveChannelId);
            if (liveChannel && liveChannel.isTextBased()) {
                const offlineImg = await getOfflineThumbnail();
                const liveEmbed = generateLiveEmbed(false, null, offlineImg); // Par défaut Offline avec miniature VOD
                const liveMessage = await liveChannel.send({ embeds: [liveEmbed] });
                
                // Sauvegarder l'ID du message live
                await supabase.from('config').upsert({ key: 'live_message_id', value: liveMessage.id }, { onConflict: 'key' });
            }

            // 3. Gérer le salon ADMIN (où la commande est lancée)
            const adminEmbed = new EmbedBuilder()
                .setTitle('⚙️ Panneau d\'Administration du Planning')
                .setDescription('Sélectionnez un jour dans le menu ci-dessous pour modifier son programme.\nLe planning public sera mis à jour automatiquement.')
                .setColor('#2B2D31');

            const selectMenuRow = generateAdminSelectMenu();
            await adminChannel.send({ embeds: [adminEmbed], components: [selectMenuRow] });

            await interaction.editReply({ content: '✅ Initialisation terminée avec succès ! Le message planning et le message live ont été créés.' });

        } catch (error) {
            console.error("Erreur lors du setup:", error);
            await interaction.editReply({ content: `❌ Une erreur est survenue lors de l'initialisation : ${error.message}` });
        }
    },
};
