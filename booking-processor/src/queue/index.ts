import { Queue } from 'bullmq';
import { config } from '../config';

export const redisConnection = {
  host: config.redis.host,
  port: config.redis.port,
  maxRetriesPerRequest: null,
};

export const bookingQueue = new Queue('bookings', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 100 },
  },
});