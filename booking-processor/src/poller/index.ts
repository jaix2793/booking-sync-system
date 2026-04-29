import axios from 'axios';
import { bookingQueue } from '../queue';
import { config } from '../config';
import {
  getCheckpoint,
  saveCheckpoint,
} from '../services/syncState';

export class Poller {
  private stopped = false;
  private checkpoint =
    '1970-01-01T00:00:00.000Z';

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

      await new Promise((r) =>
        setTimeout(r, config.pollIntervalMs)
      );
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
        (item: any) =>
          item.updated_at > this.checkpoint
      );

      if (!fresh.length) return;

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
          item.updated_at > max
            ? item.updated_at
            : max,
        this.checkpoint
      );

      this.checkpoint = latest;

      await saveCheckpoint(latest);

      console.log(
        `Queued ${fresh.length} fresh records`
      );
    } catch (err) {
      console.error('Poll failed', err);
    }
  }
}