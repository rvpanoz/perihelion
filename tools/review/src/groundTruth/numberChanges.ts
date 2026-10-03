import type { DiffLine, FileDiff } from '../diff/parseDiff.js';

export interface NumberChange {
  path: string;
  newLineNumber: number;
  oldLine: string;
  newLine: string;
  oldText: string;
  newText: string;
  oldValue: number;
  newValue: number;
  /** 1-based among the numbers on the line, so a line with two numbers can be asked about unambiguously. */
  numberPosition: number;
  nearbyLines: string[];
}

interface ChangeBlock {
  removed: DiffLine[];
  added: DiffLine[];
}

interface LinePair {
  removed: DiffLine;
  added: DiffLine;
}

interface Literal {
  text: string;
  value: number;
}

type ChangedLiteral = Omit<NumberChange, 'path' | 'nearbyLines'>;

// Test files, and shared test helpers: a default tolerance there (`digits = 6` in swarmTestSupport.ts) loosens every
// assertion that uses it.
const TEST_CODE = /(?:\.test\.tsx?|TestSupport\.tsx?|\/testing\/[^/]+\.tsx?)$/;
// A literal not glued to an identifier, member access or call result: `vec3`, `x.5` and `f()-1` are not numbers
// here, `(-1`, `1e-12`, `1_000` and `.5` are.
const NUMBER_LITERAL =
  /(?<![\w$.)\]])-?(?:\d[\d_]*(?:\.[\d_]*)?|\.\d[\d_]*)(?:[eE][+-]?\d+)?(?![\w$])/g;
const NEARBY_LINES = 3;

export function numberChanges(files: readonly FileDiff[]): NumberChange[] {
  return files.flatMap((file) =>
    file.newPath !== null && TEST_CODE.test(file.newPath) ? changesInFile(file, file.newPath) : [],
  );
}

function changesInFile(file: FileDiff, path: string): NumberChange[] {
  const pairs = changeBlocks(file.lines).flatMap(linePairs);
  return pairs.flatMap((pair) =>
    changedLiterals(pair).map((change) => ({
      ...change,
      path,
      nearbyLines: nearbyLines(file.lines, change.newLineNumber),
    })),
  );
}

/** Runs of removed/added lines between context lines: what a reader sees as "these lines became those". */
function changeBlocks(lines: readonly DiffLine[]): ChangeBlock[] {
  const blocks: ChangeBlock[] = [];
  let block: ChangeBlock | null = null;
  for (const line of lines) {
    if (line.kind === 'context') {
      block = null;
      continue;
    }
    if (!block) blocks.push((block = { removed: [], added: [] }));
    block[line.kind].push(line);
  }
  return blocks;
}

function linePairs(block: ChangeBlock): LinePair[] {
  return block.removed.flatMap((removed, index) => {
    const added = block.added[index];
    return added ? [{ removed, added }] : [];
  });
}

/** Only lines whose text is identical apart from their numbers: anything else is not a pure number edit. */
function changedLiterals(pair: LinePair): ChangedLiteral[] {
  if (skeletonOf(pair.removed.text) !== skeletonOf(pair.added.text)) return [];
  const oldLiterals = literalsOf(pair.removed.text);
  return literalsOf(pair.added.text).flatMap((newLiteral, index) => {
    const oldLiteral = oldLiterals[index];
    if (!oldLiteral || oldLiteral.value === newLiteral.value) return [];
    return [toChange(pair, { oldLiteral, newLiteral, numberPosition: index + 1 })];
  });
}

function toChange(
  { removed, added }: LinePair,
  literals: { oldLiteral: Literal; newLiteral: Literal; numberPosition: number },
): ChangedLiteral {
  return {
    newLineNumber: added.newLineNumber ?? 0,
    oldLine: removed.text.trim(),
    newLine: added.text.trim(),
    oldText: literals.oldLiteral.text,
    newText: literals.newLiteral.text,
    oldValue: literals.oldLiteral.value,
    newValue: literals.newLiteral.value,
    numberPosition: literals.numberPosition,
  };
}

function skeletonOf(line: string): string {
  return line.replace(NUMBER_LITERAL, '#').trim();
}

function literalsOf(line: string): Literal[] {
  return [...line.matchAll(NUMBER_LITERAL)].map((match) => ({
    text: match[0],
    value: Number(match[0].replaceAll('_', '')),
  }));
}

function nearbyLines(lines: readonly DiffLine[], lineNumber: number): string[] {
  return lines
    .filter(
      (line) =>
        line.newLineNumber !== null && Math.abs(line.newLineNumber - lineNumber) <= NEARBY_LINES,
    )
    .map((line) => line.text);
}
