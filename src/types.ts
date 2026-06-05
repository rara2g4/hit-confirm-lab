export type GameState = 'idle' | 'waiting' | 'target' | 'result';

export type ResultType =
  | 'success'
  | 'falseStart'
  | 'wrongPress'
  | 'missed'
  | 'correctNoPress';

export type Mode = 'basic' | 'random' | 'speed';

export type ColorId = 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'cyan';

export interface TrainingColor {
  id: ColorId;
  label: string;
  hex: string;
  foreground: string;
}

export interface ModeConfig {
  id: Mode;
  label: string;
  waitMinMs: number;
  waitMaxMs: number;
  limitMs: number;
}

export interface RoundRecord {
  id: string;
  mode: Mode;
  result: ResultType;
  targetColorId: ColorId;
  shownColorId: ColorId;
  reactionTimeMs: number | null;
  createdAt: string;
}

export interface StoredStats {
  bestReactionTimeMs: number | null;
  reactionTimes: number[];
  totalRounds: number;
  successCount: number;
  wrongPressCount: number;
  falseStartCount: number;
  missedCount: number;
  correctNoPressCount: number;
  recent: RoundRecord[];
}

export interface GameSnapshot {
  state: GameState;
  mode: Mode;
  targetColor: TrainingColor;
  decoyColors: TrainingColor[];
  shownColor: TrainingColor;
  result: ResultType | null;
  reactionTimeMs: number | null;
}
