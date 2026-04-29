import { Worker } from 'bullmq';
import { redisConnection } from '../queue';
import { processBookingEvent } from '../services/bookingProcessor';

export function startWorker() {
  return new Worker(
    'bookings',
    async (job) => processBookingEvent(job.data),
    {
      connection: redisConnection,
      concurrency: 5,
    },
  );
}