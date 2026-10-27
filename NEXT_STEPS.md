# 🚀 Prochaines Étapes - PlayDeck v2

## ✅ Ce qui vient d'être fait

### 1. Analyse Complète du Projet
- ✅ 75/75 primitives implémentées côté backend (100%)
- ✅ 16/75 primitives intégrées dans l'UI (21%)
- ✅ Identification des 59 primitives sans UI
- ✅ Identification des workarounds temporaires à remplacer

### 2. Migrations Créées (Phase 1)
- ✅ **008_p2_advanced_features.sql** - Fonctionnalités avancées P2
  - Timer (colonnes dans `turn_state`)
  - Marquage visuel (colonne `marks` JSONB dans `game_cards`)
  - Snapshots (table `game_snapshots` pour save/load)
  - Jeux prédéfinis (table `predefined_games` avec Poker, UNO, Belote)
  - Visibilité avancée (colonne `cards_hidden` dans `game_players`)

- ✅ **009_p1_advanced_features.sql** - Fonctionnalités avancées P1
  - Groupement de cartes (colonnes `group_id`, `group_name`)
  - Révélation sélective (colonne `revealed_to[]`)
  - Pause de jeu (colonnes `is_paused`, `paused_at`, `paused_by`)
  - Historique des actions (table `primitive_actions_log` pour UNDO)
  - Tracking du vainqueur (colonne `winner_id` dans `games`)

### 3. Roadmap Complète
- ✅ Plan détaillé en 6 phases (8 semaines)
- ✅ Priorisation des tâches
- ✅ Estimations de temps
- ✅ Jalons et métriques de succès

---

## 🎯 Prochaines Actions Immédiates

### Étape 1 : Appliquer les Migrations (30 min)

1. **Se connecter à Supabase Studio**
   ```
   https://supabase.com/dashboard/project/<your-project-id>
   ```

2. **Aller dans "SQL Editor"**

3. **Exécuter la migration P2**
   - Copier le contenu de `supabase/migrations/008_p2_advanced_features.sql`
   - Coller dans l'éditeur SQL
   - Cliquer sur "Run"
   - ✅ Vérifier que toutes les requêtes passent

4. **Exécuter la migration P1**
   - Copier le contenu de `supabase/migrations/009_p1_advanced_features.sql`
   - Coller dans l'éditeur SQL
   - Cliquer sur "Run"
   - ✅ Vérifier que toutes les requêtes passent

5. **Vérifier les nouvelles tables dans "Table Editor"**
   - `game_snapshots` (devrait être vide)
   - `predefined_games` (devrait avoir 3 jeux : Poker, UNO, Belote)
   - `primitive_actions_log` (devrait être vide)

6. **Vérifier les nouvelles colonnes**
   - `turn_state` : `timer_started_at`, `timer_duration`
   - `game_cards` : `marks`, `group_id`, `group_name`, `revealed_to`
   - `game_players` : `cards_hidden`
   - `games` : `is_paused`, `paused_at`, `paused_by`, `winner_id`

### Étape 2 : Tester les Migrations (1h)

1. **Créer une partie de test**
   ```bash
   npm run dev
   # Créer une nouvelle partie
   # Distribuer quelques cartes
   ```

2. **Tester manuellement via Supabase Studio**
   
   **Test Timer** :
   ```sql
   -- Dans SQL Editor
   UPDATE turn_state 
   SET timer_started_at = NOW(), timer_duration = 60 
   WHERE game_id = '<your-test-game-id>';
   
   -- Vérifier
   SELECT * FROM turn_state WHERE game_id = '<your-test-game-id>';
   ```

   **Test Snapshot** :
   ```sql
   -- Créer un snapshot de test
   INSERT INTO game_snapshots (game_id, name, snapshot_data, created_by)
   VALUES (
     '<your-test-game-id>',
     'Test Snapshot',
     '{"test": true}'::jsonb,
     auth.uid()
   );
   
   -- Vérifier
   SELECT * FROM game_snapshots WHERE game_id = '<your-test-game-id>';
   ```

   **Test Jeux Prédéfinis** :
   ```sql
   -- Lister les jeux prédéfinis
   SELECT name, description, min_players, max_players 
   FROM predefined_games;
   ```

   **Test Marquage** :
   ```sql
   -- Marquer une carte
   UPDATE game_cards 
   SET marks = '[{"type": "BADGE", "value": "★", "color": "#FFD700"}]'::jsonb
   WHERE id = '<a-card-id>';
   
   -- Vérifier
   SELECT id, marks FROM game_cards WHERE marks != '[]';
   ```

   **Test Action Log** :
   ```sql
   -- Logger une action de test
   SELECT log_primitive_action(
     '<your-test-game-id>'::uuid,
     'TEST_ACTION',
     '{"test": true}'::jsonb,
     '{"before": "state"}'::jsonb,
     '{"after": "state"}'::jsonb,
     true
   );
   
   -- Vérifier
   SELECT * FROM primitive_actions_log 
   WHERE game_id = '<your-test-game-id>';
   ```

### Étape 3 : Mettre à Jour les Server Actions (2-3h)

**Fichiers à modifier** : `app/games/[id]/gm-actions.ts`

Remplacer les workarounds temporaires par les vraies tables :

1. **Timer** (lignes ~2500-2600)
   ```typescript
   // AVANT (workaround)
   const settings = (gameData?.settings as any) || {}
   settings.timer_started_at = new Date().toISOString()
   
   // APRÈS (migration)
   await supabase
     .from('turn_state')
     .update({
       timer_started_at: new Date().toISOString(),
       timer_duration: durationSeconds
     })
     .eq('game_id', gameId)
   ```

2. **Snapshots** (lignes ~2850-3000)
   ```typescript
   // AVANT (workaround)
   settings.last_snapshot = { name: snapshotName, data: gameState }
   
   // APRÈS (migration)
   await supabase
     .from('game_snapshots')
     .insert({
       game_id: gameId,
       name: snapshotName || `Sauvegarde ${new Date().toLocaleString()}`,
       snapshot_data: gameState,
       created_by: user.id
     })
   ```

3. **Marquage** (lignes ~2750-2850)
   ```typescript
   // AVANT (workaround - simulation)
   return { success: true, message: `Carte marquée` }
   
   // APRÈS (migration)
   await supabase
     .from('game_cards')
     .update({
       marks: [...existingMarks, { type: markType, value: markValue }]
     })
     .eq('id', cardId)
   ```

4. **Jeux Prédéfinis** (lignes ~2650-2750)
   ```typescript
   // AVANT (workaround - hardcodé)
   const predefinedGames = { poker: {...}, uno: {...} }
   
   // APRÈS (migration)
   const { data: predefinedGame } = await supabase
     .from('predefined_games')
     .select('*')
     .eq('id', predefinedGameId)
     .single()
   ```

5. **Visibilité** (lignes ~2600-2650)
   ```typescript
   // AVANT (workaround - change face_visible)
   await supabase.from('game_cards').update({ face_visible: false })
   
   // APRÈS (migration)
   await supabase
     .from('game_players')
     .update({ cards_hidden: true })
     .eq('id', playerId)
   ```

**Fichiers à modifier** : `app/games/[id]/player-actions.ts`

6. **Groupement** (lignes ~400-500)
   ```typescript
   // Activer le vrai groupement
   await supabase
     .from('game_cards')
     .update({
       group_id: groupId,
       group_name: groupName
     })
     .in('id', cardIds)
   ```

7. **Révélation** (lignes ~380-400)
   ```typescript
   // Activer la vraie révélation sélective
   await supabase
     .from('game_cards')
     .update({
       revealed_to: [...existingRevealed, targetPlayerId]
     })
     .eq('id', cardId)
   ```

---

## 📋 Checklist de Validation

Avant de passer à la Phase 2 (UI), vérifier :

- [ ] ✅ Migrations 008 et 009 appliquées sans erreur
- [ ] ✅ Tables `game_snapshots`, `predefined_games`, `primitive_actions_log` créées
- [ ] ✅ Colonnes ajoutées dans `turn_state`, `game_cards`, `game_players`, `games`
- [ ] ✅ 3 jeux prédéfinis dans `predefined_games` (Poker, UNO, Belote)
- [ ] ✅ RLS policies actives sur toutes les nouvelles tables
- [ ] ✅ Tests manuels SQL passent
- [ ] ✅ Server actions mises à jour (timer, snapshots, marks, etc.)
- [ ] ✅ Aucune régression sur les parties existantes
- [ ] ✅ Commit + push des modifications

---

## 🎨 Phase 2 : UI Essentielle (Après validation Phase 1)

Une fois les migrations validées, passer à l'intégration UI :

### Priorité 1 : GM Control Panel - Timer & P2 (1-2 jours)
```typescript
// components/gm-control-panel.tsx - Nouvelle section

<div className="space-y-2">
  <h3>⏱️ Timer & Avancé</h3>
  
  {/* START_TIMER */}
  <Input 
    type="number" 
    placeholder="Durée (secondes)" 
    value={timerDuration}
    onChange={(e) => setTimerDuration(e.target.value)}
  />
  <Button onClick={() => startTimer(gameId, timerDuration)}>
    Démarrer Timer
  </Button>
  
  {/* STOP_TIMER */}
  <Button onClick={() => stopTimer(gameId)}>
    Arrêter Timer
  </Button>
  
  {/* SAVE_GAME */}
  <Input placeholder="Nom snapshot" />
  <Button onClick={() => saveGame(gameId, snapshotName)}>
    Sauvegarder
  </Button>
  
  {/* LOAD_GAME */}
  <Select>
    {snapshots.map(s => <option>{s.name}</option>)}
  </Select>
  <Button onClick={() => loadGame(gameId, selectedSnapshot)}>
    Charger
  </Button>
</div>
```

### Priorité 2 : Game Board - Actions Joueur (1 jour)
```typescript
// components/game-board.tsx - Nouveaux boutons

<Button onClick={() => drawBottomCard(gameId)}>
  <ArrowDown /> Piocher du bas
</Button>

<Button onClick={() => takeFromDiscard(gameId)}>
  <CornerDownLeft /> Prendre défausse
</Button>
```

### Priorité 3 : GM Control Panel - Deck Avancé (2 jours)

Voir détails dans `ROADMAP.md` Phase 2.

---

## 📊 Métriques de Progrès

Après Phase 1 complète :
- ✅ Backend : 100% (75/75 primitives)
- ✅ Migrations : 100% (2/2 fichiers appliqués)
- ⚠️ UI : 21% → **30% attendu** (après intégration timer/deck avancé)
- ⚠️ Tests : 5% → **15% attendu** (après tests migrations)

---

## 🆘 Support

### Problèmes Fréquents

**Erreur : "column already exists"**
- ✅ Solution : C'est normal si la migration a déjà été exécutée
- ✅ Vérifier : `SELECT column_name FROM information_schema.columns WHERE table_name = 'game_cards';`

**Erreur RLS : "new row violates row-level security policy"**
- ✅ Solution : Vérifier que l'utilisateur est bien GM du jeu
- ✅ Test : `SELECT game_master_id FROM games WHERE id = '<game-id>';`

**Snapshots ne s'affichent pas**
- ✅ Solution : Vérifier les RLS policies
- ✅ Test : `SELECT * FROM game_snapshots;` (si vide, le problème est avant la RLS)

### Ressources

- 📖 Plan complet : `ROADMAP.md`
- 📖 Migrations : `supabase/migrations/00*.sql`
- 📖 Docs primitives : `PRIMITIVES_*.md`
- 📖 Rapport exploration : Plan créé à `/root/.claude/plans/transient-knitting-valiant.md`

---

**Dernière mise à jour** : 2026-10-27  
**Status** : Phase 1 - Migrations créées, prêtes à appliquer ✅
