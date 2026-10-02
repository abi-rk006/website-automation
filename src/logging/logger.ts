export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// ANSI color codes for readable terminal output
const COLORS = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

export class Logger {
  private minLevel: LogLevel;

  constructor(minLevel: LogLevel = 'info') {
    this.minLevel = minLevel;
  }

  setLevel(level: LogLevel) {
    this.minLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[this.minLevel];
  }

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  debug(message: string, context?: any) {
    if (!this.shouldLog('debug')) return;
    const ctx = context ? ` ${COLORS.dim}${JSON.stringify(context)}${COLORS.reset}` : '';
    console.log(`${COLORS.dim}[${this.formatTimestamp()}]${COLORS.reset} ${COLORS.cyan}[DEBUG]${COLORS.reset} ${message}${ctx}`);
  }

  info(message: string, context?: any) {
    if (!this.shouldLog('info')) return;
    const ctx = context ? ` ${COLORS.dim}${JSON.stringify(context)}${COLORS.reset}` : '';
    console.log(`${COLORS.dim}[${this.formatTimestamp()}]${COLORS.reset} ${COLORS.green}[INFO]${COLORS.reset} ${message}${ctx}`);
  }

  warn(message: string, context?: any) {
    if (!this.shouldLog('warn')) return;
    const ctx = context ? ` ${COLORS.dim}${JSON.stringify(context)}${COLORS.reset}` : '';
    console.warn(`${COLORS.dim}[${this.formatTimestamp()}]${COLORS.reset} ${COLORS.yellow}[WARN]${COLORS.reset} ${message}${ctx}`);
  }

  error(message: string, error?: any) {
    if (!this.shouldLog('error')) return;
    let errStr = '';
    if (error) {
      if (error instanceof Error) {
        errStr = `\n${COLORS.red}${error.stack || error.message}${COLORS.reset}`;
      } else {
        errStr = ` ${COLORS.red}${JSON.stringify(error)}${COLORS.reset}`;
      }
    }
    console.error(`${COLORS.dim}[${this.formatTimestamp()}]${COLORS.reset} ${COLORS.red}[ERROR]${COLORS.reset} ${message}${errStr}`);
  }

  action(step: number, tool: string, args: Record<string, any>) {
    console.log(
      `${COLORS.dim}[${this.formatTimestamp()}]${COLORS.reset} ${COLORS.magenta}[ACTION #${step}]${COLORS.reset} ${COLORS.bold}${tool}${COLORS.reset} with args: ${JSON.stringify(args)}`
    );
  }

  observation(summary: string) {
    console.log(
      `${COLORS.dim}[${this.formatTimestamp()}]${COLORS.reset} ${COLORS.blue}[OBSERVATION]${COLORS.reset} ${summary}`
    );
  }
}

export const logger = new Logger('info');
