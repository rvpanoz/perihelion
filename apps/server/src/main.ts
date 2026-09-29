import { buildApp } from './app.js';
import { readServerConfig } from './config.js';
import { createDatasets } from './datasets/createDatasets.js';
import { defaultDatasetRequests } from './datasets/datasetRequests.js';
import { startScheduledRefresh } from './datasets/scheduledRefresh.js';
import { registerDatasetRoutes } from './routes/datasetRoutes.js';

const REFRESH_INTERVAL_MS = 10 * 60_000;

const config = readServerConfig(process.env);
const app = await buildApp({ logger: true });
if (config.usingDemoKey)
  app.log.warn('NASA_API_KEY is not set; DONKI uses the rate-limited DEMO_KEY');

const datasets = createDatasets(config, app.log);
registerDatasetRoutes(app, datasets);
const stopRefresh = startScheduledRefresh({
  service: datasets.service,
  requests: () => Object.values(defaultDatasetRequests(datasets.requests)),
  intervalMs: REFRESH_INTERVAL_MS,
});
app.addHook('onClose', async () => {
  stopRefresh();
  datasets.close();
});

try {
  await app.listen({ port: config.port, host: '127.0.0.1' });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
