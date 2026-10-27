# 🗺️ PlayDeck v2 - Roadmap de Finalisation

**État actuel** : Backend 100% complet, UI 21% intégrée

## 📊 Métriques Actuelles

| Catégorie | Progression | Détails |
|-----------|------------|---------|
| **Backend** | ✅ 100% | 75/75 primitives implémentées |
| **UI** | ⚠️ 21% | 16/75 primitives intégrées |
| **Migrations** | 🔄 En cours | 2 fichiers créés, à appliquer |
| **Tests** | ⚠️ 5% | 3 fichiers de tests seulement |
| **Documentation** | ⚠️ 40% | Docs techniques OK, pas de guide utilisateur |

---

## 🎯 Phase 1 : Migrations (Semaine 1) - EN COURS

### ✅ Créé
- [x] `migrations/008_p2_advanced_features.sql` - Timer, Marks, Snapshots, Predefined Games
- [x] `migrations/009_p1_advanced_features.sql` - Grouping, Reveal, Pause, Undo, Winner

### 🔄 À faire
- [ ] Appliquer les migrations sur Supabase
- [ ] Tester les nouvelles tables dans Supabase Studio
- [ ] Mettre à jour les server actions pour utiliser les nouvelles colonnes/tables
- [ ] Tests unitaires des migrations

**Fichiers à modifier après migration** :
```
app/games/[id]/gm-actions.ts
  - startTimer() / stopTimer() → Utiliser turn_state.timer_*
  - saveGame() / loadGame() → Utiliser game_snapshots table
  - markCard() / unmarkCard() → Utiliser game_cards.marks
  - hideOwnCards() / revealOwnCards() → Utiliser game_players.cards_hidden
  - loadPredefinedGame() → Query predefined_games table
  - pauseGame() / resumeGame() → Utiliser games.is_paused
  - undoAction() → Query primitive_actions_log
  - declareGameWinner() → Set games.winner_id

app/games/[id]/player-actions.ts
  - groupCards() / ungroupCards() → Utiliser game_cards.group_*
  - revealCardToPlayer() → Utiliser game_cards.revealed_to[]
```

---

## 🎨 Phase 2 : UI Essentielle (Semaines 2-3)

### Priorité Haute - Actions Fréquentes

#### GM Control Panel - Section "🎴 Deck Avancé"
- [ ] `shuffleZone()` - Dropdown zone + bouton
- [ ] `cutDeck()` - Input position + bouton
- [ ] `recycleDiscard()` - Bouton simple
- [ ] `addCardsToDeck()` - Sélecteur + bouton
- [ ] `removeCardsFromDeck()` - Sélecteur + bouton

#### GM Control Panel - Section "⏱️ Timer & P2"
- [ ] `startTimer()` - Input durée + bouton + countdown display
- [ ] `stopTimer()` - Bouton
- [ ] `saveGame()` / `loadGame()` - Input nom + 2 boutons
- [ ] `autoCalculateScore()` - Bouton
- [ ] `loadPredefinedGame()` - Dropdown + bouton

#### Game Board - Actions Joueur
- [ ] `drawBottomCard()` - Bouton "Piocher du bas"
- [ ] `takeFromDiscard()` - Bouton "Prendre défausse"

**Estimation** : 3-4 jours de dev

---

## 🔧 Phase 3 : UI Avancée (Semaines 4-5)

### GM Control Panel - Sections Restantes

#### Section "📦 Zones"
- [ ] `createZone()` - Modal avec form complet
- [ ] `deleteZone()` - Dropdown + bouton
- [ ] `repositionZone()` - Inputs (x,y,w,h)
- [ ] `updateZoneConfig()` - Form visibilité/capacité
- [ ] `toggleZone()` - Toggle activer/désactiver

#### Section "👁️ Visibilité"
- [ ] `toggleOpenGame()` - Toggle global
- [ ] `showHandToPlayer()` - 2 dropdowns
- [ ] `hideOwnCards()` / `revealOwnCards()` - Dropdown + 2 boutons

#### Section "🎯 Fin de Tour & Centre"
- [ ] `cardsToDiscard()` - Bouton "Centre → Défausse"
- [ ] `cardsToPlayer()` - Dropdown joueur + bouton
- [ ] `cardsStayCenter()` - Bouton confirmation
- [ ] `cardsToDeck()` - Bouton "Centre → Deck"
- [ ] `returnCards()` - Dropdown + bouton

#### Section "🎮 Distribution Avancée"
- [ ] `assignToPlayer()` - Dropdown + bouton
- [ ] `assignFaceChoice()` - Toggle
- [ ] `distributeCategory()` - Dropdown catégorie + input
- [ ] `distributeBatch()` / `distributeToZone()` - Dropdown zone
- [ ] `redistribute()` - Input + bouton

#### Section "🏆 Scoring Avancé"
- [ ] `setFirstPlayer()` - Dropdown + bouton
- [ ] `declareRoundWinner()` - Dropdown + input points
- [ ] `cancelDeclaration()` - Bouton

#### Section "⚙️ Paramètres"
- [ ] `updateRules()` - Textarea markdown
- [ ] `toggleRoundPersist()` - Toggle
- [ ] `undoAction()` - Bouton (avec historique)

#### Section "🎨 Marquage"
- [ ] `markCard()` - Sélecteur carte + type/valeur
- [ ] `unmarkCard()` - Sélecteur + bouton

### Nouveau Component : Zone Manager
- [ ] Créer `components/zone-manager.tsx`
- [ ] Interface drag-and-drop pour zones
- [ ] Preview temps réel
- [ ] Intégration dans GameBoard

**Estimation** : 7-10 jours de dev

---

## 🧪 Phase 4 : Tests (Semaine 6)

### Tests Unitaires Primitives

Créer des tests pour chaque catégorie :

```
__tests__/primitives/
  ├── p0-distribution.test.ts (4 tests)
  ├── p0-card-actions.test.ts (8 tests)
  ├── p0-end-of-turn.test.ts (4 tests)
  ├── p0-scoring.test.ts (4 tests)
  ├── p0-game-management.test.ts (4 tests)
  ├── p1-advanced-distribution.test.ts (3 tests)
  ├── p1-advanced-deck.test.ts (5 tests)
  ├── p1-zone-management.test.ts (4 tests)
  ├── p1-visibility.test.ts (2 tests)
  ├── p2-timer.test.ts (2 tests)
  ├── p2-save-load.test.ts (2 tests)
  └── p2-import-export.test.ts (2 tests)
```

**Objectif** : ~75 tests unitaires (1 par primitive minimum)

### Tests d'Intégration

```
__tests__/integration/
  ├── game-workflow-poker.test.ts
  ├── game-workflow-uno.test.ts
  └── game-workflow-belote.test.ts
```

### Tests E2E (Playwright)

```
__tests__/e2e/
  ├── multiplayer-sync.test.ts
  └── permissions-guest-auth.test.ts
```

**Estimation** : 5 jours de dev

---

## 📖 Phase 5 : Documentation (Semaine 7)

### Guides à créer

- [ ] `docs/USER_GUIDE.md` - Guide utilisateur complet
- [ ] `docs/PRIMITIVES_API.md` - Référence API complète
- [ ] `docs/PREDEFINED_GAMES.md` - Guide jeux prédéfinis + exemples
- [ ] `docs/IMPORT_EXPORT.md` - Format import/export decks
- [ ] `docs/MIGRATION_GUIDE.md` - Guide migration v1 → v2

### Exemples de Jeux Prédéfinis

Créer des configurations complètes pour :
- [ ] Poker Texas Hold'em
- [ ] UNO
- [ ] Belote
- [ ] Tarot
- [ ] Rami

**Estimation** : 3-4 jours de dev

---

## 🚀 Phase 6 : Production (Semaine 8)

### Optimisations

- [ ] Audit performance des requêtes
- [ ] Ajouter index manquants
- [ ] Optimiser real-time subscriptions
- [ ] Pagination pour les snapshots/logs

### Sécurité

- [ ] Audit RLS policies complètes
- [ ] Rate limiting sur actions coûteuses
- [ ] Validation stricte des inputs
- [ ] Sanitization markdown

### Monitoring

- [ ] Logger toutes les primitives
- [ ] Dashboard analytics usage
- [ ] Alertes erreurs critiques
- [ ] Métriques temps d'exécution

**Estimation** : 5 jours de dev

---

## 📈 Jalons (Milestones)

| Jalon | Date Cible | Critères de Succès |
|-------|------------|-------------------|
| **M1: Migrations** | Semaine 1 | ✅ Tables créées, actions migrées, tests OK |
| **M2: UI Essentielle** | Semaine 3 | ✅ 40+ primitives intégrées, UI testée |
| **M3: UI Complète** | Semaine 5 | ✅ 75/75 primitives avec UI |
| **M4: Tests** | Semaine 6 | ✅ Coverage ≥80%, E2E passent |
| **M5: Documentation** | Semaine 7 | ✅ Guides complets, exemples jeux |
| **M6: Production** | Semaine 8 | ✅ Audit sécurité, monitoring actif |

---

## 🎯 Objectifs Finaux

- ✅ **100% Primitives UI** : Toutes les 75 primitives accessibles via l'interface
- ✅ **Coverage ≥80%** : Tests unitaires + intégration solides
- ✅ **Documentation Complète** : Guide utilisateur + API + exemples
- ✅ **0 Workarounds** : Toutes les fonctionnalités en base de données
- ✅ **3+ Jeux Prédéfinis** : Poker, UNO, Belote minimum
- ✅ **Production Ready** : Sécurité, performance, monitoring

---

## 📝 Notes

### Dépendances Critiques

1. **Migrations avant UI** : Certaines UI nécessitent les migrations (grouping, reveal, undo)
2. **Tests avant Production** : Pas de déploiement sans 80% coverage
3. **Documentation en parallèle** : Rédiger en même temps que le dev UI

### Points d'Attention

- **Backward Compatibility** : Les games existantes doivent continuer à fonctionner
- **Performance Real-time** : Surveiller l'impact des nouvelles tables sur subscriptions
- **UX Cohérente** : Toutes les actions doivent suivre le même pattern UI

---

**Dernière mise à jour** : 2026-10-27
**Prochaine étape** : Appliquer les migrations sur Supabase
