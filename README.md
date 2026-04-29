# Booking Sync System

A full-stack booking synchronisation system built as a three-part solution:

| Component | Stack | Port |
|---|---|---|
| PMS Simulator | Go | 8080 |
| Booking Processor | Node.js / TypeScript / Express | 3001 |
| Booking Dashboard | Next.js | 3000 |

---

## Prerequisites

- Docker ≥ 24 and Docker Compose v2 (`docker compose` or `docker-compose`)
- Node.js ≥ 20 (for the dashboard only)

---

## 1. Running the Backend Services

The Go simulator, Node.js processor, MySQL, and Redis all start with a single command.

### Step 1 — Copy the environment file

```bash
cp .env.example .env
```

The defaults work out of the box for local development. No edits are required unless you want to change passwords or the poll interval.

### Step 2 — Start all services

```bash
docker-compose up --build
```

Docker Compose starts the services in dependency order:

1. **MySQL 8** and **Redis 7** boot first.
2. **PMS Simulator** starts once both datastores are healthy.
3. **Booking Processor** starts once MySQL, Redis, and the PMS simulator are all healthy. It automatically runs schema migrations on first boot.

To run in detached mode:

```bash
docker-compose up --build -d
```

To stop and remove containers:

```bash
docker-compose down
```

To also remove persisted volumes (wipes database data):

```bash
docker-compose down -v
```

### Service health endpoints

| Service | URL |
|---|---|
| PMS Simulator | http://localhost:8080/health |
| Booking Processor | http://localhost:3001/health |
| Prometheus metrics | http://localhost:3001/metrics |

---

## 2. Environment Variables

The root `.env` file controls the Docker Compose environment. All values have safe defaults.

| Variable | Default | Description |
|---|---|---|
| `MYSQL_ROOT_PASSWORD` | `root` | MySQL root password |
| `MYSQL_DATABASE` | `booking_sync` | Database name |
| `POLL_INTERVAL_MS` | `30000` | How often the processor polls the PMS (ms) |

The booking-processor container receives its full configuration through `docker-compose.yml` environment overrides. If you run the processor outside Docker, copy `booking-processor/.env.example` to `booking-processor/.env` and adjust as needed.

---

## 3. Booking Processor API

Both endpoints read from the `bookings` table (latest state only).

### `GET /bookings`

Returns a paginated list of bookings.

**Query parameters**

| Parameter | Type | Description |
|---|---|---|
| `status` | string | Filter by status (`confirmed`, `pending`, `cancelled`, `checked_in`, `checked_out`) |
| `check_in_from` | `YYYY-MM-DD` | Check-in on or after this date |
| `check_in_to` | `YYYY-MM-DD` | Check-in on or before this date |
| `page` | integer | Page number (default `1`) |
| `limit` | integer | Results per page, max 100 (default `10`) |

**Example**

```
GET /bookings?status=confirmed&check_in_from=2026-05-01&page=1&limit=20
```

**Response**

```json
{
  "data": [
    {
      "id": "44567805",
      "guest_name": "Charlie Brown",
      "check_in": "2026-05-01",
      "check_out": "2026-05-03",
      "status": "confirmed",
      "updated_at": "2026-04-29T14:23:11.000Z",
      "created_at": "2026-04-29T12:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

### `GET /bookings/:id`

Returns the latest state of a single booking plus its full status history.

**Example**

```
GET /bookings/44567801
```

**Response**

```json
{
  "id": "44567801",
  "guest_name": "John Doe",
  "check_in": "2026-04-10",
  "check_out": "2026-04-12",
  "status": "checked_out",
  "updated_at": "2026-04-29T15:00:00.000Z",
  "created_at": "2026-04-29T12:00:00.000Z",
  "history": [
    {
      "id": 1,
      "booking_id": "44567801",
      "status": "confirmed",
      "updated_at": "2026-04-29T12:00:00.000Z",
      "recorded_at": "2026-04-29T12:00:05.000Z"
    },
    {
      "id": 7,
      "booking_id": "44567801",
      "status": "checked_out",
      "updated_at": "2026-04-29T15:00:00.000Z",
      "recorded_at": "2026-04-29T15:00:04.000Z"
    }
  ]
}
```

---

## 4. Running the Dashboard (Next.js)

The dashboard is intentionally excluded from Docker and runs locally with `npm run dev`.

### Step 1 — Install dependencies

```bash
cd booking-dashboard
npm install
```

### Step 2 — Configure the API URL

```bash
cp .env.local.example .env.local
```

The default points to `http://localhost:3001`, which is correct when the backend is running via Docker Compose. No changes are needed for local development.

### Step 3 — Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Dashboard features

- **Stats bar** — total bookings and per-status counts, always unfiltered
- **Filter bar** — filter by status and check-in date range with 400 ms debounce
- **Bookings table** — paginated (10 per page), ordered by check-in date; status shown as a colour-coded badge
- **Booking detail panel** — click any row to open a side panel with full booking details and the complete status history from `booking_history`
- **Auto-refresh** — the table and stats reload automatically every 30 seconds

---

## 5. Project Structure

```
booking-sync-system/
├── docker-compose.yml
├── .env.example
│
├── pms-simulator/          # Go — GET /bookings simulator
│   ├── main.go
│   ├── go.mod
│   └── Dockerfile
│
├── booking-processor/      # Node.js — ingestion, queue, API
│   ├── src/
│   │   ├── index.ts        # Entry point, graceful shutdown
│   │   ├── app.ts          # Express app factory
│   │   ├── config/         # Environment-backed config
│   │   ├── db/             # MySQL pool + schema init
│   │   ├── poller/         # Periodic PMS polling + checkpointing
│   │   ├── queue/          # BullMQ queue definition
│   │   ├── workers/        # BullMQ worker
│   │   ├── services/       # Core business logic
│   │   │   ├── bookingProcessor.ts   # Transactional upsert + history
│   │   │   ├── bookings.ts           # Query helpers
│   │   │   └── syncState.ts          # Checkpoint persistence
│   │   ├── controllers/    # Request handlers
│   │   ├── routes/         # Express routers
│   │   └── metrics/        # Prometheus metrics endpoint
│   ├── Dockerfile
│   └── package.json
│
└── booking-dashboard/      # Next.js — UI
    ├── app/
    ├── components/
    ├── lib/
    └── types/
```

---

## 6. Polling Interval
 
The processor polls `GET /bookings` every **30 seconds** (default). This value is set via `POLL_INTERVAL_MS` in `.env` and can be overridden without a code change.
 
**Why 30 seconds:** The PMS simulator introduces up to 800 ms of network latency per call and mutates booking statuses on every 3rd request. Polling more aggressively than every few seconds would add load with negligible data gain — booking states in a property management context don't change in real time. 30 seconds means any status change surfaces on the dashboard within at most one minute, which is a reasonable operational window. For a production integration against a real PMS, this would typically be relaxed further (e.g., 5 minutes) and supplemented by a webhook for time-critical events like cancellations.

## 7. Assumptions

- The PMS simulator is the authoritative source; no bookings originate in the processor.
- `updated_at` from the PMS is treated as the conflict-resolution timestamp. A record with an older `updated_at` can never overwrite a newer one.
- The `booking_history` table is append-only. A new row is inserted only when the incoming `updated_at` is strictly newer than the most recent entry — this prevents duplicate history rows from repeated identical payloads.
- The Next.js app talks directly to the Node.js API. No BFF or API proxy layer is used.
- MySQL millisecond precision (`DATETIME(3)`) is used throughout to avoid timestamp collisions on rapid updates.
