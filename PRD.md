# PRD - Playdeck

Playdeck est une plateforme web moderne permettant de créer, gérer et jouer à des jeux de cartes personnalisés en multijoueur. L'application permet aux créateurs de transformer leurs propres visuels en decks jouables en quelques clics.

## 1. Vision du Produit

Offrir une expérience fluide et instantanée pour passer de la création d'un deck à une partie multijoueur. Playdeck se veut être l'outil de référence pour les créateurs de prototypes de jeux de cartes et les joueurs souhaitant jouer avec leurs propres designs sans contraintes techniques complexes.

## 2. Objectifs Stratégiques

- **Simplicité d'utilisation** : Upload groupé de cartes et création de deck immédiate.
- **Accessibilité** : Jouer sans compte obligatoire (système d'invités).
- **Temps Réel** : Une expérience de jeu fluide sans rafraîchissement de page.
- **Réactivité** : Une interface moderne et rapide (Next.js 15, Supabase).

## 3. Cible et Personas

### 🚀 Le Créateur (Game Designer)
- **Besoin** : Tester rapidement ses mécaniques de jeu avec ses propres visuels.
- **Attente** : Un outil d'upload simple et une gestion de deck efficace.

### 🎮 Le Joueur Occasionnel
- **Besoin** : Rejoindre ses amis pour une partie sans friction.
- **Attente** : Ne pas avoir à créer de compte, interface intuitive.

## 4. Spécifications Fonctionnelles

### 4.1. Gestion des Decks (MVP)
- **Authentification** : Inscription et connexion via Email/Mot de passe sécurisés par Supabase.
- **Création de Deck** : Nom et description personnalisables.
- **Gestion des Cartes** :
    - Upload multiple (Drag & Drop ou sélection).
    - Limite technique : 500 cartes par deck.
    - Prévisualisation instantanée.
    - Suppression individuelle des cartes.
- **Actions de Deck** : Liste, duplication (clonage complet) et suppression.

### 4.2. Jeu Multijoueur
- **Création de Salon** : L'hôte choisit un deck et définit le nombre de joueurs (2 à 6).
- **Système de Code** : Génération d'un code unique à 6 caractères alphanumériques.
- **Lobby** : Salle d'attente en temps réel avec liste des participants.
- **Gestion des Joueurs** :
    - Utilisateurs connectés.
    - **Invités** : Possibilité de rejoindre avec un simple pseudonyme (session visiteur).
- **Mécaniques de Jeu** :
    - Distribution automatique (5 cartes par défaut).
    - Tour par tour géré par le système.
    - Zones de jeu : Pioche (Deck), Main (Joueur), Défausse (Board).
    - Actions : Piocher, Jouer, Passer le tour.
- **Synchronisation** : Toutes les actions sont répercutées instantanément via Supabase Realtime.

## 5. Spécifications Techniques

- **Frontend** : Next.js 15 (App Router).
- **Langage** : TypeScript pour une sécurité de type accrue.
- **Design System** : Tailwind CSS v4 + Shadcn/UI (basé sur Radix UI).
- **Backend-as-a-Service** : Supabase.
    - **Auth** : Authentification et sessions.
    - **PostgreSQL** : Stockage des données relationnelles.
    - **Storage** : Bucket public `card-images` avec politiques RLS.
    - **Realtime** : Canaux de diffusion pour le jeu en direct.
- **Infrastructure** : Déploiement optimisé sur Vercel.

## 6. Design & UX (Charte Graphique SuperTilt)

L'application suit l'identité visuelle de SuperTilt pour un rendu premium et professionnel.
- **Palette de Couleurs** :
    - Jaune : `#ffd100` (Accentuation, boutons principaux).
    - Anthracite : `#101820` (Fonds, textes primaires).
    - Gris : `#f2f4f4` (Fonds secondaires, cartes).
- **Typographie** : Interface claire et fonctionnelle privilégiant la lisibilité sur mobile et desktop.
- **Feedback visuel** : Indicateurs de progression d'upload, animations de cartes simples.

## 7. Roadmap & Évolutions Futures

- **Phase 1** : Amélioration de l'UI du jeu (animations de pioche, drag & drop de cartes sur le plateau).
- **Phase 2** : Statistiques et historique des parties pour les utilisateurs inscrits.
- **Phase 3** : Personnalisation des règles de jeu (nombre de cartes distribuées, limites de main).
- **Phase 4** : Chat intégré et système de réactions (emojis temps réel).
- **Phase 5** : Export/Import de decks au format standardisé.

---
*Document généré le 16 janvier 2026.*
