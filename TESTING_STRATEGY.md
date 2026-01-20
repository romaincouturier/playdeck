# Stratégie de Test - PlayDeck

**Date:** 2026-01-20
**Status actuel:** ❌ 0% de couverture - AUCUN TEST
**Objectif:** 80% de couverture pour la logique critique

---

## 🎯 Objectifs

### Objectifs principaux
1. **Prévenir les régressions** dans le moteur de jeu et les actions critiques
2. **Garantir la fiabilité** des fonctionnalités multijoueurs (invités, tours, cartes)
3. **Faciliter le refactoring** avec confiance
4. **Documenter** le comportement attendu du système

### Métriques cibles
- **Logique métier critique:** 90% de couverture
- **Actions serveur:** 80% de couverture
- **Composants UI:** 60% de couverture
- **Utilitaires:** 95% de couverture

---

## 🔧 Stack de test recommandée

### Frameworks et outils

```json
{
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.1.5",
    "@testing-library/user-event": "^14.5.1",
    "vitest": "^1.1.0",
    "@vitest/ui": "^1.1.0",
    "jsdom": "^23.0.0",
    "msw": "^2.0.0",
    "@supabase/supabase-js": "^2.90.1"
  }
}
```

**Choix de Vitest** (plutôt que Jest) :
- ✅ Plus rapide (utilise Vite)
- ✅ Compatible Next.js 15
- ✅ Meilleure expérience développeur
- ✅ Support natif TypeScript
- ✅ Mode watch ultra-rapide

---

## 📊 Pyramide de tests

```
        E2E Tests (5%)
       /            \
      /   API Tests  \
     /     (15%)      \
    /                  \
   /  Integration Tests \
  /       (30%)          \
 /                        \
/__________________________\
    Unit Tests (50%)
```

### Répartition recommandée
- **50% Unit Tests** - Fonctions pures, utilitaires, logique métier
- **30% Integration Tests** - Server Actions, moteur de jeu, flows
- **15% API Tests** - Appels Supabase, authentification
- **5% E2E Tests** - Parcours utilisateur critiques

---

## 🏗️ Structure des tests

```
playdeck/
├── __tests__/
│   ├── unit/
│   │   ├── lib/
│   │   │   ├── game/
│   │   │   │   ├── engine.test.ts          ⚠️ CRITIQUE
│   │   │   │   └── state-utils.test.ts     ⚠️ CRITIQUE
│   │   │   ├── guest-session.test.ts
│   │   │   └── utils.test.ts
│   │   └── types/
│   │       └── engine.types.test.ts
│   │
│   ├── integration/
│   │   ├── games/
│   │   │   ├── create-game.test.ts         ⚠️ CRITIQUE
│   │   │   ├── join-game.test.ts           ⚠️ CRITIQUE
│   │   │   ├── start-game.test.ts          ⚠️ CRITIQUE
│   │   │   └── game-actions.test.ts        ⚠️ CRITIQUE
│   │   ├── decks/
│   │   │   ├── deck-crud.test.ts
│   │   │   └── card-crud.test.ts
│   │   └── auth/
│   │       ├── login.test.ts
│   │       └── guest-flow.test.ts          ⚠️ CRITIQUE
│   │
│   ├── components/
│   │   ├── game-board.test.tsx
│   │   ├── game-lobby.test.tsx
│   │   ├── create-game-form.test.tsx
│   │   └── card-grid.test.tsx
│   │
│   ├── e2e/
│   │   ├── game-flow.spec.ts               ⚠️ CRITIQUE
│   │   └── guest-reconnect.spec.ts         ⚠️ CRITIQUE
│   │
│   ├── fixtures/
│   │   ├── game-states.ts
│   │   ├── decks.ts
│   │   └── users.ts
│   │
│   └── mocks/
│       ├── supabase.ts
│       └── server-actions.ts
│
├── vitest.config.ts
└── vitest.setup.ts
```

---

## ⚡ Plan d'implémentation par priorité

### Phase 1 - Tests Critiques (Semaine 1) ⚠️ PRIORITÉ MAXIMALE

**Pourquoi commencer ici ?**
- Ces zones ont causé le plus de bugs récemment
- Elles sont critiques pour le multijoueur
- Elles changent souvent (risque de régression élevé)

#### 1.1 Moteur de jeu (`lib/game/engine.ts`)
```typescript
// __tests__/unit/lib/game/engine.test.ts
describe('GameEngine', () => {
  describe('validateAction', () => {
    it('should allow draw during main phase')
    it('should block draw when not player turn')
    it('should allow play when card in hand')
    it('should enforce max_cards_per_turn limit')
    it('should validate phase-specific actions')
  })

  describe('executeAction', () => {
    it('should move card from deck to hand on draw')
    it('should move card from hand to discard on play')
    it('should advance turn after pass')
    it('should transition phases correctly')
  })

  describe('checkVictory', () => {
    it('should detect winner when conditions met')
    it('should return null when no winner')
  })
})
```

**Couverture cible:** 95%

#### 1.2 Actions de jeu critiques
```typescript
// __tests__/integration/games/create-game.test.ts
describe('createGame', () => {
  it('should create game with valid deck')
  it('should generate unique 6-char code')
  it('should add host as first player')
  it('should fail if deck has no cards')
  it('should fail if user not authenticated')
})

// __tests__/integration/games/join-game.test.ts
describe('joinGame (guest)', () => {
  it('should allow guest to join waiting game')
  it('should create guest session cookie')
  it('should reject if game full')
  it('should reject if game already started (new guests)')
  it('should allow existing guest to rejoin started game') // Bug critique !
})

// __tests__/integration/games/game-actions.test.ts
describe('drawCard', () => {
  it('should add card to player hand')
  it('should decrease deck count')
  it('should fail if not player turn')
  it('should work for both auth users and guests')
})

describe('playCard', () => {
  it('should move card from hand to discard')
  it('should fail if card not in hand')
  it('should advance turn')
})

describe('passTurn', () => {
  it('should switch to next player')
  it('should cycle back to first player')
  it('should handle has_left players correctly')
})
```

**Couverture cible:** 85%

#### 1.3 Gestion des invités
```typescript
// __tests__/unit/lib/guest-session.test.ts
describe('Guest Session Management', () => {
  describe('createGuestSession', () => {
    it('should create session ID')
    it('should set cookies with 30-day expiry')
    it('should store guest name')
  })

  describe('getGuestSession', () => {
    it('should return session if cookies exist')
    it('should return null if no cookies')
  })
})

// __tests__/integration/auth/guest-flow.test.ts
describe('Guest Reconnection Flow', () => {
  it('should allow guest to rejoin after disconnect')
  it('should restore guest to started game')
  it('should mark guest as returned (has_left = false)')
  it('should redirect to correct page (lobby vs game)')
})
```

**Couverture cible:** 90%

---

### Phase 2 - Composants UI (Semaine 2)

#### 2.1 Composants de jeu
```typescript
// __tests__/components/game-board.test.tsx
describe('GameBoard', () => {
  it('should render player list')
  it('should show "your turn" indicator')
  it('should disable actions when not your turn')
  it('should show deck and discard counts')
  it('should handle real-time updates')
})

// __tests__/components/game-lobby.test.tsx
describe('GameLobby', () => {
  it('should display game code')
  it('should show player list updates')
  it('should enable start button for host when 2+ players')
  it('should disable start for non-host')
  it('should show disconnected players with opacity')
})
```

**Couverture cible:** 70%

#### 2.2 Formulaires
```typescript
// __tests__/components/create-game-form.test.tsx
describe('CreateGameForm', () => {
  it('should list user decks')
  it('should select deck on click')
  it('should set max players')
  it('should call createGame on submit')
  it('should handle NEXT_REDIRECT error')
  it('should display errors clearly')
})
```

**Couverture cible:** 75%

---

### Phase 3 - CRUD et Utilitaires (Semaine 3)

#### 3.1 Gestion des decks
```typescript
// __tests__/integration/decks/deck-crud.test.ts
describe('Deck CRUD', () => {
  it('should create deck with name and description')
  it('should list user decks only')
  it('should update deck')
  it('should delete deck and cascade cards')
})

// __tests__/integration/decks/card-crud.test.ts
describe('Card CRUD', () => {
  it('should upload card image')
  it('should update card image')
  it('should delete card and image from storage')
  it('should enforce 500 card limit')
})
```

**Couverture cible:** 80%

#### 3.2 Utilitaires
```typescript
// __tests__/unit/lib/game/state-utils.test.ts
describe('fetchGameState', () => {
  it('should fetch complete game state')
  it('should include players, cards, zones')
  it('should filter active players')
  it('should throw if game not found')
})
```

**Couverture cible:** 95%

---

### Phase 4 - E2E Tests (Semaine 4)

#### 4.1 Parcours critiques avec Playwright
```typescript
// __tests__/e2e/game-flow.spec.ts
test('Complete game flow', async ({ page }) => {
  // 1. Login as host
  await page.goto('/login')
  await login(page, hostCredentials)

  // 2. Create game
  await page.goto('/games/create')
  await page.click('[data-testid="deck-fibonacci"]')
  await page.click('button:has-text("Créer")')

  // 3. Copy game code
  const code = await page.locator('[data-testid="game-code"]').textContent()

  // 4. Open new incognito context (guest)
  const guestContext = await browser.newContext()
  const guestPage = await guestContext.newPage()

  // 5. Guest joins
  await guestPage.goto('/games/join')
  await guestPage.fill('input[name="code"]', code)
  await guestPage.fill('input[name="name"]', 'TestGuest')
  await guestPage.click('button:has-text("Rejoindre")')

  // 6. Host starts game
  await page.click('button:has-text("Démarrer")')

  // 7. Verify both in game
  await expect(page.locator('[data-testid="game-board"]')).toBeVisible()
  await expect(guestPage.locator('[data-testid="game-board"]')).toBeVisible()

  // 8. Play a turn
  await page.click('button:has-text("Piocher")')
  await page.locator('.card-in-hand').first().click()

  // 9. Guest sees update in real-time
  await expect(guestPage.locator('.your-turn-indicator')).toBeVisible()
})

// __tests__/e2e/guest-reconnect.spec.ts
test('Guest can reconnect after disconnect', async ({ page, context }) => {
  // 1. Guest joins game
  await joinAsGuest(page, 'TestGuest')
  const gameUrl = page.url()

  // 2. Close browser (simulate disconnect)
  await context.close()

  // 3. Reopen with same cookies
  const newContext = await browser.newContext({ storageState: storageState })
  const newPage = await newContext.newPage()

  // 4. Navigate back to game URL
  await newPage.goto(gameUrl)

  // 5. Verify guest is back in game
  await expect(newPage.locator('[data-testid="game-board"]')).toBeVisible()
  await expect(newPage.locator('text=TestGuest')).toBeVisible()
})
```

**Couverture cible:** Parcours critiques uniquement

---

## 🧪 Exemples de tests à implémenter

### Exemple 1 : Test unitaire du moteur

```typescript
// __tests__/unit/lib/game/engine.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { GameEngine } from '@/lib/game/engine'
import { GameState } from '@/lib/game/engine'
import { createTestGameState } from '@/__tests__/fixtures/game-states'

describe('GameEngine', () => {
  let engine: GameEngine
  let gameState: GameState

  beforeEach(() => {
    gameState = createTestGameState({
      players: [
        { user_id: 'user1', player_order: 0, is_active: true },
        { user_id: 'user2', player_order: 1, is_active: true },
      ],
      current_turn_player_id: 'user1',
      current_phase_id: 'main',
    })
    engine = new GameEngine(gameState.deck_config)
  })

  describe('validateAction', () => {
    it('should allow DRAW action during player turn in main phase', () => {
      const validation = engine.validateAction(gameState, {
        type: 'DRAW',
        player_id: 'user1',
      })

      expect(validation.valid).toBe(true)
      expect(validation.error).toBeUndefined()
    })

    it('should block DRAW when not player turn', () => {
      const validation = engine.validateAction(gameState, {
        type: 'DRAW',
        player_id: 'user2', // Not their turn
      })

      expect(validation.valid).toBe(false)
      expect(validation.error).toContain('not your turn')
    })

    it('should enforce max_cards_per_turn limit', () => {
      // Player already drew 3 cards this turn
      const stateWith3Draws = {
        ...gameState,
        turn_actions_count: { user1: { DRAW: 3 } },
      }

      const validation = engine.validateAction(stateWith3Draws, {
        type: 'DRAW',
        player_id: 'user1',
      })

      expect(validation.valid).toBe(false)
      expect(validation.error).toContain('maximum draws')
    })
  })

  describe('executeAction', () => {
    it('should move card from deck to hand on DRAW', () => {
      const newState = engine.executeAction(gameState, {
        type: 'DRAW',
        player_id: 'user1',
      })

      const deckZone = newState.deck_config.zones.find(z => z.type === 'DECK')!
      const handZone = newState.deck_config.zones.find(z => z.type === 'HAND')!

      const deckCards = newState.cards.filter(c => c.location === deckZone.id)
      const handCards = newState.cards.filter(
        c => c.location === handZone.id && c.owner_id === 'user1'
      )

      expect(deckCards.length).toBe(gameState.cards.filter(c => c.location === deckZone.id).length - 1)
      expect(handCards.length).toBe(gameState.cards.filter(
        c => c.location === handZone.id && c.owner_id === 'user1'
      ).length + 1)
    })
  })
})
```

### Exemple 2 : Test d'intégration d'une action

```typescript
// __tests__/integration/games/create-game.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createGame } from '@/app/games/actions'
import { createMockSupabaseClient } from '@/__tests__/mocks/supabase'

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => createMockSupabaseClient(),
}))

describe('createGame', () => {
  const mockUser = { id: 'user-123' }
  const mockDeckId = 'deck-456'

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()
  })

  it('should create game with valid deck and return game ID', async () => {
    const gameId = await createGame(mockDeckId, 4)

    expect(gameId).toBeDefined()
    expect(typeof gameId).toBe('string')
  })

  it('should generate unique 6-character code', async () => {
    const supabase = createMockSupabaseClient()
    const insertSpy = vi.spyOn(supabase.from('games'), 'insert')

    await createGame(mockDeckId, 4)

    const insertedData = insertSpy.mock.calls[0][0]
    expect(insertedData.code).toMatch(/^[A-Z0-9]{6}$/)
  })

  it('should add host as first player with player_order = 0', async () => {
    const supabase = createMockSupabaseClient()
    const playerInsertSpy = vi.spyOn(supabase.from('game_players'), 'insert')

    await createGame(mockDeckId, 4)

    expect(playerInsertSpy).toHaveBeenCalledWith({
      game_id: expect.any(String),
      user_id: mockUser.id,
      player_order: 0,
      is_host: true,
    })
  })

  it('should fail if deck has no cards', async () => {
    // Mock empty deck
    const supabase = createMockSupabaseClient()
    vi.spyOn(supabase.from('cards'), 'select').mockResolvedValueOnce({
      data: [],
      error: null,
    })

    await expect(createGame(mockDeckId, 4)).rejects.toThrow(
      'Le deck doit contenir au moins une carte'
    )
  })

  it('should fail if user not authenticated', async () => {
    const supabase = createMockSupabaseClient()
    vi.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
      data: { user: null },
      error: null,
    })

    await expect(createGame(mockDeckId, 4)).rejects.toThrow('Non authentifié')
  })
})
```

### Exemple 3 : Test de composant React

```typescript
// __tests__/components/game-lobby.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { GameLobby } from '@/components/game-lobby'
import { createMockSupabaseClient } from '@/__tests__/mocks/supabase'

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => createMockSupabaseClient(),
}))

describe('GameLobby', () => {
  const defaultProps = {
    gameId: 'game-123',
    gameCode: 'ABC123',
    deckName: 'Fibonacci',
    maxPlayers: 4,
    currentPlayers: 2,
    isHost: true,
    currentPlayerId: 'user-123',
    players: [
      {
        user_id: 'user-123',
        player_order: 0,
        is_host: true,
        guest_name: null,
        guest_session_id: null,
        has_left: false,
      },
      {
        user_id: null,
        player_order: 1,
        is_host: false,
        guest_name: 'TestGuest',
        guest_session_id: 'guest-456',
        has_left: false,
      },
    ],
  }

  it('should display game code', () => {
    render(<GameLobby {...defaultProps} />)
    expect(screen.getByText('ABC123')).toBeInTheDocument()
  })

  it('should show player count correctly', () => {
    render(<GameLobby {...defaultProps} />)
    expect(screen.getByText(/2 \/ 4 joueurs/)).toBeInTheDocument()
  })

  it('should enable start button for host when 2+ players', () => {
    render(<GameLobby {...defaultProps} />)
    const startButton = screen.getByRole('button', { name: /démarrer/i })
    expect(startButton).not.toBeDisabled()
  })

  it('should disable start button for non-host', () => {
    render(<GameLobby {...defaultProps} isHost={false} />)
    const startButton = screen.queryByRole('button', { name: /démarrer/i })
    expect(startButton).toBeNull()
  })

  it('should show disconnected players with visual indicator', () => {
    const playersWithDisconnected = [
      ...defaultProps.players,
      {
        user_id: 'user-789',
        player_order: 2,
        is_host: false,
        guest_name: null,
        guest_session_id: null,
        has_left: true,
      },
    ]

    render(<GameLobby {...defaultProps} players={playersWithDisconnected} />)
    expect(screen.getByText('(A quitté)')).toBeInTheDocument()
  })

  it('should call startGame when host clicks start', async () => {
    const startGameMock = vi.fn()
    vi.mock('@/app/games/actions', () => ({
      startGame: startGameMock,
    }))

    render(<GameLobby {...defaultProps} />)
    const startButton = screen.getByRole('button', { name: /démarrer/i })

    fireEvent.click(startButton)

    await waitFor(() => {
      expect(startGameMock).toHaveBeenCalledWith('game-123')
    })
  })
})
```

---

## 🔄 Intégration CI/CD

### Configuration GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit

      - name: Run integration tests
        run: npm run test:integration
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL_TEST }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY_TEST }}

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

  e2e:
    runs-on: ubuntu-latest
    needs: test

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test results
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
```

### Scripts package.json

```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run --coverage",
    "test:integration": "vitest run --coverage --config vitest.integration.config.ts",
    "test:e2e": "playwright test",
    "test:watch": "vitest watch",
    "test:ui": "vitest --ui"
  }
}
```

---

## 📈 Métriques de succès

### KPIs
- **Code Coverage:** ≥80% (global), ≥90% (logique critique)
- **Test Execution Time:** <2 min (unit + integration), <5 min (E2E)
- **Flaky Tests:** 0% (tous les tests doivent être déterministes)
- **Build Success Rate:** ≥95% sur CI

### Dashboard de couverture
- Utiliser Codecov ou Coveralls
- Badge de couverture dans README.md
- Bloquer les PRs si couverture diminue >2%

---

## 🚨 Cas de test critiques identifiés (Bugs passés)

### 1. Guest Reconnection Bug
**Problème résolu:** Invité voyait "Partie déjà commencée" au lieu de rejoindre

**Tests nécessaires:**
```typescript
it('should allow existing guest to rejoin started game')
it('should redirect guest to game board if playing')
it('should mark guest as returned (has_left = false)')
it('should not show "game started" error for existing players')
```

### 2. RLS Policies for Guests
**Problème résolu:** Invités ne pouvaient pas voir leurs cartes

**Tests nécessaires:**
```typescript
it('should allow guest to fetch their own cards')
it('should allow guest to see game_players table')
it('should prevent guest from seeing other players cards')
```

### 3. has_left Field Missing
**Problème résolu:** Erreur TypeScript car `has_left` non sélectionné

**Tests nécessaires:**
```typescript
it('should include has_left in all player queries')
it('should filter out has_left players from active count')
it('should show disconnected players in UI')
```

### 4. NEXT_REDIRECT Error Handling
**Problème résolu:** Erreur 'NEXT_REDIRECT' traitée comme vraie erreur

**Tests nécessaires:**
```typescript
it('should not show error for NEXT_REDIRECT exception')
it('should allow redirect to proceed')
it('should display real errors correctly')
```

---

## 📚 Documentation des tests

### Conventions de nommage
```typescript
describe('ComponentName | FunctionName', () => {
  describe('methodName | scenario', () => {
    it('should [expected behavior] when [condition]', () => {
      // Arrange
      // Act
      // Assert
    })
  })
})
```

### Structure AAA (Arrange-Act-Assert)
```typescript
it('should add card to hand when drawing', () => {
  // Arrange - Préparer l'état
  const gameState = createTestGameState()
  const engine = new GameEngine(gameState.deck_config)

  // Act - Exécuter l'action
  const newState = engine.executeAction(gameState, {
    type: 'DRAW',
    player_id: 'user1',
  })

  // Assert - Vérifier le résultat
  expect(newState.cards.filter(c => c.owner_id === 'user1').length).toBe(
    gameState.cards.filter(c => c.owner_id === 'user1').length + 1
  )
})
```

---

## ✅ Checklist d'implémentation

### Phase 1 (Semaine 1)
- [ ] Installer Vitest et dépendances
- [ ] Configurer vitest.config.ts
- [ ] Créer structure __tests__/
- [ ] Créer fixtures et mocks
- [ ] Tests unitaires moteur de jeu (15 tests)
- [ ] Tests intégration createGame (6 tests)
- [ ] Tests intégration joinGame (5 tests)
- [ ] Tests guest session (4 tests)
- [ ] Atteindre 80% couverture logique critique

### Phase 2 (Semaine 2)
- [ ] Tests composants GameBoard (8 tests)
- [ ] Tests composants GameLobby (6 tests)
- [ ] Tests formulaires (5 tests)
- [ ] Atteindre 60% couverture composants

### Phase 3 (Semaine 3)
- [ ] Tests CRUD decks (6 tests)
- [ ] Tests CRUD cards (5 tests)
- [ ] Tests utilitaires (4 tests)
- [ ] Atteindre 80% couverture globale

### Phase 4 (Semaine 4)
- [ ] Installer Playwright
- [ ] Tests E2E game flow
- [ ] Tests E2E guest reconnect
- [ ] Configurer CI/CD
- [ ] Badge de couverture

---

## 🎓 Ressources et formation

### Documentation
- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Playwright Documentation](https://playwright.dev/)

### Bonnes pratiques
- Tester le comportement, pas l'implémentation
- Éviter les tests trop couplés aux détails internes
- Utiliser des fixtures pour les données de test
- Mocker les dépendances externes (Supabase, fetch)
- Écrire des tests déterministes (pas de `Math.random`, pas de dates)

---

## 📊 ROI et bénéfices attendus

### Temps investi
- **Setup initial:** 8h
- **Écriture tests Phase 1-4:** 40h
- **Maintenance mensuelle:** 2-4h

### Bénéfices
- ✅ **Réduction bugs en production:** -70%
- ✅ **Temps de débogage:** -50%
- ✅ **Confiance pour refactorer:** +90%
- ✅ **Onboarding nouveaux devs:** +40% plus rapide
- ✅ **Documentation vivante** du comportement système

---

## 🚀 Prochaines étapes

1. **Approuver cette stratégie**
2. **Installer les dépendances de test**
3. **Commencer Phase 1** - Tests critiques du moteur de jeu
4. **Itérer sur feedback** et ajuster la stratégie si besoin

**Contact:** Prêt à implémenter les premiers tests dès maintenant !
