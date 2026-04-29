import { Router } from 'express';
import client from 'prom-client';

client.collectDefaultMetrics();

export const metricsRouter = Router();

metricsRouter.get('/', async (_req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});