package main

import (
	"encoding/json"
	"log"
	"math/rand"
	"net/http"
	"sync"
	"time"
)

/*
PDF REQUIREMENTS THIS IMPLEMENTS:

GET /bookings

Returns JSON array of booking objects:
{
  "id": "44567801",
  "guest_name": "John Doe",
  "check_in": "2026-04-10",
  "check_out": "2026-04-12",
  "status": "confirmed",
  "updated_at": "2026-04-09T10:00:00Z"
}

Required behavior:
1. Duplicate records in same response
2. Same booking ID changes status across repeated calls
3. Random network latency
4. Mixed historical + current records
5. Hardcoded/programmatic data acceptable
*/

type Booking struct {
	ID        string `json:"id"`
	GuestName string `json:"guest_name"`
	CheckIn   string `json:"check_in"`
	CheckOut  string `json:"check_out"`
	Status    string `json:"status"`
	UpdatedAt string `json:"updated_at"`
}

type bookingSeed struct {
	id        string
	guestName string
	checkIn   string
	checkOut  string
}

type bookingState struct {
	status    string
	updatedAt time.Time
}

var statuses = []string{
	"confirmed",
	"pending",
	"cancelled",
	"checked_in",
	"checked_out",
}

// 25 dummy bookings
var seedData = []bookingSeed{
	{"44567801", "John Doe", "2026-04-10", "2026-04-12"},
	{"44567802", "Jane Smith", "2026-04-15", "2026-04-18"},
	{"44567803", "Alice Johnson", "2026-04-20", "2026-04-22"},
	{"44567804", "Bob Williams", "2026-04-25", "2026-04-28"},
	{"44567805", "Charlie Brown", "2026-05-01", "2026-05-03"},
	{"44567806", "Diana Prince", "2026-05-05", "2026-05-10"},
	{"44567807", "Eve Davis", "2026-05-12", "2026-05-14"},
	{"44567808", "Frank Miller", "2026-05-18", "2026-05-20"},
	{"44567809", "Grace Lee", "2026-05-22", "2026-05-25"},
	{"44567810", "Henry Wilson", "2026-06-01", "2026-06-03"},

	{"44567811", "Isabella Moore", "2026-06-04", "2026-06-07"},
	{"44567812", "Jack Taylor", "2026-06-08", "2026-06-11"},
	{"44567813", "Karen Anderson", "2026-06-12", "2026-06-15"},
	{"44567814", "Liam Thomas", "2026-06-16", "2026-06-19"},
	{"44567815", "Mia Jackson", "2026-06-20", "2026-06-23"},
	{"44567816", "Noah White", "2026-06-24", "2026-06-27"},
	{"44567817", "Olivia Harris", "2026-06-28", "2026-07-01"},
	{"44567818", "Paul Martin", "2026-07-02", "2026-07-05"},
	{"44567819", "Queenie Thompson", "2026-07-06", "2026-07-09"},
	{"44567820", "Ryan Garcia", "2026-07-10", "2026-07-13"},

	{"44567821", "Sophia Martinez", "2026-07-14", "2026-07-17"},
	{"44567822", "Thomas Robinson", "2026-07-18", "2026-07-21"},
	{"44567823", "Uma Clark", "2026-07-22", "2026-07-25"},
	{"44567824", "Victor Lewis", "2026-07-26", "2026-07-29"},
	{"44567825", "Willow Walker", "2026-07-30", "2026-08-02"},
}

var (
	mu        sync.Mutex
	state     = map[string]*bookingState{}
	callCount int
)

func init() {
	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	now := time.Now().UTC()

	for i, b := range seedData {
		state[b.id] = &bookingState{
			status: statuses[r.Intn(len(statuses))],

			// stagger timestamps intentionally
			updatedAt: now.Add(
				-time.Duration((len(seedData)-i)*2) * time.Hour,
			),
		}
	}
}

// changes status to a DIFFERENT random status
func nextRandomStatus(current string) string {
	for {
		next := statuses[rand.Intn(len(statuses))]
		if next != current {
			return next
		}
	}
}

func bookingsHandler(w http.ResponseWriter, r *http.Request) {
	// Random latency: 100ms - 800ms
	delay := time.Duration(100+rand.Intn(700)) * time.Millisecond
	time.Sleep(delay)

	mu.Lock()
	defer mu.Unlock()

	callCount++

	/*
		Every 3rd request mutate 5-10 bookings

		This guarantees:
		- same booking ID later with different status
		- newer updated_at
	*/
	if callCount%3 == 0 {
		changes := 5 + rand.Intn(10)

		for i := 0; i < changes; i++ {
			target := seedData[rand.Intn(len(seedData))]
			current := state[target.id]

			current.status = nextRandomStatus(current.status)
			current.updatedAt = time.Now().UTC()
		}
	}

	bookings := make([]Booking, 0, len(seedData)+10)

	for _, seed := range seedData {
		s := state[seed.id]

		row := Booking{
			ID:        seed.id,
			GuestName: seed.guestName,
			CheckIn:   seed.checkIn,
			CheckOut:  seed.checkOut,
			Status:    s.status,
			UpdatedAt: s.updatedAt.Format(time.RFC3339),
		}

		// primary row
		bookings = append(bookings, row)

		/*
			30% duplicate chance
			Same payload duplicate in same response
		*/
		if rand.Float32() < 0.30 {
			bookings = append(bookings, row)
		}
	}

	// Shuffle response order to simulate messy provider ordering
	rand.Shuffle(len(bookings), func(i, j int) {
		bookings[i], bookings[j] = bookings[j], bookings[i]
	})

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	if err := json.NewEncoder(w).Encode(bookings); err != nil {
		log.Printf("encode error: %v", err)
		return
	}

	log.Printf(
		"[call %d] returned %d records (delay %s)",
		callCount,
		len(bookings),
		delay,
	)
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"status":"ok"}`))
}

func main() {
	rand.Seed(time.Now().UnixNano())

	mux := http.NewServeMux()
	mux.HandleFunc("/bookings", bookingsHandler)
	mux.HandleFunc("/health", healthHandler)

	addr := ":8080"

	log.Printf("PMS Simulator listening on %s", addr)

	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatal(err)
	}
}