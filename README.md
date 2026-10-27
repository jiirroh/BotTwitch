# Bot Discord Twitch & Planning 

Ce projet est un bot Discord conçu pour gérer l'interaction communautaire avec Twitch et un planning interactif. Il intègre deux fonctionnalités principales :
- **Un planning interactif permanent** synchronisé avec une base de données (Supabase) modifiable par les modérateurs.
- **Des alertes automatisées et intelligentes** pour Twitch, YouTube et TikTok (Changement de nom de salon dynamique, envois d'Embeds propres, et Ghost pings).

## 🔑 Configuration des Clés API (Hébergement)

Pour que le bot puisse fonctionner sur votre serveur, il nécessite plusieurs informations indispensables. Ces clés doivent être renseignées dans les variables d'environnement de votre hébergeur, ou dans le fichier `.env` à la racine du projet :

- `DISCORD_TOKEN` : Le Token secret de votre bot. Il s'obtient sur la page "Bot" du [Discord Developer Portal](https://discord.com/developers/applications). *(Important : Veillez à bien cocher les "Privileged Gateway Intents" sur cette même page).*
- `CLIENT_ID` : L'identifiant public de votre application Discord (Trouvable sur la page "General Information").
- `GUILD_ID` : L'identifiant (ID) de votre serveur Discord.
- `SUPABASE_URL` et `SUPABASE_KEY` : Vos identifiants de base de données [Supabase](https://supabase.com/).
- `TWITCH_CLIENT_ID` et `TWITCH_CLIENT_SECRET` : Vos clés développeur [Twitch](https://dev.twitch.tv/console).
- `TWITCH_CHANNEL_NAME`, `YOUTUBE_CHANNEL_ID`, `TIKTOK_USERNAME` : Les créateurs à surveiller sur les réseaux sociaux.

*(Des identifiants de salons et de rôles spécifiques doivent également être configurés. Référez-vous au fichier `.env.example` pour la liste complète et le format attendu).*

## ⚙️ Configuration Initiale sur Discord

Une fois le bot invité et en ligne sur votre serveur (assurez-vous qu'il possède la permission **"Gérer les salons"**), tapez la commande suivante :
**/setup**

Cela va initialiser les différents modules du bot et envoyer automatiquement :
- **Le panneau d'administration du planning** (Menu déroulant pour éditer le calendrier + Bouton de Ghost Ping) dans votre salon d'administration.
- **L'affichage du planning public** dans le salon communautaire.
- **Le panneau de statut Live permanent** (qui change d'état lors du lancement du stream) dans le salon Twitch.

*(Note : Seuls les membres ayant la permission "Administrateur" ou le rôle défini dans `ADMIN_ROLE_ID` peuvent utiliser cette commande).*

---

## 🛠️ Commandes et Outils disponibles

Le bot inclut des scripts de test (utilisables dans le terminal) pour vous permettre de vérifier l'apparence des notifications sans avoir à attendre une vraie publication.

### Tests Twitch
- `npm run test:live` : Simule un passage en LIVE (Renomme le salon en `🔴・live`, met à jour l'Embed permanent, et envoie un Ghost Ping).
- `npm run test:offline` : Simule la fin du live (Renomme le salon en `⚫・offline` et modifie l'Embed).
- `npm run test:vod` : Simule la publication d'une rediffusion VOD.

### Tests Réseaux Sociaux
- `npm run test:youtube` : Simule une alerte de nouvelle vidéo YouTube.
- `npm run test:tiktok` : Simule une alerte de nouveau TikTok.
- `npm run test:all` : Exécute tous les tests de notification ci-dessus à la suite, avec une petite pause entre chaque pour vérifier le bon fonctionnement global.

### Lancement
- `npm start` : Démarre le bot Discord et le serveur Web de santé (Healthcheck).
