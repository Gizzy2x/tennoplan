import { Check } from 'lucide-react';
import { useThemeStore } from '@/store/theme';
import { getTypographyStyle } from '@/tokens/utils';

export interface CompletionToggleProps {
  label:    string;
  sublabel: string;
  checked:  boolean;
  onToggle: () => void;
}

export function CompletionToggle({ label, sublabel, checked, onToggle }: CompletionToggleProps) {
  const { tokens } = useThemeStore();
  const color = '#E3C372';

  return (
    <div
      className="flex items-center gap-3 py-3 px-4 cursor-pointer select-none transition-colors hover:bg-white/[0.02]"
      onClick={onToggle}
      role="checkbox"
      aria-checked={checked}
      tabIndex={0}
      onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onToggle(); } }}
    >
      {/* Checkmark ring */}
      <div
        className="flex items-center justify-center flex-shrink-0 transition-all duration-300"
        style={{
          width:      32,
          height:     32,
          border:     checked ? `1px solid ${color}55` : '1px solid rgba(197,192,190,0.20)',
          background: checked ? `${color}0E` : 'transparent',
          boxShadow:  checked ? `0 0 14px ${color}28, inset 0 1px 0 rgba(255,255,255,0.06)` : 'none',
        }}
      >
        <Check
          size={16}
          strokeWidth={1.8}
          style={{
            color:   checked ? color : 'rgba(197,192,190,0.20)',
            opacity: checked ? 1 : 0.4,
            transition: 'color 0.3s ease, opacity 0.3s ease',
          }}
        />
      </div>

      {/* Labels */}
      <div className="flex-1 min-w-0">
        <p
          data-role="body"
          className="leading-snug transition-colors duration-300"
          style={{
            ...getTypographyStyle(tokens, 'body'),
            color: checked ? color : 'rgba(229,226,225,0.65)',
          }}
        >
          {label}
        </p>
        <p
          data-role="labelTiny"
          className="mt-0.5"
          style={{
            ...getTypographyStyle(tokens, 'labelTiny'),
            color: '#C6C6C7',
            opacity: 0.30,
          }}
        >
          {sublabel}
        </p>
      </div>

      {/* Completed chip */}
      {checked && (
        <span
          data-role="labelTiny"
          className="flex-shrink-0 px-2 py-0.5"
          style={{
            ...getTypographyStyle(tokens, 'labelTiny'),
            color,
            border:          `1px solid ${color}35`,
            backgroundColor: `${color}0A`,
          }}
        >
          Completed
        </span>
      )}
    </div>
  );
}
