const { Events, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { DAYS, updateScheduleDay, updatePublicScheduleMessage } = require('../services/schedule');
const { hasAdminPermission } = require('../utils/permissions');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (interaction.isChatInputCommand()) {
            // Exécution des commandes slash
            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) return;
            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(`Erreur lors de l'exécution de la commande ${interaction.commandName}:`, error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: 'Une erreur est survenue !', ephemeral: true });
                } else {
                    await interaction.reply({ content: 'Une erreur est survenue !', ephemeral: true });
                }
            }
        } 
        else if (interaction.isStringSelectMenu()) {
            if (interaction.customId === 'schedule_select') {
                // Vérification de la permission pour ouvrir le menu d'édition
                if (!hasAdminPermission(interaction.member)) {
                    return interaction.reply({
                        content: '❌ Vous n\'avez pas la permission de modifier le planning. Vous devez être Administrateur ou avoir le rôle autorisé.',
                        ephemeral: true
                    });
                }

                const selectedDayId = interaction.values[0];
                const dayInfo = DAYS.find(d => d.id === selectedDayId);

                if (!dayInfo) return interaction.reply({ content: 'Jour invalide.', ephemeral: true });

                // Ouvrir le modal
                const modal = new ModalBuilder()
                    .setCustomId(`schedule_modal_${selectedDayId}`)
                    .setTitle(`Planning: ${dayInfo.label}`);

                const titleInput = new TextInputBuilder()
                    .setCustomId('title')
                    .setLabel("Titre du live (ex: Soirée Minecraft, OFF)")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const timeInput = new TextInputBuilder()
                    .setCustomId('startTime')
                    .setLabel("Heure (ex: 20:00, -)")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const imageInput = new TextInputBuilder()
                    .setCustomId('imageUrl')
                    .setLabel("URL de l'image (optionnel)")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(titleInput),
                    new ActionRowBuilder().addComponents(timeInput),
                    new ActionRowBuilder().addComponents(imageInput)
                );

                await interaction.showModal(modal);
            }
        }
        else if (interaction.isModalSubmit()) {
            if (interaction.customId.startsWith('schedule_modal_')) {
                // Vérification de la permission pour soumettre les modifications
                if (!hasAdminPermission(interaction.member)) {
                    return interaction.reply({
                        content: '❌ Vous n\'avez pas la permission de modifier le planning. Vous devez être Administrateur ou avoir le rôle autorisé.',
                        ephemeral: true
                    });
                }

                const dayId = interaction.customId.replace('schedule_modal_', '');
                
                const title = interaction.fields.getTextInputValue('title');
                const startTime = interaction.fields.getTextInputValue('startTime');
                const imageUrl = interaction.fields.getTextInputValue('imageUrl');

                await interaction.deferReply({ ephemeral: true });

                try {
                    // Mettre à jour Supabase
                    await updateScheduleDay(dayId, title, startTime, imageUrl);
                    
                    // Mettre à jour l'embed public
                    const success = await updatePublicScheduleMessage(interaction.client);
                    
                    if (success) {
                        await interaction.editReply({ content: `✅ Le planning du jour a été mis à jour avec succès !` });
                    } else {
                        await interaction.editReply({ content: `⚠️ Base de données mise à jour, mais impossible de modifier le message public sur Discord.` });
                    }
                } catch (error) {
                    console.error("Erreur ModalSubmit:", error);
                    await interaction.editReply({ content: `❌ Une erreur est survenue lors de la mise à jour.` });
                }
            }
        }
    },
};
