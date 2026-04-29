export interface Booking {
  id: string;
  guest_name: string;
  check_in: string;   // "YYYY-MM-DD"
  check_out: string;  // "YYYY-MM-DD"
  status: BookingStatus;
  updated_at: string; // ISO 8601
  created_at: string;
}

export type BookingStatus =
  | 'confirmed'
  | 'pending'
  | 'cancelled'
  | 'checked_in'
  | 'checked_out'
  | string; // allow unknown statuses gracefully

export interface HistoryEntry {
  id: number;
  booking_id: string;
  status: BookingStatus;
  updated_at: string;
  recorded_at: string;
}

export interface BookingDetail extends Booking {
  history: HistoryEntry[];
}
