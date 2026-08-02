# TomoTrésor 🎁

**TomoTrésor** est un compagnon web non officiel pour suivre sa collection de **trésors** dans *Tomodachi Life: Une vie de rêve* (Nintendo Switch).

Dans le jeu, les habitants de votre île reçoivent régulièrement des cadeaux dans des boîtes (Petite, Moyenne, Grande) qui peuvent contenir l'un des **247 trésors** possibles : livres, albums, émissions TV, jeux vidéo ou animaux de compagnie. Comme il n'y a aucune liste native pour savoir ce qu'il vous manque, TomoTrésor sert de checklist visuelle pour suivre votre progression vers la collection complète.

## Fonctionnalités

- ✅ **Checklist des 247 trésors**, classés par catégorie (Lecture, Disque, Programme télé, Jeu vidéo, Animal de compagnie) et par taille de boîte (Petite / Moyenne / Grande).
- 🔎 Recherche par nom et option pour masquer les trésors déjà obtenus.
- 📊 Barre de progression et statistiques pour visualiser l'avancement de la collection.
- 🎯 Indicateur de la boîte offrant la meilleure chance d'obtenir un trésor manquant.
- 🌗 Thème clair / sombre (mémorisé automatiquement).
- 💾 Sauvegarde locale automatique dans le navigateur (`localStorage`), avec export/import d'un fichier de sauvegarde et réinitialisation possible.

## Utilisation

Le site est 100% statique (HTML/CSS/JS), sans backend ni build : il suffit d'ouvrir [`index.html`](index.html) dans un navigateur, ou de servir le dossier avec n'importe quel serveur de fichiers statiques.

Votre progression est enregistrée uniquement en local dans le navigateur utilisé. Pensez à faire une sauvegarde (bouton **💾 Sauvegarde → ⬇️ Sauvegarder**) avant de vider le cache ou de changer d'appareil, puis à la réimporter si besoin.

## Structure du projet

```
index.html        Page unique de l'application
css/styles.css     Styles
js/data.js         Données des 247 trésors (id, nom, catégorie)
js/script.js       Logique de l'application
img/               Icônes et illustrations des trésors
```

## Avertissement

Projet non officiel, à usage personnel, réalisé par des fans. *Tomodachi Life* et les données associées sont © Nintendo.
