# Construction du site

Le site n'utilise plus Babel dans le navigateur. Le JSX est compilé **avant**
le déploiement, ce qui divise par sept le temps d'affichage sur mobile.

## Où écrire

| Fichier | Contenu |
|---|---|
| `src/app.jsx` | tout le code React — c'est ici qu'on travaille au quotidien |
| `src/index.template.html` | l'enveloppe HTML : `<head>`, styles, scripts tiers, balises SEO |
| les autres `*.html` | les pages annexes, copiées telles quelles |

`index.html` n'existe plus à la racine : il est **généré** dans `dist/` à chaque
construction. Le modifier à la main n'aurait aucun effet.

## Commandes

```bash
npm install   # une seule fois
npm run build # produit dist/
```

Pour vérifier le résultat en local :

```bash
npx serve dist    # ou: cd dist && python3 -m http.server 8000
```

## Ce que fait la construction

1. `src/app.jsx` est compilé et minifié par esbuild (JSX → `React.createElement`,
   le même résultat que produisait Babel, mais une fois pour toutes).
2. Le fichier obtenu est nommé `assets/app.<empreinte>.js`. L'empreinte change
   avec le contenu : les navigateurs reprennent donc toujours la dernière version,
   sans jamais re-télécharger une version inchangée.
3. Le marqueur `<!--APP_SCRIPT-->` du gabarit est remplacé par la balise `<script>`
   correspondante.
4. Les images, polices et pages annexes sont recopiées dans `dist/`.

## Déploiement

Vercel exécute `npm run build` et publie `dist/` — voir `vercel.json`.
Rien à lancer à la main.

## Si quelque chose casse

La construction échoue bruyamment plutôt que de publier une page blanche :
une erreur de syntaxe dans `src/app.jsx` arrête le déploiement, et la version
précédente reste en ligne. C'était l'inverse avec Babel, où l'erreur ne se
découvrait que dans le navigateur du visiteur.
