'use client';

export interface FilterState {
  status: string;
  checkInFrom: string;
  checkInTo: string;
}

const STATUSES = ['confirmed', 'pending', 'cancelled', 'checked_in', 'checked_out'];

interface Props {
  filters: FilterState;
  onChange: (f: FilterState) => void;
}

export function Filters({ filters, onChange }: Props) {
  const set = (patch: Partial<FilterState>) => onChange({ ...filters, ...patch });

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">Status</label>
        <select
          value={filters.status}
          onChange={(e) => set({ status: e.target.value })}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">Check-in from</label>
        <input
          type="date"
          value={filters.checkInFrom}
          onChange={(e) => set({ checkInFrom: e.target.value })}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">Check-in before</label>
        <input
          type="date"
          value={filters.checkInTo}
          onChange={(e) => set({ checkInTo: e.target.value })}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {(filters.status || filters.checkInFrom || filters.checkInTo) && (
        <button
          onClick={() => onChange({ status: '', checkInFrom: '', checkInTo: '' })}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500 shadow-sm hover:bg-gray-50"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}