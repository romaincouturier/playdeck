# Migrations Supabase - PlayDeck v2

## 🚀 Guide Rapide

**Vous voulez juste appliquer la migration ?**

👉 **Consultez le guide simplifié** : [`APPLY_MIGRATION_V2_SIMPLE.md`](../../APPLY_MIGRATION_V2_SIMPLE.md)

Un seul script à exécuter, tout est unifié et prêt à l'emploi !

---

## Vue d'ensemble

Ce dossier contient les scripts de migration pour le moteur universel v2 de PlayDeck.

## Scripts disponibles

### 1. Migration principale
**Fichier** : `20260211_v2_universal_engine.sql`

**Description** : Migration complète du moteur v2 avec toutes les fonctionnalités P0, P1 et P2.

**Contenu** :
- 🆕 7 nouvelles tables (game_master, zones, primitive_actions, turn_state, etc.)
- 🆕 4 tables P1/P2 (card_marks, game_snapshots, predefined_games, player_visibility_overrides)
- 🆕 7 fonctions SQL utilitaires
- 🔄 Modifications sur tables existantes (games, game_players, game_cards, cards)
- 📊 Données seed (2 jeux prédéfinis : Bataille, Uno)

**Caractéristiques** :
- ✅ Idempotente : peut être réexécutée sans erreur
  - Tables : `CREATE TABLE IF NOT EXISTS`
  - Index : `CREATE INDEX IF NOT EXISTS`
  - Policies : `DROP POLICY IF EXISTS` puis `CREATE POLICY`
  - Colonnes : `ADD COLUMN IF NOT EXISTS`, `DROP COLUMN IF EXISTS`
- ✅ Supprime automatiquement `host_id` (remplacée par `game_master_id`)
- ✅ RLS (Row Level Security) : 25 policies configurées pour toutes les tables

---

### 2. Script de test
**Fichier** : `test_v2_migration.sql`

**Description** : Valide que la migration a été correctement appliquée.

**Tests inclus** :
- ✅ 8 tests de tables
- ✅ 7 tests de fonctions SQL
- ✅ Création d'une partie complète de test (code: TEST99)
- ✅ Vérification de toutes les données créées

**Résultat attendu** : Tous les tests doivent passer et la partie TEST99 doit être créée avec succès.

---

### 3. Script de rollback
**Fichier** : `rollback_v2.sql`

**Description** : Annule complètement la migration v2 et nettoie la base de données.

**⚠️ ATTENTION** : Ce script supprime TOUTES les données de test et les tables v2 !

**Utilisation** : Uniquement si vous devez réinitialiser complètement la base de données.

---

## Procédure d'application

### Étape 1 : Backup (recommandé)
```sql
-- Créer un backup de votre base de données
-- Via Supabase Dashboard > Settings > Backups
```

### Étape 2 : Appliquer la migration
1. Ouvrir Supabase SQL Editor
2. Copier le contenu de `20260211_v2_universal_engine.sql`
3. Exécuter le script
4. Vérifier qu'il n'y a pas d'erreurs

### Étape 3 : Tester la migration
1. Copier le contenu de `test_v2_migration.sql`
2. Exécuter le script
3. Vérifier que tous les tests passent

### Étape 4 : Nettoyer (optionnel)
```sql
-- Supprimer la partie de test si nécessaire
DELETE FROM primitive_actions WHERE game_id IN (SELECT id FROM games WHERE code = 'TEST99');
DELETE FROM game_snapshots WHERE game_id IN (SELECT id FROM games WHERE code = 'TEST99');
DELETE FROM game_cards WHERE game_id IN (SELECT id FROM games WHERE code = 'TEST99');
DELETE FROM turn_state WHERE game_id IN (SELECT id FROM games WHERE code = 'TEST99');
DELETE FROM zones WHERE game_id IN (SELECT id FROM games WHERE code = 'TEST99');
DELETE FROM game_players WHERE game_id IN (SELECT id FROM games WHERE code = 'TEST99');
DELETE FROM game_master WHERE game_id IN (SELECT id FROM games WHERE code = 'TEST99');
DELETE FROM games WHERE code = 'TEST99';
```

---

## Résolution de problèmes

### Erreur : "relation already exists"
**Solution** : La migration est idempotente, cette erreur ne devrait plus se produire. Si elle persiste :
1. Vérifiez que vous utilisez la dernière version du script
2. Si nécessaire, exécutez `rollback_v2.sql` puis réappliquez la migration

### Erreur : "column host_id does not exist"
**Solution** : La migration supprime automatiquement `host_id`. Cette erreur indique que le script de test utilise une ancienne version.

### Erreur : "null value in column violates not-null constraint"
**Solution** : Vérifiez que toutes les colonnes requises sont fournies dans les INSERT statements.

---

## Architecture v2

### Nouvelles tables principales

#### `game_master`
Configuration du Maître du Jeu pour chaque partie.

#### `zones`
Zones dynamiques configurables (DECK, HAND, CENTER, DISCARD, CUSTOM).

#### `primitive_actions`
Historique de toutes les actions primitives exécutées.

#### `turn_state`
État actuel des tours (joueur actuel, ordre, direction, timer).

### Tables P1/P2

#### `card_marks` (P2)
Marquages visuels sur les cartes.

#### `game_snapshots` (P2)
Sauvegardes complètes de parties.

#### `predefined_games` (P2)
Bibliothèque de jeux prédéfinis.

#### `player_visibility_overrides` (P1)
Surcharges de visibilité entre joueurs.

---

## Prochaines étapes

Une fois la migration appliquée avec succès :

1. ✅ Consulter `MIGRATION_PLAN.md` pour le plan d'implémentation sur 10 semaines
2. ✅ Commencer Phase 1 : Core Engine (2 semaines)
3. ✅ Implémenter les composants TypeScript dans `/types`
4. ✅ Créer les Server Actions Next.js pour les primitives

---

## Support

Pour toute question ou problème :
1. Consulter `MIGRATION_TEST_PLAN.md` pour la checklist complète
2. Consulter `ARCHITECTURE_V2.md` pour les détails techniques
3. Vérifier les logs SQL dans Supabase Dashboard > SQL Editor > History
