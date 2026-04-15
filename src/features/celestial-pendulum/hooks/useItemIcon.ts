/**
 * Re-export from the canonical src/hooks/useItemIcon.ts.
 * This shim keeps existing imports in the celestial-pendulum feature working
 * without a mass-rename, while ensuring all icon logic lives in one place.
 */
export { useItemIcon } from '@/hooks/useItemIcon';
