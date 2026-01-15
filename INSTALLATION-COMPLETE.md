# 🎮 Installation complète du jeu multijoueur avec invités

## ⚠️ IMPORTANT : Ordre d'exécution des scripts SQL

Vous **DEVEZ** exécuter ces scripts dans cet ordre précis dans Supabase SQL Editor :

### 1️⃣ Correction des politiques RLS (OBLIGATOIRE)
**Fichier** : `supabase/fix-rls-final.sql`

Ce script corrige le problème de récursion infinie dans les politiques RLS.

```sql
-- Ouvrez Supabase SQL Editor
-- Copiez TOUT le contenu de supabase/fix-rls-final.sql
-- Exécutez-le
```

### 2️⃣ Accès public aux parties en attente (OBLIGATOIRE)
**Fichier** : `supabase/add-public-game-access.sql`

Permet aux invités non connectés de voir les parties pour vérifier le code.

```sql
-- Ouvrez Supabase SQL Editor
-- Copiez TOUT le contenu de supabase/add-public-game-access.sql
-- Exécutez-le
```

### 3️⃣ Support des joueurs invités (OBLIGATOIRE)
**Fichier** : `supabase/add-guest-support.sql`

Ajoute le support complet des invités (sans compte).

```sql
-- Ouvrez Supabase SQL Editor
-- Copiez TOUT le contenu de supabase/add-guest-support.sql
-- Exécutez-le
```

## ✅ Vérification

Après avoir exécuté les 3 scripts, vérifiez :

### Dans Table Editor → game_players :
- `user_id` est maintenant **nullable**
- Nouveaux champs : `guest_name` (TEXT), `guest_session_id` (TEXT)

### Dans Database → Functions :
- `user_game_ids(p_user_id UUID)` existe
- `generate_game_code()` existe
- `distribute_cards(p_game_id UUID, p_cards_per_player INTEGER)` existe

### Dans Table Editor → games → Policies :
- "Users can view their games" existe
- "Anyone can view waiting games" existe (nouvelle)

## 🎮 Fonctionnalités après installation

### Pour les hôtes (avec compte) :
1. Créer un deck avec des cartes
2. Cliquer sur "Créer une partie"
3. Sélectionner le deck et le nombre de joueurs
4. **Copier le lien d'invitation** (nouveau bouton)
5. Partager le lien par WhatsApp/Discord/etc.

### Pour les invités (sans compte) :
1. Cliquer sur le lien reçu : `https://votre-app.com/games/join/ABC123`
2. Entrer **uniquement prénom et nom** (pas d'email ni mot de passe !)
3. Cliquer sur "Rejoindre la partie"
4. Jouer normalement comme les autres joueurs

### Dans le lobby :
- Les invités apparaissent avec leur nom complet
- Badge "Invité" pour les distinguer
- Badge "Hôte" avec couronne pour l'hôte
- Synchronisation temps réel de tous les joueurs

## 🐛 Dépannage

### Erreur "infinite recursion detected"
➡️ Vous n'avez pas appliqué `fix-rls-final.sql` ou dans le mauvais ordre

### Erreur "le code ne correspond à aucune partie active" pour les invités
➡️ Vous n'avez pas appliqué `add-public-game-access.sql`

### Erreur lors de la création de partie
➡️ Vérifiez que `fix-rls-final.sql` a bien été exécuté

### Les invités ne peuvent pas rejoindre
➡️ Vérifiez que `add-guest-support.sql` a bien été exécuté

### La colonne "guest_name" n'existe pas
➡️ Vous n'avez pas exécuté `add-guest-support.sql`

## 📊 Résumé des changements

### Base de données :
- `game_players.user_id` → **nullable** (pour les invités)
- `game_players.guest_name` → **TEXT** (nom de l'invité)
- `game_players.guest_session_id` → **TEXT** (session unique)
- `game_cards.owner_user_id` → **nullable** (pour les invités)

### Politiques RLS :
- Correction de la récursion infinie
- Accès public aux parties en attente
- Support des invités dans toutes les politiques

### Fonctionnalités :
- URLs partageables `/games/join/[CODE]`
- Formulaire simplifié : prénom + nom
- Sessions invités avec cookies (7 jours)
- Affichage des noms dans le lobby
- Synchronisation temps réel

## 🚀 C'est prêt !

Une fois les 3 scripts SQL exécutés, votre jeu est entièrement fonctionnel avec le support des invités ! 🎉
