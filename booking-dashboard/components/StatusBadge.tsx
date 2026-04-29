'use client';

import { BookingStatus } from '@/types';

const STATUS_STYLES: Record<string, string> = {
  confirmed:    'bg-green-100 text-green-800 border-green-200',
  pending:      'bg-yellow-100 text-yellow-800 border-yellow-200',
  cancelled:    'bg-red-100 text-red-800 border-red-200',
  checked_in:   'bg-blue-100 text-blue-800 border-blue-200',
  checked_out:  'bg-gray-100 text-gray-700 border-gray-200',
};

const DEFAULT_STYLE = 'bg-slate-100 text-slate-700 border-slate-200';

export function StatusBadge({ status }: { status: BookingStatus }) {
  const cls = STATUS_STYLES[status] ?? DEFAULT_STYLE;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${cls}`}
    >
      {status.replace('_', ' ')}
    </span>
  );
}
