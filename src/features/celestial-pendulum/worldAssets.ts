import cetusDayBg    from '@/assets/worlds/bg-cetus-day.jpg';
import cetusNightBg  from '@/assets/worlds/bg-cetus-night.jpg';
import vallisWarmBg  from '@/assets/worlds/bg-vallis.jpg';
import vallisColdBg  from '@/assets/worlds/bg-vallis.jpg';
import cambionBg     from '@/assets/worlds/bg-cambion.jpg';
import zarimanBg     from '@/assets/worlds/bg-zariman.jpg';
import duviriBg      from '@/assets/worlds/bg-duviri.jpg';
import earthBg       from '@/assets/worlds/bg-earth.jpg';

export const WORLD_BG_LOCAL: Record<string, string> = {
  'cetus-day':       cetusDayBg,
  'cetus-night':     cetusNightBg,
  'vallis-warm':     vallisWarmBg,
  'vallis-cold':     vallisColdBg,
  'cambion-fass':    cambionBg,
  'cambion-vome':    cambionBg,
  'zariman-corpus':  zarimanBg,
  'zariman-grineer': zarimanBg,
  'duviri-joy':      duviriBg,
  'duviri-anger':    duviriBg,
  'duviri-envy':     duviriBg,
  'duviri-sorrow':   duviriBg,
  'duviri-fear':     duviriBg,
  'earth-day':       earthBg,
  'earth-night':     earthBg,
};

export function getWorldBg(id: string, state: string): string {
  return WORLD_BG_LOCAL[`${id}-${state}`] ?? WORLD_BG_LOCAL[`${id}-day`] ?? '';
}
