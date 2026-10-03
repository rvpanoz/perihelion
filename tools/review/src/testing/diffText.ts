// Builders for `git diff --unified=3 --find-renames` text, so tests read as the diffs they stand for.

export function modifiedFile(path: string, hunks: readonly string[]): string {
  return [
    `diff --git a/${path} b/${path}`,
    'index 1111111..2222222 100644',
    `--- a/${path}`,
    `+++ b/${path}`,
    ...hunks,
  ].join('\n');
}

export function newFile(path: string, lines: readonly string[]): string {
  return [
    `diff --git a/${path} b/${path}`,
    'new file mode 100644',
    'index 0000000..2222222',
    '--- /dev/null',
    `+++ b/${path}`,
    `@@ -0,0 +1,${lines.length} @@`,
    ...lines.map((line) => `+${line}`),
  ].join('\n');
}

export function deletedFile(path: string, lines: readonly string[]): string {
  return [
    `diff --git a/${path} b/${path}`,
    'deleted file mode 100644',
    'index 1111111..0000000',
    `--- a/${path}`,
    '+++ /dev/null',
    `@@ -1,${lines.length} +0,0 @@`,
    ...lines.map((line) => `-${line}`),
  ].join('\n');
}

export function renamedFile(from: string, to: string): string {
  return [
    `diff --git a/${from} b/${to}`,
    'similarity index 100%',
    `rename from ${from}`,
    `rename to ${to}`,
  ].join('\n');
}

export function binaryFile(path: string): string {
  return [
    `diff --git a/${path} b/${path}`,
    'index 1111111..2222222 100644',
    `Binary files a/${path} and b/${path} differ`,
  ].join('\n');
}

/** One changed line with three context lines either side, as git prints it. */
export function oneLineChange(path: string, change: { from: string; to: string }): string {
  return modifiedFile(path, [
    '@@ -11,7 +11,7 @@ describe(() => {',
    ' const a = 1;',
    ' const b = 2;',
    ' const c = 3;',
    `-${change.from}`,
    `+${change.to}`,
    ' const d = 4;',
    ' const e = 5;',
    ' const f = 6;',
  ]);
}
