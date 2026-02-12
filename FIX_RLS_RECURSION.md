# 🔧 Fix: Infinite Recursion RLS

## 🚨 Le problème

Vous avez ces erreurs :
```
infinite recursion detected in policy for relation "game_players"
infinite recursion detected in policy for relation "games"
```

**Cause** : Les policies RLS (Row Level Security) ont des dépendances circulaires :
- Policy sur `games` vérifie si vous êtes dans `game_players`
- Policy sur `game_players` vérifie si le jeu existe dans `games`
- → Boucle infinie ! 💥

---

## ✅ Solution : Un seul script à exécuter

**Dans Supabase SQL Editor**, copiez et exécutez **tout le contenu** de :

📄 `supabase/migrations/fix_rls_infinite_recursion.sql`

---

## 📋 Ce que fait le script

### 1. Crée des fonctions helper (SECURITY DEFINER)

Ces fonctions contournent RLS pour éviter la récursion :

```sql
is_player_in_game(game_id, user_id, guest_session_id)
  → Vérifie si un utilisateur participe à une partie

is_game_master(game_id, user_id)
  → Vérifie si un utilisateur est GM d'une partie

get_player_id_in_game(game_id, user_id, guest_session_id)
  → Récupère l'ID du joueur dans une partie
```

### 2. Recrée toutes les policies problématiques

**Avant** (récursif) :
```sql
CREATE POLICY "Players can view games they participate in"
  ON games FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM game_players  -- ← Déclenche policy sur game_players
      WHERE game_id = games.id     --   qui elle-même vérifie games
    )                              --   → RÉCURSION INFINIE
  );
```

**Après** (sans récursion) :
```sql
CREATE POLICY "Players can view games they participate in"
  ON games FOR SELECT
  USING (
    is_player_in_game(id, auth.uid(), current_setting('app.guest_session_id', true))
    -- ↑ Fonction SECURITY DEFINER qui bypasse RLS
  );
```

### 3. Tables corrigées

✅ `games` - 1 policy
✅ `zones` - 2 policies
✅ `turn_state` - 2 policies
✅ `primitive_actions` - 2 policies
✅ `game_rules_text` - 2 policies
✅ `card_groups` - 2 policies
✅ `card_marks` - 2 policies
✅ `game_snapshots` - 1 policy
✅ `player_visibility_overrides` - 2 policies

**Total : 16 policies recréées**

---

## 🎯 Résultats attendus

```sql
✅ Fonctions helper créées:
   - is_player_in_game()
   - is_game_master()
   - get_player_id_in_game()

✅ Policies recréées sans récursion:
   - games (1 policy)
   - zones (2 policies)
   - turn_state (2 policies)
   ...

🎉 Infinite recursion fixed!
```

---

## 🧪 Vérification

Une fois le script exécuté, **rechargez** :

```
http://localhost:3000/admin/check-migration
```

**Tous les tests doivent maintenant être ✅ verts** (y compris `game_master`, `turn_state`, etc.)

---

## ⚠️ Note technique

Les fonctions `SECURITY DEFINER` s'exécutent avec les privilèges de l'owner (postgres), contournant ainsi RLS. C'est sécurisé car :
1. Les fonctions font uniquement des vérifications d'existence
2. Elles n'exposent pas de données sensibles
3. Elles sont appelées DEPUIS des policies qui contrôlent l'accès final

C'est une pratique standard pour résoudre les dépendances circulaires RLS.

---

## 🚀 Prochaine étape

Après avoir appliqué ce fix avec succès :
1. Vérifiez `/admin/check-migration` (tous verts ✅)
2. Testez la création d'une partie
3. On pourra ensuite améliorer l'UI avec les primitives ! 🎮
