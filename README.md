# VideoForge AI

Studio local en français pour préparer des vidéos courtes. Cette première tranche comprend l’interface d’édition, l’aperçu d’une scène, la gestion des scènes, la validation des projets côté serveur, leur sauvegarde dans `data/projects.json`, et une création de projets en série sans appels IA.

## Démarrage local (Windows / VS Code)

Le dépôt contient un squelette Next.js 16 et une installation initiale incomplète de dépendances. Depuis le terminal VS Code, avec Node.js 20.9 ou plus récent :

```powershell
npm install
npm run dev
```

Ouvrir http://localhost:3000. Pour créer une version de production : `npm run build`, puis `npm start`.

## Générer et télécharger un MP4

Dans deux terminaux VS Code, démarrez l’application puis le worker Remotion :

```powershell
npm run dev
npm run worker
```

Dans l’éditeur, enregistrez ou modifiez un projet et cliquez sur **Générer la vidéo**. La tâche apparaît dans **Rendus**; l’écran se met à jour pendant le traitement et propose le téléchargement du MP4 à la fin. Le worker doit rester ouvert pendant toute la durée du rendu. Il utilise Chromium et FFmpeg fournis par les dépendances Remotion. Pour ouvrir l’interface Remotion de développement, lancez `npm run remotion:studio`.

La file locale stocke ses tâches et ses sorties dans `storage/renders`. `RENDER_CONCURRENCY` règle le nombre de rendus simultanés (1 par défaut, maximum 4) et `RENDER_FRAME_CONCURRENCY` règle la concurrence d’encodage par rendu. Cette file sur disque est destinée au développement sur une seule machine; Redis/BullMQ et un worker dédié restent nécessaires pour une file distribuée en production.

Le proxy réseau de l’environnement de développement peut bloquer npm. Dans ce cas, exécutez ces commandes depuis un réseau autorisant `https://registry.npmjs.org/`. Les versions utilisées sont inscrites dans `package.json`.

Les dépendances de base de données, de rendu et de tâches asynchrones sont installées : Prisma 6, Remotion 4.0.529, BullMQ 6, Vitest 4 et Playwright 1. Les paquets Remotion sont verrouillés à la même version; Zod est aligné sur la version requise par Remotion. La génération du client Prisma, les scénarios de rendu et les tests restent à configurer avec leurs fichiers respectifs.

## Fonctionnalités présentes

- Éditeur sombre responsive avec scène active, aperçu de composition, durée totale et timeline.
- Ajout, édition, duplication, suppression et déplacement des scènes.
- Édition du titre, du sujet, de la durée cible, du texte de narration, de la légende, de la durée de scène et de la couleur de fond.
- Formats 9:16, 16:9 et 1:1.
- Sauvegarde et liste des projets via l’API Next.js et validation Zod.
- Création en série d’un projet par sujet, sans appel IA automatique.

Les images JPG/PNG/WebP et vidéos MP4/WebM peuvent être téléversées (25 Mo maximum) dans le stockage local `storage/media`; elles sont servies par une route dédiée et liées à une scène. Le rendu MP4 Remotion fonctionne dans un processus worker local. Prisma/PostgreSQL, Redis, l’authentification et la narration audio ne sont pas encore intégrés.

## Stockage et sécurité

Les données de projet sont conservées en clair dans `data/projects.json`; cette version est destinée au développement local avec un seul utilisateur. N’exposez pas le serveur publiquement. Avant tout déploiement, ajoutez authentification, autorisation par projet, limitation de débit et stockage dédié. Les médias téléversés sont stockés sur le disque local et ne doivent pas être exposés publiquement sans authentification ni contrôle d’accès.

## Prochaines étapes

1. Configurer Prisma avec PostgreSQL et ajouter les modèles Project, Scene, MediaAsset et RenderJob.
2. Créer une composition Remotion et produire puis vérifier un MP4 local avant d’activer le bouton d’export.
3. Déplacer les rendus vers un worker dédié; Redis/BullMQ et stockage objet conviennent à une architecture de production.

Un rendu vidéo lourd ne doit pas être exécuté dans une route serverless : utilisez un worker Node avec Chromium/FFmpeg et un stockage objet. Aucun script `worker`, test Vitest, test Playwright ni commande `render:test` n’est déclaré tant qu’il n’existe pas.
