require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
    console.log('Simulating TikTok notification...');

    const discordChannelId = process.env.TIKTOK_NOTIFICATION_CHANNEL_ID;
    const discordChannel = await client.channels.fetch(discordChannelId).catch(() => null);
    
    if (!discordChannel) {
        console.error(`Could not fetch TikTok notification channel: ${discordChannelId}`);
        process.exit(1);
    }

    const rolePing = process.env.TIKTOK_ROLE_ID ? `<@&${process.env.TIKTOK_ROLE_ID}>` : '';

    const embed = new EmbedBuilder()
        .setTitle('Nouveau TikTok !')
        .setURL('https://www.tiktok.com/@tiktok/video/123456789')
        .setAuthor({ name: 'TikTok', iconURL: 'https://cdn-icons-png.flaticon.com/512/3046/3046121.png' })
        .setDescription('TEST : Viens voir la nouvelle vidéo !')
        .setColor('#000000')
        .setTimestamp(new Date());

    await discordChannel.send({
        content: `${rolePing} Nouveau TikTok de **TEST** !`,
        embeds: [embed]
    });

    console.log('TikTok notification simulated successfully.');
    process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
