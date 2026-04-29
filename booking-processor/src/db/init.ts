import { pool } from './index';

export async function initDB() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS bookings (
      id VARCHAR(8) PRIMARY KEY,
      guest_name VARCHAR(255),
      check_in DATE,
      check_out DATE,
      status VARCHAR(50),
      updated_at DATETIME(3),
      created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3)
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS booking_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      booking_id VARCHAR(8) NOT NULL,
      guest_name VARCHAR(255),
      check_in DATE,
      check_out DATE,
      status VARCHAR(50),
      updated_at DATETIME(3),
      recorded_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
      UNIQUE KEY uq_booking_update (booking_id, updated_at),
      CONSTRAINT fk_history_booking
        FOREIGN KEY (booking_id) REFERENCES bookings(id)
        ON DELETE CASCADE
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS sync_state (
      state_key VARCHAR(100) PRIMARY KEY,
      state_value VARCHAR(255) NOT NULL,
      updated_at DATETIME(3)
        DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3)
    )
  `);
}