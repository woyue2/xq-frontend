import { createApp } from './app';
import { env } from './config/env';

const app = createApp();

const port = env.PORT;

const server = app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend server listening on port ${port}`);
});

process.on('SIGTERM', () => {
  server.close(() => {
    process.exit(0);
  });
});
