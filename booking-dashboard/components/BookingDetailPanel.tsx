'use client';

import { useEffect, useState } from 'react';
import { BookingDetail } from '@/types';
import { fetchBooking } from '@/lib/api';
import { StatusBadge } from './StatusBadge';

interface Props {
  bookingId: string | null;
  onClose: () => void;
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
    second: '2-digit',
  });
}

export function BookingDetailPanel({ bookingId, onClose }: Props) {
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId) {
      setBooking(null);
      return;
    }
    setLoading(true);
    setError(null);
    fetchBooking(bookingId)
      .then(setBooking)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [bookingId]);

  const open = !!bookingId;

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[1px]"
          onClick={onClose}
        />
      )}

      {/* Slide-over panel */}
      <div
        className={`fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Booking detail</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading && (
            <div className="flex h-40 items-center justify-center text-sm text-gray-400">
              Loading…
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          {booking && !loading && (
            <div className="space-y-6">
              {/* Core details */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-gray-400">#{booking.id}</span>
                  <StatusBadge status={booking.status} />
                </div>

                <h3 className="text-xl font-semibold text-gray-900">{booking.guest_name}</h3>

                <div className="grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-4">
                  <div>
                    <p className="text-xs text-gray-500">Check-in</p>
                    <p className="text-sm font-medium text-gray-800">{fmt(booking.check_in)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Check-out</p>
                    <p className="text-sm font-medium text-gray-800">{fmt(booking.check_out)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500">Last updated</p>
                    <p className="text-sm font-medium text-gray-800">
                      {fmtDatetime(booking.updated_at)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Status history */}
              <div>
                <h4 className="mb-3 text-sm font-semibold text-gray-700">Status history</h4>

                {booking.history.length === 0 ? (
                  <p className="text-sm text-gray-400">No history recorded yet.</p>
                ) : (
                  <ol className="relative ml-2 border-l border-gray-200">
                    {[...booking.history].reverse().map((entry, i) => (
                      <li key={entry.id} className="mb-4 ml-4">
                        <div className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full border-2 border-white bg-gray-300" />
                        <div className="flex items-center gap-2">
                          <StatusBadge status={entry.status} />
                          {i === 0 && (
                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">
                              current
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-gray-400">
                          {fmtDatetime(entry.updated_at)}
                        </p>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
