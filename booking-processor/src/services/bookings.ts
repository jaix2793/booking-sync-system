import { pool } from '../db';

interface BookingFilters {
  status?: string;
  check_in_from?: string;
  check_in_to?: string;
  page?: number;
  limit?: number;
}

export async function findAllBookings(
  filters: BookingFilters = {},
) {
  const where: string[] = [];
  const params: any[] = [];

  if (filters.status) {
    where.push('status = ?');
    params.push(filters.status);
  }

  if (filters.check_in_from) {
    where.push('check_in >= ?');
    params.push(filters.check_in_from);
  }

  if (filters.check_in_to) {
    where.push('check_in <= ?');
    params.push(filters.check_in_to);
  }

  const clause = where.length
    ? `WHERE ${where.join(' AND ')}`
    : '';

  const page = Math.max(Number(filters.page ?? 1), 1);
  const limit = Math.min(
    Math.max(Number(filters.limit ?? 10), 1),
    100
  );

  const offset = (page - 1) * limit;

  // Count query
  const [countRows]: any = await pool.execute(
    `SELECT COUNT(*) AS total
     FROM bookings ${clause}`,
    params
  );

  const total = Number(countRows[0].total);

  // IMPORTANT: use query(), not execute()
  const sql = `
    SELECT *
    FROM bookings
    ${clause}
    ORDER BY check_in ASC
    LIMIT ${offset}, ${limit}
  `;

  const [rows]: any = await pool.query(sql, params);

  return {
    data: rows,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(
        1,
        Math.ceil(total / limit)
      ),
    },
  };
}

export async function findBookingById(id: string) {
  const [rows]: any = await pool.execute(
    'SELECT * FROM bookings WHERE id=?',
    [id]
  );

  if (!rows.length) return null;

  const [history]: any = await pool.execute(
    `SELECT *
     FROM booking_history
     WHERE booking_id=?
     ORDER BY updated_at ASC`,
    [id]
  );

  return {
    ...rows[0],
    history,
  };
}