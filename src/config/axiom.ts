import { Axiom } from '@axiomhq/js';
import { Logger, AxiomJSTransport, ConsoleTransport } from '@axiomhq/logging';
import { env } from './env.js';

const axiom = new Axiom({
  token: env.AXIOM_TOKEN,
});

export const logger = new Logger({
  transports: [
    new AxiomJSTransport({
      axiom: axiom,
      dataset: env.AXIOM_DATASET,
    }),
    new ConsoleTransport({ prettyPrint: env.NODE_ENV === 'development' }),
  ],
  logLevel: env.LOG_LEVEL,
});

export async function flushLogs(): Promise<void> {
  await logger.flush();
}
