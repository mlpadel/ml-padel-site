# CLAUDE.md

Ce fichier fournit des consignes à Claude Code (claude.ai/code) lors de toute intervention sur ce dépôt.

## Vue d'ensemble du projet

Site marketing + réservation pour **ML Padel** (coaching padel à La Réunion). C'est un **site statique sans étape de build** — Vercel sert les fichiers tels quels. La page principale est une SPA React livrée via `<script type="text/babel">` (React 18 UMD + Babel Standalone, transpilé dans le navigateur).

La langue est **le français partout** ; identifiants de sections, clés d'objets, noms de composants et messages de commit utilisent tous le français (souvent accentué, par ex. `id="événements"`, `function Événements()`, `data.académie`). Conserver les identifiants accentués existants — plusieurs commits récents sont des reverts d'urgence suite à corruption d'encodage UTF-8 (`fd11280`, `c8bad0e`, `32892c7`).

## Commandes

Aucun `package.json`, pas de tests, pas de linter, pas de bundler. Le flux est : « éditer le HTML, rafraîchir le navigateur, commit, push ».

- **Aperçu local** : `python3 -m http.server 8000` (ou tout autre serveur statique) depuis la racine, puis ouvrir `http://localhost:8000/`.
- **Déploiement** : automatique via Vercel sur push vers `main`. `vercel.json` fixe `buildCommand: null`, `outputDirectory: "."` et redirige tout vers `/index.html` (Cal.com / Apps Script / Firebase gèrent tout le côté serveur — il n'y a pas de `/api/`).
- **Mise à jour du sitemap** : lorsqu'on ajoute une nouvelle page `.html` à indexer, ajouter aussi une entrée `<url>` dans `sitemap.xml` avec `<lastmod>` à la date du jour.

## Architecture

### Disposition des fichiers

- `index.html` (~3100 lignes) — la landing page. Contient toute l'app React dans un unique bloc `<script type="text/babel">`. Tous les composants de section y sont définis et composés dans `<MLPadel/>` en bas (vers la ligne 2821). Rendu via `ReactDOM.createRoot(document.getElementById("root")).render(<MLPadel/>)`.
- Pages HTML autonomes (chacune autosuffisante, HTML/CSS classique + un petit `<script>`, **sans React**) :
  - `academie-inscription.html` — formulaire d'inscription Académie (POST vers Apps Script `WALLET_API`).
  - `academie-padel-reunion.html`, `cours-padel-reunion.html`, `stage-padel-reunion.html` — pages SEO.
  - `stage-mai-2026.html` — page campagne pour le stage de mai.
  - `architecture.html`, `experience-client.html` — pages de contenu secondaire.
  - `system.html` — page cachée de visualisation d'architecture. Bloquée dans `robots.txt`. **Accessible uniquement par triple-clic sur le logo de la navbar de `index.html`** (handler en bas de `index.html` sur `<a href="#hero">`).
- Images à la racine du dépôt, avec variantes responsives pré-générées suffixées `-480w.webp`, `-768w.webp`, `-1080w.webp` (en plus de l'original `.JPG`/`.PNG`). Pour ajouter une photo, suivre la même nomenclature et générer les trois tailles webp.
- `manifest.json` (PWA), `sitemap.xml`, `robots.txt`, `vercel.json`.

### Structure interne de `index.html`

À lire dans cet ordre :
1. **Lignes 1–99** : `<head>` — meta, JSON-LD `SportsActivityLocation`, Open Graph, GA4 (`G-42T2TZ445S`), tags CDN Firebase + React + Babel.
2. **Lignes 108–166** : constantes globales de l'app. Source unique de vérité pour les couleurs, URLs externes et coordonnées. Toujours les réutiliser — ne jamais coder en dur de hex, d'URL Cal.com, de téléphone ou d'URL API dans du nouveau code.
   - Tokens de couleur : `NAVY`, `NAVY_MID`, `NAVY_LIGHT`, `GOLD`, `GOLD_LIGHT`, `GOLD_PALE`, `CREAM`, `WARM_WHITE`, `SAND`, `TEXT_DARK`, `TEXT_MED`, `TEXT_LIGHT`, `WHITE`.
   - `firebaseConfig` + `db = firebase.firestore()` — utilisés par `Reviews()`.
   - `CALCOM_BASE` + table `CALCOM` des slugs Cal.com. Deux variantes par prestation : `*Wallet` (débitée du wallet) et version non-wallet (paiement direct).
   - `CCT_API` et `WALLET_API_GLOBAL` — endpoints Google Apps Script ; voir *Backends* plus bas.
3. **Lignes 168–205** : `fontLink` — CSS global injecté comme élément React (keyframes, scrollbar, media queries mobile). Les règles mobiles utilisent des classNames comme `nav-desktop`, `hero-cta-row`, `wallet-cards`, `pricing-tabs`.
4. **Lignes 208–300** : primitives partagées — `useInView`, `AnimatedSection`, `Carousel`, `PhotoBanner`, `Icon` (table SVG), `Logo`.
5. **Lignes 304–2820** : une fonction par section de page. Le composant racine `MLPadel` (ligne 2821) les compose dans un ordre figé :
   `Navbar → Hero → CounterStats → About → TransitionAbout → ExperienceClient → Événements → Pricing → CoachingCarousel → TransitionPricing → Horaires → Wallet → WalletClient → TeamSection → InstagramSection → Gallery → CoursCollectifsSection → PallapShop → Testimonials → HowItWorks → FAQ → MapSection → CentrePhotos → Contact → Reviews → MentionsLegales → Footer → CookieBanner`.
6. **Lignes 2865+** (après le script React) : overlays JS vanilla autonomes ajoutés directement au DOM. L'ordre compte car ils mutent la page rendue :
   - **Cloche de notification** (`#mlp-bell-btn`) : modale d'abonnement flottante, tape `CCT_API?action=alert_subscribe|alert_unsubscribe`. État de l'abonnement en `localStorage` (`mlpadel_alert_subscribed`, `mlpadel_alert_email`).
   - **Scroll reveal** : `IntersectionObserver` tardif (timeout 2 s) qui fait apparaître en fondu les sections principales par ID.
   - **Tracking GA4** : listener `click` délégué qui marque les clics Cal.com / WhatsApp / wallet / pallap plus les impressions `section_vue`.
   - **Bandeau breaking-news** : bannière haute avec clé `localStorage` `mlp_acad2026_dismissed`. **Pousse le `<nav>` fixe vers le bas de 42 px via un `<style>` injecté** — y faire attention en modifiant le layout de la nav.
   - **Injection du badge Académie** : `setTimeout` à 3 s qui réécrit tout élément dont le texte vaut exactement `Académie` pour y ajouter le badge « 🆕 ».
   - **Triple-clic logo → `/system.html`** : fenêtre de 600 ms, surveille `nav a[href="#hero"]`. Ne pas modifier ce sélecteur sans mettre à jour le handler.

### Conventions dans `index.html`

- **Styles inline uniquement.** Pas de CSS modules, pas de styled-components, pas de Tailwind. Le seul bloc de style est `fontLink`. Suivre le style existant : littéraux d'objet `style={{...}}` avec références aux tokens (`background:WARM_WHITE`) ou interpolation de chaîne pour le hex alpha (`` `${GOLD}30` ``).
- **Ancres de section / nav** : définies dans `Navbar()` (ligne 304). Ajouter une section = ajouter un `id` à son `<section>` ET une entrée `{label, href}` dans le tableau `links`. Conserver les accents dans les IDs (`#événements`, `#academie`).
- **Animations** : envelopper le contenu visible dans `<AnimatedSection delay={...}>` plutôt que de coder un nouvel IntersectionObserver.
- **Responsive** : s'appuyer sur les classNames de media-queries déjà présents dans `fontLink` (`wallet-cards`, `pricing-tabs`, `stats-grid`, `gallery-slide`, `about-grid`, `nav-mobile-btn`). En ajouter dans `fontLink` plutôt que d'éparpiller des blocs `@media`.
- **Pas de type-checking JSX**, pas de TypeScript — Babel Standalone est permissif. Surveiller les bugs que la chaîne ne détectera pas (ex. `PhotoBanner` ligne 259 référence un `o.disabled` non défini — c'est un pattern de bug connu ; le nouveau code ne doit pas dépendre de variables hors portée).

### Pages HTML autonomes

Chacune est HTML brut + un bloc `<style>` + un petit `<script>` inline. Elles **ne partagent pas de code** avec `index.html` — couleurs et polices y sont dupliquées. Quand on modifie les couleurs de marque, faire une recherche dans tous les fichiers `.html`. Les formulaires d'inscription POSTent vers le même endpoint Apps Script `WALLET_API` avec un paramètre `action=...` (par ex. `academie_inscription`).

## Backends et intégrations

Toute la persistance est tierce. Aucun code serveur dans ce dépôt.

- **Cal.com** (`https://cal.com/ml-padel/*`) — toutes les réservations. Slugs centralisés dans la constante `CALCOM`.
- **Liens de paiement Stripe** — recharges wallet. URLs codées en dur dans le tableau `tiers` de `Wallet()` (~ligne 988) ; remplacer l'URL complète quand on change l'offre.
- **Firebase Firestore** (projet `ml-padel-reviews`) — seule la collection `reviews`, en lecture+écriture directe depuis le navigateur via le SDK firebase-compat. La clé API dans `firebaseConfig` est une clé client publique (normal pour Firebase web) — la sécurité est appliquée par les règles Firestore côté console Firebase, pas ici.
- **Google Apps Script — Wallet** (`WALLET_API_GLOBAL`, redéclaré aussi en `WALLET_API` dans `WalletClient()`) : POST JSON avec `action` ∈ `sendOtp`, `verifyOtp`, `history`, `debit`. Login par OTP email, puis débit de crédit sur le grand livre du wallet.
- **Google Apps Script — CCT** (`CCT_API`) : `GET ?action=events` liste les sessions cours collectifs ; `POST {action:"inscription", eventId, ...}` inscrit un participant ; `GET ?action=alert_subscribe|alert_unsubscribe&email=...` gère la liste de la cloche de notification.
- **Google Analytics 4** (`G-42T2TZ445S`). Événements personnalisés : `clic_reserver`, `clic_whatsapp`, `acces_wallet`, `clic_boutique`, `section_vue`. Ajouter les nouveaux événements via le listener délégué en bas de `index.html` plutôt que d'éparpiller des appels `gtag`.
- **WhatsApp** : construire les liens via le helper `wa(msg)`, pas en concaténant le numéro.

## Workflow Git

- Branche par défaut : `main`. Vercel déploie automatiquement depuis cette branche.
- Messages de commit majoritairement en français, à l'impératif/présent, parfois avec des préfixes type conventional (`fix:`, `feat:`, `Fix:`, ou libre). Coller au style de l'historique alentour.
- Plusieurs commits récents sont des reverts déclenchés par de la corruption UTF-8 (`URGENT: Revert ...`, `Revert: retour index.html ...`). Si `index.html` semble cassé visuellement après une édition, soupçonner du mojibake sur les caractères accentués avant de soupçonner un bug logique — et préférer `git revert` / `git checkout <sha-sain> -- index.html` plutôt qu'une retape manuelle.
