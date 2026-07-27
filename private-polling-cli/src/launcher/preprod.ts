// Private Polling CLI — Preprod Launcher

import axios from 'axios';
import { createLogger } from '../logger-utils.js';
import { run } from '../index.js';
import { PreprodRemoteConfig } from '../config.js';

// Override 1000ms health check timeout for international latency
axios.interceptors.request.use((config) => {
  if (config.timeout && config.timeout <= 2000) {
    config.timeout = 15000;
  }
  return config;
});

const config = new PreprodRemoteConfig();
const logger = await createLogger(config.logDir);
const testEnvironment = config.getEnvironment(logger);
await run(config, testEnvironment, logger);
