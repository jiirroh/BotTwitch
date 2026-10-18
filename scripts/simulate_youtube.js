require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
    console.log('Simulating YouTube notification...');

    const discordChannelId = process.env.YOUTUBE_NOTIFICATION_CHANNEL_ID;
    const discordChannel = await client.channels.fetch(discordChannelId).catch(() => null);
    
    if (!discordChannel) {
        console.error(`Could not fetch YouTube notification channel: ${discordChannelId}`);
        process.exit(1);
    }

    const rolePing = process.env.YOUTUBE_ROLE_ID ? `<@&${process.env.YOUTUBE_ROLE_ID}>` : '';

    const embed = new EmbedBuilder()
        .setTitle('TEST : Super Vidéo YouTube !')
        .setURL('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
        .setAuthor({ name: 'YouTube', iconURL: 'https://cdn-icons-png.flaticon.com/512/1384/1384060.png' })
        .setDescription(`Une nouvelle vidéo est disponible sur YouTube !`)
        .setColor('#FF0000')
        .setTimestamp(new Date());

    await discordChannel.send({
        content: `${rolePing} Nouvelle vidéo de **TEST** !`,
        embeds: [embed]
    });

    console.log('YouTube notification simulated successfully.');
    process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
