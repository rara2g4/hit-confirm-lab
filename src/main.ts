import { COLORS, DEFAULT_COLOR, HitConfirmGame, MODE_CONFIGS } from './game';
import { addRecord, loadStats, resetStats } from './storage';
import type { ColorId, GameSnapshot, Mode, ResultType, RoundRecord, StoredStats, TrainingColor } from './types';
import './style.css';

const game = new HitConfirmGame();
let stats = loadStats();

const arena = getElement<HTMLButtonElement>('arena');
const stateLabel = getElement<HTMLSpanElement>('state-label');
const resultLabel = getElement<HTMLSpanElement>('result-label');
const reactionLabel = getElement<HTMLSpanElement>('reaction-label');
const startButton = getElement<HTMLButtonElement>('start-button');
const nextButton = getElement<HTMLButtonElement>('next-button');
const resetButton = getElement<HTMLButtonElement>('reset-button');
const modeTabs = Array.from(document.querySelectorAll<HTMLButtonElement>('.mode-tab'));
const targetChip = getElement<HTMLSpanElement>('target-chip');
const decoyChips = getElement<HTMLDivElement>('decoy-chips');

const statElements = {
  bestTime: getElement<HTMLElement>('best-time'),
  averageTime: getElement<HTMLElement>('average-time'),
  successRate: getElement<HTMLElement>('success-rate'),
  successCount: getElement<HTMLElement>('success-count'),
  wrongCount: getElement<HTMLElement>('wrong-count'),
  falseStartCount: getElement<HTMLElement>('false-start-count'),
  missedCount: getElement<HTMLElement>('missed-count'),
  noPressCount: getElement<HTMLElement>('no-press-count'),
  historyList: getElement<HTMLOListElement>('history-list'),
};

game.subscribe(renderGame);
game.onResult((record) => {
  stats = addRecord(stats, record);
  renderStats(stats);
});

startButton.addEventListener('click', (event) => {
  event.stopPropagation();
  game.startRound();
});

nextButton.addEventListener('click', (event) => {
  event.stopPropagation();
  game.startRound();
});

resetButton.addEventListener('click', (event) => {
  event.stopPropagation();
  stats = resetStats();
  renderStats(stats);
});

arena.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  game.registerInput();
});

window.addEventListener('keydown', (event) => {
  if (event.key !== ' ' && event.key !== 'Enter') {
    return;
  }

  const target = event.target;
  if (target instanceof HTMLElement && target.closest('button, input, select, textarea') && target !== arena) {
    return;
  }

  event.preventDefault();
  game.registerInput();
});

modeTabs.forEach((tab) => {
  tab.addEventListener('click', (event) => {
    event.stopPropagation();
    const mode = tab.dataset.mode as Mode;
    game.setMode(mode);
    modeTabs.forEach((item) => item.classList.toggle('is-active', item === tab));
  });
});

renderStats(stats);

function renderGame(snapshot: GameSnapshot): void {
  const { state, shownColor, result, reactionTimeMs } = snapshot;

  document.documentElement.style.setProperty('--arena-color', shownColor.hex);
  document.documentElement.style.setProperty('--arena-fg', shownColor.foreground);
  document.documentElement.style.setProperty('--target-color', snapshot.targetColor.hex);
  document.body.dataset.state = state;
  document.body.dataset.result = result ?? '';

  renderColorChip(targetChip, snapshot.targetColor);
  renderDecoyChips(snapshot.decoyColors);

  stateLabel.textContent = stateText(snapshot);
  resultLabel.textContent = resultText(snapshot);
  reactionLabel.textContent = reactionTimeMs !== null ? `${reactionTimeMs}ms` : '';

  startButton.disabled = state === 'waiting' || state === 'target';
  nextButton.disabled = state !== 'result';
  arena.style.setProperty('--panel-shadow-color', shownColor.hex);
}

function renderStats(nextStats: StoredStats): void {
  const average = averageReactionTime(nextStats.reactionTimes);
  const correctCount = nextStats.successCount + nextStats.correctNoPressCount;
  const successRate = nextStats.totalRounds === 0 ? 0 : Math.round((correctCount / nextStats.totalRounds) * 100);

  statElements.bestTime.textContent = formatMs(nextStats.bestReactionTimeMs);
  statElements.averageTime.textContent = formatMs(average);
  statElements.successRate.textContent = `${successRate}%`;
  statElements.successCount.textContent = String(nextStats.successCount);
  statElements.wrongCount.textContent = String(nextStats.wrongPressCount);
  statElements.falseStartCount.textContent = String(nextStats.falseStartCount);
  statElements.missedCount.textContent = String(nextStats.missedCount);
  statElements.noPressCount.textContent = String(nextStats.correctNoPressCount);

  statElements.historyList.innerHTML = '';
  if (nextStats.recent.length === 0) {
    const item = document.createElement('li');
    item.className = 'history-empty';
    item.textContent = 'まだ記録がありません';
    statElements.historyList.append(item);
    return;
  }

  nextStats.recent.forEach((record) => {
    const item = document.createElement('li');
    item.className = `history-item result-${record.result}`;
    item.innerHTML = `
      <span class="history-dot" style="--dot-color: ${COLORS[record.shownColorId].hex}"></span>
      <span>${historyResultText(record)}</span>
      <strong>${record.reactionTimeMs === null ? '' : `${record.reactionTimeMs}ms`}</strong>
    `;
    statElements.historyList.append(item);
  });
}

function stateText(snapshot: GameSnapshot): string {
  if (snapshot.state === 'idle') {
    return MODE_CONFIGS[snapshot.mode].label;
  }

  if (snapshot.state === 'waiting') {
    return '構えろ';
  }

  if (snapshot.state === 'target') {
    return snapshot.shownColor.id === snapshot.targetColor.id ? '押せ' : '待て';
  }

  return resultHeading(snapshot.result);
}

function resultText(snapshot: GameSnapshot): string {
  if (snapshot.state === 'idle') {
    return '中央パネル・Space・Enterで入力';
  }

  if (snapshot.state === 'waiting') {
    return '色が変わるまで押さない';
  }

  if (snapshot.state === 'target') {
    return snapshot.shownColor.label;
  }

  return resultDescription(snapshot.result, snapshot.shownColor, snapshot.targetColor);
}

function resultHeading(result: ResultType | null): string {
  const headings: Record<ResultType, string> = {
    success: 'SUCCESS',
    falseStart: 'FALSE START',
    wrongPress: 'WRONG PRESS',
    missed: 'MISSED',
    correctNoPress: 'GOOD HOLD',
  };
  return result ? headings[result] : 'RESULT';
}

function resultDescription(
  result: ResultType | null,
  shownColor: TrainingColor,
  targetColor: TrainingColor,
): string {
  if (result === 'success') {
    return `${targetColor.label} を確認して入力`;
  }

  if (result === 'falseStart') {
    return '色が変わる前に入力';
  }

  if (result === 'wrongPress') {
    return `${shownColor.label} は押してはいけない色`;
  }

  if (result === 'missed') {
    return `${targetColor.label} を見逃し`;
  }

  if (result === 'correctNoPress') {
    return `${shownColor.label} を我慢できた`;
  }

  return '';
}

function historyResultText(record: RoundRecord): string {
  const shown = COLORS[record.shownColorId as ColorId].label;
  const labels: Record<ResultType, string> = {
    success: `成功 / ${shown}`,
    falseStart: 'フライング',
    wrongPress: `ミス / ${shown}`,
    missed: `見逃し / ${shown}`,
    correctNoPress: `我慢 / ${shown}`,
  };
  return labels[record.result];
}

function renderColorChip(element: HTMLElement, color: TrainingColor): void {
  element.style.setProperty('--chip-color', color.hex);
  element.textContent = color.label;
}

function renderDecoyChips(colors: TrainingColor[]): void {
  decoyChips.innerHTML = '';
  colors.forEach((color) => {
    const chip = document.createElement('span');
    chip.className = 'color-chip color-chip-compact';
    chip.style.setProperty('--chip-color', color.hex);
    chip.textContent = color.label;
    decoyChips.append(chip);
  });
}

function averageReactionTime(times: number[]): number | null {
  if (times.length === 0) {
    return null;
  }

  return Math.round(times.reduce((sum, time) => sum + time, 0) / times.length);
}

function formatMs(value: number | null): string {
  return value === null ? '--' : `${value}ms`;
}

function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing element: ${id}`);
  }

  return element as T;
}
