# Architecture Notes — Booking Sync System

## System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│  Docker Compose                                                       │
│                                                                       │
│  ┌─────────────────┐    GET /bookings    ┌──────────────────────┐    │
│  │  PMS Simulator  │ ◄─────────────────  │  Booking Processor   │    │
│  │   (Go :8080)    │                     │   (Node.js :3001)    │    │
│  └─────────────────┘                     │                      │    │
│                                          │  Poller → BullMQ     │    │
│  ┌─────────────────┐                     │  Worker → MySQL      │    │
│  │   Redis 7       │ ◄──────────────────►│                      │    │
│  │   (:6379)       │                     └──────────┬───────────┘    │
│  └─────────────────┘                                │                │
│                                                     │                │
│  ┌─────────────────┐                                │                │
│  │   MySQL 8       │ ◄───────────────────────────── ┘                │
│  │   (:3306)       │                                                  │
│  └─────────────────┘                                                  │
└──────────────────────────────────────────────────────────────────────┘

         ▲ GET /bookings
         │ GET /bookings/:id
         │
┌────────┴────────────┐
│  Booking Dashboard  │
│  (Next.js :3000)    │
│  runs outside Docker│
└─────────────────────┘
```

---

## Part 1: PMS Simulator (Go)

The simulator is intentionally simple — a single `main.go` with an in-memory state map guarded by a `sync.Mutex`.

**Simulated real-world behaviour**

| Behaviour | Implementation |
|---|---|
| Duplicates | 30% probability of appending a second copy of each booking in the same response |
| Status changes over time | Every 3rd request, 5–14 randomly chosen bookings receive a new, different status with a fresh `updated_at` |
| Network latency | `time.Sleep` of 100–800 ms before each response |
| Out-of-order records | Response is shuffled with `rand.Shuffle` before encoding |
| Mixed historical/current | Initial state staggers `updated_at` values 2 hours apart per booking, so early records have genuinely older timestamps |

The 25 seed bookings span April–August 2026, giving a realistic spread of upcoming check-in dates.

A `/health` endpoint is exposed so Docker Compose can gate the processor start on the simulator being ready.

---

## Part 2: Booking Processor (Node.js)

### Polling interval — 30 seconds

The default `POLL_INTERVAL_MS` is 30,000 ms. This is a deliberate balance:

- The PMS adds latency of up to 800 ms per call and mutates bookings on every 3rd request, so polling more frequently than every few seconds yields meaningless extra load with little data gain.
- 30 seconds is short enough to surface a status change on the dashboard within a minute, which is acceptable for a property management context where booking states don't change in real time.
- The interval is fully configurable via the `POLL_INTERVAL_MS` environment variable, so it can be tightened for demo purposes or loosened for production without a code change.

### Checkpoint-based filtering

The poller maintains a `last_seen_updated_at` timestamp (the "checkpoint") in the `sync_state` MySQL table. On each poll it filters the PMS response to only records with `updated_at > checkpoint`, then advances the checkpoint to the highest `updated_at` seen.

This means:
- The queue is never flooded with records that have not changed.
- After a processor restart, polling resumes from the last persisted checkpoint rather than re-queuing all 25+ bookings.

### Queue design (BullMQ + Redis)

Each fresh booking record becomes a BullMQ job. Key design choices:

**Job ID = `{booking_id}-{updated_at}`**

BullMQ deduplicates jobs by ID. Using the composite key `{id}-{updated_at}` means that if the poller sees the same `(id, updated_at)` pair twice — either from in-response duplicates emitted by the PMS or from a poller crash and restart — BullMQ silently drops the second enqueue. No duplicate job, no duplicate DB write.

**Retry policy: 3 attempts, exponential backoff starting at 2 s**

A transient MySQL or Redis hiccup won't permanently lose a booking event. The job is retried up to twice more with increasing delays (2 s, 4 s), and only moves to the failed queue after all attempts are exhausted. The failed queue retains the last 100 jobs for inspection.

**Worker concurrency: 5**

Five concurrent workers gives enough throughput to drain the queue quickly after a large poll batch without overwhelming the MySQL connection pool (configured at 10 connections). Each worker holds a single pooled connection for the duration of its transaction.

**Crash safety**

BullMQ marks a job as active before passing it to the worker. If the worker process crashes mid-execution, Redis retains the job in the active set, and BullMQ automatically re-queues it when the worker reconnects. No booking event is silently lost.

### Database schema and upsert logic

```sql
-- Latest state: one row per booking ID
CREATE TABLE bookings (
  id          VARCHAR(8) PRIMARY KEY,
  guest_name  VARCHAR(255),
  check_in    DATE,
  check_out   DATE,
  status      VARCHAR(50),
  updated_at  DATETIME(3),
  created_at  DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3)
);

-- Append-only history: one row per status change
CREATE TABLE booking_history (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  booking_id  VARCHAR(8),
  guest_name  VARCHAR(255),
  check_in    DATE,
  check_out   DATE,
  status      VARCHAR(50),
  updated_at  DATETIME(3),
  recorded_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY  uq_booking_update (booking_id, updated_at)
);

-- Checkpoint persistence
CREATE TABLE sync_state (
  state_key   VARCHAR(100) PRIMARY KEY,
  state_value VARCHAR(255) NOT NULL,
  updated_at  DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3)
              ON UPDATE CURRENT_TIMESTAMP(3)
);
```

**Upsert flow per job** (`bookingProcessor.ts`):

```
BEGIN TRANSACTION
  SELECT ... FROM bookings WHERE id = ? FOR UPDATE   ← row-level lock prevents races
  
  if no existing row:
    INSERT INTO bookings (...)
    INSERT IGNORE INTO booking_history (...)          ← IGNORE = idempotent
  
  else if incoming.updated_at <= existing.updated_at:
    ROLLBACK                                          ← out-of-order: discard silently
  
  else:
    INSERT IGNORE INTO booking_history (...)          ← log new status
    UPDATE bookings SET ... WHERE id = ?              ← advance latest state
COMMIT
```

Three correctness guarantees fall out of this logic:

1. **No duplicates in `bookings`** — `PRIMARY KEY` on `id` plus the `SELECT FOR UPDATE` / `UPDATE` path means upserts are always single-row mutations.

2. **Out-of-order safety** — the `incoming.updated_at <= existing.updated_at` guard ensures an older payload (e.g., a delayed re-delivery) can never revert a booking to a stale status.

3. **Idempotency** — `INSERT IGNORE` on `booking_history` uses the `UNIQUE KEY (booking_id, updated_at)` to silently skip any row that has already been recorded. Re-processing the exact same payload any number of times produces exactly one history row.

`DATETIME(3)` (millisecond precision) is used throughout to handle the edge case where two status changes are produced within the same second.

### API layer

Express with:
- Rate limiting (100 requests/minute per IP) to protect against accidental polling loops.
- CORS enabled so the Next.js dev server can talk directly to the API without a proxy.
- `/metrics` endpoint exposing default Prometheus metrics via `prom-client`, useful for monitoring queue depth or request latency in a production deployment.
- Graceful shutdown: on `SIGTERM`/`SIGINT` the poller stops, the BullMQ worker drains, the MySQL pool is closed, and the HTTP server stops accepting new connections before the process exits.

---

## Part 3: Booking Dashboard (Next.js)

The dashboard is a single-page client component with no server actions or API routes — it talks directly to the Node.js API over HTTP.

**Stats bar** fetches all bookings without filters (up to 1,000 records) to compute accurate totals regardless of whatever filters the table is currently applying. This is kept as a separate fetch so the stats never misleadingly reflect the filtered view.

**Debounced filters** apply a 400 ms delay before re-fetching, preventing a flood of API calls while the user is still typing a date into the filter inputs.

**Auto-refresh** uses a `setInterval` at 30 seconds — matching the backend poll cycle — so the dashboard converges to the latest state within roughly one poll cycle after a PMS status change.

**Booking detail panel** is rendered as a side-panel overlay rather than a separate page. It fetches `GET /bookings/:id` on-demand (when the user clicks a row) and renders the full history timeline in ascending `updated_at` order, giving a clear picture of how the booking has evolved.

**Pagination** is handled server-side in MySQL (`LIMIT offset, count`) rather than in-memory, so the API remains efficient as the dataset grows.

---

## Trade-offs and What Would Change at Scale

| Area | Current approach | Production consideration |
|---|---|---|
| Polling | Simple interval loop | Replace with webhook push from PMS; fall back to polling as a reconciliation sweep |
| Checkpoint | Single global timestamp | Per-booking `etag` or cursor for finer-grained incremental sync |
| Queue | Single `bookings` queue | Separate queues by priority (e.g., cancellations processed before confirmations) |
| History | Status-change only | Could log every field change (guest name, dates) for a full audit trail |
| Dashboard stats | Separate full fetch | Precomputed aggregate table or a dedicated `GET /stats` endpoint |
| Auth | None | JWT-protected API; role-based access for admin vs read-only views |