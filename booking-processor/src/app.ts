import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { bookingsRouter } from './routes/bookings';
import { metricsRouter } from './metrics';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use(rateLimit({
    windowMs: 60_000,
    max: 100,
  }));

  app.use('/bookings', bookingsRouter);
  app.use('/metrics', metricsRouter);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
}