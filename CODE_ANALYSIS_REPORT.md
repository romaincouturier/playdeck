# PlayDeck Codebase Analysis Report
**Date:** 2026-01-20
**Scope:** TypeScript/TSX files in /home/user/playdeck
**Total Project Files:** 50 TypeScript files (excluding node_modules)

---

## Executive Summary

This report identifies dead code, unused imports, duplicate patterns, and inconsistencies in the PlayDeck codebase. The project has recently undergone a refactoring to introduce a new game engine system (`lib/game/engine.ts` and `lib/game/state-utils.ts`), which is now being used throughout the application. Overall, the codebase is relatively clean with minimal dead code.

---

## 1. Unused Imports

### High Priority

#### `/app/games/[id]/actions.ts`
- **Line 7-9:** `GameCardState` and `GamePlayerState` imports are **UNUSED**
  - These types are imported but never referenced in the file
  - Only type annotations use `any` instead of these specific types
  ```typescript
  import { GameCardState } from '@/lib/game/engine'  // UNUSED
  import { GamePlayerState } from '@/lib/game/engine'  // UNUSED
  ```
  - **Recommendation:** Remove these unused imports

#### `/app/games/[id]/actions.ts`
- **Line 8:** `ZoneConfig` import is **UNUSED**
  ```typescript
  import { ZoneConfig } from '@/types/engine.types'  // UNUSED
  ```
  - This type is never used in the file
  - **Recommendation:** Remove this import

#### `/components/game-board.tsx`
- **Line 12:** Comment indicates potential dead import
  ```typescript
  import { fetchGameState } from '@/lib/game/state-utils' // Note: This might need a client version or just use Supabase directly for updates
  ```
  - `fetchGameState` is imported but **NEVER CALLED** in this client component
  - The component receives `gameState` as props and refreshes via `router.refresh()`
  - **Recommendation:** Remove this unused import and the misleading comment

### Medium Priority

#### `/components/join-game-form.tsx`
- **Line 5:** `joinGame` action is imported but **NEVER USED**
  ```typescript
  import { joinGame } from '@/app/games/actions'  // UNUSED
  ```
  - The component navigates to `/games/join/${code}` instead of calling this action
  - **Recommendation:** Remove this import

---

## 2. Unused Exported Functions/Components

### `/lib/guest-session.ts`
- **`deleteGuestSession()` function (lines 54-58):**
  - Exported but **NEVER IMPORTED** anywhere in the codebase
  - This function is defined to delete guest session cookies
  ```typescript
  export async function deleteGuestSession(): Promise<void> {
    const cookieStore = await cookies()
    cookieStore.delete(GUEST_SESSION_COOKIE)
    cookieStore.delete(GUEST_NAME_COOKIE)
  }
  ```
  - **Recommendation:** Either use this function for logout/cleanup or remove it if not needed

### `/lib/game/engine.ts`
- **`checkVictory()` method (lines 127-145):**
  - Defined in `GameEngine` class but **NEVER CALLED** anywhere
  - This is a potentially important game mechanic that isn't being used
  ```typescript
  checkVictory(state: GameState): { winnerId: string | null; reason?: string }
  ```
  - **Recommendation:** Either implement victory checking in game actions or remove if not needed for MVP

### `/proxy.ts`
- **Entire file is DEAD CODE**
  - This file exports a `proxy` function for middleware authentication
  - **NEVER IMPORTED** anywhere in the codebase
  - No `middleware.ts` file exists to use this proxy
  - **Recommendation:** DELETE this file entirely (74 lines of unused code)

---

## 3. Code Duplication Issues

### Authentication Check Pattern
**Locations:**
- `/app/games/actions.ts` (lines 148-154)
- `/app/games/[id]/actions.ts` (lines 12-17, 82-87, 136-141, 196-203, 236-239)
- `/app/decks/actions.ts` (lines 10-16, 34-41, 63-69, 97-103, 153-156)
- `/app/decks/[id]/actions.ts` (lines 10-16, 34-41, 58-66, 134-142, 211-217)

**Pattern:**
```typescript
const {
  data: { user },
} = await supabase.auth.getUser()

if (!user) {
  throw new Error('Non authentifié')
}
```

**Impact:** This pattern appears **20+ times** across action files
**Recommendation:** Create a reusable helper function:
```typescript
// lib/auth-helpers.ts
export async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')
  return { user, supabase }
}
```

### Guest Session + Auth Pattern
**Locations:**
- `/app/games/[id]/page.tsx` (lines 12-26)
- `/app/games/[id]/lobby/page.tsx` (lines 12-23)
- `/app/games/actions.ts` (lines 369-378)

**Pattern:**
```typescript
const { data: { user } } = await supabase.auth.getUser()
const guestSession = await getGuestSession()
if (!user && !guestSession) {
  redirect('/login')
}
const playerId = user?.id || guestSession?.sessionId || ''
```

**Recommendation:** Create a helper function for player identification

### Error Handling Pattern
**Duplicate try-catch with NEXT_REDIRECT**
- `/components/create-game-form.tsx` (lines 36-49)
- `/components/join-game-form.tsx` (lines 27-34)
- `/components/game-lobby.tsx` (lines 161-172, 179-188)

**Pattern:**
```typescript
try {
  // action
} catch (err) {
  if (err instanceof Error && err.message === 'NEXT_REDIRECT') {
    return
  }
  // handle error
}
```

**Recommendation:** Create a wrapper for server actions that handles Next.js redirects

---

## 4. Old vs New Engine Code

### ✅ Status: Migration Complete

The new engine system has been **successfully integrated**:

**New Engine Files:**
- `/lib/game/engine.ts` - GameEngine class with validation logic
- `/lib/game/state-utils.ts` - fetchGameState helper
- `/types/engine.types.ts` - Comprehensive type definitions

**Usage:**
- All game actions in `/app/games/[id]/actions.ts` use the new engine
- `GameEngine` validates actions before executing them
- `fetchGameState` is used in 4 locations (pages and actions)
- Components properly consume the new `GameState` type

**No Old Engine Code Found:**
- No legacy game logic files detected
- No conflicting game action patterns
- Clean implementation across the board

### ⚠️ Minor Issues:

1. **Victory condition checking not implemented**
   - `GameEngine.checkVictory()` exists but is never called
   - Victory conditions are defined in game config but not enforced

2. **Type inconsistencies**
   - Some places use `any` instead of proper types (e.g., `as any` in state-utils.ts)
   - Could benefit from stricter typing

---

## 5. Commented Code

### Minimal Commented Code Found

Only **1 TODO/NOTE comment** found:
```typescript
// app/games/[id]/actions.ts:182-184
// NOTE: If the current system only supports auth.users in current_turn_player_id,
// we might need to update the schema to support guest session IDs too.
```

This comment is **outdated** - the schema already supports `current_turn_guest_id` column.

**Other comments are documentation/explanatory** - not dead code

---

## 6. Console Logs for Cleanup

**15 files contain console.log/error/warn statements:**

### Debug Logs to Remove (Production):
- `/components/game-lobby.tsx` - 4 console.log statements for debugging realtime
- `/app/games/actions.ts` - 4 console.log statements for game creation debugging
- `/app/games/create/page.tsx` - Debug logging

### Keep (Error Handling):
- `/components/create-game-form.tsx` - console.error for error tracking
- `/components/join-game-form.tsx` - console.error
- `/app/decks/actions.ts` - console.error for debugging issues
- `/lib/i18n/i18n-context.tsx` - console.warn for missing translations

**Recommendation:** Remove debug console.logs before production, keep error logging

---

## 7. Unused Types in engine.types.ts

Some exported types may not be fully utilized:

### Potentially Unused Type Properties:
- `CardProperties` - Many optional properties defined but not validated
- `GameSettings.hints_enabled` - Not referenced anywhere
- `GameSettings.allow_reactions` - Not implemented
- `TurnStructure.skip_conditions` - Not used in validation

**Recommendation:** Keep for future features or remove if not in roadmap

---

## 8. Recommendations Summary

### Immediate Actions (Quick Wins):

1. **Delete `/proxy.ts`** - 74 lines of completely unused code
2. **Remove unused imports:**
   - `GameCardState`, `GamePlayerState`, `ZoneConfig` from `/app/games/[id]/actions.ts`
   - `fetchGameState` from `/components/game-board.tsx`
   - `joinGame` from `/components/join-game-form.tsx`

3. **Remove or implement:**
   - `deleteGuestSession()` in `/lib/guest-session.ts`
   - `checkVictory()` in `/lib/game/engine.ts`

4. **Remove debug console.logs** from:
   - `/components/game-lobby.tsx`
   - `/app/games/actions.ts`

### Medium Priority Refactoring:

5. **Create auth helper utilities** to reduce duplication:
   ```typescript
   // lib/auth-helpers.ts
   - requireAuth()
   - getPlayerIdentity()
   - requireHost(gameId)
   ```

6. **Create error handling wrapper** for Next.js server actions

7. **Improve type safety:**
   - Replace `any` types with proper interfaces
   - Use `GameCardState` and `GamePlayerState` where appropriate

8. **Update outdated comment** at `/app/games/[id]/actions.ts:182`

### Low Priority:

9. **Consider removing unused type properties** if features won't be implemented
10. **Add ESLint rules** to catch unused imports automatically

---

## 9. Code Quality Metrics

### Positive Findings:
- ✅ Clean separation of concerns (components, actions, lib)
- ✅ Consistent naming conventions
- ✅ Good use of TypeScript types
- ✅ Server/client component separation is clear
- ✅ No major architectural issues
- ✅ New engine system is well-designed

### Areas for Improvement:
- ⚠️ ~20+ instances of duplicated auth checks
- ⚠️ Some `any` types where strict typing would be better
- ⚠️ Debug logs should be removed before production
- ⚠️ Victory condition logic incomplete

---

## 10. Files to Clean Up

**Priority 1 - Delete:**
- `/proxy.ts` (completely unused)

**Priority 2 - Modify:**
- `/app/games/[id]/actions.ts` - Remove 3 unused imports
- `/components/game-board.tsx` - Remove 1 unused import
- `/components/join-game-form.tsx` - Remove 1 unused import
- `/lib/guest-session.ts` - Remove or implement `deleteGuestSession()`

**Priority 3 - Consider:**
- Create `/lib/auth-helpers.ts` to reduce duplication
- Implement victory checking or remove `checkVictory()`
- Clean up console.logs in production build

---

## Conclusion

The PlayDeck codebase is in **good shape** overall. The new game engine integration is complete and working well. The main areas for improvement are:

1. Removing unused code (proxy.ts, unused imports)
2. Reducing code duplication through helper functions
3. Improving type safety in a few areas
4. Completing or removing incomplete features (victory checking)

**Estimated Cleanup Time:** 2-4 hours for all priority 1 and 2 items

**Lines of Dead Code to Remove:** ~100 lines across multiple files

