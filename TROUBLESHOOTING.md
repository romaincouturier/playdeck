# Guide de Dépannage - PlayDeck

## 🖼️ Les images des cartes ne s'affichent pas

Si vous voyez une icône d'image cassée au lieu de vos cartes, suivez ces étapes :

### Étape 1 : Vérifier que le bucket existe

1. Allez dans votre projet Supabase : https://supabase.com
2. Cliquez sur **Storage** dans le menu de gauche
3. Vérifiez qu'il existe un bucket nommé **`card-images`**

**Si le bucket n'existe pas :**
- Le script SQL n'a pas été exécuté complètement
- Réexécutez le fichier `supabase/schema.sql` dans le SQL Editor

### Étape 2 : Vérifier que le bucket est public

1. Dans **Storage**, cliquez sur le bucket `card-images`
2. Cliquez sur **Settings** (icône d'engrenage)
3. Vérifiez que **Public bucket** est coché ✅

**Si ce n'est pas coché :**
1. Cochez "Public bucket"
2. Cliquez sur "Save"

### Étape 3 : Vérifier les politiques de stockage

1. Dans **Storage**, cliquez sur `card-images`
2. Cliquez sur **Policies** (ou Configuration → Policies)
3. Vous devez voir ces 3 politiques :
   - ✅ **"Users can upload card images"** (INSERT)
   - ✅ **"Card images are publicly accessible"** (SELECT)
   - ✅ **"Users can delete their own card images"** (DELETE)

**Si les politiques n'existent pas :**

Allez dans **SQL Editor** et exécutez :

```sql
-- Storage policies
CREATE POLICY "Users can upload card images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'card-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Card images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'card-images');

CREATE POLICY "Users can delete their own card images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'card-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

### Étape 4 : Vérifier les URLs des images

1. Dans Supabase, allez dans **Storage** → `card-images`
2. Vous devriez voir vos images uploadées dans des dossiers par user_id
3. Cliquez sur une image → "Get URL"
4. L'URL devrait ressembler à :
   ```
   https://[votre-projet].supabase.co/storage/v1/object/public/card-images/...
   ```

**Si les images ne sont pas dans le bucket :**
- L'upload a échoué silencieusement
- Vérifiez la console du navigateur (F12) pour les erreurs
- Réessayez d'uploader une carte

### Étape 5 : Tester l'accès public

1. Copiez l'URL d'une image depuis Supabase Storage
2. Ouvrez cette URL dans un nouvel onglet privé (mode incognito)
3. L'image devrait s'afficher

**Si l'image ne s'affiche pas en mode incognito :**
- Le bucket n'est pas public
- Les politiques de lecture (SELECT) ne sont pas configurées
- Retournez aux étapes 2 et 3

### Étape 6 : Vérifier les variables d'environnement sur Vercel

1. Allez sur [vercel.com](https://vercel.com) → Votre projet
2. **Settings** → **Environment Variables**
3. Vérifiez que ces 2 variables existent et sont correctes :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Si elles manquent ou sont incorrectes :**
1. Ajoutez-les ou corrigez-les
2. Allez dans **Deployments**
3. Redéployez l'application

---

## 🔐 Problèmes d'authentification

### "Invalid supabaseUrl"

**Cause :** Les variables d'environnement ne sont pas configurées sur Vercel

**Solution :**
1. Vercel → Settings → Environment Variables
2. Ajoutez `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Redéployez

### Email de confirmation non reçu

**Solutions :**
1. Vérifiez vos spams
2. Attendez 5 minutes
3. Dans Supabase → **Authentication** → **Users**, confirmez l'email manuellement

---

## 📁 Problème d'upload

### "Body exceeded 1 MB limit"

**Cause :** L'image est trop grande

**Solution :**
- Les images sont limitées à 10 MB
- Compressez votre image avec [TinyPNG](https://tinypng.com) ou [Squoosh](https://squoosh.app)

### "Le deck a atteint la limite de 500 cartes"

**Cause :** Normal, c'est la limite par design

**Solution :**
- Créez un nouveau deck
- Ou supprimez des cartes anciennes

---

## 🚫 Erreurs RLS (Row Level Security)

### "new row violates row-level security policy"

**Cause :** Les politiques RLS ne sont pas configurées correctement

**Solution :**

1. Allez dans Supabase → **SQL Editor**
2. Exécutez le fichier complet `supabase/schema.sql`
3. Vérifiez que toutes les politiques sont créées :
   - Allez dans **Database** → **Tables** → `decks` → **Policies**
   - Vous devriez voir 4 politiques (SELECT, INSERT, UPDATE, DELETE)
   - Même chose pour la table `cards`

---

## 🔄 Après avoir tout essayé

Si rien ne fonctionne :

1. **Supprimez et recréez le bucket :**
   - Storage → card-images → Settings → Delete bucket
   - Réexécutez `supabase/schema.sql`

2. **Vérifiez la console navigateur (F12) :**
   - Onglet Console : regardez les erreurs
   - Onglet Network : vérifiez les requêtes Supabase

3. **Testez en local :**
   ```bash
   npm run dev
   ```
   - Si ça marche en local mais pas sur Vercel → problème de variables d'environnement

4. **Redéployez sur Vercel :**
   - Vercel → Deployments → ⋮ → Redeploy

---

## 📞 Support

Si le problème persiste :
1. Vérifiez les logs Vercel (Deployments → Function Logs)
2. Vérifiez les logs Supabase (Logs & Analytics)
3. Ouvrez un issue sur GitHub avec les détails de l'erreur
