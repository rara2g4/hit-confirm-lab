import type {
  ColorId,
  GameSnapshot,
  GameState,
  Mode,
  ModeConfig,
  ResultType,
  RoundRecord,
  TrainingColor,
} from './types';

export const COLORS: Record<ColorId, TrainingColor> = {
  blue: { id: 'blue', label: 'Blue', hex: '#2487ff', foreground: '#f7fbff' },
  green: { id: 'green', label: 'Green', hex: '#28c96f', foreground: '#04120a' },
  red: { id: 'red', label: 'Red', hex: '#ff3d57', foreground: '#fff7f8' },
  yellow: { id: 'yellow', label: 'Yellow', hex: '#ffd84a', foreground: '#171200' },
  purple: { id: 'purple', label: 'Purple', hex: '#a45bff', foreground: '#fcf8ff' },
  cyan: { id: 'cyan', label: 'Cyan', hex: '#31d6db', foreground: '#001314' },
};

export const DEFAULT_COLOR: TrainingColor = {
  id: 'cyan',
  label: 'Neutral',
  hex: '#182332',
  foreground: '#e7edf6',
};

export const MODE_CONFIGS: Record<Mode, ModeConfig> = {
  basic: { id: 'basic', label: 'Basic Mode', waitMinMs: 1000, waitMaxMs: 3500, limitMs: 1000 },
  random: { id: 'random', label: 'Random Mode', waitMinMs: 1000, waitMaxMs: 3500, limitMs: 1000 },
  speed: { id: 'speed', label: 'Speed Mode', waitMinMs: 800, waitMaxMs: 2600, limitMs: 800 },
};

const colorPool = Object.values(COLORS);
const decoyPool = [COLORS.red, COLORS.yellow, COLORS.purple, COLORS.green, COLORS.cyan];

const resultByTimeout: Record<'target' | 'decoy', ResultType> = {
  target: 'missed',
  decoy: 'correctNoPress',
};

export class HitConfirmGame {
  private state: GameState = 'idle';
  private mode: Mode = 'basic';
  private targetColor: TrainingColor = COLORS.blue;
  private decoyColors: TrainingColor[] = [COLORS.red, COLORS.yellow, COLORS.purple];
  private shownColor: TrainingColor = DEFAULT_COLOR;
  private result: ResultType | null = null;
  private reactionTimeMs: number | null = null;
  private targetStartedAt = 0;
  private waitTimer: number | null = null;
  private limitTimer: number | null = null;
  private listeners = new Set<(snapshot: GameSnapshot) => void>();
  private resultListeners = new Set<(record: RoundRecord) => void>();

  subscribe(listener: (snapshot: GameSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }

  onResult(listener: (record: RoundRecord) => void): () => void {
    this.resultListeners.add(listener);
    return () => this.resultListeners.delete(listener);
  }

  setMode(mode: Mode): void {
    this.clearTimers();
    this.mode = mode;
    this.state = 'idle';
    this.result = null;
    this.reactionTimeMs = null;
    this.prepareRoundColors();
    this.shownColor = DEFAULT_COLOR;
    this.emit();
  }

  startRound(): void {
    this.clearTimers();
    this.prepareRoundColors();
    this.state = 'waiting';
    this.result = null;
    this.reactionTimeMs = null;
    this.shownColor = DEFAULT_COLOR;
    this.emit();

    const config = MODE_CONFIGS[this.mode];
    const waitMs = randomInt(config.waitMinMs, config.waitMaxMs);
    this.waitTimer = window.setTimeout(() => this.revealTarget(), waitMs);
  }

  registerInput(): void {
    if (this.state === 'waiting') {
      this.finishRound('falseStart');
      return;
    }

    if (this.state !== 'target') {
      return;
    }

    const isTargetColor = this.shownColor.id === this.targetColor.id;
    if (isTargetColor) {
      const elapsed = Math.round(performance.now() - this.targetStartedAt);
      this.finishRound('success', elapsed);
      return;
    }

    this.finishRound('wrongPress');
  }

  getSnapshot(): GameSnapshot {
    return this.snapshot();
  }

  private revealTarget(): void {
    this.waitTimer = null;
    this.state = 'target';
    this.shownColor = this.pickShownColor();
    this.targetStartedAt = performance.now();
    this.emit();

    this.limitTimer = window.setTimeout(() => {
      const outcome = this.shownColor.id === this.targetColor.id ? resultByTimeout.target : resultByTimeout.decoy;
      this.finishRound(outcome);
    }, MODE_CONFIGS[this.mode].limitMs);
  }

  private finishRound(result: ResultType, reactionTimeMs: number | null = null): void {
    if (this.state === 'result') {
      return;
    }

    this.clearTimers();
    this.state = 'result';
    this.result = result;
    this.reactionTimeMs = result === 'success' ? reactionTimeMs : null;
    this.emit();

    const record: RoundRecord = {
      id: crypto.randomUUID(),
      mode: this.mode,
      result,
      targetColorId: this.targetColor.id,
      shownColorId: this.shownColor.id,
      reactionTimeMs: this.reactionTimeMs,
      createdAt: new Date().toISOString(),
    };

    this.resultListeners.forEach((listener) => listener(record));
  }

  private prepareRoundColors(): void {
    if (this.mode === 'random') {
      this.targetColor = pickOne(colorPool);
      this.decoyColors = shuffle(colorPool.filter((color) => color.id !== this.targetColor.id)).slice(0, 3);
      return;
    }

    this.targetColor = this.mode === 'speed' ? COLORS.green : COLORS.blue;
    this.decoyColors = decoyPool.filter((color) => color.id !== this.targetColor.id).slice(0, 3);
  }

  private pickShownColor(): TrainingColor {
    const candidates = [this.targetColor, ...this.decoyColors];
    return pickOne(candidates);
  }

  private snapshot(): GameSnapshot {
    return {
      state: this.state,
      mode: this.mode,
      targetColor: this.targetColor,
      decoyColors: this.decoyColors,
      shownColor: this.shownColor,
      result: this.result,
      reactionTimeMs: this.reactionTimeMs,
    };
  }

  private emit(): void {
    const snapshot = this.snapshot();
    this.listeners.forEach((listener) => listener(snapshot));
  }

  private clearTimers(): void {
    if (this.waitTimer !== null) {
      window.clearTimeout(this.waitTimer);
      this.waitTimer = null;
    }

    if (this.limitTimer !== null) {
      window.clearTimeout(this.limitTimer);
      this.limitTimer = null;
    }
  }
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickOne<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}
