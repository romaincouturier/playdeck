# PlayDeck - Gestionnaire de Decks de Cartes

Application Next.js 15 pour gérer vos decks de cartes avec authentification et stockage cloud.

## Stack Technique

- **Framework**: Next.js 15 (App Router)
- **Langage**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: Shadcn/ui
- **Backend**: Supabase (Auth + Database + Storage)

## Fonctionnalités (MVP - ÉTAPE 1)

- ✅ Authentification (inscription/connexion) avec Supabase Auth
- ✅ Gestion des decks (créer, lister, dupliquer, supprimer)
- ✅ Gestion des cartes (upload d'images, affichage, suppression)
- ✅ Limite de 500 cartes par deck
- ✅ Upload d'images par glisser-déposer ou bouton
- ✅ Design responsive (mobile, tablette, desktop)
- ✅ Mode sombre automatique

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

1. Dans votre projet Supabase, allez dans **SQL Editor**
2. Copiez le contenu du fichier `supabase/schema.sql`
3. Collez-le dans l'éditeur SQL et exécutez-le
4. Cela créera :
   - Les tables `decks` et `cards`
   - Les politiques de sécurité RLS (Row Level Security)
   - Le bucket de stockage `card-images`
   - Les politiques de stockage

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
│   ├── login/              # Page de connexion
│   │   └── page.tsx
│   ├── globals.css         # Styles globaux + variables Tailwind
│   ├── layout.tsx          # Layout principal
│   └── page.tsx            # Page d'accueil (redirige vers /decks)
├── components/
│   ├── ui/                 # Composants UI Shadcn
│   ├── card-grid.tsx       # Grille d'affichage des cartes
│   ├── card-upload.tsx     # Composant d'upload de cartes
│   ├── create-deck-dialog.tsx  # Dialog de création de deck
│   └── deck-card.tsx       # Carte d'affichage d'un deck
├── lib/
│   ├── supabase/
│   │   ├── client.ts       # Client Supabase côté navigateur
│   │   └── server.ts       # Client Supabase côté serveur
│   └── utils.ts            # Utilitaires (cn)
├── types/
│   └── database.types.ts   # Types TypeScript pour la BDD
├── supabase/
│   └── schema.sql          # Schéma de base de données
└── proxy.ts                # Proxy d'authentification (Next.js 15)
```

## Base de Données

### Tables

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
2. Glissez-déposez une image ou cliquez sur "Sélectionner une image"
3. L'image sera uploadée et ajoutée au deck
4. Maximum 500 cartes par deck

### 4. Gérer les cartes

- **Supprimer** : Survolez une carte et cliquez sur l'icône poubelle
- Les cartes sont affichées en grille responsive

### 5. Gérer les decks

- **Dupliquer** : Menu ⋮ → Dupliquer (copie le deck et toutes ses cartes)
- **Supprimer** : Menu ⋮ → Supprimer (supprime le deck et toutes ses cartes)

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

### Problème de connexion à Supabase

- Vérifiez que vos variables d'environnement sont correctes
- Vérifiez que le projet Supabase est actif
- Vérifiez que vous avez exécuté le script SQL

### Les images ne s'affichent pas

- Vérifiez que le bucket `card-images` existe
- Vérifiez que les politiques de stockage sont configurées
- Vérifiez la console du navigateur pour les erreurs

### Erreurs RLS (Row Level Security)

- Assurez-vous que toutes les politiques RLS du fichier `schema.sql` sont bien créées
- Vérifiez que vous êtes bien connecté

## Prochaines Étapes (Après MVP)

- Jeu multijoueur en temps réel
- Mélange et distribution de cartes
- Gestion de plusieurs joueurs
- WebSockets pour la synchronisation temps réel

## Technologies Utilisées

- [Next.js 15](https://nextjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Shadcn/ui](https://ui.shadcn.com/)
- [Supabase](https://supabase.com/)
- [Radix UI](https://www.radix-ui.com/)
- [Lucide Icons](https://lucide.dev/)
