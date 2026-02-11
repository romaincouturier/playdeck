# Plan de Migration PlayDeck v1 → v2

**Version cible :** 2.0.0
**Date :** 2026-02-11
**Type :** Refonte complète (breaking changes)

---

## 📋 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Checklist des Fonctionnalités](#checklist-des-fonctionnalités)
3. [Plan d'Implémentation](#plan-dimplémentation)
4. [Migration des Données](#migration-des-données)
5. [Stratégie de Déploiement](#stratégie-de-déploiement)
6. [Rollback](#rollback)

---

## 🎯 Vue d'Ensemble

### Philosophie v2

PlayDeck v2 devient un **moteur universel** où le Maître du Jeu (MJ) compose des **primitives atomiques** pour créer n'importe quel jeu de cartes. Le moteur ne connaît aucune règle : il fournit uniquement des briques de base.

### Changements Majeurs

| Aspect | v1 | v2 |
|--------|-----|-----|
| **Architecture** | Monolithique | Modulaire (primitives) |
| **Rôles** | Tous égaux | MJ omniscient + Joueurs |
| **Règles** | Codées (TURN_BASED) | Zéro règle codée |
| **Actions** | 3 fixes | 70+ primitives composables |
| **Zones** | Fixes (deck, hand, discard) | Dynamiques configurables |
| **Distribution** | Auto (5 cartes) | Manuelle carte par carte |
| **Tours** | Auto (ordre fixe) | MJ décide qui joue quand |
| **Visibilité** | Main privée | Configurable par zone |
| **Décks** | Images seules | + Catégories, valeurs numériques |
| **Fin partie** | Hôte termine | MJ déclare vainqueur |

### Impact

- ❌ **Incompatibilité totale** avec v1
- ❌ **Pas de migration automatique** des parties en cours
- ✅ **Migration manuelle** des decks possible
- ✅ **Base de code nettoyée** et extensible

---

## ✅ Checklist des Fonctionnalités

### P0 - MVP (50 specs) - Implémentation prioritaire

**Objectif :** Permettre de jouer à des jeux simples (Bataille, jeux de plis basiques)

#### Configuration Tapis (TAP-*)
- [x] TAP-01: Couleur du tapis (TapConfig)
- [ ] TAP-05: Propriétés d'emplacement (zones avec config)

#### Création Deck (DEC-*)
- [x] DEC-01: Deck standard (32, 52 cartes)
- [x] DEC-02: Deck personnalisé (images custom)
- [x] DEC-03: Catégories de cartes (card_categories)

#### Mélange (MEL-*)
- [x] MEL-01: Mélanger deck (primitive SHUFFLE_DECK)
- [x] MEL-04: Ne pas mélanger (option)

#### Distribution (DIS-*)
- [x] DIS-01: Révéler première carte (REVEAL_TOP_CARD)
- [x] DIS-02: Attribuer à joueur (ASSIGN_TO_PLAYER)
- [x] DIS-03: Choix face visible/cachée (ASSIGN_FACE_CHOICE)
- [x] DIS-04: Distribution par catégorie (DISTRIBUTE_CATEGORY)
- [x] DIS-06: Visibilité post-donne (zone.visibility)

#### Affichage Règles (REG-*)
- [x] REG-01: Saisir règles (game_rules_text.markdown)
- [x] REG-02: Afficher règles (UI panneau)

#### Gestion Tours (TOU-*)
- [x] TOU-01: Désigner premier joueur (SET_FIRST_PLAYER)
- [x] TOU-02: Premier aléatoire (RANDOM_FIRST_PLAYER)
- [x] TOU-03: Passer la main (PASS_TURN)
- [x] TOU-04: Passer à joueur spécifique (PASS_TO_PLAYER)

#### Actions Cartes (ACT-*)
- [x] ACT-01: Poser au centre (PLAY_TO_CENTER)
- [x] ACT-02: Défausser (DISCARD)
- [x] ACT-05: Piocher dessus (DRAW_TOP)
- [x] ACT-08: Prendre défausse (TAKE_FROM_DISCARD)
- [x] ACT-09: Prendre du centre (TAKE_FROM_CENTER)
- [x] ACT-10: Retourner carte (FLIP_CARD)
- [x] ACT-16: Passer son tour (SKIP_TURN)

#### Fin de Tour (FDT-*)
- [x] FDT-01: Cartes → défausse (CARDS_TO_DISCARD)
- [x] FDT-02: Cartes → joueur (pli) (CARDS_TO_PLAYER)
- [x] FDT-03: Cartes restent centre (CARDS_STAY_CENTER)
- [x] FDT-05: Rendre cartes (RETURN_CARDS)

#### Gestion Défausse (DEF-*)
- [x] DEF-01: Activer/désactiver (zone.isEnabled)
- [x] DEF-02: Visibilité défausse (zone.visibility)
- [x] DEF-03: Piocher dans défausse (TAKE_FROM_DISCARD)

#### Visibilité (VIS-*)
- [x] VIS-01: MJ omniscient (GameMaster.omniscientMode)
- [x] VIS-02: Joueur voit sa main (zone.visibility = OWNER)

#### Scoring (SCO-*)
- [x] SCO-01: Ajouter/retirer points (ADD_POINTS, REMOVE_POINTS)
- [x] SCO-03: Tableau scores (game_players.score)
- [x] SCO-04: Vainqueur manche (DECLARE_ROUND_WINNER)
- [x] SCO-05: Vainqueur partie (DECLARE_GAME_WINNER)

#### Gestion Partie (PAR-*)
- [x] PAR-01: Nouvelle donne (NEW_ROUND)
- [x] PAR-02: Donne persistante (TOGGLE_ROUND_PERSIST)
- [x] PAR-03: Rappeler cartes (RECALL_ALL_CARDS)
- [x] PAR-04: Terminer partie (END_GAME)

#### Multijoueur (MUL-*)
- [x] MUL-01: Créer partie (CreateGameV2)
- [x] MUL-02: Rejoindre (JoinGameV2)
- [x] MUL-03: MJ joue ou non (GameMaster.isPlaying)
- [x] MUL-04: Synchro temps réel (Supabase Realtime)

**Total P0 :** 42/50 specs architecturées ✅

---

### P1 - Confort (28 specs) - Extension de jeux

**Objectif :** Permettre de jouer à des jeux avancés (Belote, Rami, Poker)

#### Configuration Tapis (TAP-*)
- [x] TAP-02: Créer emplacement (CREATE_ZONE)
- [x] TAP-03: Supprimer emplacement (DELETE_ZONE)
- [x] TAP-04: Repositionner (REPOSITION_ZONE)
- [x] TAP-05: Propriétés emplacement (UPDATE_ZONE_CONFIG)

#### Création Deck (DEC-*)
- [x] DEC-04: Multi-deck (fusion JSON)
- [x] DEC-06: Valeurs numériques (cards.numeric_values)
- [x] DEC-07: Ajouter/retirer cartes (ADD_CARDS_TO_DECK, REMOVE_CARDS_FROM_DECK)

#### Mélange (MEL-*)
- [x] MEL-02: Mélange partiel (SHUFFLE_ZONE)
- [x] MEL-03: Couper deck (CUT_DECK)

#### Distribution (DIS-*)
- [x] DIS-05: Distribution rapide (DISTRIBUTE_BATCH)
- [x] DIS-07: Distribution vers zone (DISTRIBUTE_TO_ZONE)
- [x] DIS-08: Redistribuer (REDISTRIBUTE)

#### Règles (REG-*)
- [x] REG-04: Modifier en cours (game_rules_text.updated_at)

#### Tours (TOU-*)
- [x] TOU-05: Inverser sens (REVERSE_DIRECTION)
- [x] TOU-06: Sauter joueur (SKIP_PLAYER)
- [x] TOU-08: Pause (PAUSE_GAME, RESUME_GAME)

#### Actions Cartes (ACT-*)
- [x] ACT-03: Remettre pioche (RETURN_TO_DECK)
- [x] ACT-04: Donner à joueur (GIVE_TO_PLAYER)
- [x] ACT-06: Piocher dessous (DRAW_BOTTOM)
- [x] ACT-07: Piocher carte précise (DRAW_SPECIFIC)
- [x] ACT-11: Révéler à tous (REVEAL_TO_ALL)
- [x] ACT-12: Révéler à joueur (REVEAL_TO_PLAYER)
- [x] ACT-13: Grouper cartes (GROUP_CARDS)
- [x] ACT-14: Dégrouper (UNGROUP_CARDS)
- [x] ACT-15: Échanger (EXCHANGE_CARDS)

#### Fin de Tour (FDT-*)
- [x] FDT-04: Cartes → pioche (CARDS_TO_DECK)

#### Visibilité (VIS-*)
- [x] VIS-03: Voir main autre (SHOW_HAND_TO_PLAYER)
- [x] VIS-04: Jeu ouvert (TOGGLE_OPEN_GAME)

#### Défausse (DEF-*)
- [x] DEF-04: Recycler défausse (RECYCLE_DISCARD, fonction SQL)

#### Scoring (SCO-*)
- [x] SCO-06: Annuler déclaration (CANCEL_DECLARATION)

#### Gestion Partie (PAR-*)
- [x] PAR-05: Historique actions (primitive_actions table)
- [x] PAR-06: Annuler action (UNDO_ACTION)

#### Multijoueur (MUL-*)
- [x] MUL-05: Reconnexion (guest_session_id persistant)

**Total P1 :** 28/28 specs architecturées ✅

---

### P2 - Évolutions (14 specs) - Fonctionnalités avancées

**Objectif :** IA, spectateurs, imports, scoring auto

#### Deck (DEC-*)
- [x] DEC-05: Dupliquer deck (déjà existe v1)
- [x] DEC-08: Importer deck (IMPORT_DECK, EXPORT_DECK)

#### Règles (REG-*)
- [x] REG-03: Règles prédéfinies (LOAD_PREDEFINED_GAME, table predefined_games)

#### Tours (TOU-*)
- [x] TOU-07: Timer (START_TIMER, STOP_TIMER, turn_state.timer_seconds)

#### Visibilité (VIS-*)
- [x] VIS-05: Cacher cartes (HIDE_OWN_CARDS, REVEAL_OWN_CARDS)

#### Scoring (SCO-*)
- [x] SCO-02: Score automatique (AUTO_CALCULATE_SCORE, fonction SQL)

#### Gestion Partie (PAR-*)
- [x] PAR-07: Sauvegarder partie (SAVE_GAME, LOAD_GAME, table game_snapshots)

#### Marquage Visuel (MAR-*)
- [x] MAR-01: Marquer carte (MARK_CARD)
- [x] MAR-02: Retirer marquage (UNMARK_CARD)

#### Multijoueur (MUL-*)
- [x] MUL-06: Spectateurs (role = 'SPECTATOR')

#### IA comme MJ (IAM-*)
- [ ] IAM-01: Charger jeu connu (intégration future avec Claude API)
- [ ] IAM-02: Valider coups (logique IA)
- [ ] IAM-03: Calculer scores (via AUTO_CALCULATE_SCORE)
- [ ] IAM-04: Suggérer actions (logique IA)

**Total P2 :** 10/14 specs architecturées (IA reportée en v2.1)

---

## 🏗️ Plan d'Implémentation

### Phase 0 : Préparation (1 semaine)

**Objectif :** Mettre en place l'infrastructure

- [ ] Appliquer migration SQL sur Supabase
- [ ] Vérifier toutes les tables créées
- [ ] Tester triggers et fonctions SQL
- [ ] Configurer RLS policies
- [ ] Seed data : 2 jeux prédéfinis (Bataille, Uno)

**Livrable :** Base de données v2 opérationnelle

---

### Phase 1 : Core Engine (2 semaines)

**Objectif :** Moteur de base fonctionnel (P0)

#### Semaine 1 : Zones & MJ

**Backend (lib/)**
- [ ] `lib/v2/zones/` - CRUD zones dynamiques
  - [ ] `createZone(game, config)`
  - [ ] `updateZone(zoneId, updates)`
  - [ ] `deleteZone(zoneId)`
  - [ ] `getZonesByGame(gameId)`
  - [ ] `getZoneCards(zoneId)`

- [ ] `lib/v2/game-master/` - Gestion MJ
  - [ ] `assignGameMaster(game, user)`
  - [ ] `checkGMPermissions(user, game, action)`
  - [ ] `isGameMaster(user, game)`

- [ ] `lib/v2/state/` - État de jeu
  - [ ] `getGameStateV2(gameId, viewerId)`
  - [ ] `getGMView(gameId, gmId)`
  - [ ] `getPlayerView(gameId, playerId)`

**Server Actions (app/v2/actions/)**
- [ ] `app/v2/games/actions.ts` - Actions partie
  - [ ] `createGameV2(params)`
  - [ ] `joinGameV2(params)`
  - [ ] `startGameV2(params)`

- [ ] `app/v2/zones/actions.ts` - Actions zones
  - [ ] `executeCreateZone(gameId, config)`
  - [ ] `executeDeleteZone(zoneId)`
  - [ ] `executeUpdateZone(zoneId, updates)`

**Hooks (hooks/v2/)**
- [ ] `useGameStateV2(gameId)`
- [ ] `useIsGameMaster()`
- [ ] `useZones(gameId)`
- [ ] `useGMPermissions()`

**Tests**
- [ ] Tests zones CRUD
- [ ] Tests permissions MJ
- [ ] Tests RLS policies
- [ ] Tests création partie v2

**Livrable :** Zones dynamiques + Rôle MJ fonctionnels

#### Semaine 2 : Primitives de base

**Backend (lib/v2/primitives/)**
- [ ] `lib/v2/primitives/engine.ts` - Moteur primitives
  - [ ] `executePrimitive(action, gameState)`
  - [ ] `validatePrimitive(action, actor, gameState)`
  - [ ] `logPrimitive(action)`

- [ ] `lib/v2/primitives/distribution.ts` - Primitives distribution
  - [ ] `executeRevealTopCard()`
  - [ ] `executeAssignToPlayer()`
  - [ ] `executeDistributeCategory()`

- [ ] `lib/v2/primitives/cards.ts` - Primitives cartes
  - [ ] `executePlayToCenter()`
  - [ ] `executeDiscard()`
  - [ ] `executeDrawTop()`
  - [ ] `executeFlipCard()`

- [ ] `lib/v2/primitives/turns.ts` - Primitives tours
  - [ ] `executeSetFirstPlayer()`
  - [ ] `executePassTurn()`
  - [ ] `executePassToPlayer()`

- [ ] `lib/v2/primitives/scoring.ts` - Primitives scoring
  - [ ] `executeAddPoints()`
  - [ ] `executeDeclareWinner()`

**Server Actions**
- [ ] `app/v2/primitives/actions.ts` - Exécuter primitives
  - [ ] `executePrimitiveAction(action)`
  - [ ] `undoLastAction(gameId)`

**Tests**
- [ ] Tests chaque primitive P0
- [ ] Tests validation permissions
- [ ] Tests log actions
- [ ] Tests undo

**Livrable :** 15 primitives P0 opérationnelles

---

### Phase 2 : UI Maître du Jeu (2 semaines)

**Objectif :** Interface MJ complète (P0)

#### Semaine 3 : Panneau Contrôle MJ

**Composants (components/v2/gm/)**
- [ ] `<GMControlPanel />` - Panneau principal MJ
- [ ] `<GMDistributionPanel />` - Onglet distribution
  - [ ] Bouton "Révéler carte suivante"
  - [ ] Liste joueurs avec bouton "Attribuer"
  - [ ] Carte révélée affichée
  - [ ] Choix face visible/cachée

- [ ] `<GMTurnsPanel />` - Onglet tours
  - [ ] Sélection premier joueur
  - [ ] Bouton "Passer au suivant"
  - [ ] Bouton "Donner main à..."
  - [ ] Indicateur joueur actif

- [ ] `<GMScoringPanel />` - Onglet scoring
  - [ ] Tableau scores joueurs
  - [ ] Inputs ajouter/retirer points
  - [ ] Bouton "Déclarer vainqueur manche"
  - [ ] Bouton "Déclarer vainqueur partie"

- [ ] `<GMZonesPanel />` - Onglet zones
  - [ ] Liste zones avec cartes
  - [ ] Bouton "Créer zone"
  - [ ] Actions sur zone (modifier, supprimer)

- [ ] `<GMHistoryPanel />` - Onglet historique
  - [ ] Log actions avec timestamps
  - [ ] Bouton "Annuler dernière action"
  - [ ] Filtres par type d'action

- [ ] `<GMRulesPanel />` - Onglet règles
  - [ ] Éditeur markdown
  - [ ] Aperçu temps réel
  - [ ] Bouton "Sauvegarder règles"

**Composants Communs**
- [ ] `<GMBadge />` - Badge "MJ" visible
- [ ] `<TurnIndicator />` - Indicateur tour actuel
- [ ] `<CardRevealDisplay />` - Carte révélée centre

**Tests**
- [ ] Tests composants MJ
- [ ] Tests intégration panneau
- [ ] Tests E2E distribution

**Livrable :** Panneau MJ complet et fonctionnel

#### Semaine 4 : UI Plateau de Jeu

**Composants (components/v2/game/)**
- [ ] `<GameBoardV2 />` - Plateau principal
- [ ] `<ZoneDisplay zone={zone} />` - Affichage zone
  - [ ] Variantes par type (DECK, HAND, CENTER, DISCARD)
  - [ ] Respect visibilité
  - [ ] Affichage cartes face visible/cachée

- [ ] `<PlayerHandV2 />` - Main du joueur
  - [ ] Sélection carte
  - [ ] Menu contextuel actions
  - [ ] Drag & drop (futur)

- [ ] `<CenterZone />` - Zone centrale
  - [ ] Affichage cartes jouées
  - [ ] Emplacements nommés
  - [ ] Grille responsive

- [ ] `<DeckZone />` - Zone pioche
  - [ ] Compteur cartes
  - [ ] Bouton piocher
  - [ ] Animation pioche

- [ ] `<ScoreboardV2 />` - Tableau scores
  - [ ] Scores joueurs
  - [ ] Leaderboard
  - [ ] Indicateur vainqueur

- [ ] `<RulesViewer />` - Panneau règles
  - [ ] Markdown rendu
  - [ ] Collapsible
  - [ ] Toujours accessible

**Composants Actions**
- [ ] `<CardActionMenu card={card} />` - Menu contextuel
  - [ ] Actions filtrées selon permissions
  - [ ] Confirmation actions critiques

- [ ] `<ActionButton action={action} />` - Bouton action
  - [ ] Disabled si non autorisé
  - [ ] Loading state
  - [ ] Success feedback

**Tests**
- [ ] Tests composants UI
- [ ] Tests visibilité cartes
- [ ] Tests E2E partie complète

**Livrable :** UI complète joueur + MJ

---

### Phase 3 : Features P1 (2 semaines)

**Objectif :** Fonctionnalités de confort

#### Semaine 5 : Primitives P1

**Nouvelles primitives**
- [ ] Distribution rapide (DISTRIBUTE_BATCH)
- [ ] Groupage cartes (GROUP_CARDS, UNGROUP_CARDS)
- [ ] Mélange partiel (SHUFFLE_ZONE)
- [ ] Emplacements tapis (CREATE_ZONE custom)
- [ ] Visibilité avancée (SHOW_HAND_TO_PLAYER)
- [ ] Recycler défausse (RECYCLE_DISCARD)

**UI**
- [ ] Composant `<CardGroup />` - Affichage groupe
- [ ] Composant `<ZoneCreator />` - Créateur zone custom
- [ ] Modal "Distribuer N cartes"
- [ ] Modal "Montrer main à..."

**Tests**
- [ ] Tests primitives P1
- [ ] Tests groupage
- [ ] Tests visibilité avancée

**Livrable :** Features P1 essentielles

#### Semaine 6 : Undo & Historique

**Backend**
- [ ] Système undo complet
- [ ] Validation actions annulables
- [ ] Reconstruction état

**UI**
- [ ] Panneau historique enrichi
- [ ] Timeline actions
- [ ] Preview état avant undo

**Tests**
- [ ] Tests undo multi-actions
- [ ] Tests edge cases

**Livrable :** Historique complet avec undo

---

### Phase 4 : Features P2 (2 semaines)

**Objectif :** Fonctionnalités avancées

#### Semaine 7 : Sauvegarde & Jeux Prédéfinis

**Backend**
- [ ] Système sauvegarde snapshots
- [ ] Chargement partie sauvegardée
- [ ] Bibliothèque jeux prédéfinis
- [ ] Import/Export decks JSON

**UI**
- [ ] Modal "Sauvegarder partie"
- [ ] Sélecteur jeux prédéfinis
- [ ] Import/Export deck
- [ ] Liste snapshots

**Seed Data**
- [ ] 10 jeux prédéfinis (Belote, Poker, Tarot, Rami, etc.)

**Tests**
- [ ] Tests sauvegarde/chargement
- [ ] Tests jeux prédéfinis

**Livrable :** Sauvegarde + Bibliothèque jeux

#### Semaine 8 : Scoring Auto & Marquage

**Backend**
- [ ] Calcul automatique score
- [ ] Marquage visuel cartes
- [ ] Timer tours

**UI**
- [ ] Composant `<CardMark />` - Badges visuels
- [ ] Modal calcul auto score
- [ ] Timer countdown

**Tests**
- [ ] Tests scoring auto
- [ ] Tests timer

**Livrable :** Features P2 complètes

---

### Phase 5 : Tests & Polish (1 semaine)

**Objectif :** Stabilisation et qualité

- [ ] Tests E2E complets
  - [ ] Partie Bataille complète
  - [ ] Partie Belote complète
  - [ ] Partie Poker complète
- [ ] Tests performance
  - [ ] Parties 6 joueurs
  - [ ] 1000 actions primitives
- [ ] Accessibility
  - [ ] Navigation clavier
  - [ ] Screen readers
  - [ ] ARIA labels
- [ ] Documentation
  - [ ] Guide utilisateur MJ
  - [ ] Guide utilisateur joueur
  - [ ] API reference
- [ ] Traductions
  - [ ] FR, EN, ES, DE complets

**Livrable :** Application production-ready

---

## 💾 Migration des Données

### Données Conservées

**Decks v1 → v2**
- [x] Nom, description
- [x] Images cartes
- [x] Position cartes
- [ ] **Nouveau :** Catégories (manuel)
- [ ] **Nouveau :** Valeurs numériques (manuel)

**Utilisateurs**
- [x] Comptes auth
- [x] Sessions invités

### Données Perdues

❌ **Parties en cours v1** - Incompatibles, doivent être terminées avant migration
❌ **Historique parties v1** - Pas migré
❌ **Scores v1** - Système différent

### Script de Migration

```sql
-- Migration decks v1 → v2 (manuel via UI)
-- Pas de migration automatique recommandée car changements structurels importants

-- Option 1 : Export/Import manuel
-- 1. User exporte deck v1 en JSON
-- 2. Admin adapte JSON au format v2
-- 3. User importe deck v2

-- Option 2 : Recréation manuelle
-- L'utilisateur recrée ses decks dans v2 (interface améliorée)
```

### Checklist Migration Données

- [ ] Communiquer aux utilisateurs 2 semaines avant
- [ ] Fournir outil export decks v1
- [ ] Terminer toutes parties v1 en cours
- [ ] Backup complet base v1
- [ ] Appliquer migration SQL v2
- [ ] Permettre import decks
- [ ] Vérifier intégrité données

---

## 🚀 Stratégie de Déploiement

### Option A : Big Bang (Recommandé pour MVP)

**Avantages :** Refonte propre, pas de code legacy
**Inconvénients :** Downtime nécessaire

1. **Annonce** : 2 semaines avant
2. **Freeze v1** : 48h avant (plus de nouvelles parties)
3. **Backup** : Snapshot complet v1
4. **Migration** : Appliquer SQL v2 (30min)
5. **Déploiement** : Frontend v2 (1h)
6. **Tests** : Smoke tests (2h)
7. **Go Live** : Ouverture v2

**Downtime total :** ~4h

### Option B : Blue-Green (Si v1 doit rester accessible)

**Avantages :** Zero downtime
**Inconvénients :** Infrastructure double

1. Déployer v2 sur nouveau domaine (`v2.playdeck.com`)
2. Garder v1 actif (`playdeck.com`)
3. Permettre migration progressive utilisateurs
4. Après 1 mois : redirection v1 → v2
5. Décommission v1

**Coût :** Double infrastructure pendant 1 mois

### Option Recommandée

**Big Bang** car :
- MVP, pas de clients payants critiques
- Refonte totale de toute façon
- Downtime acceptable (4h nuit)
- Moins complexe techniquement

---

## 🔙 Rollback

### Plan de Rollback

**Si problème critique détecté < 2h après déploiement :**

1. **Arrêter app v2**
2. **Restaurer backup base v1**
3. **Redéployer code v1**
4. **Tester smoke tests v1**
5. **Communiquer aux utilisateurs**
6. **Analyser problème**

**Durée estimée :** 30 minutes

### Critères de Rollback

- Impossibilité de créer partie
- Crash serveur récurrent
- Perte de données détectée
- Faille sécurité critique

### Backups Nécessaires

- [x] Dump SQL complet v1
- [x] Snapshot storage Supabase
- [x] Tag Git version v1
- [x] Build frontend v1

---

## 📊 Récapitulatif Chiffres

### Développement

| Phase | Durée | Livrables |
|-------|-------|-----------|
| Préparation | 1 semaine | BDD v2 |
| Core Engine | 2 semaines | Zones, MJ, Primitives P0 |
| UI MJ | 2 semaines | Panneau MJ, Plateau |
| Features P1 | 2 semaines | Confort |
| Features P2 | 2 semaines | Avancé |
| Tests & Polish | 1 semaine | Production |
| **TOTAL** | **10 semaines** | **v2.0.0 complète** |

### Complexité Code

| Métrique | v1 | v2 |
|----------|-----|-----|
| Tables BDD | 9 | 16 (+7) |
| Types TS | ~500 lignes | ~2500 lignes |
| Primitives | 3 | 70+ |
| Composants UI | ~25 | ~60 |
| Tests | 17 (76%) | ~200 (objectif 85%) |

### Fonctionnalités

- **P0 :** 42/50 specs (84%) ✅
- **P1 :** 28/28 specs (100%) ✅
- **P2 :** 10/14 specs (71%) - IA reportée v2.1

**Total général :** 80/92 specs (87%) architecturées

---

## ✅ Prochaines Étapes Immédiates

1. **Valider ce plan** avec l'équipe
2. **Appliquer migration SQL** sur environnement dev
3. **Tester triggers et fonctions SQL**
4. **Commencer Phase 1** (Zones + MJ)
5. **Setup CI/CD** pour v2
6. **Créer environnement staging** v2

---

**Document créé :** 2026-02-11
**Version :** 1.0
**Auteur :** Claude Code (Architecture v2)
**Statut :** Prêt pour implémentation
