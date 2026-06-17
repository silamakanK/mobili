# CLAUDE.md — Mobili

Source de vérité unique du projet. Ce fichier prime sur tout contexte de conversation.

---

## Présentation

**Mobili** est une plateforme web responsive de réservation de billets de transport interurbain au Mali.

Parcours principal : recherche de trajet → comparaison des compagnies → réservation d'un siège → paiement en ligne → e-ticket PDF avec QR code unique → validation à l'embarquement par scan.

**Contexte terrain :**
- Majorité d'utilisateurs sur smartphones Android entrée de gamme
- Connexions limitées (3G)
- Paiement mobile dominant : Orange Money, Moov Money, Wave
- Devise : XOF (Franc CFA)
- Axes principaux : Bamako ↔ Kayes, Sikasso, Mopti, Gao, Tombouctou
- Compagnies cibles : Diarra Transport, Tilemsi, Sonef, Benso

---

## Stack technique

| Couche | Technologie |
|---|---|
| Frontend | React.js, React Router, Axios, Tailwind CSS, React Hook Form |
| Backend | Node.js, Express.js, API REST |
| ORM | **Prisma** (pas Sequelize) |
| Base de données | PostgreSQL |
| Authentification | JWT + RBAC |
| Paiement | PayDunya (agrège Orange Money, Moov Money, Wave, carte) |
| PDF | PDFKit ou équivalent |
| QR Code | bibliothèque Node.js (ex. qrcode) |
| Notifications | SMS (Infobip ou Twilio) + Email (SMTP / Mailgun) |
| Tests | Jest |
| Qualité code | ESLint, Prettier, Husky (pre-commit), SonarQube |
| CI/CD | GitHub Actions |
| Conteneurisation | Docker + Docker Compose |
| Déploiement | VPS Linux |
| Documentation API | Swagger / OpenAPI |
| Versionnement | Git / GitHub |

---

## Architecture

```
projet_fil_rouge/
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── companies/
│   │   │   ├── routes/
│   │   │   ├── trips/
│   │   │   ├── reservations/
│   │   │   ├── payments/
│   │   │   ├── tickets/
│   │   │   ├── validations/
│   │   │   └── notifications/
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js
│   │   │   └── rbac.middleware.js
│   │   ├── utils/
│   │   ├── config/
│   │   └── app.js
│   ├── prisma/
│   │   └── schema.prisma
│   ├── tests/
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── hooks/
│   │   └── utils/
│   └── package.json
├── docs/
│   └── uml/
├── docker-compose.yml
├── .github/
│   └── workflows/
└── CLAUDE.md
```

---

## Rôles et permissions (RBAC)

| Rôle | Qui | Permissions |
|---|---|---|
| `VOYAGEUR` | Tout utilisateur inscrit | Recherche, réservation, paiement, tickets, historique |
| `AGENT` | Contrôleur à la gare | Départs du jour, scan QR, validation/refus, recherche manuelle |
| `ADMIN_COMPANY` | Responsable compagnie | Lignes, trajets, véhicules, sièges, agents, réservations de sa compagnie |
| `SUPER_ADMIN` | Équipe Mobili | Tout — compagnies, utilisateurs, transactions, statistiques globales |

Un agent ne voit que les trajets de sa compagnie. Un admin compagnie ne modifie que ses propres données.

---

## Fonctionnalités V1

### Voyageur
- Créer un compte
- Se connecter / se déconnecter
- Rechercher un trajet (origine, destination, date)
- Comparer les offres disponibles (compagnie, horaire, prix, places restantes)
- Réserver un siège
- Payer en ligne via PayDunya (XOF)
- Télécharger l'e-ticket PDF
- Consulter l'historique des réservations

### Agent de contrôle
- Consulter les départs du jour (sa compagnie uniquement)
- Scanner un QR code
- Valider un billet (VALIDE)
- Refuser un billet (DÉJÀ UTILISÉ / INVALIDE / INTROUVABLE)
- Rechercher un billet manuellement (nom ou téléphone)

### Admin Compagnie
- Gérer les lignes (créer, modifier, activer/désactiver)
- Gérer les trajets (horaires, prix, places)
- Gérer les véhicules
- Gérer les sièges
- Gérer les agents (créer des comptes agents)
- Consulter les réservations de sa compagnie

### Super Admin
- Gérer les compagnies partenaires
- Gérer tous les utilisateurs
- Superviser les transactions
- Consulter les statistiques globales

### Hors périmètre V1
- Applications mobiles natives iOS/Android
- USSD
- Programme de fidélité
- Avis et notation
- Recommandations IA
- Gestion automatisée des trajets retour

---

## Modèle de données

### Entités

```
User          id, firstName, lastName, email, phone, passwordHash, isActive, roleId, companyId, createdAt
Role          id, name, permissions[]
Company       id, name, logo, contactEmail, contactPhone, isActive, createdAt
Vehicle       id, registrationNumber, type, totalSeats, isActive, companyId
Route         id, origin, destination, distance, estimatedDuration, companyId
Trip          id, routeId, vehicleId, departureDate, departureTime, price, availableSeats, status
Seat          id, vehicleId, seatNumber, type, isAvailable
Reservation   id, userId, tripId, seatId, reservationCode, status, totalAmount, createdAt
Payment       id, reservationId, amount, method, transactionId, status, paidAt
Ticket        id, reservationId, ticketCode, qrCode, pdfUrl, isUsed, issuedAt
TicketValidation  id, ticketId, agentId, validatedAt, status, reason
Notification  id, userId, type, channel, content, sentAt, status
```

### Enums

```
TripStatus:         SCHEDULED | CANCELLED | COMPLETED
ReservationStatus:  PENDING | CONFIRMED | CANCELLED
PaymentMethod:      ORANGE_MONEY | MOOV_MONEY | WAVE | CARD
PaymentStatus:      PENDING | CONFIRMED | FAILED | REFUNDED
ValidationStatus:   VALID | INVALID | ALREADY_USED | NOT_FOUND
NotificationChannel: SMS | EMAIL
```

---

## API REST — Endpoints

### Auth
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
```

### Trips
```
GET    /api/trips?from=&to=&date=
GET    /api/trips/today              (agent — trajets du jour de sa compagnie)
GET    /api/trips/:id
```

### Reservations
```
POST   /api/reservations
GET    /api/reservations/me
GET    /api/reservations/:id
```

### Payments
```
POST   /api/payments/initiate
POST   /api/payments/webhook        (PayDunya callback — public)
GET    /api/payments/:id/status
```

### Tickets
```
GET    /api/tickets/:id
GET    /api/tickets/:id/download    (PDF)
GET    /api/tickets/search?q=       (agent — recherche manuelle)
POST   /api/tickets/validate        (agent — scan QR)
```

### Companies (Admin Compagnie / Super Admin)
```
GET    /api/companies
POST   /api/companies
GET    /api/companies/:id
PUT    /api/companies/:id
```

### Routes, Trips, Vehicles, Seats (Admin Compagnie)
```
CRUD   /api/routes
CRUD   /api/vehicles
CRUD   /api/seats
```

### Users (Super Admin)
```
GET    /api/users
PUT    /api/users/:id
DELETE /api/users/:id
```

### Stats (Super Admin / Admin Compagnie)
```
GET    /api/stats/global
GET    /api/stats/company/:id
```

---

## Règles métier

1. Une réservation n'est confirmée qu'après validation du paiement (webhook PayDunya).
2. Un billet est lié à exactement 1 trajet + 1 date + 1 heure + 1 siège.
3. Un siège ne peut être attribué qu'à un seul voyageur par trajet (verrouillage transactionnel).
4. Un QR code est à usage unique — le 2ème scan retourne ALREADY_USED.
5. Un billet doit toujours contenir un code alphanumérique court de secours (pour les agents sans réseau).
6. Détection de doublon de réservation dans une fenêtre de 5 minutes.
7. PayDunya est l'unique agrégateur de paiement — pas d'intégration directe Orange/Wave/Moov.
8. La confirmation du paiement est asynchrone (webhook) — jamais synchrone.
9. Toutes les opérations sensibles (paiement, validation, connexion) doivent être journalisées.
10. Les données bancaires ne sont jamais stockées dans Mobili.

---

## Cas limites terrain (tous gérés)

| # | Cas | Solution principale | Secours |
|---|---|---|---|
| 1 | Téléphone déchargé | Recherche par nom/téléphone | Imprimer PDF à l'avance |
| 2 | Pas de réseau agent | Liste passagers téléchargée en début de journée | Vérif manuelle |
| 3 | Voyageur sans smartphone | Code alphanumérique dans le SMS | Agent saisit manuellement |
| 4 | Paiement sans confirmation | Webhook + génération en rattrapage | Support Mobili |
| 5 | Fraude / faux billet | QR usage unique | Vérification pièce d'identité |
| 6 | Annulation compagnie | SMS automatique + report/remboursement | Espace personnel |
| 7 | Double réservation | Détection backend < 5 min | Remboursement automatique |
| 8 | Coupure réseau au paiement | Confirmation asynchrone + page statut | Email/SMS dès confirmation |
| 9 | Mauvais bus scanné | Message INVALIDE POUR CE BUS | Agent redirige |

---

## Sécurité

- HTTPS obligatoire
- JWT pour toutes les routes authentifiées
- RBAC middleware sur chaque endpoint (vérifier le rôle, pas seulement le token)
- Validation des entrées côté serveur (pas seulement côté client)
- Protection XSS, injection SQL (Prisma paramétré par défaut)
- Rate limiting sur les endpoints sensibles (login, paiement)
- Journalisation (Winston) de toutes les actions sensibles
- Aucune donnée bancaire stockée
- Secrets dans variables d'environnement, jamais dans le code

---

## Conventions de développement

### Git — GitFlow
- `main` : production stable uniquement
- `develop` : intégration continue
- `feature/nom-feature` : une branche par fonctionnalité
- `release/x.y.z` : préparation release
- `hotfix/nom-fix` : correctif urgent sur main

### Nommage
- Variables / fonctions JS : camelCase
- Composants React : PascalCase
- Fichiers : kebab-case
- Tables / colonnes Prisma : camelCase (Prisma gère la conversion SQL)
- Variables d'environnement : UPPER_SNAKE_CASE

### Commits
Format : `type(scope): message court`
Types : feat, fix, docs, style, refactor, test, chore

Exemples :
```
feat(auth): add JWT middleware with role check
fix(payment): handle webhook timeout gracefully
test(reservation): add seat lock concurrency test
```

### Code
- Pas de commentaires évidents — seulement les WHY non-obvieux
- Pas de `console.log` en production — utiliser Winston
- Toujours valider les données à l'entrée de l'API (jamais faire confiance au client)
- Un module = un dossier avec `router.js`, `controller.js`, `service.js`, `*.test.js`

---

## Tests

- **Unitaires** : fonctions utilitaires, services isolés
- **Intégration** : endpoints API avec base de données de test
- **Fonctionnels** : parcours complets (réservation, paiement, validation)
- Framework : Jest
- Couverture cible : > 70%

---

## Variables d'environnement requises

```env
# Base de données
DATABASE_URL=postgresql://user:password@localhost:5432/mobili_db

# Auth
JWT_SECRET=
JWT_EXPIRES_IN=7d

# PayDunya
PAYDUNYA_MASTER_KEY=
PAYDUNYA_PRIVATE_KEY=
PAYDUNYA_TOKEN=
PAYDUNYA_MODE=test

# Notifications
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMS_API_KEY=

# App
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
```

---

## Performances & accessibilité

- Mobile-first, responsive — priorité Android entrée de gamme + 3G
- Lazy loading des composants React
- Pagination sur toutes les listes
- Compression des ressources (gzip)
- Indexation PostgreSQL sur les colonnes fréquemment filtrées (tripId, userId, ticketCode, qrCode)
- Contrastes suffisants, boutons dimensionnés, messages d'erreur explicites (WCAG)

---

## Méthodologie projet

**Agile Scrum** + tableau Kanban (colonnes : À faire / En cours / En revue / Terminé).

### Outils de pilotage

| Outil | Usage |
|---|---|
| Notion ou Jira | Backlog + Kanban |
| GitHub | Versionnement + CI/CD |
| Figma | Maquettes UX/UI |
| Postman | Tests API |
| Notion / Google Sheets | Suivi KPI |

### Découpage en sprints (BC1)

**Phase 0 — Cadrage & conception** *(en cours)*
- CDC, user stories, maquettes Figma, architecture, environnements

**Sprint 1**
- Auth JWT + RBAC
- Recherche de trajets
- Espace Admin Compagnie (lignes, trajets, véhicules, sièges)
- Gestion des agents

**Sprint 2**
- Réservation de siège
- Paiement (PayDunya + webhook)
- Génération e-ticket PDF + QR code
- Liste passagers + téléchargement billet

**Phase finale — Recette & déploiement**
- Tests fonctionnels, sécurité, cas limites
- Corrections + déploiement V1

### KPIs produit cibles

- Taux de conversion réservation → paiement
- Temps moyen de réservation
- Temps moyen de validation d'un billet
- Taux d'échec de paiement
- Billets invalides / déjà utilisés détectés
- Nombre de compagnies actives

---

## Déploiement

### Stratégie : Vercel (frontend) + Render (backend + DB)

| Composant | Plateforme | Plan | Pourquoi |
|---|---|---|---|
| React.js (frontend) | **Vercel** | Free | CDN mondial, déploiement sur push, HTTPS auto |
| Node.js/Express (backend) | **Render** | Free (Web Service) | Serveur persistant, pas de cold start webhook |
| PostgreSQL | **Render** | Free (90 jours puis renouveler) | Intégré, connexion interne rapide |

**Pourquoi pas tout sur Vercel ?**
Les webhooks PayDunya nécessitent un serveur persistant. Vercel utilise des fonctions serverless avec cold starts (~1-3s) qui peuvent faire échouer silencieusement un webhook de confirmation de paiement. Render garde le serveur actif.

**Limite du free tier Render :** le service s'endort après 15 min d'inactivité (premier wake-up ~30s). Acceptable pour un projet académique — en production réelle, passer au plan payant ou utiliser un ping de keepalive.

### Environnements

| Environnement | Frontend | Backend | Base de données |
|---|---|---|---|
| `development` | localhost:5173 | localhost:3000 | Docker PostgreSQL local |
| `staging` | Vercel preview (PR) | Render staging service | Render PostgreSQL staging |
| `production` | Vercel production | Render production service | Render PostgreSQL production |

### Variables d'environnement par plateforme

**Render (backend)** — définies dans le dashboard Render :
```
DATABASE_URL          (fourni automatiquement par Render PostgreSQL)
JWT_SECRET
JWT_EXPIRES_IN=7d
PAYDUNYA_MASTER_KEY
PAYDUNYA_PRIVATE_KEY
PAYDUNYA_TOKEN
PAYDUNYA_MODE=live
FRONTEND_URL          (URL Vercel de production)
SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS
SMS_API_KEY
NODE_ENV=production
PORT=3000
```

**Vercel (frontend)** — définies dans le dashboard Vercel :
```
VITE_API_URL          (URL du backend Render)
VITE_ENV=production
```

---

## DevOps — Pipeline CI/CD

### Flux GitHub Actions

```
Push sur feature/* ou develop
    └── CI Pipeline
        ├── 1. Checkout code
        ├── 2. Install dependencies (npm ci)
        ├── 3. ESLint (lint check)
        ├── 4. Prettier (format check)
        ├── 5. Jest (tests unitaires + intégration)
        ├── 6. SonarQube scan (qualité + sécurité)
        └── ✓ Rapport de statut sur la PR

Merge sur develop
    └── Deploy staging
        ├── Backend → Render staging (auto via webhook Render)
        └── Frontend → Vercel preview (auto)

Merge sur main
    └── Deploy production
        ├── Backend → Render production (auto via webhook Render)
        └── Frontend → Vercel production (auto)
```

### Fichiers GitHub Actions

```
.github/
└── workflows/
    ├── ci.yml          ← lint + tests + sonar (sur toutes les PR)
    └── deploy.yml      ← déploiement staging/prod (sur merge)
```

### `ci.yml` — structure
```yaml
name: CI
on:
  pull_request:
    branches: [develop, main]
jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: mobili_test
          POSTGRES_USER: mobili
          POSTGRES_PASSWORD: mobili
        options: --health-cmd pg_isready
    steps:
      - checkout
      - setup Node 20
      - npm ci (backend + frontend)
      - npx prisma migrate deploy (env test)
      - eslint
      - prettier --check
      - jest --coverage
      - sonarqube-scan
```

### Dependabot — `dependabot.yml`
```yaml
updates:
  - package-ecosystem: npm
    directory: /backend
    schedule: weekly
  - package-ecosystem: npm
    directory: /frontend
    schedule: weekly
  - package-ecosystem: github-actions
    directory: /
    schedule: weekly
```

---

## Sécurité — Shift Left Security

### Dans le code (backend)

| Menace | Solution |
|---|---|
| Injection SQL | Prisma (requêtes paramétrées par défaut) |
| XSS | Helmet.js (`X-Content-Type`, `X-Frame-Options`, CSP) |
| CSRF | SameSite cookies + token CSRF si besoin |
| Brute force login | express-rate-limit sur `/auth/login` (5 req/min) |
| Exposition de données | Ne jamais retourner `passwordHash` dans les réponses |
| Secrets dans le code | Variables d'environnement uniquement — `.env` dans `.gitignore` |
| Dépendances vulnérables | Dependabot + `npm audit` dans CI |
| JWT volé | Expiration courte (7d) + HTTPS obligatoire |
| Données bancaires | Jamais stockées — PayDunya gère tout |
| Accès non autorisé | RBAC middleware sur chaque route protégée |
| Logs sensibles | Winston — ne jamais logger les tokens, mots de passe, données bancaires |

### Headers de sécurité (Helmet.js)
```js
app.use(helmet())               // active tous les headers de sécurité
app.use(helmet.hsts())          // force HTTPS
app.use(helmet.noSniff())       // X-Content-Type-Options
app.use(helmet.frameguard())    // X-Frame-Options: DENY
```

### Validation des entrées (Zod)
Toutes les entrées API sont validées avec **Zod** avant d'atteindre les services :
```js
// Exemple : POST /auth/register
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().regex(/^\+?[0-9]{8,15}$/),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
})
```

### Rate limiting
```js
// Endpoints sensibles
authLimiter:     5 req / 15 min par IP  (login, register)
paymentLimiter: 10 req / 1 min par IP   (initiate payment)
validateLimiter: 30 req / 1 min par IP  (scan QR — agents)
globalLimiter:  100 req / 1 min par IP  (général)
```

### CORS
```js
cors({
  origin: process.env.FRONTEND_URL,   // URL Vercel uniquement
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
})
```

### Checklist sécurité avant chaque PR

- [ ] Aucun secret dans le code (`.env.example` sans valeurs réelles)
- [ ] Validation Zod sur tous les inputs du nouvel endpoint
- [ ] RBAC middleware appliqué sur toutes les routes protégées
- [ ] `npm audit` sans vulnérabilités critiques
- [ ] Pas de `console.log` en production (Winston uniquement)
- [ ] Données personnelles non exposées dans les réponses API

### Secrets GitHub Actions
Stocker dans **GitHub → Settings → Secrets** (jamais dans le code) :
```
SONAR_TOKEN
RENDER_DEPLOY_HOOK_BACKEND
DATABASE_URL_TEST
JWT_SECRET_TEST
```

---

## Phase actuelle

**Conception** — les 5 diagrammes UML PlantUML sont dans `../docs/uml/`. Aucun code applicatif encore écrit.

Prochaine étape : scaffolding `mobili/` (structure monorepo, Git + GitFlow, Docker Compose PostgreSQL, ESLint + Prettier + Husky + Zod + Helmet).
