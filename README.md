# sdn-project

A reference deployment of an Express + React e-commerce style application, packaged with a full Kubernetes deployment (Ingress-NGINX, MongoDB StatefulSet, HPA, auto-seed job, load-balancer tests).

This repository is a lightweight npm monorepo:

- `ui/` — React 19 Single Page Application.
- `server/` — Express 5 REST API with modular feature folders.
- `server/deploy/` — Dockerfiles, Kubernetes manifests, and helper scripts for end-to-end deployment.

---

## Architecture

```
                    ┌─────────────────────────────────┐
                    │     Nginx Ingress Controller    │
                    │   (L7 Load Balancer + TLS off)  │
                    └──────────────┬──────────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
      ┌───────▼────────┐   ┌───────▼────────┐   ┌───────▼────────┐
      │  sdn-backend   │   │  sdn-frontend  │   │     mongo      │
      │  Express 5     │   │  Nginx + React │   │  StatefulSet   │
      │  HPA 3-10 pods │   │  HPA 2-6 pods  │   │  replSet=rs0   │
      └───────┬────────┘   └────────────────┘   └────────────────┘
              │
              ▼
        sdn-uploads-pvc (RWX 5Gi, shared across backend replicas)
```

API requests are routed by the Ingress to backend pods under `/api/*`, static files and the React SPA are served from the frontend under `/*`, and uploads are persisted on a ReadWriteMany PVC so any backend replica can serve them.

---

## Tech Stack

| Layer            | Technologies                                                              |
|------------------|---------------------------------------------------------------------------|
| Frontend         | React 19, React Router 6, Axios, Tailwind CSS                             |
| Backend          | Node.js, Express 5, Helmet, CORS, Morgan, Multer, express-rate-limit      |
| Auth             | JWT (`jsonwebtoken`) + `bcryptjs`                                         |
| Database         | MongoDB + Mongoose                                                        |
| Tooling          | Create React App, Nodemon, Concurrently, dotenv                           |
| Container        | Docker (multi-stage frontend image with Nginx)                             |
| Orchestration    | Kubernetes (Deployments, StatefulSet, HPA, Ingress, ConfigMap, Secret)    |
| Ingress / LB     | ingress-nginx with `round_robin` + keep-alive cycling + active health     |

---

## Repository Layout

```
sdn-project/                        # npm monorepo root
├── package.json                    # orchestrates install:all, dev, seed scripts
├── server/                         # Express REST API
│   ├── .env.example                # local dev environment template
│   ├── package.json
│   └── src/
│       ├── server.js               # entry point, connects MongoDB
│       ├── app.js                  # Express app, middleware, routes, /health
│       ├── seed.js                 # mock data seeder (users, products, orders, ...)
│       ├── config/
│       │   ├── db.js               # Mongoose connection helper
│       │   └── environment.js      # validated env vars (incl. rate-limit)
│       └── modules/
│           ├── auth/               # JWT login, users, middleware, error handler
│           ├── coupon/             # discount coupons
│           ├── dispute/            # order dispute resolution
│           ├── inventory/          # stock management
│           ├── listings/           # public listing creation
│           ├── order/              # order lifecycle
│           ├── product/            # product CRUD
│           ├── public/             # public categories endpoint
│           ├── report/             # reporting endpoints
│           ├── reviews/            # product reviews
│           └── store/              # store management
├── ui/                             # React 19 SPA (Create React App)
│   ├── package.json
│   ├── public/
│   └── src/
│       ├── index.js                # entry point
│       ├── App.js                  # router + providers
│       ├── components/             # reusable UI components
│       ├── context/                # AuthContext, ...
│       ├── hooks/                  # useAuth, ...
│       ├── pages/                  # Login, Dashboard, ...
│       └── services/               # apiClient (Axios instance)
└── server/deploy/                  # K8s manifests + scripts
    ├── README.md                   # full deployment guide (Vietnamese)
    ├── docker/                     # Dockerfiles + nginx.conf
    ├── k8s/                        # namespace, secrets, PVCs, MongoDB, backend,
    │                               # frontend, ingress, HPAs, seed-job
    └── scripts/                    # build-images, deploy-all, seed-mongo,
                                    # port-forward-ingress, tear-down, test-load-balancer
```

---

## Modules (server/src/modules)

Each module follows the same structure where applicable:

- `controllers/` — route handler logic
- `middleware/` — auth checks, validators, error handler
- `models/` — Mongoose schemas
- `routes/` — Express router wiring

Mounted under `/api/v1/`:

| Path prefix   | Module   | Notes                                              |
|---------------|----------|----------------------------------------------------|
| `/auth`       | `auth`   | login, register, refresh                           |
| `/users`      | `auth`   | user CRUD                                          |
| `/products`   | `product`| product CRUD                                       |
| `/categories` | `public` | public catalog endpoint                            |
| `/inventory`  | `inventory` | stock in / out                                 |
| `/coupons`    | `coupon` | discount coupons                                   |
| `/orders`     | `order`  | order lifecycle                                    |
| `/listings`   | `listings` | public listing creation (no auth)                |
| `/store`      | `store`  | store management                                   |
| `/reviews`    | `reviews`| product reviews                                    |
| `/disputes`   | `dispute`| order disputes                                     |
| `/reports`    | `report` | reporting                                          |

---

## Local Development (without Kubernetes)

### Prerequisites

- Node.js 18+
- npm
- A reachable MongoDB instance (default: `mongodb://localhost:27017/sdn_db`)

### Setup

```bash
# 1. Install all workspace dependencies (root + server + ui)
npm run install:all

# 2. Create the server env file and edit values as needed
cp server/.env.example server/.env

# 3. (Optional) Seed mock data into MongoDB
npm run seed          # add fixtures
npm run seed:drop     # reset before seeding
```

### Run

```bash
# Start Express API (port 5000) + React UI (port 3000) concurrently
npm run dev
```

- Frontend: http://localhost:3000
- API: http://localhost:5000/api/v1
- Health: http://localhost:5000/health

### Environment Variables

Defined in `server/.env` (see `server/.env.example`):

| Variable               | Default                                  | Purpose                                              |
|------------------------|------------------------------------------|------------------------------------------------------|
| `PORT`                 | `5000`                                   | API listen port                                      |
| `NODE_ENV`             | `development`                            | `development` or `production`                        |
| `CLIENT_URL`           | `http://localhost:3000`                  | Origin allowed by CORS                               |
| `DATABASE_URL`         | `mongodb://localhost:27017/sdn_db`       | MongoDB connection string                            |
| `JWT_SECRET`           | `fallback_secret`                        | Secret for signing JWTs (override in production!)    |
| `UPLOAD_DIR`           | `server/public/uploads`                  | Local upload directory (PVC path in K8s)             |
| `RATE_LIMIT_WINDOW_MS` | `900000`                                 | Rate-limit window in ms (fallback)                   |
| `RATE_LIMIT_WINDOW_MIN`| `15`                                     | Rate-limit window in minutes (used by K8s ConfigMap) |
| `RATE_LIMIT_MAX`       | `500`                                    | Max requests per IP per window. `0` disables it      |

### Root npm Scripts

| Script              | What it does                                                          |
|---------------------|-----------------------------------------------------------------------|
| `npm run install:all` | Installs root, server, and UI dependencies                           |
| `npm run dev`       | Runs backend and frontend concurrently                                |
| `npm run server`    | Runs only the backend with `nodemon`                                  |
| `npm run ui`        | Runs only the React dev server                                        |
| `npm run seed`      | Seeds mock data into MongoDB                                          |
| `npm run seed:drop` | Drops existing collections then seeds again                           |

---

## Kubernetes Deployment

For the full deployment guide see [`server/deploy/README.md`](server/deploy/README.md). It covers:

- Prereqs: `kubectl`, `ingress-nginx`, `metrics-server`, RWX StorageClass.
- Building images: `server/deploy/scripts/build-images.sh` (supports `IMAGE_TAG`, `REGISTRY`).
- Configuring `sdn-secrets` (JWT, MongoDB URL).
- Deploying via `kubectl apply -k` or `server/deploy/scripts/deploy-all.sh`.
- Port-forwarding the Ingress for local access (`sdn.local`).
- Seeding data automatically via the `sdn-seed` Kubernetes Job (`server/deploy/k8s/11-seed-job.yaml`).
- Autoscaling verification (`kubectl top pods`, `kubectl get hpa -w`).
- Load-balancer verification with `server/deploy/scripts/test-load-balancer.js`.
- Troubleshooting and production hardening.

---

## Operational Notes

These behaviors are intentional and matter for both local and cluster runs:

- **Trust proxy** — `app.set("trust proxy", 1)` is set so `req.ip` reflects the real client IP behind ingress-NGINX. Without this, every request looks like it came from the ingress pod and the rate-limiter would 429 the entire test load.
- **Rate-limit bypass** — the limiter is only registered when `RATE_LIMIT_MAX > 0`. Set `RATE_LIMIT_MAX=0` (in `server/.env` or the K8s ConfigMap) to disable it for load tests.
- **Pod identification header** — every response carries `X-Backend-Instance: <pod-hostname>`, and `/health` also returns it in the JSON body. `test-load-balancer.js` uses this header to attribute requests to specific pods.
- **Ingress load balancing** — `07-ingress.yaml` uses `round_robin` with `upstream-keepalive-requests: "100"` and `upstream-keepalive-connections: "50"` so connections cycle to newly-scaled pods, plus `proxy-next-upstream` retries and an active health check on `/health`.
- **HPA cooldown** — `08-hpa-backend.yaml` sets `scaleDown.stabilizationWindowSeconds: 300` to prevent backend pods from scaling down immediately when a load test finishes.

---

## Project Status

The codebase is functional end-to-end:

- All listed modules under `server/src/modules/` are wired into the Express router (`/api/v1`).
- The seed script populates mock users, products, orders, reviews, and disputes.
- The Kubernetes manifests deploy the whole stack into any cluster with ingress-nginx and an RWX StorageClass.
- Load-balancer verification is automated through `test-load-balancer.js`.
