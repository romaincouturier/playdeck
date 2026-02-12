# 🚀 Guide rapide : Appliquer la migration v2

## ⚠️ IMPORTANT : Vous devez appliquer la migration avant de pouvoir créer des parties !

L'erreur que vous rencontrez vient du fait que la migration v2 n'a pas encore été appliquée dans Supabase.

---

## Étapes à suivre

### 1️⃣ Vérifier l'état actuel

1. Ouvrez **Supabase Dashboard** : https://supabase.com/dashboard
2. Allez dans **SQL Editor**
3. Copiez-collez le contenu de `supabase/migrations/check_v2_status.sql`
4. Cliquez sur **Run**

**Résultat attendu** :
- ✅ Si tout est OK : "🎉 Migration v2 appliquée avec succès!"
- ❌ Si erreur : La migration n'est pas appliquée, passez à l'étape 2

---

### 2️⃣ Appliquer la migration v2

1. Dans **Supabase SQL Editor**
2. Ouvrez le fichier `supabase/migrations/20260211_v2_universal_engine.sql`
3. Copiez **TOUT** le contenu du fichier
4. Collez dans le SQL Editor
5. Cliquez sur **Run**
6. Attendez 30-60 secondes (c'est un gros script)

**Résultat attendu** :
```
Success. No rows returned
```

---

### 3️⃣ Vérifier que tout fonctionne

Relancez le script de vérification (étape 1). Vous devriez voir :
```
✅ Table game_master: OK
✅ Table turn_state: OK
✅ Colonne games.game_master_id: OK
✅ Colonne games.host_id supprimée: OK
✅ Table zones avec game_id: OK
✅ Colonne game_cards.zone_id: OK
🎉 Migration v2 appliquée avec succès!
```

---

### 4️⃣ Tester la création de partie

Relancez l'application :
```bash
npm run dev
```

Puis essayez de créer une nouvelle partie.

---

## 🆘 En cas de problème

### Erreur : "relation already exists"
**Solution** : C'est normal ! La migration est idempotente (peut être relancée). Si tout le reste passe, c'est OK.

### Erreur : "permission denied"
**Solution** : Vérifiez que vous êtes bien connecté en tant que propriétaire du projet Supabase.

### Erreur : "syntax error"
**Solution** :
1. Vérifiez que vous avez copié **TOUT** le fichier SQL
2. Ne copiez QUE le contenu SQL, sans les métadonnées de fichier

---

## 📋 Checklist rapide

- [ ] J'ai ouvert Supabase Dashboard
- [ ] J'ai vérifié l'état avec `check_v2_status.sql`
- [ ] J'ai appliqué `20260211_v2_universal_engine.sql`
- [ ] J'ai re-vérifié l'état (tous les tests passent ✅)
- [ ] J'ai relancé `npm run dev`
- [ ] Je peux créer une partie sans erreur 🎉

---

## 📞 Besoin d'aide ?

Si après avoir suivi ces étapes vous rencontrez toujours des erreurs :
1. Partagez le message d'erreur exact de Supabase
2. Partagez le message d'erreur de la console navigateur (F12)
3. Indiquez à quelle étape vous bloquez
