import { Booking, BookingDetail } from '@/types';

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:3001';

export interface BookingFilters {
  status?: string;
  check_in_from?: string;
  check_in_to?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedBookings {
  data: Booking[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function fetchBookings(
  filters: BookingFilters = {}
): Promise<PaginatedBookings> {
  const params = new URLSearchParams();

  if (filters.status)
    params.set('status', filters.status);

  if (filters.check_in_from)
    params.set('check_in_from', filters.check_in_from);

  if (filters.check_in_to)
    params.set('check_in_to', filters.check_in_to);

  params.set('page', String(filters.page ?? 1));
  params.set('limit', String(filters.limit ?? 10));

  const res = await fetch(
    `${BASE_URL}/bookings?${params.toString()}`,
    { cache: 'no-store' }
  );

  if (!res.ok) {
    throw new Error('Failed to fetch bookings');
  }

  return res.json();
}

export async function fetchBooking(
  id: string
): Promise<BookingDetail> {
  const res = await fetch(
    `${BASE_URL}/bookings/${id}`,
    { cache: 'no-store' }
  );

  if (!res.ok) {
    throw new Error('Failed to fetch booking');
  }

  return res.json();
}


export interface BookingStats {
  total: number;
  perStatus: Record<string, number>;
}

export async function fetchStats(): Promise<BookingStats> {
  const res = await fetch(`${BASE_URL}/bookings/stats`, {
    cache: 'no-store',
  });

  if (!res.ok) throw new Error('Failed to fetch stats');

  return res.json();
}