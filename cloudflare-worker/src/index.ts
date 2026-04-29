import type { Env } from './types';
import { route } from './api/routes';
import { logger } from './logger';

// Phase B: import { runWorldstateUpdate } from './worldstate/updater';
// Phase C: import { runCodexUpdate }      from './codex/updater';

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    return route(request, env);
  },

  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    logger.info('scheduler', 'cron tick', { cron: controller.cron });

    // Phase B: every-minute worldstate update
    // ctx.waitUntil(runWorldstateUpdate(env));

    // Phase C: 6-hour codex update
    // const now = new Date();
    // if (now.getMinutes() === 0 && now.getUTCHours() % 6 === 0) {
    //   ctx.waitUntil(runCodexUpdate(env));
    // }
  },
} satisfies ExportedHandler<Env>;
