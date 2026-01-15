# Configuration du Jeu Multijoueur

## ⚠️ Étape obligatoire avant d'utiliser le jeu multijoueur

Le schéma de base de données pour le jeu multijoueur doit être appliqué dans votre projet Supabase.

## 📋 Instructions pas à pas

### 1. Ouvrez votre projet Supabase

Allez sur [https://supabase.com/dashboard](https://supabase.com/dashboard) et ouvrez votre projet.

### 2. Ouvrez le SQL Editor

Dans le menu de gauche, cliquez sur **"SQL Editor"**

### 3. Copiez le schéma SQL

Ouvrez le fichier `supabase/game-schema.sql` de votre projet et **copiez tout son contenu** (212 lignes).

### 4. Exécutez le schéma

1. Collez le contenu dans l'éditeur SQL de Supabase
2. Cliquez sur le bouton **"Run"** (ou appuyez sur Ctrl+Enter / Cmd+Enter)
3. Attendez que l'exécution se termine (quelques secondes)

### 5. Vérifiez que ça a fonctionné

Vous devriez voir un message de succès. Pour vérifier :

1. Allez dans **"Table Editor"** dans le menu de gauche
2. Vous devriez voir ces nouvelles tables :
   - `games`
   - `game_players`
   - `game_cards`

## ✅ C'est fait !

Une fois le schéma appliqué, le jeu multijoueur fonctionnera immédiatement. Vous pourrez :

- Créer des parties
- Rejoindre avec un code
- Jouer en temps réel

## 🐛 En cas de problème

Si vous avez une erreur lors de l'exécution du SQL :

1. **Erreur "already exists"** : C'est normal si vous avez déjà exécuté le script. Le schéma utilise `CREATE IF NOT EXISTS`.

2. **Erreur de permissions** : Assurez-vous d'être bien connecté à votre projet Supabase avec les droits appropriés.

3. **Autre erreur** : Copiez l'erreur complète et vérifiez qu'aucune ligne n'a été coupée lors du copier-coller.

## 📊 Ce que le schéma crée

### Tables
- `games` : Les parties (code, statut, joueurs max, etc.)
- `game_players` : Les joueurs dans chaque partie
- `game_cards` : Les cartes en jeu (pioche, main, défausse)

### Fonctions
- `generate_game_code()` : Génère un code unique à 6 caractères
- `distribute_cards()` : Distribue automatiquement les cartes aux joueurs

### Sécurité
- Politiques RLS (Row Level Security) pour protéger les données
- Les joueurs ne voient que leurs propres parties

### Performance
- 7 indexes pour des requêtes rapides
