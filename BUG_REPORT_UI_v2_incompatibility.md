# 🔥 BUGS CRITIQUES : UI Incompatible avec Migration v2

**Date**: 2026-02-12
**Gravité**: 🔴 BLOQUANT - L'application ne fonctionne pas avec le schéma v2
**Fichiers affectés**: `app/games/actions.ts`

---

## 🚨 Résumé

L'application UI utilise **des colonnes de la v1 qui ont été supprimées par la migration v2**. La création et le démarrage de jeux **échoueront à 100%**.

---

## 🔴 Bug #1 - CRITIQUE: createGame() utilise host_id (supprimé en v2)

**Fichier**: `app/games/actions.ts:100`

**Code actuel**:
```typescript
const { data: game, error: gameError } = await supabase
  .from('games')
  .insert({
    host_id: user.id,  // ❌ ERREUR: colonne supprimée en v2
    deck_id: deckId,
    code,
    max_players: maxPlayers,
    status: 'waiting',
  })
  .select()
  .single()
```

**Problème**:
- `host_id` a été supprimé par la migration v2 (ligne 439 de 20260211_v2_universal_engine.sql)
- La v2 utilise `game_master_id` à la place
- `game_mode` doit être défini à 'UNIVERSAL'
- Pas de création d'entrée dans `game_master`

**Erreur SQL attendue**:
```
ERROR: column "host_id" of relation "games" does not exist
```

**Solution**:
```typescript
// 1. Créer le jeu avec game_master_id
const { data: game, error: gameError } = await supabase
  .from('games')
  .insert({
    game_master_id: user.id,  // ✅ Nouveau champ v2
    deck_id: deckId,
    code,
    max_players: maxPlayers,
    status: 'waiting',
    game_mode: 'UNIVERSAL',  // ✅ Requis en v2
    current_round: 1,
  })
  .select()
  .single()

// 2. Créer l'entrée game_master
await supabase.from('game_master').insert({
  game_id: game.id,
  user_id: user.id,
  is_playing: true,  // Le GM joue aussi
  omniscient_mode: false,  // Le GM ne voit pas tout
  can_undo: true,
})
```

---

## 🔴 Bug #2 - CRITIQUE: startGame() utilise host_id pour vérification

**Fichier**: `app/games/actions.ts:307-312`

**Code actuel**:
```typescript
const { data: game, error: gameError } = await supabase
  .from('games')
  .select('id, host_id, status')  // ❌ host_id n'existe plus
  .eq('id', gameId)
  .eq('host_id', user.id)  // ❌ Filtrage impossible
  .single()
```

**Problème**:
- La vérification que l'utilisateur est l'hôte échouera
- `host_id` n'existe plus en v2

**Erreur SQL attendue**:
```
ERROR: column games.host_id does not exist
```

**Solution**:
```typescript
// Vérifier via game_master
const { data: game, error: gameError } = await supabase
  .from('games')
  .select(`
    id,
    status,
    game_master:game_master(user_id)
  `)
  .eq('id', gameId)
  .single()

if (!game || game.game_master?.user_id !== user.id) {
  throw new Error('Partie introuvable ou vous n\'êtes pas le Game Master')
}
```

---

## 🔴 Bug #3 - CRITIQUE: startGame() utilise current_turn_player_id (supprimé en v2)

**Fichier**: `app/games/actions.ts:338-347`

**Code actuel**:
```typescript
const { error: updateError } = await supabase
  .from('games')
  .update({
    status: 'playing',
    started_at: new Date().toISOString(),
    current_turn_player_id: isGuestFirst ? null : firstPlayer.user_id,  // ❌ Supprimé
    current_turn_guest_id: isGuestFirst ? firstPlayer.guest_session_id : null,  // ❌ Supprimé
    current_phase_id: 'main'  // ❌ Supprimé
  })
  .eq('id', gameId)
```

**Problème**:
- `current_turn_player_id`, `current_turn_guest_id`, `current_phase_id` ont été supprimés en v2
- La v2 utilise la table `turn_state` pour gérer les tours

**Erreur SQL attendue**:
```
ERROR: column "current_turn_player_id" of relation "games" does not exist
ERROR: column "current_turn_guest_id" of relation "games" does not exist
ERROR: column "current_phase_id" of relation "games" does not exist
```

**Solution**:
```typescript
// 1. Mettre à jour le status du jeu
const { error: updateError } = await supabase
  .from('games')
  .update({
    status: 'playing',
    started_at: new Date().toISOString(),
  })
  .eq('id', gameId)

// 2. Le trigger on_game_start_create_zones va automatiquement:
//    - Créer les zones (DECK, CENTER, DISCARD)
//    - Initialiser turn_state avec turn_order

// 3. Pas besoin de gérer manuellement current_turn_player_id
//    C'est géré par turn_state.current_player_id
```

---

## 🟡 Bug #4 - Mineur: player_order devrait démarrer à 1

**Fichier**: `app/games/actions.ts:124, 204`

**Code actuel**:
```typescript
player_order: 0,  // ⚠️ Démarre à 0
```

**Problème**:
- `turn_state.turn_number` démarre à 1 (CHECK >= 1)
- Par convention, il serait mieux que `player_order` démarre aussi à 1
- Mais ce n'est pas bloquant

**Solution** (optionnelle):
```typescript
player_order: 1,  // Démarre à 1 pour cohérence
```

---

## 🟡 Bug #5 - Incomplet: Pas de champs v2 requis

**Fichier**: `app/games/actions.ts:99-107`

**Problème**:
- Manque `game_mode: 'UNIVERSAL'` (requis en v2)
- Manque `current_round: 1`
- Pas de création de zones (sera fait par trigger en théorie)
- Pas d'ajout du champ `role` dans game_players

**Solution**:
```typescript
// Dans createGame
const { data: game } = await supabase
  .from('games')
  .insert({
    game_master_id: user.id,
    deck_id: deckId,
    code,
    max_players: maxPlayers,
    status: 'waiting',
    game_mode: 'UNIVERSAL',  // ✅ Requis
    current_round: 1,         // ✅ Valeur par défaut
  })

// Dans l'ajout du joueur
await supabase.from('game_players').insert({
  game_id: game.id,
  user_id: user.id,
  player_order: 1,
  role: 'PLAYER',  // ✅ Nouveau champ v2
  score: 0,        // ✅ Nouveau champ v2
})
```

---

## 🟡 Bug #6 - Manque: Fonction distribute_cards n'existe peut-être pas

**Fichier**: `app/games/actions.ts:354-357`

**Code actuel**:
```typescript
const { error: distributeError } = await supabase.rpc('distribute_cards', {
  p_game_id: gameId,
  p_cards_per_player: 5,
})
```

**Problème**:
- La fonction `distribute_cards` n'est pas définie dans la migration v2
- La migration v2 utilise des "primitives" au lieu de fonctions automatiques

**Solution**:
- Implémenter `distribute_cards` dans la migration v2
- OU utiliser les primitives de la v2 pour distribuer manuellement

---

## 📊 Impact sur l'Utilisateur

### Scénario 1: Créer un jeu
1. Utilisateur clique "Créer une partie" ✅
2. Sélectionne un deck ✅
3. Clique "Créer" 🔴
4. **ERREUR SQL**: `column "host_id" does not exist`
5. ❌ Aucun jeu créé

### Scénario 2: Démarrer un jeu
1. Utilisateur crée un jeu (échoue déjà) ❌
2. Si le jeu était créé manuellement en DB:
   - Clique "Démarrer" 🔴
   - **ERREUR SQL**: `column "current_turn_player_id" does not exist`
   - ❌ Le jeu ne démarre pas

### Scénario 3: Rejoindre un jeu
1. Utilisateur entre un code ✅
2. joinGame() ne cherche pas `host_id` ✅
3. Mais le jeu n'aura jamais été créé (Bug #1) ❌

---

## ✅ Solutions Prioritaires

### Priorité 1 (BLOQUANT):
1. ✅ Remplacer `host_id` → `game_master_id`
2. ✅ Ajouter `game_mode: 'UNIVERSAL'`
3. ✅ Créer l'entrée `game_master`
4. ✅ Supprimer `current_turn_player_id`, `current_turn_guest_id`, `current_phase_id`
5. ✅ Corriger la vérification du GM dans `startGame()`

### Priorité 2 (Important):
1. Ajouter `role` et `score` aux joueurs
2. Vérifier que le trigger `on_game_start_create_zones` fonctionne
3. Implémenter ou vérifier `distribute_cards`

### Priorité 3 (Optionnel):
1. Démarrer `player_order` à 1 au lieu de 0
2. Ajouter des tests UI avec vraie DB

---

## 🎯 Prochaines Étapes

1. **Corriger app/games/actions.ts** pour être compatible v2
2. **Tester le flux complet** :
   - Créer un jeu
   - Rejoindre un jeu
   - Démarrer un jeu
3. **Vérifier les triggers** fonctionnent côté DB
4. **Créer des tests E2E** pour éviter les régressions

---

## 📝 Notes

- La migration SQL v2 est correcte
- Le problème est que **l'application UI n'a pas été mise à jour** pour la v2
- C'est un cas classique de **migration DB sans mise à jour du code applicatif**
- Tous les bugs trouvés sont **déterministes** et **reproductibles à 100%**

---

**Détecté par**: Analyse statique du code + comparaison schéma v1/v2
**Méthode**: Lecture du code d'actions + vérification contre migration SQL
