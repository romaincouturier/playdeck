# PlayDeck v2 Migration - Test Strategy

This document explains the testing strategy for validating the PlayDeck v2 Universal Engine migration.

## Test Architecture

The v2 migration uses a **multi-layered testing approach**:

### 1. Schema Validation Tests (TypeScript/Vitest) ✅

**Location**: `__tests__/unit/v2-migration-schema.test.ts`

**Purpose**: Validate the SQL migration file structure without requiring a database connection.

**What it tests**:
- ✅ All required tables are defined
- ✅ Tables have correct columns with proper types
- ✅ Indexes are created for performance
- ✅ Functions are defined with correct signatures
- ✅ Triggers are created for automation
- ✅ Constraints (UNIQUE, CHECK, FK) are in place
- ✅ RLS policies are defined
- ✅ Existing tables are modified correctly
- ✅ Migration is idempotent (IF NOT EXISTS, CREATE OR REPLACE)
- ✅ Security best practices (no SQL injection, cautious SECURITY DEFINER usage)
- ✅ Error handling in critical functions

**How to run**:
```bash
npm run test:run -- __tests__/unit/v2-migration-schema.test.ts
```

**Current status**: ✅ 102/102 tests passing

**Advantages**:
- ⚡ Fast (no database required)
- 🔄 Runs in CI/CD without setup
- 📝 Validates migration structure
- 🛡️ Catches schema errors early

**Limitations**:
- ❌ Doesn't validate runtime behavior
- ❌ Doesn't test actual data operations
- ❌ Doesn't verify RLS policy logic (only structure)

---

### 2. SQL Integration Tests (Direct SQL)

**Location**: `supabase/migrations/test_v2_migration.sql`

**Purpose**: Validate the migration works with actual data in a real PostgreSQL database.

**What it tests**:
- ✅ Complete game creation flow
- ✅ Zone creation (default zones, player hands)
- ✅ Player management
- ✅ Card operations
- ✅ Turn state initialization
- ✅ Primitive actions
- ✅ Game snapshots
- ✅ Data integrity constraints
- ✅ RLS policy enforcement
- ✅ Cascade deletes
- ✅ Predefined games seeding

**How to run**:

**Option 1: With Supabase CLI** (recommended for local development)
```bash
# Start local Supabase
supabase start

# Apply migration
supabase db reset

# Run test
psql postgresql://postgres:postgres@localhost:54322/postgres -f supabase/migrations/test_v2_migration.sql
```

**Option 2: With direct PostgreSQL**
```bash
# Apply migration first
psql -h <host> -U <user> -d <database> -f supabase/migrations/20260211_v2_universal_engine.sql

# Run test
psql -h <host> -U <user> -d <database> -f supabase/migrations/test_v2_migration.sql
```

**Option 3: Via Supabase dashboard**
1. Go to SQL Editor
2. Paste contents of `test_v2_migration.sql`
3. Run

**Current status**: ✅ All tests passing (verified manually)

**Advantages**:
- ✅ Tests actual database behavior
- ✅ Validates RLS policies work correctly
- ✅ Tests data operations and functions
- ✅ Catches runtime errors

**Limitations**:
- ⚠️ Requires database setup
- ⚠️ Slower than unit tests
- ⚠️ Needs cleanup after tests

---

### 3. Application Integration Tests (Future)

**Location**: TBD

**Purpose**: Test the application code interacting with the v2 schema via Supabase client.

**What it would test**:
- React components with v2 data
- Game state management
- Real-time subscriptions
- User authentication with RLS
- Edge cases and error handling

**Status**: 📋 Not yet implemented

**How to implement**:
```typescript
// Example test structure
describe('Game Creation with v2 Schema', () => {
  it('should create game as GM', async () => {
    // Use mocked Supabase client
    const { data } = await supabase.from('games').insert({...});
    expect(data.game_mode).toBe('UNIVERSAL');
  });
});
```

---

## Test Coverage Summary

| Layer | Type | Database Required | Status | Tests |
|-------|------|-------------------|--------|-------|
| Schema Validation | Unit | ❌ No | ✅ Passing | 102 |
| SQL Integration | Integration | ✅ Yes | ✅ Passing | ~40 |
| Application | E2E | ✅ Yes | 📋 Planned | 0 |

---

## Continuous Integration

### Recommended CI/CD Pipeline

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  schema-validation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:run -- __tests__/unit/v2-migration-schema.test.ts

  sql-integration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: supabase/setup-cli@v1
      - run: supabase start
      - run: supabase db reset
      - run: psql postgresql://postgres:postgres@localhost:54322/postgres -f supabase/migrations/test_v2_migration.sql
```

---

## Development Workflow

### Before committing migration changes:

1. **Validate schema structure**:
   ```bash
   npm run test:run -- __tests__/unit/v2-migration-schema.test.ts
   ```
   ✅ Should pass 102/102 tests

2. **Test with real database** (optional but recommended):
   ```bash
   supabase start
   supabase db reset
   psql postgresql://postgres:postgres@localhost:54322/postgres -f supabase/migrations/test_v2_migration.sql
   ```
   ✅ Should see "Migration v2 : TOUS LES TESTS PASSÉS ✓"

3. **Commit changes**:
   ```bash
   git add .
   git commit -m "feat: update v2 migration"
   git push
   ```

---

## Rollback Strategy

If the migration fails in production:

1. **Immediate rollback**:
   ```bash
   psql -h <prod-host> -U <user> -d <database> -f supabase/migrations/rollback_v2.sql
   ```

2. **Verify rollback**:
   ```sql
   -- Check that v2 tables are removed
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name IN ('game_master', 'zones', 'turn_state');
   -- Should return 0 rows (or just 'zones' if it existed before)
   ```

3. **⚠️ Important**: The rollback script does NOT restore v1 schema. It only removes v2 additions. See `rollback_v2.sql` header for restoration instructions.

---

## Test Maintenance

### When adding new schema elements:

1. **Update migration** (`20260211_v2_universal_engine.sql`):
   - Add new table/column/function
   - Make it idempotent (IF NOT EXISTS)

2. **Update schema validation test** (`__tests__/unit/v2-migration-schema.test.ts`):
   ```typescript
   it('should have new_table', () => {
     expect(migrationSQL).toMatch(/CREATE TABLE IF NOT EXISTS new_table/i);
   });
   ```

3. **Update SQL integration test** (`test_v2_migration.sql`):
   ```sql
   -- Test new feature
   SELECT 'Testing new_table'::TEXT;
   INSERT INTO new_table (id, name) VALUES (gen_random_uuid(), 'test');
   ```

4. **Run all tests**:
   ```bash
   npm run test:run -- __tests__/unit/v2-migration-schema.test.ts
   ```

5. **Update rollback** (`rollback_v2.sql`):
   ```sql
   DROP TABLE IF EXISTS new_table CASCADE;
   ```

---

## Performance Benchmarks

Expected test execution times:

- **Schema validation**: ~6 seconds (102 tests)
- **SQL integration**: ~2 seconds (with warm database)
- **Full CI pipeline**: ~2 minutes (including setup)

---

## Troubleshooting

### Schema validation tests fail

**Problem**: Tests fail after migration changes

**Solution**:
1. Read the test output carefully
2. Check if the migration file has the expected pattern
3. Update the regex in the test if needed
4. Ensure migration is idempotent

### SQL integration tests fail

**Problem**: "ERROR: relation does not exist"

**Solution**:
```bash
# Reset database
supabase db reset

# Or manually drop and recreate
psql -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
```

**Problem**: "ERROR: permission denied"

**Solution**:
- Ensure RLS is enabled: `ALTER TABLE xyz ENABLE ROW LEVEL SECURITY;`
- Check policy definitions
- Verify `auth.uid()` returns correct user

**Problem**: "ERROR: duplicate key value violates unique constraint"

**Solution**:
- Test data may already exist from previous run
- Add cleanup at start of test
- Use `ON CONFLICT DO NOTHING` for seed data

---

## Additional Resources

- [Supabase Migration Guide](https://supabase.com/docs/guides/database/migrations)
- [PostgreSQL Testing Best Practices](https://www.postgresql.org/docs/current/regress.html)
- [Vitest Documentation](https://vitest.dev/)
- [PlayDeck v2 Migration README](../supabase/migrations/README.md)

---

**Last updated**: 2026-02-12
**Migration version**: v2 (20260211_v2_universal_engine.sql)
**Test coverage**: 102 schema validation tests + 40 SQL integration tests
