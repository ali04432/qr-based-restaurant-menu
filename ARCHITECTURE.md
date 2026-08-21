# Architecture Overview

## System Architecture

The platform is organized into **four distinct layers** that communicate through well-defined interfaces. No layer reaches "past" its neighbor.

```
┌─────────────────────────────────────────────────────┐
│                    CLIENT LAYER                     │
│  Next.js (App Router) · React · Tailwind CSS        │
│  - Pages & layouts (app/)                           │
│  - UI Components (components/)                      │
│  - Custom hooks (hooks/)                            │
│  - NO business logic                               │
└───────────────────┬─────────────────────────────────┘
                    │  HTTP (REST) + Socket.io
┌───────────────────▼─────────────────────────────────┐
│                    API LAYER                        │
│  Express.js · TypeScript · Node.js                  │
│  - Route handlers (routes/)                         │
│  - Auth middleware (middleware/)                     │
│  - Request validation (Zod schemas)                 │
│  - Standardized responses                           │
│  - NO direct database queries                       │
└───────────────────┬─────────────────────────────────┘
                    │  Service calls
┌───────────────────▼─────────────────────────────────┐
│                 BUSINESS LOGIC LAYER                │
│  Services (services/)                               │
│  - Password hashing, JWT signing                    │
│  - Auth service                                     │
│  - (Future: order service, menu service, etc.)      │
│  - NO knowledge of HTTP or database schema          │
└───────────────────┬─────────────────────────────────┘
                    │  Prisma Client calls
┌───────────────────▼─────────────────────────────────┐
│                  DATA ACCESS LAYER                  │
│  Prisma ORM · PostgreSQL                            │
│  - Type-safe database queries                       │
│  - Schema migrations                                │
│  - Relational data model                            │
└─────────────────────────────────────────────────────┘
```

---

## Real-Time Layer (Cross-Cutting)

Socket.io runs alongside the REST API on the same server instance but is logically separate.

```
┌────────────────────────────────────┐
│         Socket.io Server           │
│  - Namespaced by restaurant ID     │
│  - Events: order.*, kitchen.*      │
│  - Auth: JWT token validation      │
│  - Emits to rooms (table, staff)   │
└────────────────────────────────────┘
```

---

## Authentication & Authorization

```
Request
  └─► authMiddleware (verify JWT, attach req.user)
        └─► roleMiddleware (check role permissions)
              └─► Route handler
```

Roles supported: `SUPER_ADMIN | ADMIN | MANAGER | CHEF | WAITER | CASHIER`

---

## Multi-Tenant Isolation

Every tenant (restaurant) has an `id` and a `slug`. All child entities carry a `restaurantId` foreign key:

```
Restaurant (tenant root)
  ├── User (staff accounts)
  ├── Table (QR-mapped tables)
  ├── MenuCategory  (Phase 2+)
  ├── MenuItem      (Phase 2+)
  ├── Order         (Phase 2+)
  └── ...
```

API middleware will enforce that a logged-in user can only access data belonging to their restaurant.

---

## AI Service Abstraction (Placeholder — Phase 7)

```
AIService (interface)
  └─► GeminiProvider (default)
  └─► OpenAIProvider (future)
  └─► AnthropicProvider (future)
```

The abstraction is created now so the provider can be swapped via environment variable without touching business logic.

---

## Shared Types Package

The `packages/shared` package exports TypeScript types and Zod schemas used by **both** the API and the web frontend. This eliminates type duplication and ensures the API contract is always in sync with the client expectations.

```
packages/shared/
  src/
    types/      ← entity interfaces (Restaurant, User, Table, …)
    schemas/    ← Zod schemas for validation
```
