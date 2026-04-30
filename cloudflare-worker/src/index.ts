import type { Env } from './types';
import { route } from './api/routes';
import { logger } from './logger';
import { runWorldstateUpdate } from './worldstate/updater';
import { runCodexUpdate } from './codex/updater';

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    return route(request, env);
  },

  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    logger.info('scheduler', 'cron tick', { cron: controller.cron });

    // Cloudflare fires scheduled() once PER cron expression, even when two
    // crons land on the same minute. Dispatch by exact cron string.
    if (controller.cron === '* * * * *') {
      ctx.waitUntil(runWorldstateUpdate(env));
    }

    if (controller.cron === '0 */6 * * *') {
      ctx.waitUntil(runCodexUpdate(env));
    }
  },
} satisfies ExportedHandler<Env>;
