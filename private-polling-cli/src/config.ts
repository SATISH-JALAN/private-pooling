// Private Polling CLI Configuration

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  EnvironmentConfiguration,
  getTestEnvironment,
  RemoteTestEnvironment,
  TestEnvironment,
} from '@midnight-ntwrk/testkit-js';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { Logger } from 'pino';

export interface Config {
  readonly privateStateStoreName: string;
  readonly logDir: string;
  readonly zkConfigPath: string;
  getEnvironment(logger: Logger): TestEnvironment;
  readonly generateDust: boolean;
}

export const currentDir = path.dirname(fileURLToPath(import.meta.url));

const getLogFilename = () => `${new Date().toISOString().replace(/:/g, '-')}.log`;

export class StandaloneConfig implements Config {
  getEnvironment(logger: Logger): TestEnvironment {
    return getTestEnvironment(logger) as TestEnvironment;
  }
  privateStateStoreName = 'private-polling-private-state';
  logDir = path.resolve(currentDir, '..', 'logs', 'standalone', getLogFilename());
  zkConfigPath = path.resolve(currentDir, '..', '..', 'contract', 'src', 'managed', 'private-polling');
  generateDust = false;
}

export class PreviewRemoteConfig implements Config {
  getEnvironment(logger: Logger): TestEnvironment {
    setNetworkId('preview');
    return new PreviewTestEnvironment(logger);
  }
  privateStateStoreName = 'private-polling-private-state';
  logDir = path.resolve(currentDir, '..', 'logs', 'preview-remote', getLogFilename());
  zkConfigPath = path.resolve(currentDir, '..', '..', 'contract', 'src', 'managed', 'private-polling');
  generateDust = true;
}

export class PreprodRemoteConfig implements Config {
  getEnvironment(logger: Logger): TestEnvironment {
    setNetworkId('preprod');
    return new PreprodTestEnvironment(logger);
  }
  privateStateStoreName = 'private-polling-private-state';
  logDir = path.resolve(currentDir, '..', 'logs', 'preprod-remote', getLogFilename());
  zkConfigPath = path.resolve(currentDir, '..', '..', 'contract', 'src', 'managed', 'private-polling');
  generateDust = false;
}

export class PreviewTestEnvironment extends RemoteTestEnvironment {
  constructor(logger: Logger) {
    super(logger);
  }

  private getProofServerUrl(): string {
    return process.env.PROOF_SERVER_URL ?? 'http://127.0.0.1:6300';
  }

  private getIndexerUrl(): string {
    return process.env.INDEXER_URL ?? 'https://indexer.preview.midnight.network/api/v4/graphql';
  }

  private getIndexerWsUrl(): string {
    return process.env.INDEXER_WS_URL ?? 'wss://indexer.preview.midnight.network/api/v4/graphql/ws';
  }

  private getNodeUrl(): string {
    return process.env.NODE_URL ?? 'https://rpc.preview.midnight.network';
  }

  private getNodeWsUrl(): string {
    return process.env.NODE_WS_URL ?? 'wss://rpc.preview.midnight.network';
  }

  getEnvironmentConfiguration(): EnvironmentConfiguration {
    return {
      indexer: this.getIndexerUrl(),
      indexerWS: this.getIndexerWsUrl(),
      node: this.getNodeUrl(),
      nodeWS: this.getNodeWsUrl(),
      proofServer: this.getProofServerUrl(),
      walletNetworkId: 'preview',
    } as EnvironmentConfiguration;
  }
}

export class PreprodTestEnvironment extends RemoteTestEnvironment {
  constructor(logger: Logger) {
    super(logger);
  }

  private getProofServerUrl(): string {
    return process.env.PROOF_SERVER_URL ?? 'http://127.0.0.1:6300';
  }

  private getIndexerUrl(): string {
    return process.env.INDEXER_URL ?? 'https://indexer.preprod.midnight.network/api/v4/graphql';
  }

  private getIndexerWsUrl(): string {
    return process.env.INDEXER_WS_URL ?? 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws';
  }

  private getNodeUrl(): string {
    return process.env.NODE_URL ?? 'https://rpc.preprod.midnight.network';
  }

  private getNodeWsUrl(): string {
    return process.env.NODE_WS_URL ?? 'wss://rpc.preprod.midnight.network';
  }

  getEnvironmentConfiguration(): EnvironmentConfiguration {
    return {
      indexer: this.getIndexerUrl(),
      indexerWS: this.getIndexerWsUrl(),
      node: this.getNodeUrl(),
      nodeWS: this.getNodeWsUrl(),
      proofServer: this.getProofServerUrl(),
      walletNetworkId: 'preprod',
    } as EnvironmentConfiguration;
  }
}
