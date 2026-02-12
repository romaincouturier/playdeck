# 🚀 Guide Simplifié : Migration v2

## ✨ Un seul script à exécuter !

La migration v2 a été **unifiée** pour inclure tous les correctifs. Vous n'avez besoin que d'un seul script.

---

## 📝 Instructions

### 1. Ouvrir Supabase SQL Editor

Allez sur votre **Supabase Dashboard** → **SQL Editor**

### 2. Exécuter le script de migration v2

Copiez **tout le contenu** de ce fichier et exécutez-le :

📄 `supabase/migrations/20260211_v2_universal_engine.sql`

### 3. Vérifier le succès

**Résultats attendus dans les logs** :
```
✅ Conversion de zone_id TEXT → UUID via nouvelle colonne...
  → Colonne zone_id_new créée
  → Valeurs UUID valides copiées
  → Ancienne colonne zone_id supprimée
  → Colonne renommée zone_id_new → zone_id
✅ Conversion terminée avec succès

✅ Table game_master créée
✅ Table turn_state créée
✅ Fonction distribute_cards créée
✅ Triggers créés
```

### 4. Vérifier via l'interface

Visitez : `http://localhost:3000/admin/check-migration`

**Tous les tests doivent être verts** ✅

---

## 🎮 Test final

1. Allez sur `/decks`
2. Créez un nouveau deck (ou utilisez un existant)
3. Ajoutez quelques cartes
4. Cliquez sur **"Créer une partie"**
5. Ajoutez un autre joueur
6. Cliquez sur **"Démarrer la partie"**

**Résultat attendu** : La partie démarre, les zones sont créées automatiquement, et les cartes sont distribuées aux joueurs 🎉

---

## ⚠️ En cas de problème

### Erreur : "table zones already exists"
**Solution** : C'est normal si vous réexécutez le script. Le script est **idempotent** (peut être exécuté plusieurs fois sans problème).

### Erreur : "column zone_id already exists"
**Solution** : Le script détecte automatiquement si `zone_id` est déjà UUID et ignore la conversion.

### Erreur : "constraint already exists"
**Solution** : Normal, le script vérifie l'existence avant de créer.

### Autres erreurs
Consultez le fichier `MIGRATION_FIX_ZONE_ID.md` pour des solutions détaillées, ou contactez le support.

---

## 📦 Ce que fait la migration v2

### Nouvelles tables
- ✅ `game_master` - Gestion du maître de jeu
- ✅ `turn_state` - Gestion des tours de jeu
- ✅ `zones` - Zones de jeu (DECK, HAND, DISCARD, etc.)
- ✅ `primitive_actions` - Historique des actions
- ✅ `game_rules_text` - Règles du jeu en markdown

### Colonnes modifiées
- ✅ `games.game_master_id` (remplace `host_id`)
- ✅ `game_cards.zone_id` (UUID - remplace `location` TEXT)
- ✅ `zones.game_id` (zones par partie, pas par deck)

### Fonctions ajoutées
- ✅ `distribute_cards()` - Distribution des cartes
- ✅ `create_default_zones()` - Création zones par défaut
- ✅ `initialize_turn_state()` - Initialisation des tours
- ✅ `recycle_discard_to_deck()` - Recyclage défausse → pioche
- ✅ Et bien d'autres...

### Triggers automatiques
- ✅ Création automatique des zones au démarrage de partie
- ✅ Création automatique de la main d'un joueur qui rejoint
- ✅ Mise à jour automatique des timestamps

---

## 🎉 C'est tout !

Une fois la migration appliquée avec succès, votre PlayDeck est prêt à héberger des parties avec le nouveau moteur v2 universel et agnostique du type de jeu.

**Bon jeu !** 🎮🃏
