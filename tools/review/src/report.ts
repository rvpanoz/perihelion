import { approvedFingerprintMarker } from './approval.js';
import type { ToleranceFinding } from './groundTruth/toleranceGuard.js';
import type { MessageFinding, MessageReview } from './messages/messageCheck.js';
import {
  APPROVAL_LABEL,
  COMMENT_MARKER,
  type ReviewResult,
  hasGroundTruthFindings,
} from './review.js';

const TOLERANCE_TABLE_HEADER = [
  '| Where | Change | Jev’s kind | Confidence | Why it blocks |',
  '| --- | --- | --- | --- | --- |',
];

export function renderReport(result: ReviewResult): string {
  const sections = [groundTruthSections(result), messageSection(result.messages)].flat();
  const body = sections.length > 0 ? sections : ['Nothing to flag.'];
  const approvalRecord = result.approvedFingerprint
    ? [approvedFingerprintMarker(result.approvedFingerprint)]
    : [];
  return [
    COMMENT_MARKER,
    ...approvalRecord,
    '## Ground-truth and message review',
    '',
    ...body,
  ].join('\n');
}

function groundTruthSections(result: ReviewResult): string[] {
  if (!hasGroundTruthFindings(result)) return [];
  return [
    statusLine(result),
    '',
    ...fixtureSection(result.fixtureFiles),
    ...toleranceSection(result.tolerances),
  ];
}

function statusLine({ approved, approvalRevoked }: ReviewResult): string {
  if (approved) {
    return `**Approved** with \`${APPROVAL_LABEL}\`: the user reviewed the changes below.`;
  }
  if (approvalRevoked) {
    return `**Blocked**: the changes below changed since \`${APPROVAL_LABEL}\` was applied, so the label was removed. Review them and apply it again.`;
  }
  return `**Blocked** until the changes below are undone or the user applies \`${APPROVAL_LABEL}\`.`;
}

function fixtureSection(files: readonly string[]): string[] {
  if (files.length === 0) return [];
  return [
    '### Protected files (fixtures, recordings and the review check)',
    '',
    ...files.map((file) => `- \`${file}\``),
    '',
  ];
}

function toleranceSection(findings: readonly ToleranceFinding[]): string[] {
  if (findings.length === 0) return [];
  return ['### Test numbers', '', ...TOLERANCE_TABLE_HEADER, ...findings.map(toleranceRow), ''];
}

function toleranceRow({ change, judgement, reason, detail }: ToleranceFinding): string {
  const cells = [
    `\`${change.path}:${change.newLineNumber}\``,
    `\`${change.oldText}\` → \`${change.newText}\``,
    judgement?.kind ?? '—',
    judgement ? judgement.confidence.toFixed(2) : '—',
    `${reason}: ${detail}`,
  ];
  return `| ${cells.join(' | ')} |`;
}

function messageSection(messages: MessageReview): string[] {
  const skipped = messages.jevUnavailable ? ['Message check skipped: Jev unavailable.'] : [];
  if (messages.findings.length === 0 && skipped.length === 0) return [];
  return [
    '### Advice on commit and PR messages (never blocks)',
    '',
    ...messages.findings.map(messageLine),
    ...skipped,
  ];
}

function messageLine({ subject, problem, probability }: MessageFinding): string {
  const jev = probability === null ? '' : ` (Jev ${probability.toFixed(2)})`;
  return `- **${subject}**: ${problem}${jev}`;
}
