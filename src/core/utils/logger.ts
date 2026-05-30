const STYLES = {
  info:    'color: #7eb8d4; font-weight: bold;',
  warn:    'color: #DBB058; font-weight: bold;',
  error:   'color: #d46a6a; font-weight: bold;',
  success: 'color: #7ed47e; font-weight: bold;',
  label:   'color: #C6C6C7; font-weight: normal;',
  reset:   '',
};

function fmt(level: string, style: string, module?: string): [string, ...string[]] {
  const tag = module ? `[${level}][${module}]` : `[${level}]`;
  return [`%c${tag}%c`, style, STYLES.label];
}

export const logger = {
  info(msg: string, ...args: unknown[]): void {
    console.info(...fmt('INFO', STYLES.info), msg, ...args);
  },
  warn(msg: string, ...args: unknown[]): void {
    console.warn(...fmt('WARN', STYLES.warn), msg, ...args);
  },
  error(msg: string, ...args: unknown[]): void {
    console.error(...fmt('ERR', STYLES.error), msg, ...args);
  },
  success(msg: string, ...args: unknown[]): void {
    console.log(...fmt('OK', STYLES.success), msg, ...args);
  },
  /** Scoped logger — prefixes every message with the module name. */
  scope(module: string) {
    return {
      info   : (msg: string, ...args: unknown[]) => console.info(...fmt('INFO', STYLES.info, module), msg, ...args),
      warn   : (msg: string, ...args: unknown[]) => console.warn(...fmt('WARN', STYLES.warn, module), msg, ...args),
      error  : (msg: string, ...args: unknown[]) => console.error(...fmt('ERR',  STYLES.error, module), msg, ...args),
      success: (msg: string, ...args: unknown[]) => console.log(...fmt('OK',   STYLES.success, module), msg, ...args),
    };
  },
};
