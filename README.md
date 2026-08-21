# QR Based Restaurant Menu

A **multi-tenant restaurant QR ordering SaaS platform** that allows restaurants to onboard, generate QR codes for tables, and let customers scan to browse the digital menu, place orders, and track them in real time.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, React, TypeScript, Tailwind CSS |
| Backend | Node.js, Express.js, TypeScript |
| Database | PostgreSQL, Prisma ORM |
| Real-time | Socket.io |
| Authentication | JWT (JSON Web Tokens) + bcrypt |
| Validation | Zod |
| Monorepo | npm Workspaces |

---

## Project Structure

```
qr-based-restaurant-menu/
├── apps/
│   ├── api/                  # Express.js backend
│   │   ├── prisma/           # Prisma schema & migrations
│   │   └── src/
│   │       ├── config/       # env & database config
│   │       ├── middleware/   # auth, error, logger
│   │       ├── routes/       # API route handlers
│   │       ├── services/     # business logic services
│   │       ├── socket/       # Socket.io server
│   │       ├── types/        # Express type augmentations
│   │       └── utils/        # shared utilities
│   └── web/                  # Next.js frontend
│       └── src/
│           ├── app/          # Next.js App Router pages
│           ├── components/   # reusable UI components
│           ├── hooks/        # custom React hooks
│           └── lib/          # API client, env helpers
└── packages/
    └── shared/               # shared TypeScript types & Zod schemas
        └── src/
            ├── types/        # entity type definitions
            └── schemas/      # Zod validation schemas
```

---

## Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **PostgreSQL** >= 14

---

## Environment Setup

1. Copy the example environment file:
   ```bash
   cp .env.example apps/api/.env
   ```

2. Edit `apps/api/.env` and fill in:
   - `DATABASE_URL` — your PostgreSQL connection string
   - `JWT_SECRET` — a strong random secret (see comment in `.env.example`)
   - Other variables as needed

---

## Database Setup

```bash
# Generate Prisma client
npm run prisma:generate

# Validate Prisma schema
npm run prisma:validate

# Run database migrations (requires PostgreSQL to be running)
npm run prisma:migrate
```

---

## Development Commands

```bash
# Install all workspace dependencies
npm install

# Run everything in development mode
npm run dev

# Run only the API backend (port 4000)
npm run dev:api

# Run only the frontend (port 3000)
npm run dev:web

# Type check all packages
npm run type-check

# Build all packages
npm run build
```

---

## API Endpoints (Phase 2)

### Health
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | None | Health check |

### Authentication
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | None | Register a staff user |
| POST | `/api/auth/login` | None | Authenticate, returns JWT |
| GET | `/api/auth/me` | Bearer JWT | Get current user profile |

### Menu
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/menu/categories?restaurantId=<id>` | None | List categories |
| GET | `/api/menu/items?restaurantId=<id>&categoryId=<id>&q=<search>` | None | List/search menu items |
| GET | `/api/menu/items/:id` | None | Get single item |
| POST | `/api/menu/items` | Staff JWT | Create menu item |
| PATCH | `/api/menu/items/:id` | Staff JWT | Update menu item |
| DELETE | `/api/menu/items/:id` | Staff JWT | Remove menu item |

### Orders
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/orders` | None | Customer places order |
| GET | `/api/orders/:id` | None | Track order by ID |
| GET | `/api/orders?restaurantId=<id>` | Staff JWT | List restaurant orders |
| PATCH | `/api/orders/:id/status` | Staff JWT | Update order status |

---

## Architecture

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for a detailed description of the layered architecture and how the system components interact.

---

## Development Roadmap

| Phase | Description | Status |
|---|---|---|
| Phase 1 | Foundation & Architecture Setup | ✅ Complete |
| Phase 2 | Customer QR Ordering Frontend + Core API | ✅ Complete |
| Phase 3 | Restaurant Owner Dashboard | ⏳ Pending |
| Phase 4 | Kitchen Display System (KDS) | ⏳ Pending |
| Phase 5 | Waiter & Cashier Panels | ⏳ Pending |
| Phase 6 | Inventory & Analytics | ⏳ Pending |
| Phase 7 | AI Features | ⏳ Pending |

---

## Multi-Tenant Design

Every restaurant is a **tenant**. All restaurant-scoped data (tables, menu, orders, staff) is associated with a `restaurantId`, ensuring complete data isolation between restaurants.
