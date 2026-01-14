# PlayDeck - Gestionnaire de Decks de Cartes

Application Next.js 15 pour gérer vos decks de cartes avec authentification et stockage cloud.

## Stack Technique

- **Framework**: Next.js 15 (App Router)
- **Langage**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: Shadcn/ui
- **Backend**: Supabase (Auth + Database + Storage)

## Fonctionnalités

### ÉTAPE 1 - MVP : Gestion des Decks ✅

- ✅ Authentification (inscription/connexion) avec Supabase Auth
- ✅ Gestion des decks (créer, lister, dupliquer, supprimer)
- ✅ Gestion des cartes (upload d'images, affichage, suppression)
- ✅ Limite de 500 cartes par deck
- ✅ Upload multiple d'images par glisser-déposer ou bouton
- ✅ Design responsive (mobile, tablette, desktop)
- ✅ Mode sombre automatique

### ÉTAPE 2 - Jeu Multijoueur ✅

- ✅ Création de parties avec code unique (6 caractères)
- ✅ Rejoindre une partie avec un code
- ✅ Salle d'attente (lobby) avec liste des joueurs en temps réel
- ✅ Distribution automatique des cartes au démarrage
- ✅ Plateau de jeu avec pioche, défausse et main du joueur
- ✅ Actions de jeu : piocher, jouer une carte, passer le tour
- ✅ Synchronisation temps réel avec Supabase Realtime
- ✅ Gestion des tours de jeu
- ✅ 2 à 6 joueurs par partie

## Installation

### 1. Cloner le projet

```bash
git clone <votre-repo>
cd playdeck
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configuration Supabase

#### A. Créer un projet Supabase

1. Allez sur [supabase.com](https://supabase.com)
2. Créez un compte ou connectez-vous
3. Créez un nouveau projet
4. Notez votre **URL du projet** et votre **clé API anonyme**

#### B. Configurer la base de données

**Schéma de base (ÉTAPE 1) :**

1. Dans votre projet Supabase, allez dans **SQL Editor**
2. Copiez le contenu du fichier `supabase/schema.sql`
3. Collez-le dans l'éditeur SQL et exécutez-le
4. Cela créera :
   - Les tables `decks` et `cards`
   - Les politiques de sécurité RLS (Row Level Security)
   - Le bucket de stockage `card-images`
   - Les politiques de stockage

**Schéma de jeu multijoueur (ÉTAPE 2) :**

1. Dans le même **SQL Editor**
2. Copiez le contenu du fichier `supabase/game-schema.sql`
3. Collez-le dans l'éditeur SQL et exécutez-le
4. Cela créera :
   - Les tables `games`, `game_players`, et `game_cards`
   - Les politiques RLS pour les parties
   - Les fonctions `generate_game_code()` et `distribute_cards()`
   - Les indexes pour les performances

#### C. Configurer le stockage

1. Allez dans **Storage** dans votre projet Supabase
2. Vérifiez que le bucket `card-images` a été créé
3. Le bucket est configuré comme public pour permettre l'affichage des images

### 4. Variables d'environnement

1. Copiez le fichier `.env.local.example` :

```bash
cp .env.local.example .env.local
```

2. Éditez `.env.local` et ajoutez vos informations Supabase :

```env
NEXT_PUBLIC_SUPABASE_URL=votre-url-supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-cle-anon-supabase
```

Vous pouvez trouver ces informations dans :
- **Settings** → **API** dans votre projet Supabase

### 5. Lancer l'application en local

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

## Structure du Projet

```
playdeck/
├── app/
│   ├── decks/              # Pages de gestion des decks
│   │   ├── [id]/           # Page détail d'un deck
│   │   │   ├── actions.ts  # Actions serveur pour les cartes
│   │   │   └── page.tsx    # Page détail du deck
│   │   ├── actions.ts      # Actions serveur pour les decks
│   │   └── page.tsx        # Liste des decks
│   ├── games/              # Pages de jeu multijoueur
│   │   ├── [id]/           # Pages d'une partie
│   │   │   ├── lobby/      # Salle d'attente
│   │   │   ├── actions.ts  # Actions de jeu (piocher, jouer, etc.)
│   │   │   └── page.tsx    # Plateau de jeu
│   │   ├── create/         # Création de partie
│   │   ├── join/           # Rejoindre une partie
│   │   └── actions.ts      # Actions de gestion des parties
│   ├── login/              # Page de connexion
│   │   └── page.tsx
│   ├── globals.css         # Styles globaux + variables Tailwind
│   ├── layout.tsx          # Layout principal
│   └── page.tsx            # Page d'accueil (redirige vers /decks)
├── components/
│   ├── ui/                 # Composants UI Shadcn
│   ├── card-grid.tsx       # Grille d'affichage des cartes
│   ├── card-image.tsx      # Affichage d'image avec gestion d'erreur
│   ├── card-upload.tsx     # Composant d'upload multiple de cartes
│   ├── create-deck-dialog.tsx  # Dialog de création de deck
│   ├── create-game-form.tsx    # Formulaire de création de partie
│   ├── deck-card.tsx       # Carte d'affichage d'un deck
│   ├── game-board.tsx      # Plateau de jeu avec Realtime
│   ├── game-lobby.tsx      # Lobby avec liste des joueurs Realtime
│   └── join-game-form.tsx  # Formulaire pour rejoindre une partie
├── lib/
│   ├── supabase/
│   │   ├── client.ts       # Client Supabase côté navigateur
│   │   └── server.ts       # Client Supabase côté serveur
│   └── utils.ts            # Utilitaires (cn)
├── types/
│   └── database.types.ts   # Types TypeScript pour la BDD (avec tables de jeu)
├── supabase/
│   ├── schema.sql          # Schéma de base (decks/cards)
│   └── game-schema.sql     # Schéma du jeu multijoueur
└── proxy.ts                # Proxy d'authentification (Next.js 15)
```

## Base de Données

### Tables - Gestion des Decks

**decks**
- `id` (UUID, PK)
- `user_id` (UUID, FK vers auth.users)
- `name` (TEXT)
- `description` (TEXT, nullable)
- `created_at` (TIMESTAMP)

**cards**
- `id` (UUID, PK)
- `deck_id` (UUID, FK vers decks)
- `image_url` (TEXT)
- `position` (INTEGER)
- `created_at` (TIMESTAMP)

### Tables - Jeu Multijoueur

**games**
- `id` (UUID, PK)
- `host_id` (UUID, FK vers auth.users)
- `deck_id` (UUID, FK vers decks)
- `code` (TEXT, unique) - Code à 6 caractères
- `status` (TEXT) - 'waiting', 'playing', 'finished'
- `max_players` (INTEGER) - 2 à 6
- `current_turn_player_id` (UUID, nullable)
- `created_at`, `started_at`, `finished_at` (TIMESTAMP)

**game_players**
- `id` (UUID, PK)
- `game_id` (UUID, FK vers games)
- `user_id` (UUID, FK vers auth.users)
- `player_order` (INTEGER) - Ordre de jeu
- `is_host` (BOOLEAN)
- `joined_at` (TIMESTAMP)

**game_cards**
- `id` (UUID, PK)
- `game_id` (UUID, FK vers games)
- `card_id` (UUID, FK vers cards)
- `location` (TEXT) - 'deck', 'hand', 'discard'
- `owner_user_id` (UUID, nullable, FK vers auth.users)
- `position` (INTEGER)
- `created_at` (TIMESTAMP)

### Sécurité

- Row Level Security (RLS) activé sur toutes les tables
- Les utilisateurs ne peuvent voir/modifier que leurs propres decks
- Les utilisateurs ne peuvent gérer que les cartes de leurs propres decks
- Les images sont stockées dans des dossiers par utilisateur

## Utilisation

### 1. Créer un compte

1. Ouvrez l'application
2. Cliquez sur "Pas de compte ? S'inscrire"
3. Entrez votre email et mot de passe
4. Vérifiez votre email (Supabase envoie un lien de confirmation)

### 2. Créer un deck

1. Cliquez sur "Créer un deck"
2. Entrez un nom et une description (optionnelle)
3. Cliquez sur "Créer le deck"

### 3. Ajouter des cartes

1. Cliquez sur un deck pour voir ses détails
2. Glissez-déposez des images ou cliquez sur "Sélectionner des images"
3. Vous pouvez sélectionner plusieurs images à la fois
4. Les images seront uploadées avec indication de progression
5. Maximum 500 cartes par deck

### 4. Gérer les cartes

- **Supprimer** : Survolez une carte et cliquez sur l'icône poubelle
- Les cartes sont affichées en grille responsive

### 5. Gérer les decks

- **Dupliquer** : Menu ⋮ → Dupliquer (copie le deck et toutes ses cartes)
- **Supprimer** : Menu ⋮ → Supprimer (supprime le deck et toutes ses cartes)

### 6. Créer une partie multijoueur

1. Depuis la page des decks, cliquez sur "Créer une partie"
2. Sélectionnez un deck (doit contenir au moins une carte)
3. Choisissez le nombre maximum de joueurs (2 à 6)
4. Cliquez sur "Créer la partie"
5. Un code unique à 6 caractères sera généré
6. Partagez ce code avec les autres joueurs

### 7. Rejoindre une partie

1. Cliquez sur "Rejoindre" dans l'en-tête
2. Entrez le code à 6 caractères de la partie
3. Cliquez sur "Rejoindre"
4. Vous serez redirigé vers la salle d'attente

### 8. Jouer

**Dans la salle d'attente :**
- L'hôte peut démarrer la partie quand il y a au moins 2 joueurs
- Les joueurs qui rejoignent apparaissent en temps réel
- Tout joueur peut quitter avant le démarrage

**Pendant la partie :**
- Les cartes sont automatiquement distribuées (5 par joueur)
- Le premier joueur commence son tour
- **Actions disponibles pendant votre tour :**
  - **Piocher** : Prendre une carte de la pioche
  - **Jouer une carte** : Cliquer sur une carte de votre main pour la défausser
  - **Passer le tour** : Terminer votre tour
- **Synchronisation en temps réel** : Tous les joueurs voient les actions instantanément
- L'hôte peut terminer la partie à tout moment

## Scripts Disponibles

```bash
# Développement
npm run dev

# Build production
npm run build

# Démarrer en production
npm start

# Linter
npm run lint
```

## Troubleshooting

**🔧 Problèmes d'affichage des images, d'upload ou d'authentification ?**

Consultez le **[Guide de Dépannage Complet](TROUBLESHOOTING.md)** qui couvre :
- 🖼️ Les images des cartes ne s'affichent pas
- 🔐 Problèmes d'authentification
- 📁 Problèmes d'upload
- 🚫 Erreurs RLS (Row Level Security)
- Et plus encore...

## Améliorations Possibles

- 📊 Statistiques des parties (historique, victoires, etc.)
- 🎮 Règles de jeu personnalisables
- 💬 Chat intégré dans les parties
- 🏆 Système de classement/leaderboard
- 🎨 Personnalisation des arrière-plans de cartes
- 📱 Application mobile (React Native)
- 🔔 Notifications pour invitations de parties
- 👥 Système d'amis
- 🎯 Modes de jeu différents (timer, challenges, etc.)

## Technologies Utilisées

- [Next.js 15](https://nextjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Shadcn/ui](https://ui.shadcn.com/)
- [Supabase](https://supabase.com/)
- [Radix UI](https://www.radix-ui.com/)
- [Lucide Icons](https://lucide.dev/)
