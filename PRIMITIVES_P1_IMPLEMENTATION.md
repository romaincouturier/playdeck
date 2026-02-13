# 🎮 Implémentation des Primitives P1 - Advanced Player & GM Actions

## ✅ Ce qui a été créé

### 1. **Card Context Menu Component**
📄 `components/card-context-menu.tsx`

Un menu contextuel déroulant sur chaque carte de la main avec **6 actions P1 joueur** :

#### 🎴 Actions sur les cartes
- **FLIP_CARD** - Retourner la carte (face visible/cachée)
- **REVEAL_TO_ALL** - Révéler la carte à tous les joueurs
- **RETURN_TO_DECK** - Retourner la carte au deck
- **GIVE_TO_PLAYER** - Donner la carte à un autre joueur (sous-menu avec liste)

**Contrôle d'accès** :
- Actions désactivées si ce n'est pas le tour du joueur (sauf pour GM)
- Liste des autres joueurs dans le sous-menu "Donner à..."
- Bouton contextuel visible uniquement au survol (`opacity-0 group-hover:opacity-100`)

---

### 2. **Player Server Actions P1**
📄 `app/games/[id]/player-actions.ts`

6 nouvelles fonctions server pour les primitives P1 joueur :

```typescript
// P1 Player Actions
- returnCardToDeck(gameId, cardId, guestSessionId?)
- giveCardToPlayer(gameId, cardId, targetPlayerId, guestSessionId?)
- flipCard(gameId, cardId, guestSessionId?)
- revealCardToAll(gameId, cardId, guestSessionId?)
- drawBottomCard(gameId, guestSessionId?)
- takeFromDiscard(gameId, guestSessionId?)
```

**Sécurité** :
- Authentification utilisateur ou session invité
- Validation des zones (DECK, HAND, DISCARD)
- Calcul automatique des positions (maxPos + 1)
- Support des invités via `guestSessionId`

---

### 3. **GM Turn Management Actions P1**
📄 `app/games/[id]/gm-actions.ts` (ajouté à la fin)

3 actions avancées pour la gestion des tours par le GM :

```typescript
// P1 GM Turn Management
- reverseTurnDirection(gameId)      // CLOCKWISE ↔ COUNTERCLOCKWISE
- skipCurrentPlayer(gameId)          // Passe au joueur suivant
- passToSpecificPlayer(gameId, targetPlayerId)  // Force le tour à un joueur
```

**Logique** :
- `reverseTurnDirection` : Toggle entre CLOCKWISE et COUNTERCLOCKWISE dans `turn_state.direction`
- `skipCurrentPlayer` : Calcule le joueur suivant selon `turn_order` et `direction`
- `passToSpecificPlayer` : Valide que le joueur cible est dans `turn_order`, puis force `current_player_id`

**Sécurité** : Toutes les actions vérifient que l'utilisateur est Game Master.

---

### 4. **Modifications du GM Control Panel**
📄 `components/gm-control-panel.tsx`

Ajout de la section **🔄 Tours** avec 4 boutons :

#### Section "Gestion des tours"
```typescript
interface GMControlPanelProps {
  // P0 props...
  // P1 props ⬇️
  onReverseDirection: () => void
  onSkipPlayer: () => void
  onPassToPlayer: (playerId: string) => void
}
```

**Nouveaux boutons** :
1. **Premier joueur aléatoire** (P0, déjà existant)
2. **Inverser direction** (P1) - `RefreshCw` icon
3. **Sauter joueur actuel** (P1) - `SkipForward` icon
4. **Forcer tour à ce joueur** (P1) - `FastForward` icon, visible uniquement si un joueur est sélectionné

---

### 5. **Intégration complète dans GameBoard**
📄 `components/game-board.tsx`

#### Imports ajoutés
```typescript
import {
  // P1 GM actions
  reverseTurnDirection, skipCurrentPlayer, passToSpecificPlayer,
} from '@/app/games/[id]/gm-actions'

import {
  returnCardToDeck, giveCardToPlayer, flipCard,
  revealCardToAll, drawBottomCard, takeFromDiscard,
} from '@/app/games/[id]/player-actions'

import { CardContextMenu } from '@/components/card-context-menu'
```

#### Handlers créés (9 nouveaux)

**P1 GM Handlers (3)** :
```typescript
const handleReverseDirection = async () => { ... }
const handleSkipPlayer = async () => { ... }
const handlePassToPlayer = async (targetPlayerId: string) => { ... }
```

**P1 Player Handlers (6)** :
```typescript
const handleReturnToDeck = async (cardId: string) => { ... }
const handleGiveToPlayer = async (cardId: string, targetPlayerId: string) => { ... }
const handleFlipCard = async (cardId: string) => { ... }
const handleRevealToAll = async (cardId: string) => { ... }
const handleDrawBottom = async () => { ... }
const handleTakeFromDiscard = async () => { ... }
```

Tous les handlers incluent :
- ✅ Loading state (`setLoading(true/false)`)
- ✅ Error handling avec affichage (`setError()`)
- ✅ Support invité (`isGuest ? playerId : undefined`)
- ✅ Refresh de la page après succès (`router.refresh()`)

#### Intégration CardContextMenu
```tsx
<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
  {hand.map((card: HandCard) => (
    <div key={card.id} className="group relative aspect-[2/3] ...">
      <button onClick={() => handlePlayCard(card.id)}>
        <CardImage src={card.imageUrl} ... />
      </button>
      {/* P1: Card Context Menu */}
      <CardContextMenu
        cardId={card.id}
        playerId={playerId}
        players={players.map(...)}
        isMyTurn={isMyTurn}
        isGameMaster={isGameMaster}
        onReturnToDeck={handleReturnToDeck}
        onGiveToPlayer={handleGiveToPlayer}
        onFlipCard={handleFlipCard}
        onRevealToAll={handleRevealToAll}
      />
    </div>
  ))}
</div>
```

#### Props passés au GMControlPanel (3 nouveaux)
```tsx
<GMControlPanel
  // P0 props...
  onReverseDirection={handleReverseDirection}
  onSkipPlayer={handleSkipPlayer}
  onPassToPlayer={handlePassToPlayer}
/>
```

---

## 📊 Résumé des Primitives Implémentées

### P0 (9 primitives) ✅
- SHUFFLE_DECK
- REVEAL_TOP_CARD
- DISTRIBUTE_CARDS
- ADD_POINTS
- REMOVE_POINTS
- DECLARE_GAME_WINNER
- NEW_ROUND
- RECALL_ALL_CARDS
- RANDOM_FIRST_PLAYER

### P1 (9 primitives) ✅
**Player Actions (6)** :
- RETURN_TO_DECK
- GIVE_TO_PLAYER
- FLIP_CARD
- REVEAL_TO_ALL
- DRAW_BOTTOM
- TAKE_FROM_DISCARD

**GM Turn Management (3)** :
- REVERSE_DIRECTION
- SKIP_PLAYER
- PASS_TO_PLAYER

**Total implémenté** : 18 / 104 primitives (~17%) ✅

---

## 🧪 Comment tester le workflow P1

### Test 1 : Actions joueur sur les cartes

1. **Créer une partie** et **démarrer** (avec au moins 2 joueurs)
2. **Distribuer des cartes** via le GM Control Panel
3. **Survol une carte** dans votre main → Bouton "⋮" apparaît
4. **Cliquer sur le bouton** → Menu contextuel s'ouvre
5. **Tester chaque action** :
   - ✅ **Retourner la carte** → La carte change de face visible
   - ✅ **Révéler à tous** → `face_visible = true`
   - ✅ **Retourner au deck** → La carte retourne dans la pioche
   - ✅ **Donner à...** → Choisir un joueur → La carte apparaît dans sa main

### Test 2 : Actions avancées pioche/défausse

1. Dans le plateau, tester les nouvelles actions :
   - ✅ **Piocher du bas** → Tire la carte en position max du DECK
   - ✅ **Prendre de la défausse** → Tire la carte en position max du DISCARD

### Test 3 : Gestion des tours (GM uniquement)

1. **En tant que GM**, ouvrir le GM Control Panel
2. **Section "🔄 Tours"**, tester :
   - ✅ **Premier joueur aléatoire** → Choisit un joueur au hasard
   - ✅ **Inverser direction** → `turn_state.direction` change (CLOCKWISE ↔ COUNTERCLOCKWISE)
   - ✅ **Sauter joueur actuel** → Le tour passe au joueur suivant
   - ✅ **Forcer tour à ce joueur** :
     1. Sélectionner un joueur dans le dropdown "Scoring"
     2. Le bouton "Forcer tour à ce joueur" apparaît
     3. Cliquer → Le tour est forcé à ce joueur

### Test 4 : Contrôle d'accès

1. **Tester en tant que joueur non-GM** :
   - ✅ Menu contextuel des cartes désactivé si ce n'est pas votre tour
   - ✅ GM Control Panel **non visible**

2. **Tester en tant que GM** :
   - ✅ Peut utiliser les actions même hors tour
   - ✅ GM Control Panel visible avec toutes les sections

---

## 🎨 Améliorations futures (P2)

### P2 - Zone Management
- **CREATE_ZONE** : Créer une nouvelle zone personnalisée
- **DELETE_ZONE** : Supprimer une zone
- **REPOSITION_ZONE** : Réorganiser l'ordre des zones
- **UPDATE_ZONE_CONFIG** : Modifier visibilité/règles d'une zone

### P2 - Visibilité & Permissions
- **SHOW_HAND_TO_PLAYER** : Révéler la main d'un joueur à un autre
- **TOGGLE_OPEN_GAME** : Mode "jeu ouvert" (toutes les mains visibles)
- **MARK_CARD** : Marquer une carte (surligner, annoter)

### P2 - Timer & Snapshots
- **START_TIMER** : Démarrer un timer pour le tour
- **STOP_TIMER** : Arrêter le timer
- **PAUSE_GAME** : Mettre la partie en pause
- **RESUME_GAME** : Reprendre la partie
- **CREATE_SNAPSHOT** : Créer un point de sauvegarde
- **RESTORE_SNAPSHOT** : Restaurer un état précédent
- **UNDO_ACTION** : Annuler la dernière action

### P2 - Import/Export
- **IMPORT_DECK** : Importer un deck externe
- **EXPORT_DECK** : Exporter le deck actuel
- **SAVE_GAME** : Sauvegarder la partie
- **LOAD_GAME** : Charger une partie sauvegardée

---

## 📋 Fichiers créés/modifiés

### Créés (2)
- `components/card-context-menu.tsx` - Menu contextuel des cartes (253 lignes)
- `app/games/[id]/player-actions.ts` - 6 actions joueur P1 (540 lignes)

### Modifiés (3)
- `app/games/[id]/gm-actions.ts` - Ajout de 3 actions GM P1 (+156 lignes)
- `components/gm-control-panel.tsx` - Section "Tours" avec P1 (+29 lignes)
- `components/game-board.tsx` - Intégration complète P1 (+158 lignes)

**Total** : ~1136 lignes de code ajoutées/modifiées

---

## 🎉 Status Final P1

**Implémentation P1** : ✅ **COMPLÈTE**

- ✅ Component CardContextMenu créé
- ✅ 6 player actions créées
- ✅ 3 GM turn actions créées
- ✅ GM Control Panel enrichi
- ✅ GameBoard intégré avec tous les handlers
- ✅ Support invité pour toutes les actions joueur
- ✅ Authentification et validation pour toutes les actions
- ✅ Error handling et loading states
- ✅ Committed & pushed to `claude/nextjs-card-game-mvp-EdMSV`

**Prochaine étape** : 🚀 **Implémenter P2** (Zone Management, Visibilité, Timer, Snapshots)

---

## ⚠️ Composants UI requis

Si vous n'avez pas encore installé les composants shadcn/ui nécessaires :

```bash
npx shadcn-ui@latest add dropdown-menu
```

Le `CardContextMenu` utilise `DropdownMenu` de shadcn/ui.
