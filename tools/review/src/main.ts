// Entry point for the Review workflow (.github/workflows/review.yml). The only code that reaches the network:
// Jev for judgements and GitHub for the comment. Never imported by apps/* or packages/* (CONTRIBUTING.md #1).
import { appendFileSync, readFileSync } from 'node:fs';
import { approvalFor, approvedFingerprintIn, fingerprintOf } from './approval.js';
import { parseDiff } from './diff/parseDiff.js';
import { readCommits, readDiff, readProtectedDiff } from './git/gitHistory.js';
import {
  type CommentTarget,
  findReviewComment,
  removeLabel,
  upsertComment,
} from './github/prComment.js';
import {
  type PullRequest,
  labelJustAppliedIn,
  pullRequestEventSchema,
} from './github/pullRequestEvent.js';
import { PROTECTED_ROOTS, protectedFiles } from './groundTruth/fixtureFiles.js';
import { numberChanges } from './groundTruth/numberChanges.js';
import { blockingTolerances } from './groundTruth/toleranceGuard.js';
import { reviewMessages } from './messages/messageCheck.js';
import { renderReport } from './report.js';
import { APPROVAL_LABEL, type ReviewResult, isBlocked } from './review.js';
import { type JevClient, createJevClient } from './typesafe/jevClient.js';

const JEV_TIMEOUT_MS = 20_000;

interface Environment {
  eventPath: string;
  repository: string;
  githubToken: string | undefined;
  summaryPath: string | undefined;
  jevApiKey: string | undefined;
}

interface ReviewContext {
  pr: PullRequest;
  jev: JevClient;
  labelJustApplied: boolean;
  previousComment: string | null;
}

async function main(): Promise<void> {
  const environment = readEnvironment();
  const event: unknown = JSON.parse(readFileSync(environment.eventPath, 'utf8'));
  const pr = pullRequestEventSchema.parse(event);
  const github = githubTarget(environment, pr);
  const jev = createJevClient({
    apiKey: environment.jevApiKey,
    fetchImpl: fetch,
    timeoutMs: JEV_TIMEOUT_MS,
  });
  const labelJustApplied = labelJustAppliedIn(event) === APPROVAL_LABEL;
  const previousComment = await previousReviewComment(github);
  const result = await review({ pr, jev, labelJustApplied, previousComment });
  const report = renderReport(result);
  console.log(report);
  writeSummary(environment, report);
  await publish(github, { report, revokeApproval: result.approvalRevoked });
  process.exitCode = isBlocked(result) ? 1 : 0;
}

async function review(context: ReviewContext): Promise<ReviewResult> {
  const { pr, jev } = context;
  const files = parseDiff(readDiff(pr));
  const changes = numberChanges(files);
  const [tolerances, messages] = await Promise.all([
    blockingTolerances(changes, jev),
    reviewMessages({ commits: readCommits(pr), prBody: pr.body }, jev),
  ]);
  const approval = approvalFor({
    labelApplied: pr.labels.includes(APPROVAL_LABEL),
    labelJustApplied: context.labelJustApplied,
    fingerprint: fingerprintOf({
      protectedDiff: readProtectedDiff(pr, PROTECTED_ROOTS),
      numberChanges: changes,
    }),
    previouslyApproved: approvedFingerprintIn(context.previousComment),
  });
  return { fixtureFiles: protectedFiles(files), tolerances, messages, ...approval };
}

function readEnvironment(): Environment {
  const { GITHUB_EVENT_PATH, GITHUB_REPOSITORY, GH_TOKEN, GITHUB_STEP_SUMMARY, TYPESAFE_API_KEY } =
    process.env;
  if (!GITHUB_EVENT_PATH || !GITHUB_REPOSITORY) {
    throw new Error(
      'GITHUB_EVENT_PATH and GITHUB_REPOSITORY must be set (run inside a pull_request workflow)',
    );
  }
  return {
    eventPath: GITHUB_EVENT_PATH,
    repository: GITHUB_REPOSITORY,
    githubToken: GH_TOKEN || undefined,
    summaryPath: GITHUB_STEP_SUMMARY || undefined,
    jevApiKey: TYPESAFE_API_KEY,
  };
}

function writeSummary(environment: Environment, report: string): void {
  if (environment.summaryPath) appendFileSync(environment.summaryPath, `${report}\n`);
}

function githubTarget(environment: Environment, pr: PullRequest): CommentTarget | null {
  if (!environment.githubToken) {
    console.warn('GH_TOKEN is not set; the PR comment and the approval label are left alone');
    return null;
  }
  return {
    fetchImpl: fetch,
    token: environment.githubToken,
    repository: environment.repository,
    issueNumber: pr.number,
  };
}

/** Unreadable means no recorded approval, so the label is not honoured: failing closed. */
async function previousReviewComment(target: CommentTarget | null): Promise<string | null> {
  if (!target) return null;
  try {
    return (await findReviewComment(target))?.body ?? null;
  } catch (error) {
    console.warn(`Could not read the previous review comment: ${messageOf(error)}`);
    return null;
  }
}

/** A failed comment must not hide the verdict: the job summary and the log still carry the report. */
async function publish(
  target: CommentTarget | null,
  { report, revokeApproval }: { report: string; revokeApproval: boolean },
): Promise<void> {
  if (!target) return;
  try {
    if (revokeApproval) await removeLabel(target, APPROVAL_LABEL);
    await upsertComment(target, report);
  } catch (error) {
    console.warn(`Could not update the PR: ${messageOf(error)}`);
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
