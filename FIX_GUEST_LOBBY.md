# 🔧 Fix: Les invités ne peuvent pas accéder au lobby

## 🚨 Le problème

Les invités voient cette erreur en essayant d'accéder au lobby :
```
Application error: a server side exception has occurred while loading playdeck
```

**Cause** : Les tables `game_players` et `game_cards` n'avaient **AUCUNE policy RLS**.

Quand un invité essaie d'accéder à `/games/ID/lobby`, le serveur :
1. Appelle `fetchGameState()`
2. Fait des requêtes SQL sur `game_players` et `game_cards`
3. ❌ **ÉCHOUE** car RLS bloque l'accès (pas de policy)

---

## ✅ Solution : Ajouter les RLS policies manquantes

**Dans Supabase SQL Editor**, exécutez **tout le contenu** de :

📄 `supabase/migrations/add_game_players_rls.sql`

---

## 📋 Ce que fait le script

### 1. Active RLS sur `game_players`

Crée 4 policies :

```sql
✅ "Players can view players in their games" (SELECT)
   → Tout joueur/invité peut voir les autres joueurs dans sa partie

✅ "Users can join games" (INSERT)
   → Permet à un utilisateur ou invité de rejoindre une partie

✅ "Players can update own record" (UPDATE)
   → Permet aux joueurs de modifier leur propre ligne

✅ "Game master can manage players" (ALL)
   → Le GM peut tout faire sur les joueurs
```

### 2. Active RLS sur `game_cards`

Crée 2 policies :

```sql
✅ "Players can view cards in their games" (SELECT)
   → Tout joueur peut voir les cartes de sa partie
   (La visibilité des zones est gérée au niveau applicatif)

✅ "Players can modify cards in their games" (ALL)
   → Joueurs et GM peuvent manipuler les cartes
```

### 3. Utilise les fonctions helper (sans récursion)

Les policies utilisent :
- `is_player_in_game(game_id, user_id, guest_session_id)`
- `is_game_master(game_id, user_id)`

Ces fonctions sont `SECURITY DEFINER` et évitent la récursion RLS.

---

## 🎯 Résultats attendus

```sql
============================
GAME_PLAYERS & GAME_CARDS RLS
============================

✅ RLS enabled on game_players
   - 4 policies created

✅ RLS enabled on game_cards
   - 2 policies created

🎉 Guests can now access game lobbies!
```

---

## 🧪 Vérification

Après l'exécution :

1. **L'hôte crée une partie** (fonctionne déjà)
2. **Un invité rejoint** avec le code
   - ✅ Devrait voir le lobby SANS erreur
   - ✅ Devrait voir la liste des joueurs
   - ✅ Devrait pouvoir attendre le démarrage

3. **L'hôte démarre la partie**
   - ✅ Tous les joueurs (hôte + invités) devraient accéder au plateau

---

## 🐛 Bonus : Fix TypeScript

Le commit inclut aussi :
- Ajout de `'UNIVERSAL'` au type `GameMode` (types/engine.types.ts)
- Corrige l'erreur de build Vercel : "Type 'string' is not assignable to type 'GameMode'"

---

## ⚠️ Note importante

**Ordre des scripts** :
1. `20260211_v2_universal_engine.sql` - Migration v2 principale
2. `fix_rls_infinite_recursion.sql` - Fonctions helper RLS
3. `add_game_players_rls.sql` - **← Ce script (NEW)**

Les fonctions helper créées dans `fix_rls_infinite_recursion.sql` sont **requises** pour ce script.

---

## 🎉 Une fois appliqué

Les invités pourront :
- ✅ Rejoindre les parties
- ✅ Accéder au lobby
- ✅ Voir les autres joueurs
- ✅ Jouer normalement

**Testez le flow complet** :
1. Hôte : Crée partie → Partage code
2. Invité : Rejoint via code → Voit lobby
3. Hôte : Démarre partie
4. Tous : Jouent ! 🎮🃏
