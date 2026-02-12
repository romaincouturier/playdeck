# 🔧 Fix: Erreur de type zone_id lors de la migration v2

## 🚨 Le problème

Vous avez rencontré cette erreur lors de l'application de la migration v2 :

```
ERROR: 42804: foreign key constraint "game_cards_zone_id_fkey" cannot be implemented
DETAIL: Key columns "zone_id" and "id" are of incompatible types: text and uuid.
```

**Cause** : La colonne `game_cards.zone_id` a été renommée depuis `location` (qui était TEXT), mais n'a pas été convertie en UUID pour correspondre à `zones.id`.

---

## ✅ Solution en 2 étapes

### Étape 1 : Appliquer le correctif

Dans **Supabase SQL Editor**, exécutez le contenu de ce fichier :

📄 `supabase/migrations/fix_zone_id_type.sql`

Ce script va :
1. ✅ Supprimer l'ancienne contrainte FK (si elle existe)
2. ✅ Vérifier le type actuel de `zone_id`
3. ✅ Convertir `zone_id` de TEXT vers UUID
4. ✅ Nettoyer les valeurs invalides (non-UUID)
5. ✅ Recréer la contrainte FK vers `zones(id)`
6. ✅ Vérifier que tout est correct

**Résultat attendu** :
```
✅ game_cards.zone_id converti en UUID
✅ Contrainte game_cards_zone_id_fkey créée
✅ Les types correspondent!
🎉 Migration du type zone_id terminée avec succès!
```

---

### Étape 2 : Réappliquer la migration v2 (si nécessaire)

Si la migration v2 n'était pas complète, vous pouvez maintenant la réexécuter :

📄 `supabase/migrations/20260211_v2_universal_engine.sql`

Le script est maintenant **corrigé** et contient la conversion automatique du type `zone_id`.

---

## 🔍 Vérification

Une fois le correctif appliqué, vérifiez que tout fonctionne :

### Option 1 : Via l'application
1. Allez sur `http://localhost:3000/admin/check-migration`
2. Tous les tests doivent être ✅ verts
3. Vous devriez voir "🎉 Migration v2 appliquée avec succès!"

### Option 2 : Via SQL
```sql
-- Vérifier les types
SELECT
  'game_cards.zone_id' as colonne,
  data_type
FROM information_schema.columns
WHERE table_name = 'game_cards' AND column_name = 'zone_id'
UNION ALL
SELECT
  'zones.id' as colonne,
  data_type
FROM information_schema.columns
WHERE table_name = 'zones' AND column_name = 'id';

-- Résultat attendu :
-- game_cards.zone_id | uuid
-- zones.id           | uuid
```

---

## 🎯 Tester la création de partie

Une fois tout corrigé :

1. Relancez l'application : `npm run dev`
2. Allez sur `/decks`
3. Créez un nouveau deck avec des cartes
4. Cliquez sur "Créer une partie"
5. ✅ Ça devrait fonctionner !

---

## 🆘 En cas de problème persistant

### Erreur : "column zone_id already has a default"
**Solution** : Ignorez cette erreur, elle est normale si vous réexécutez le script.

### Erreur : "constraint already exists"
**Solution** : Le script supprime automatiquement l'ancienne contrainte, mais si l'erreur persiste :
```sql
ALTER TABLE game_cards DROP CONSTRAINT IF EXISTS game_cards_zone_id_fkey;
```
Puis réexécutez le script.

### Erreur : "invalid input syntax for type uuid"
**Solution** : Vous avez des données non-UUID dans `zone_id`. Le script nettoie automatiquement, mais vous pouvez vérifier :
```sql
SELECT id, zone_id
FROM game_cards
WHERE zone_id IS NOT NULL
  AND zone_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
```

---

## 📝 Note pour les futurs utilisateurs

La migration principale (`20260211_v2_universal_engine.sql`) est maintenant **corrigée** et contient la conversion automatique du type. Les nouveaux utilisateurs n'auront plus ce problème.

---

## ✅ Checklist de récupération

- [ ] J'ai exécuté `fix_zone_id_type.sql` dans Supabase
- [ ] J'ai vu "🎉 Migration du type zone_id terminée avec succès!"
- [ ] J'ai vérifié sur `/admin/check-migration` (tous ✅)
- [ ] J'ai testé la création d'une partie (ça marche !)

🎉 Félicitations ! Votre migration v2 est maintenant complète et fonctionnelle.
