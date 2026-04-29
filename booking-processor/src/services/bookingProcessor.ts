import { pool } from '../db';

export async function processBookingEvent(data: any) {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [rows]: any = await conn.execute(
      'SELECT * FROM bookings WHERE id=? FOR UPDATE',
      [data.id],
    );

    const existing = rows[0];
    const incoming = new Date(data.updated_at);

    if (!existing) {
      await conn.execute(
        `INSERT INTO bookings
        (id,guest_name,check_in,check_out,status,updated_at)
        VALUES(?,?,?,?,?,?)`,
        [
          data.id,
          data.guest_name,
          data.check_in,
          data.check_out,
          data.status,
          incoming,
        ],
      );

      await conn.execute(
        `INSERT IGNORE INTO booking_history
        (booking_id,guest_name,check_in,check_out,status,updated_at)
        VALUES(?,?,?,?,?,?)`,
        [
          data.id,
          data.guest_name,
          data.check_in,
          data.check_out,
          data.status,
          incoming,
        ],
      );
    } else {
      const current = new Date(existing.updated_at);
      if (incoming <= current) {
        await conn.rollback();
        return;
      }

      await conn.execute(
        `INSERT IGNORE INTO booking_history
        (booking_id,guest_name,check_in,check_out,status,updated_at)
        VALUES(?,?,?,?,?,?)`,
        [
          data.id,
          data.guest_name,
          data.check_in,
          data.check_out,
          data.status,
          incoming,
        ],
      );

      await conn.execute(
        `UPDATE bookings
         SET guest_name=?,check_in=?,check_out=?,status=?,updated_at=?
         WHERE id=?`,
        [
          data.guest_name,
          data.check_in,
          data.check_out,
          data.status,
          incoming,
          data.id,
        ],
      );
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}