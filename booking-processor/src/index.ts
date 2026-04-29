import { initDB } from './db/init';
import { createApp } from './app';
import { startWorker } from './workers/bookingWorker';
import { Poller } from './poller/';
import { config } from './config';
import { pool } from './db';

export function registerShutdown({ worker, poller, server }: any) {
  const shutdown = async () => {
    await poller.stop();
    await worker.close();
    await pool.end();
    await new Promise((resolve) => server.close(resolve));
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}


async function main() {
  await initDB();

  const worker = startWorker();
  const poller = new Poller();
  await poller.start();

  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`API listening on ${config.port}`);
  });

  registerShutdown({ worker, poller, server });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});