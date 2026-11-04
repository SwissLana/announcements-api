# Announcements API

A JSON REST API for an announcements board built with Express 5, TypeScript, Prisma 7, and PostgreSQL. Visitors can browse announcements; registered users can create, edit, and delete their own announcements. Authentication uses short-lived access tokens and rotating refresh tokens.

This work follows the [provided boilerplate](https://github.com/BetterED-Neoversity/Boilerplate-REST-API-Nodejs).

## Requirements

- Node.js 22.12+ (Node.js 24 recommended).
- npm.
- PostgreSQL, or Docker Desktop for the included database configuration.

## Setup

Open a terminal in this directory:

```bash
npm ci
cp .env.example .env
```

Generate a secret and put its value in `JWT_SECRET` in `.env`:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Keep `.env` local. It is excluded from Git and the submission archive. The example database password is only for local development.

Start Docker Desktop, then start the local PostgreSQL database:

```bash
docker compose up -d --wait
```

Alternatively, use an existing PostgreSQL instance and update `DATABASE_URL` in `.env`. Apply the included migration and generate the client:

```bash
npm run prisma:deploy
npm run prisma:generate
npm run typecheck
npm run dev
```

Open **http://localhost:3000/api-docs/** for Swagger UI. The machine-readable document is at **http://localhost:3000/openapi.json**. `npm start` starts the server without watch mode. The server binds to localhost by default.

For later schema changes, create a new migration rather than editing an already applied one:

```bash
npm run prisma:migrate -- --name describe_the_change
npm run prisma:generate
```

`prisma:deploy` applies checked-in migrations; `prisma:migrate` creates development migrations. The database is persisted in a Docker volume. `docker compose stop` stops it without deleting its data.

## Routes

| Method | Route | Access | Success |
| --- | --- | --- | --- |
| POST | `/auth/register` | Public | 201, user and tokens |
| POST | `/auth/login` | Public | 200, user and tokens |
| POST | `/auth/refresh` | Public, valid refresh token required | 200, new tokens |
| POST | `/auth/logout` | Access token | 204, no body |
| GET | `/auth/me` | Access token | 200, profile |
| GET | `/announcements` | Public | 200, data and pagination |
| GET | `/announcements/:id` | Public | 200, announcement and author |
| POST | `/announcements` | Access token | 201, created announcement |
| PATCH | `/announcements/:id` | Owner | 200, updated announcement |
| DELETE | `/announcements/:id` | Owner | 204, no body |

Send protected requests with `Authorization: Bearer <accessToken>`. In Swagger, register first, copy the returned **accessToken**, click **Authorize**, and paste just the token.

### Register

```bash
curl -i http://localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"ivan_petrenko","email":"ivan@example.com","password":"example123","name":"Іван"}'
```

Registration returns `{ user, accessToken, refreshToken }`. User fields are `id`, `username`, `email`, and `name`. Passwords never appear in responses.

### Log in and refresh

```bash
curl -i http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"ivan_petrenko","password":"example123"}'

curl -i http://localhost:3000/auth/refresh \
  -H 'Content-Type: application/json' \
  -d '{"refreshToken":"PASTE_REFRESH_TOKEN"}'
```

Use the **new refresh token** after every successful refresh. Reusing the previous token returns 401. Login replaces the user's previous refresh token. Each user has one refresh session, so logging in on another device invalidates the previous refresh session.

Access tokens expire after **15 minutes**, refresh tokens after **7 days**. Both are signed with HS256 and carry a token type and a unique ID. Access tokens cannot be used as refresh tokens or vice versa. Logout removes the current user's refresh token and always returns 204, even if it was already removed. Existing access tokens remain valid until their expiry; logout is not an access-token blacklist.

### Create an announcement

```bash
curl -i http://localhost:3000/announcements \
  -H 'Authorization: Bearer PASTE_ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"title":"Bicycle for sale","description":"Mountain bike in excellent condition","price":8000,"category":"sale"}'
```

`userId` is taken only from the verified token. Unknown body fields are stripped by validation and cannot change ownership.

### Browse and search

```bash
curl 'http://localhost:3000/announcements?search=bicycle&sort=newest&page=1'
curl http://localhost:3000/announcements/1
```

- `search`: optional case-insensitive substring in `title`; empty means all records.
- `sort`: `newest` (default) or `oldest`.
- `page`: positive integer, default 1. Each page contains at most 10 records.
- Records with equal creation times are ordered by ID for stable pagination.
- Responses contain `data` and `pagination: { total, page, totalPages, perPage }`.
- A page beyond the last page returns an empty `data` array. No matches means `totalPages: 0`.

### Update, delete, profile, and logout

```bash
curl -X PATCH http://localhost:3000/announcements/1 \
  -H 'Authorization: Bearer PASTE_ACCESS_TOKEN' \
  -H 'Content-Type: application/json' -d '{"price":6500}'

curl -i -X DELETE http://localhost:3000/announcements/1 \
  -H 'Authorization: Bearer PASTE_ACCESS_TOKEN'

curl http://localhost:3000/auth/me \
  -H 'Authorization: Bearer PASTE_ACCESS_TOKEN'

curl -i -X POST http://localhost:3000/auth/logout \
  -H 'Authorization: Bearer PASTE_ACCESS_TOKEN'
```

## Validation and errors

| Field | Rule |
| --- | --- |
| username | String, 3 - 30 characters |
| email | Valid email; stored in lowercase |
| password | At least 6 characters; at most 72 UTF-8 bytes to avoid bcrypt truncation |
| name | String, at least 2 characters |
| title | String, 5 - 50 characters |
| description | String, at least 10 characters |
| price | JSON number greater than zero |
| category | `sale`, `service`, `job`, or `other` |

Names, usernames, titles, descriptions, and searches are trimmed. Passwords are not trimmed. PATCH accepts a subset of announcement fields but requires at least one recognized field; `{}` and a body containing only unknown fields are invalid. IDs must be positive PostgreSQL integers. Invalid request bodies, parameters, or query values return 400 with details.

Errors use JSON such as `{ "error": "Access denied" }`:

- **400**: validation failure or malformed JSON.
- **401**: invalid credentials or missing/invalid/expired token. Login always uses `Invalid credentials` for wrong username or password.
- **403**: modifying another user's announcement (`Access denied`).
- **404**: missing announcement or unknown route.
- **409**: duplicate username or email (`Username or email already taken`).
- **500**: unexpected internal error without internal details in the response.

## Structure

```text
announcements-api/
├── app.ts                         # Express app; no listening socket on import
├── server.ts                      # Database connection and HTTP startup
├── prisma.config.ts
├── prisma/
│   ├── schema.prisma              # User, RefreshToken, Announcement
│   ├── client.ts                  # Shared Prisma client and PostgreSQL adapter
│   └── migrations/                # Initial SQL migration
├── src/
│   ├── config.ts                  # Required environment configuration
│   ├── controllers/               # Authentication and announcement handlers
│   ├── middleware/                # Authentication, validation, errors
│   ├── routes/                    # Route definitions and middleware order
│   ├── validators/                # Zod schemas shared with OpenAPI
│   ├── types/express.d.ts         # req.user type extension
│   ├── utils/                     # JWT helpers and HttpError
│   └── openapi.ts                 # All 10 operations and bearerAuth
├── tests/
│   ├── api.test.ts                # HTTP integration tests
│   └── database.setup.ts          # Isolated test database and migrations
├── vitest.config.ts
├── compose.yaml                   # Local PostgreSQL
├── .env.example
├── WALKTHROUGH_EN.md
└── WALKTHROUGH_UK.md
```

Controllers use parsed values in `res.locals` because Express 5 exposes `req.query` as a getter. `authenticate` sets `req.user.sub`. Ownership is checked before modifying a record, and the write also includes the owner ID. Prisma `@updatedAt` maintains modification times. Refresh-token deletion and replacement run in one transaction.

## Tests and verification

```bash
npm test
npm run typecheck
npm audit
```

`npm test` automatically generates Prisma Client, starts an isolated **PostgreSQL 17 Docker container**, applies the actual migration with Prisma, runs 18 Vitest tests, and removes the test container. Docker Desktop must be running. Tests use a random available local port and never clear your configured database. They use the real Prisma client and HTTP handlers, not mocked persistence.

An optional Docker-free fallback uses PGlite (PostgreSQL compiled to WebAssembly):

```bash
TEST_DB_ENGINE=pglite npm test
```

The fallback uses one underlying connection and is not a replacement for native concurrency testing. Native PostgreSQL uses a pool of 10 connections. `DATABASE_POOL_SIZE` can override the application pool size.

Verification completed: the migration and all 18 integration tests pass against native PostgreSQL 17 in Docker, including two simultaneous refresh requests where exactly one succeeds. TypeScript checking passes, and the dependency audit reports zero known vulnerabilities at verification time.

Coverage includes password hashing, duplicate users, validation boundaries, token lifetimes, login replacement, immediate rotation/replay, concurrent refresh requests, authentication, ownership, all CRUD operations, pagination, case-insensitive search, both sort orders, missing records, Swagger, and malformed JSON.

The esbuild override pins a patched release used by the development tools. The lockfile is included for reproducible installation.

