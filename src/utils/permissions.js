const { PermissionsBitField } = require('discord.js');

/**
 * Vérifie si un membre a la permission d'administrer le bot (Admin Discord OU Rôle configuré dans le .env)
 * @param {import('discord.js').GuildMember} member 
 * @returns {boolean}
 */
function hasAdminPermission(member) {
    if (!member) return false;

    // 1. Vérification si l'utilisateur a la permission Administrateur sur Discord
    if (member.permissions && member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return true;
    }

    // 2. Vérification si l'utilisateur possède le rôle défini dans le .env
    const adminRoleId = process.env.ADMIN_ROLE_ID;
    if (adminRoleId && member.roles && member.roles.cache && member.roles.cache.has(adminRoleId)) {
        return true;
    }

    return false;
}

module.exports = {
    hasAdminPermission
};
