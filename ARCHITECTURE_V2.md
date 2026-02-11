# Architecture v2 - Moteur Universel de Jeu de Cartes

## 🎯 Vue d'ensemble de la refonte

### Philosophie v2
**PlayDeck v2** devient un **moteur universel** où le Maître du Jeu (MJ) compose des primitives atomiques pour créer n'importe quel jeu de cartes. Le moteur ne connaît aucune règle de jeu : il fournit uniquement des actions de base que le MJ orchestre.

### Changements majeurs vs v1

| Aspect | v1 | v2 |
|--------|-----|-----|
| **Rôle** | Tous égaux | MJ omniscient + Joueurs |
| **Règles** | Codées (TURN_BASED) | Aucune règle codée, MJ arbitre |
| **Actions** | 3 fixes (DRAW, PLAY, PASS) | 40+ primitives composables |
| **Zones** | Fixes (deck, hand, discard) | Dynamiques et configurables |
| **Distribution** | Auto (5 cartes) | Manuelle carte par carte |
| **Tours** | Auto (ordre fixe) | MJ décide qui joue quand |
| **Visibilité** | Main privée uniquement | Configurable par zone |
| **Fin de partie** | Hôte termine | MJ déclare vainqueur |

---

## 📊 Schéma Base de Données v2

### Nouvelles tables

#### `game_master` - Configuration MJ
```sql
CREATE TABLE game_master (
  game_id UUID PRIMARY KEY REFERENCES games(id),
  user_id UUID REFERENCES auth.users(id),
  is_playing BOOLEAN DEFAULT false,
  omniscient_mode BOOLEAN DEFAULT true,
  can_undo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `zones` - Zones dynamiques (refonte)
```sql
CREATE TABLE zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id),
  name TEXT NOT NULL, -- "Pioche", "Main J1", "Centre", "Atout"
  type TEXT NOT NULL, -- 'DECK', 'HAND', 'CENTER', 'DISCARD', 'CUSTOM'

  -- Propriétés de visibilité
  visibility TEXT DEFAULT 'PRIVATE', -- 'PRIVATE', 'OWNER', 'ALL', 'GM_ONLY'
  default_face TEXT DEFAULT 'HIDDEN', -- 'VISIBLE', 'HIDDEN'

  -- Propriétés de capacité
  is_ordered BOOLEAN DEFAULT true,
  max_capacity INTEGER, -- NULL = illimité

  -- Propriétés de zone
  owner_player_id UUID REFERENCES game_players(id), -- NULL = zone globale
  is_enabled BOOLEAN DEFAULT true,

  -- Position visuelle (pour emplacements sur tapis)
  position_x INTEGER,
  position_y INTEGER,
  width INTEGER,
  height INTEGER,

  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `card_categories` - Catégories de cartes (DEC-03)
```sql
CREATE TABLE card_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id UUID REFERENCES decks(id),
  name TEXT NOT NULL, -- "Atouts", "Honneurs", "Spéciales"
  color TEXT,
  icon TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Junction table pour catégories multiples
CREATE TABLE card_category_membership (
  card_id UUID REFERENCES cards(id),
  category_id UUID REFERENCES card_categories(id),
  PRIMARY KEY (card_id, category_id)
);
```

#### `primitive_actions` - Log des actions primitives
```sql
CREATE TABLE primitive_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id),
  actor_id UUID REFERENCES game_players(id), -- Qui a fait l'action (MJ ou joueur)
  action_type TEXT NOT NULL, -- 'REVEAL_TOP', 'ASSIGN_TO_PLAYER', 'POSE_CENTER', etc.

  -- Payload de l'action
  card_ids UUID[], -- Cartes concernées
  source_zone_id UUID REFERENCES zones(id),
  target_zone_id UUID REFERENCES zones(id),
  target_player_id UUID REFERENCES game_players(id),

  -- Metadata
  face_visible BOOLEAN,
  parameters JSONB, -- Paramètres additionnels

  -- Undo
  can_be_undone BOOLEAN DEFAULT true,
  undone_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `game_rules_text` - Règles textuelles (REG-01)
```sql
CREATE TABLE game_rules_text (
  game_id UUID PRIMARY KEY REFERENCES games(id),
  rules_markdown TEXT, -- Règles en markdown
  game_name TEXT, -- Nom du jeu (Belote, Poker, etc.)
  predefined_game_id TEXT, -- ID jeu prédéfini si chargé depuis bibliothèque
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `turn_state` - État du système de tours
```sql
CREATE TABLE turn_state (
  game_id UUID PRIMARY KEY REFERENCES games(id),
  current_player_id UUID REFERENCES game_players(id),
  turn_order TEXT[] DEFAULT '{}', -- Array d'IDs joueurs dans l'ordre
  direction TEXT DEFAULT 'CLOCKWISE', -- 'CLOCKWISE', 'COUNTER_CLOCKWISE'
  turn_number INTEGER DEFAULT 1,
  timer_seconds INTEGER, -- NULL = pas de timer
  timer_started_at TIMESTAMP,
  is_paused BOOLEAN DEFAULT false,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `card_groups` - Groupes de cartes (ACT-13)
```sql
CREATE TABLE card_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id),
  name TEXT, -- "Brelan de 7", "Suite coeur"
  card_ids UUID[] NOT NULL,
  owner_player_id UUID REFERENCES game_players(id),
  zone_id UUID REFERENCES zones(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Modifications tables existantes

**`games` - Ajout champs MJ**
```sql
ALTER TABLE games ADD COLUMN game_master_id UUID REFERENCES auth.users(id);
ALTER TABLE games ADD COLUMN current_round INTEGER DEFAULT 1;
ALTER TABLE games ADD COLUMN game_mode TEXT DEFAULT 'UNIVERSAL'; -- Plus de TURN_BASED
ALTER TABLE games DROP COLUMN current_phase_id; -- Phases gérées par MJ
```

**`game_players` - Ajout rôle**
```sql
ALTER TABLE game_players ADD COLUMN role TEXT DEFAULT 'PLAYER'; -- 'GM', 'PLAYER', 'SPECTATOR'
ALTER TABLE game_players ADD COLUMN score INTEGER DEFAULT 0;
```

**`game_cards` - Simplification**
```sql
ALTER TABLE game_cards RENAME COLUMN location TO zone_id;
ALTER TABLE game_cards ADD COLUMN face_visible BOOLEAN DEFAULT false;
ALTER TABLE game_cards ADD COLUMN group_id UUID REFERENCES card_groups(id);
```

**`cards` - Ajout valeurs numériques (DEC-06)**
```sql
ALTER TABLE cards ADD COLUMN numeric_values JSONB DEFAULT '{}';
-- Ex: {"base": 7, "scoring": 10, "trump": 14}
```

---

## 🎮 Types TypeScript v2

### Primitives d'actions P0

```typescript
// types/primitives.types.ts

export type PrimitiveActionType =
  // Distribution (DIS-*)
  | 'REVEAL_TOP_CARD'      // DIS-01: Révéler carte du dessus
  | 'ASSIGN_TO_PLAYER'     // DIS-02: Attribuer à un joueur
  | 'DISTRIBUTE_BATCH'     // DIS-05: Distribution rapide N cartes
  | 'DISTRIBUTE_TO_ZONE'   // DIS-07: Distribuer vers zone

  // Actions sur cartes (ACT-*)
  | 'PLAY_TO_CENTER'       // ACT-01: Poser au centre
  | 'DISCARD'              // ACT-02: Défausser
  | 'RETURN_TO_DECK'       // ACT-03: Remettre dans pioche
  | 'DRAW_TOP'             // ACT-05: Piocher dessus
  | 'DRAW_BOTTOM'          // ACT-06: Piocher dessous
  | 'TAKE_FROM_DISCARD'    // ACT-08: Prendre de défausse
  | 'TAKE_FROM_CENTER'     // ACT-09: Prendre du centre
  | 'FLIP_CARD'            // ACT-10: Retourner face visible/cachée
  | 'REVEAL_TO_ALL'        // ACT-11: Révéler à tous
  | 'SKIP_TURN'            // ACT-16: Passer son tour

  // Fin de tour (FDT-*)
  | 'CARDS_TO_DISCARD'     // FDT-01: Envoyer cartes centre → défausse
  | 'CARDS_TO_PLAYER'      // FDT-02: Attribuer cartes centre → joueur
  | 'CARDS_STAY_CENTER'    // FDT-03: Laisser cartes au centre

  // Tours (TOU-*)
  | 'SET_FIRST_PLAYER'     // TOU-01: Désigner premier joueur
  | 'PASS_TURN'            // TOU-03: Passer la main
  | 'PASS_TO_PLAYER'       // TOU-04: Donner main à joueur spécifique

  // Scoring (SCO-*)
  | 'ADD_POINTS'           // SCO-01: Ajouter points
  | 'REMOVE_POINTS'        // SCO-01: Retirer points
  | 'DECLARE_ROUND_WINNER' // SCO-04: Vainqueur de manche
  | 'DECLARE_GAME_WINNER'  // SCO-05: Vainqueur de partie

  // Gestion partie (PAR-*)
  | 'NEW_ROUND'            // PAR-01: Nouvelle donne
  | 'RECALL_ALL_CARDS'     // PAR-03: Rappeler toutes cartes
  | 'END_GAME';            // PAR-04: Terminer partie

export interface PrimitiveAction {
  type: PrimitiveActionType;
  actorId: string; // ID du joueur ou MJ qui exécute

  // Paramètres selon type
  cardIds?: string[];
  sourceZoneId?: string;
  targetZoneId?: string;
  targetPlayerId?: string;
  faceVisible?: boolean;
  count?: number; // Pour distribution batch
  points?: number; // Pour scoring

  // Metadata
  parameters?: Record<string, any>;
  timestamp: string;
}
```

### Zones dynamiques

```typescript
// types/zones.types.ts

export type ZoneType =
  | 'DECK'      // Pioche
  | 'HAND'      // Main d'un joueur
  | 'CENTER'    // Centre/tapis
  | 'DISCARD'   // Défausse
  | 'CUSTOM';   // Zone personnalisée

export type ZoneVisibility =
  | 'PRIVATE'   // Personne ne voit
  | 'OWNER'     // Propriétaire seul
  | 'ALL'       // Tous les joueurs
  | 'GM_ONLY';  // MJ uniquement

export type CardFace = 'VISIBLE' | 'HIDDEN';

export interface DynamicZone {
  id: string;
  gameId: string;
  name: string;
  type: ZoneType;

  // Visibilité
  visibility: ZoneVisibility;
  defaultFace: CardFace;

  // Capacité
  isOrdered: boolean;
  maxCapacity?: number; // undefined = illimité

  // Propriétaire (null = zone globale)
  ownerPlayerId?: string;
  isEnabled: boolean;

  // Position visuelle (pour emplacements tapis)
  position?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  createdAt: string;
}
```

### Rôle MJ

```typescript
// types/game-master.types.ts

export interface GameMaster {
  gameId: string;
  userId: string;
  isPlaying: boolean; // MJ joue ou arbitre uniquement
  omniscientMode: boolean; // Voit toutes les cartes
  canUndo: boolean;
  createdAt: string;
}

export interface GameMasterPermissions {
  canSeeAllCards: boolean;
  canModifyZones: boolean;
  canDistribute: boolean;
  canControlTurns: boolean;
  canScoring: boolean;
  canUndo: boolean;
  canEndGame: boolean;
}
```

### État de jeu v2

```typescript
// types/game-state.types.ts

export interface GameStateV2 {
  game: {
    id: string;
    code: string;
    status: 'waiting' | 'playing' | 'finished';
    gameMasterId: string;
    currentRound: number;
    deckId: string;
  };

  gameMaster: GameMaster;

  players: Array<{
    id: string;
    userId?: string;
    guestSessionId?: string;
    name: string;
    role: 'GM' | 'PLAYER' | 'SPECTATOR';
    playerOrder: number;
    score: number;
    isActive: boolean;
  }>;

  zones: DynamicZone[];

  cards: Array<{
    id: string;
    cardId: string; // Référence deck
    zoneId: string;
    ownerId?: string; // Propriétaire si zone HAND
    position: number;
    faceVisible: boolean;
    groupId?: string;
  }>;

  turnState: {
    currentPlayerId?: string;
    turnOrder: string[];
    direction: 'CLOCKWISE' | 'COUNTER_CLOCKWISE';
    turnNumber: number;
    timerSeconds?: number;
    isPaused: boolean;
  };

  rules?: {
    markdown: string;
    gameName?: string;
  };
}
```

---

## 🔧 Actions Primitives P0 - Détails

### Catégorie : Distribution (P0)

#### REVEAL_TOP_CARD (DIS-01)
**Description :** Le MJ révèle la carte du dessus de la pioche. Elle devient visible à tous.

**Workflow :**
```
1. MJ clique "Révéler carte suivante"
2. Carte du dessus de zone DECK devient visible
3. Affichée dans UI "Carte révélée" (centre temporaire)
4. MJ décide ensuite où l'attribuer
```

**Paramètres :**
```typescript
{
  type: 'REVEAL_TOP_CARD',
  actorId: gmId,
  sourceZoneId: deckZoneId,
  faceVisible: true
}
```

#### ASSIGN_TO_PLAYER (DIS-02)
**Description :** Le MJ attribue une carte révélée à un joueur.

**Workflow :**
```
1. Carte est révélée au centre
2. MJ clique sur joueur cible
3. Carte déplacée vers zone HAND du joueur
4. Face cachée par défaut (configurable)
```

**Paramètres :**
```typescript
{
  type: 'ASSIGN_TO_PLAYER',
  actorId: gmId,
  cardIds: [revealedCardId],
  targetPlayerId: playerId,
  targetZoneId: playerHandZoneId,
  faceVisible: false // Arrive face cachée dans main
}
```

#### DISTRIBUTE_BATCH (DIS-05)
**Description :** Distribution rapide de N cartes à un ou plusieurs joueurs.

**Workflow :**
```
1. MJ sélectionne joueur(s)
2. MJ définit nombre de cartes (ex: 5)
3. Système distribue automatiquement
4. Face cachée par défaut
```

**Paramètres :**
```typescript
{
  type: 'DISTRIBUTE_BATCH',
  actorId: gmId,
  count: 5,
  targetPlayerId: playerId, // ou array de playerIds
  faceVisible: false
}
```

---

### Catégorie : Actions sur cartes (P0)

#### PLAY_TO_CENTER (ACT-01)
**Description :** Joueur pose une carte de sa main au centre (tapis).

**Autorisations :**
- Joueur peut exécuter si c'est son tour (MJ décide)
- MJ peut toujours exécuter

**Workflow :**
```
1. Joueur sélectionne carte dans sa main
2. Clic "Jouer au centre"
3. Carte déplacée de zone HAND → zone CENTER
4. Face visible par défaut
```

**Paramètres :**
```typescript
{
  type: 'PLAY_TO_CENTER',
  actorId: playerId,
  cardIds: [cardId],
  sourceZoneId: playerHandZoneId,
  targetZoneId: centerZoneId,
  faceVisible: true
}
```

#### DISCARD (ACT-02)
**Description :** Joueur défausse une carte.

**Workflow :**
```
1. Joueur sélectionne carte
2. Clic "Défausser"
3. Carte → zone DISCARD
4. Face visible ou cachée selon config défausse
```

#### DRAW_TOP (ACT-05)
**Description :** Joueur pioche la carte du dessus.

**Workflow :**
```
1. Joueur clique "Piocher"
2. Carte dessus DECK → HAND joueur
3. Face cachée (visible uniquement par joueur)
```

#### FLIP_CARD (ACT-10)
**Description :** Retourner une carte (face visible ↔ face cachée).

**Cas d'usage :**
- Révéler atout
- Retourner carte défausse
- Montrer puis cacher

**Paramètres :**
```typescript
{
  type: 'FLIP_CARD',
  actorId: gmId,
  cardIds: [cardId],
  faceVisible: !currentFaceState
}
```

---

### Catégorie : Gestion des tours (P0)

#### SET_FIRST_PLAYER (TOU-01)
**Description :** MJ désigne manuellement le premier joueur.

**Workflow :**
```
1. MJ clique sur joueur
2. Système marque joueur comme actif
3. UI indique "Tour de [Joueur]"
4. Seul ce joueur peut agir (sauf MJ)
```

**Paramètres :**
```typescript
{
  type: 'SET_FIRST_PLAYER',
  actorId: gmId,
  targetPlayerId: playerId
}
```

#### PASS_TURN (TOU-03)
**Description :** Passer la main au joueur suivant (sens horaire par défaut).

**Autorisations :**
- Joueur actif peut passer son tour
- MJ peut toujours passer

**Workflow :**
```
1. Joueur actif clique "Passer"
2. Système trouve joueur suivant dans turnOrder
3. Direction = CLOCKWISE → index+1
4. Met à jour currentPlayerId
```

#### PASS_TO_PLAYER (TOU-04)
**Description :** MJ donne la main à un joueur spécifique (hors séquence).

**Cas d'usage :**
- Règles spéciales (dernier gagnant commence)
- Pénalités (sauter des joueurs)
- Jeux non-linéaires

---

### Catégorie : Fin de tour (P0)

#### CARDS_TO_PLAYER (FDT-02)
**Description :** Attribuer toutes les cartes du centre à un joueur (pli).

**Workflow :**
```
1. Tour terminé, cartes au centre
2. MJ clique "Attribuer à [Joueur]"
3. Toutes cartes CENTER → Zone "Plis de [Joueur]"
4. Centre vidé
```

**Paramètres :**
```typescript
{
  type: 'CARDS_TO_PLAYER',
  actorId: gmId,
  sourceZoneId: centerZoneId,
  targetPlayerId: winnerId,
  targetZoneId: playerTrickZoneId // Nouvelle zone "Plis"
}
```

---

### Catégorie : Scoring (P0)

#### ADD_POINTS (SCO-01)
**Description :** MJ ajoute des points à un joueur.

**Workflow :**
```
1. MJ ouvre panneau scoring
2. Sélectionne joueur
3. Saisit points (+10, -5, etc.)
4. Tableau scores mis à jour temps réel
```

**Paramètres :**
```typescript
{
  type: 'ADD_POINTS',
  actorId: gmId,
  targetPlayerId: playerId,
  points: 10
}
```

#### DECLARE_ROUND_WINNER (SCO-04)
**Description :** MJ désigne le vainqueur de la manche.

**Workflow :**
```
1. Fin de manche
2. MJ clique joueur + "Vainqueur manche"
3. Notification visible tous joueurs
4. Optionnel : points automatiques
```

---

## 🏗️ Plan d'Implémentation P0

### Phase 1 : Fondations (Semaine 1)

**1.1 Base de données**
- [ ] Créer tables : `game_master`, `zones` (refonte), `turn_state`, `primitive_actions`
- [ ] Migrer tables existantes (ajout colonnes)
- [ ] Créer politiques RLS pour MJ omniscient

**1.2 Types TypeScript**
- [ ] Créer `types/primitives.types.ts` (15 actions P0)
- [ ] Créer `types/zones.types.ts`
- [ ] Créer `types/game-master.types.ts`
- [ ] Refactoriser `GameStateV2`

**1.3 Zones dynamiques**
- [ ] Fonction `createZone(game, name, type, config)`
- [ ] Fonction `updateZone(zoneId, config)`
- [ ] Fonction `deleteZone(zoneId)`
- [ ] Auto-création zones par défaut (DECK, CENTER, DISCARD)

---

### Phase 2 : Distribution & MJ (Semaine 2)

**2.1 Rôle MJ**
- [ ] Fonction `assignGameMaster(game, user)`
- [ ] Middleware permissions MJ
- [ ] Hook `useIsGameMaster()`
- [ ] Composant `<GMBadge />`

**2.2 Distribution manuelle**
- [ ] Action `REVEAL_TOP_CARD`
- [ ] Action `ASSIGN_TO_PLAYER`
- [ ] Action `DISTRIBUTE_BATCH`
- [ ] UI : Panneau distribution MJ
- [ ] UI : Carte révélée affichée centre

**2.3 Zones mains joueurs**
- [ ] Auto-création zone HAND par joueur
- [ ] Visibilité OWNER
- [ ] Hook `usePlayerHand(playerId)`

---

### Phase 3 : Actions cartes (Semaine 3)

**3.1 Actions de base**
- [ ] `PLAY_TO_CENTER`
- [ ] `DISCARD`
- [ ] `DRAW_TOP`
- [ ] `TAKE_FROM_CENTER`
- [ ] `FLIP_CARD`

**3.2 Moteur permissions**
- [ ] `canPlayerExecuteAction(player, action, gameState)`
- [ ] MJ peut toujours tout faire
- [ ] Joueur ne peut agir que si autorisé

**3.3 UI actions**
- [ ] Composant `<CardActionMenu card={card} />`
- [ ] Actions contextuelles selon zone
- [ ] Confirmation actions critiques

---

### Phase 4 : Système tours (Semaine 4)

**4.1 Gestion tours**
- [ ] Action `SET_FIRST_PLAYER`
- [ ] Action `PASS_TURN`
- [ ] Action `PASS_TO_PLAYER`
- [ ] Fonction `getNextPlayer(turnState)`

**4.2 UI tours**
- [ ] Composant `<TurnIndicator currentPlayer={...} />`
- [ ] Bouton "Passer son tour"
- [ ] Highlight joueur actif
- [ ] Composant MJ "Donner main à..."

**4.3 État synchronisé**
- [ ] Subscription Supabase Realtime sur `turn_state`
- [ ] Hook `useTurnState(gameId)`

---

### Phase 5 : Scoring & Fin (Semaine 5)

**5.1 Scoring**
- [ ] Action `ADD_POINTS`
- [ ] Action `REMOVE_POINTS`
- [ ] Tableau scores temps réel
- [ ] UI : Panneau scoring MJ

**5.2 Fin de tour/partie**
- [ ] Action `CARDS_TO_PLAYER`
- [ ] Action `CARDS_TO_DISCARD`
- [ ] Action `DECLARE_ROUND_WINNER`
- [ ] Action `DECLARE_GAME_WINNER`
- [ ] Action `END_GAME`

**5.3 Nouvelle donne**
- [ ] Action `NEW_ROUND`
- [ ] Action `RECALL_ALL_CARDS`
- [ ] Reset zones
- [ ] Increment `currentRound`

---

### Phase 6 : UI Globale (Semaine 6)

**6.1 Plateau MJ**
- [ ] Vue MJ avec tous les contrôles
- [ ] Zones visibles avec cartes
- [ ] Actions rapides contextuelles
- [ ] Historique actions (log)

**6.2 Plateau Joueur**
- [ ] Vue simplifiée
- [ ] Main visible
- [ ] Centre visible
- [ ] Actions autorisées uniquement

**6.3 Visibilité**
- [ ] Implémentation logique visibilité par zone
- [ ] MJ voit tout
- [ ] Joueur voit selon `zone.visibility`
- [ ] Carte face cachée = placeholder

---

## 📝 Exemple de Workflow : Distribution Manuel Belote

**Contexte :** Belote à 4 joueurs, deck 32 cartes.

```
1. MJ crée partie, sélectionne deck "Belote 32 cartes"
2. Zones auto-créées : DECK, CENTER, DISCARD, 4×HAND
3. MJ mélange deck (action MEL-01)
4. MJ désigne J1 comme premier joueur (SET_FIRST_PLAYER)

Distribution tour 1 (3 cartes) :
5. MJ clique "Distribuer 3 cartes" → J1 (DISTRIBUTE_BATCH)
6. MJ clique "Distribuer 3 cartes" → J2
7. MJ clique "Distribuer 3 cartes" → J3
8. MJ clique "Distribuer 3 cartes" → J4

Révélation atout :
9. MJ clique "Révéler carte suivante" (REVEAL_TOP_CARD)
10. Carte affichée centre (ex: Valet de Coeur)
11. MJ clique "Laisser au centre" (CARDS_STAY_CENTER)

Distribution tour 2 (2 cartes) :
12. MJ distribue 2 cartes à chaque joueur (DISTRIBUTE_BATCH × 4)

Début du jeu :
13. J1 (actif) joue carte (PLAY_TO_CENTER)
14. MJ passe à J2 (PASS_TURN)
15. J2 joue carte...
16. Fin du pli : MJ attribue pli à J3 (CARDS_TO_PLAYER)
17. MJ donne main à J3 (PASS_TO_PLAYER)
18. Continue...
```

---

## 🎨 UI/UX Guidelines

### Composants clés

**`<GMControlPanel />`**
- Toujours visible en mode MJ
- Onglets : Distribution | Tours | Zones | Scoring
- Actions rapides contextuelles

**`<ZoneDisplay zone={zone} />`**
- Affichage zone avec cartes
- Varie selon `zone.type`
- Drag & drop si autorisé

**`<CardContextMenu card={card} />`**
- Actions disponibles selon contexte
- MJ : toutes actions
- Joueur : actions filtrées

**`<TurnIndicator />`**
- Joueur actif highlighted
- Flèche sens rotation
- Timer si activé

---

## ✅ Checklist MVP P0

### Base de données
- [ ] 7 nouvelles tables créées
- [ ] Migrations existantes modifiées
- [ ] RLS configuré pour MJ

### Types
- [ ] 15 actions primitives typées
- [ ] Types zones dynamiques
- [ ] Types GameStateV2

### Actions primitives
- [ ] REVEAL_TOP_CARD
- [ ] ASSIGN_TO_PLAYER
- [ ] DISTRIBUTE_BATCH
- [ ] PLAY_TO_CENTER
- [ ] DISCARD
- [ ] DRAW_TOP
- [ ] TAKE_FROM_CENTER
- [ ] FLIP_CARD
- [ ] SET_FIRST_PLAYER
- [ ] PASS_TURN
- [ ] PASS_TO_PLAYER
- [ ] CARDS_TO_PLAYER
- [ ] ADD_POINTS
- [ ] DECLARE_ROUND_WINNER
- [ ] END_GAME

### UI
- [ ] Panneau contrôle MJ
- [ ] Vue plateau MJ
- [ ] Vue plateau joueur
- [ ] Zones dynamiques affichées
- [ ] Cartes face cachée/visible
- [ ] Indicateur tour
- [ ] Tableau scores

### Tests
- [ ] Tests unitaires actions primitives
- [ ] Tests permissions MJ vs Joueur
- [ ] Tests visibilité zones
- [ ] Tests système tours

---

## 🚀 Prochaines Étapes

### Après P0 → P1 Features
- Emplacements nommés sur tapis (TAP-02)
- Catégories de cartes (DEC-03)
- Groupage cartes (ACT-13)
- Timer tours (TOU-07)
- Undo action (PAR-06)

### Après P1 → P2 Features
- IA comme MJ (IAM-*)
- Spectateurs (MUL-06)
- Import/Export decks
- Bibliothèque jeux prédéfinis

---

**Document créé le :** 2026-02-11
**Version :** 2.0.0-alpha
**Statut :** Architecture validée, implémentation en cours
