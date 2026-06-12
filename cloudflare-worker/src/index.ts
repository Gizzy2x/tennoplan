import type { Env } from './types';
import { route } from './api/routes';
import { logger } from './logger';

// NOTE: worldstate/updater is dynamically imported inside scheduled() so the
// worldstate-parser dependency (heavy NestJS decorator tree) only compiles
// when the cron actually fires — keeps cold-start CPU low.
//
// The codex pipeline is NOT run from the worker. The full parse+build+enrich
// chain over ~8,800 items exceeds the Free-plan CPU budget. Instead, GitHub
// Actions builds the blob in Node and uploads it to KV
// (.github/workflows/build-codex.yml). The worker only serves the cached blob
// via /v1/codex (api/handlers/codex.ts), which is fast and within budget.

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return route(request, env, ctx);
  },

  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    logger.info('scheduler', 'cron tick', { cron: controller.cron });

    if (controller.cron === '*/5 * * * *') {
      ctx.waitUntil(
        (async () => {
          await import('reflect-metadata');
          const { runWorldstateUpdate } = await import('./worldstate/updater');
          return runWorldstateUpdate(env);
        })(),
      );
    }
  },
} satisfies ExportedHandler<Env>;
