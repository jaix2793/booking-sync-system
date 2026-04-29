import { pool } from '../db';

const CHECKPOINT_KEY = 'bookings_checkpoint';

export async function getCheckpoint(): Promise<string> {
  const [rows]: any = await pool.execute(
    `SELECT state_value
     FROM sync_state
     WHERE state_key = ?`,
    [CHECKPOINT_KEY]
  );

  if (!rows.length) {
    return '1970-01-01T00:00:00.000Z';
  }

  return rows[0].state_value;
}

export async function saveCheckpoint(
  value: string
): Promise<void> {
  await pool.execute(
    `INSERT INTO sync_state
      (state_key, state_value)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE
      state_value = VALUES(state_value)`,
    [CHECKPOINT_KEY, value]
  );
}