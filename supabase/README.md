# Migrations SQL Supabase

**IMPORTANT** : Vous devez exécuter ces scripts SQL dans Supabase pour que l'application fonctionne correctement.

## Ordre d'exécution des migrations

Exécutez ces fichiers SQL dans l'ordre suivant dans le **SQL Editor** de Supabase :

### 1. Schéma de base du jeu (OBLIGATOIRE)
```
supabase/game-schema.sql
```
**Ce fichier contient :**
- Création des tables `games`, `game_players`, `game_cards`
- Fonction `generate_game_code()` pour générer les codes de parties
- Fonction `distribute_cards()` pour distribuer les cartes
- Politiques RLS de base

**Sans ce fichier, vous aurez l'erreur :**
```
ERREUR SQL: La fonction generate_game_code() n'existe pas dans Supabase
```

### 2. Support des invités
```
supabase/add-guest-support.sql
```
**Ce fichier ajoute :**
- Champs `guest_name` et `guest_session_id` dans `game_players`
- Permet aux joueurs non authentifiés de rejoindre les parties

### 3. Champs pour les invités dans game_cards
```
supabase/add-guest-game-cards.sql
```
**Ce fichier ajoute :**
- Champ `owner_guest_session_id` dans `game_cards`
- Permet aux invités de recevoir des cartes

### 4. Déconnexion des joueurs
```
supabase/add-player-disconnect.sql
```
**Ce fichier ajoute :**
- Champ `has_left` dans `game_players`
- Permet de marquer les joueurs qui ont quitté la partie

### 5. Politiques RLS pour les invités - Parties
```
supabase/fix-guest-rejoin-rls.sql
```
**Ce fichier corrige :**
- Politique RLS pour que les invités puissent voir toutes les parties
- Permet aux invités de rejoindre des parties en cours

### 6. Politiques RLS pour les invités - Cartes (OBLIGATOIRE pour les invités)
```
supabase/fix-guest-cards-rls.sql
```
**Ce fichier corrige :**
- Politiques RLS pour `game_cards` : permet aux invités de voir leurs cartes
- Politiques RLS pour `game_players` : permet aux invités de voir les autres joueurs

**Sans ce fichier, les invités ne pourront pas voir leurs cartes ni jouer.**

## Comment exécuter les migrations

1. Ouvrez Supabase : https://supabase.com
2. Sélectionnez votre projet
3. Allez dans **SQL Editor**
4. Créez une nouvelle requête
5. Copiez-collez le contenu de chaque fichier SQL dans l'ordre ci-dessus
6. Cliquez sur **Run** pour chaque fichier

## Vérification

Pour vérifier que tout est installé correctement, exécutez cette requête SQL :

```sql
-- Vérifier que la fonction generate_game_code existe
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'generate_game_code';

-- Vérifier que la fonction distribute_cards existe
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'distribute_cards';

-- Vérifier la structure de game_players
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'game_players'
ORDER BY ordinal_position;

-- Vérifier la structure de game_cards
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'game_cards'
ORDER BY ordinal_position;
```

Vous devriez voir :
- ✅ `generate_game_code` dans les fonctions
- ✅ `distribute_cards` dans les fonctions
- ✅ Colonnes `guest_name`, `guest_session_id`, `has_left` dans `game_players`
- ✅ Colonne `owner_guest_session_id` dans `game_cards`
