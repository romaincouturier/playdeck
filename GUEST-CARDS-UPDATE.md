# Mise à jour : Support complet des invités dans le jeu

## ⚠️ IMPORTANT : Migration de la base de données requise

Pour que les invités puissent jouer au jeu de cartes, vous devez appliquer une nouvelle migration SQL.

### Étape 1 : Appliquer le script SQL

1. Allez dans votre projet Supabase
2. Ouvrez le **SQL Editor**
3. Copiez le contenu du fichier `supabase/add-guest-game-cards.sql`
4. Collez-le dans l'éditeur SQL et exécutez-le

### Ce que fait ce script :

- Ajoute un champ `owner_guest_session_id` dans la table `game_cards`
- Met à jour la fonction `distribute_cards()` pour distribuer des cartes aux invités
- Ajoute une contrainte pour s'assurer que chaque carte appartient soit à un user_id soit à un guest_session_id

### Étape 2 : Redéployer sur Vercel

Une fois le script SQL appliqué, Vercel redéploiera automatiquement l'application avec les derniers changements de code qui supportent :

- ✅ Les invités peuvent rejoindre une partie avec juste leur prénom/nom
- ✅ Les invités reçoivent des cartes comme les autres joueurs
- ✅ Les invités peuvent piocher et jouer des cartes
- ✅ Les invités voient leur propre main de cartes
- ✅ L'affichage correct des noms des invités dans le jeu

### Vérification

Après avoir appliqué les changements :

1. Créez une partie en tant qu'utilisateur authentifié
2. Partagez le lien d'invitation
3. Ouvrez le lien en navigation privée (pour être invité)
4. Entrez un prénom et nom
5. Rejoignez la partie
6. L'hôte démarre la partie
7. L'invité devrait voir ses cartes et pouvoir jouer !

## Prochaines actions si les invités ne peuvent toujours pas jouer

Si après cette migration les invités ne peuvent pas jouer, il faudra également mettre à jour les actions de jeu (`drawCard`, `playCard`, `passTurn`) pour supporter les invités. Pour l'instant, ces actions supposent que le joueur est authentifié.
