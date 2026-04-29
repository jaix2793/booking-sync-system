'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Booking } from '@/types';
import { fetchBookings, BookingFilters } from '@/lib/api';
import { StatsBar } from '@/components/StatsBar';
import { Filters, FilterState } from '@/components/Filters';
import { BookingsTable } from '@/components/BookingsTable';
import { BookingDetailPanel } from '@/components/BookingDetailPanel';

const REFRESH_INTERVAL_MS = 30_000;
const DEBOUNCE_MS = 400;
const PAGE_SIZE = 10;

export default function DashboardPage() {
  // table rows (filtered)
  const [bookings, setBookings] = useState<Booking[]>([]);

  // metrics rows (always unfiltered)
  const [statsBookings, setStatsBookings] = useState<Booking[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [lastRefreshed, setLastRefreshed] =
    useState<Date | null>(null);

  const [selectedId, setSelectedId] =
    useState<string | null>(null);

  const [page, setPage] = useState(1);

  const [meta, setMeta] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });

  const [filters, setFilters] = useState<FilterState>({
    status: '',
    checkInFrom: '',
    checkInTo: '',
  });

  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const pageRef = useRef(page);
  pageRef.current = page;

  const debounceTimer =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---------------------------------------------------
  // Load table data (filtered)
  // ---------------------------------------------------
  const loadTable = useCallback(
    async (
      currentFilters: FilterState,
      currentPage = 1,
      showSpinner = false
    ) => {
      if (showSpinner) setLoading(true);

      try {
        const apiFilters: BookingFilters = {
          status:
            currentFilters.status || undefined,
          check_in_from:
            currentFilters.checkInFrom ||
            undefined,
          check_in_to:
            currentFilters.checkInTo ||
            undefined,
          page: currentPage,
          limit: PAGE_SIZE,
        };

        const res = await fetchBookings(
          apiFilters
        );

        setBookings(res.data);
        setMeta(res.meta);
        setError(null);
      } catch (e: unknown) {
        setError(
          e instanceof Error
            ? e.message
            : 'Unknown error'
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // ---------------------------------------------------
  // Load stats data (NO filters)
  // ---------------------------------------------------
  const loadStats = useCallback(async () => {
    try {
      const res = await fetchBookings({
        page: 1,
        limit: 1000, // enough for assignment demo
      });

      setStatsBookings(res.data);
    } catch {
      // ignore silently
    }
  }, []);

  // ---------------------------------------------------
  // Combined refresh
  // ---------------------------------------------------
  const refreshAll = useCallback(
    async (
      currentFilters: FilterState,
      currentPage = 1,
      showSpinner = false
    ) => {
      await Promise.all([
        loadTable(
          currentFilters,
          currentPage,
          showSpinner
        ),
        loadStats(),
      ]);

      setLastRefreshed(new Date());
    },
    [loadTable, loadStats]
  );

  // ---------------------------------------------------
  // Initial load
  // ---------------------------------------------------
  useEffect(() => {
    refreshAll(filters, 1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------
  // Auto refresh
  // ---------------------------------------------------
  useEffect(() => {
    const timer = setInterval(() => {
      refreshAll(
        filtersRef.current,
        pageRef.current
      );
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [refreshAll]);

  // ---------------------------------------------------
  // Filters changed
  // ---------------------------------------------------
  const handleFiltersChange = (
    newFilters: FilterState
  ) => {
    setFilters(newFilters);
    setPage(1);

    if (debounceTimer.current) {
      clearTimeout(
        debounceTimer.current
      );
    }

    debounceTimer.current =
      setTimeout(() => {
        refreshAll(newFilters, 1);
      }, DEBOUNCE_MS);
  };

  // ---------------------------------------------------
  // Pagination
  // ---------------------------------------------------
  const goToPage = (
    newPage: number
  ) => {
    setPage(newPage);

    refreshAll(filters, newPage);
  };

  // ---------------------------------------------------
  // UI
  // ---------------------------------------------------
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">
              🏡
            </span>

            <h1 className="text-lg font-semibold text-gray-900">
              Booking Sync
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {lastRefreshed && (
              <span className="text-xs text-gray-400">
                Last refreshed{' '}
                {lastRefreshed.toLocaleTimeString(
                  'en-GB'
                )}
              </span>
            )}

            <button
              onClick={() =>
                refreshAll(
                  filters,
                  page,
                  true
                )
              }
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm hover:bg-gray-50"
            >
              ↻ Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-7xl space-y-5 px-6 py-6">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            ⚠️ {error}
          </div>
        )}

        {/* GLOBAL metrics */}
        {!loading && (
          <StatsBar
            bookings={statsBookings}
          />
        )}

        <Filters
          filters={filters}
          onChange={
            handleFiltersChange
          }
        />

        {loading ? (
          <div className="rounded-xl border border-gray-200 bg-white py-16 text-center text-sm text-gray-400 shadow-sm">
            Loading bookings…
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500">
              Showing{' '}
              <span className="font-medium text-gray-700">
                {bookings.length}
              </span>{' '}
              booking
              {bookings.length !== 1
                ? 's'
                : ''}{' '}
              on this page •{' '}
              <span className="font-medium text-gray-700">
                {meta.total}
              </span>{' '}
              matching filters
            </p>

            <BookingsTable
              bookings={bookings}
              onRowClick={
                setSelectedId
              }
            />

            {/* Pagination */}
            <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-sm text-gray-500">
                Page {meta.page} of{' '}
                {meta.totalPages || 1}
              </p>

              <div className="flex gap-2">
                <button
                  disabled={
                    page <= 1
                  }
                  onClick={() =>
                    goToPage(
                      page - 1
                    )
                  }
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Prev
                </button>

                <button
                  disabled={
                    page >=
                    meta.totalPages
                  }
                  onClick={() =>
                    goToPage(
                      page + 1
                    )
                  }
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </main>

      <BookingDetailPanel
        bookingId={selectedId}
        onClose={() =>
          setSelectedId(null)
        }
      />
    </div>
  );
}