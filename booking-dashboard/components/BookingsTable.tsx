'use client';

import { Booking } from '@/types';
import { StatusBadge } from './StatusBadge';

interface Props {
  bookings: Booking[];
  onRowClick: (id: string) => void;
}

function fmt(date: string) {
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function fmtDatetime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function BookingsTable({ bookings, onRowClick }: Props) {
  if (bookings.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white py-16 text-center text-sm text-gray-400 shadow-sm">
        No bookings match the current filters.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-gray-500">Booking ID</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Guest</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Check-in</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Check-out</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Last updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {bookings.map((b) => (
              <tr
                key={b.id}
                onClick={() => onRowClick(b.id)}
                className="cursor-pointer transition-colors hover:bg-blue-50/60"
              >
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{b.id}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{b.guest_name}</td>
                <td className="px-4 py-3 text-gray-600">{fmt(b.check_in)}</td>
                <td className="px-4 py-3 text-gray-600">{fmt(b.check_out)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={b.status} />
                </td>
                <td className="px-4 py-3 text-gray-400">{fmtDatetime(b.updated_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
