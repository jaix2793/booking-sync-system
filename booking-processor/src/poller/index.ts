import axios from 'axios';
import { bookingQueue } from '../queue';
import { config } from '../config';
import {
  getCheckpoint,
  saveCheckpoint,
} from '../services/syncState';

const MAX_BACKOFF_MS = 5 * 60 * 1000; // 5 minutes

export class Poller {
  private stopped = false;
  private checkpoint = '1970-01-01T00:00:00.000Z';
  private consecutiveFailures = 0;

  async start(): Promise<void> {
    this.checkpoint = await getCheckpoint();
    void this.run();
  }

  async stop(): Promise<void> {
    this.stopped = true;
  }

  private async run() {
    while (!this.stopped) {
      await this.pollOnce();

      // If failing repeatedly, back off — up to MAX_BACKOFF_MS
      const backoff = this.consecutiveFailures > 0
        ? Math.min(
            config.pollIntervalMs * 2 ** this.consecutiveFailures,
            MAX_BACKOFF_MS
          )
        : config.pollIntervalMs;

      await new Promise((r) => setTimeout(r, backoff));
    }
  }

  private async pollOnce() {
    try {
      const { data } = await axios.get(
        `${config.pmsUrl}/bookings`,
        { timeout: 15000 }
      );

      if (!Array.isArray(data)) return;

      const fresh = data.filter(
        (item: any) => item.updated_at > this.checkpoint
      );

      if (!fresh.length) {
        this.consecutiveFailures = 0;
        return;
      }

      const jobs = fresh.map((b: any) => ({
        name: 'processBooking',
        data: b,
        opts: {
          jobId: `${b.id}-${b.updated_at}`,
        },
      }));

      await bookingQueue.addBulk(jobs);

      const latest = fresh.reduce(
        (max: string, item: any) =>
          item.updated_at > max ? item.updated_at : max,
        this.checkpoint
      );

      this.checkpoint = latest;
      await saveCheckpoint(latest);

      this.consecutiveFailures = 0;
      console.log(`Queued ${fresh.length} fresh records`);
    } catch (err) {
      this.consecutiveFailures++;
      const nextBackoff = Math.min(
        config.pollIntervalMs * 2 ** this.consecutiveFailures,
        MAX_BACKOFF_MS
      );
      console.error(
        `Poll failed (attempt ${this.consecutiveFailures}), backing off ${nextBackoff}ms:`,
        err
      );
    }
  }
}