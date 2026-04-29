'use client';

import { Booking } from '@/types';

const STATUS_COLORS: Record<string, string> = {
  confirmed:   'text-green-700',
  pending:     'text-yellow-700',
  cancelled:   'text-red-700',
  checked_in:  'text-blue-700',
  checked_out: 'text-gray-600',
};

interface Props {
  bookings: Booking[];
}

export function StatsBar({ bookings }: Props) {
  const total = bookings.length;

  const counts = bookings.reduce<Record<string, number>>((acc, b) => {
    acc[b.status] = (acc[b.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-200 bg-white px-6 py-4 shadow-sm">
      {/* Total */}
      <div className="flex flex-col">
        <span className="text-2xl font-semibold text-gray-900">{total}</span>
        <span className="text-xs text-gray-500">Total bookings</span>
      </div>

      <div className="h-8 w-px bg-gray-200" />

      {/* Per-status */}
      {Object.entries(counts).map(([status, count]) => (
        <div key={status} className="flex flex-col">
          <span className={`text-xl font-semibold ${STATUS_COLORS[status] ?? 'text-gray-700'}`}>
            {count}
          </span>
          <span className="text-xs capitalize text-gray-500">{status.replace('_', ' ')}</span>
        </div>
      ))}
    </div>
  );
}
