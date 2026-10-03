// Entry point for the Review workflow (.github/workflows/review.yml). The only code that reaches the network:
// Jev for judgements and GitHub for the comment. Never imported by apps/* or packages/* (CLAUDE.md #1).
import { appendFileSync, readFileSync } from 'node:fs';
import { parseDiff } from './diff/parseDiff.js';
import { readCommits, readDiff } from './git/gitHistory.js';
import { upsertComment } from './github/prComment.js';
import { type PullRequest, pullRequestEventSchema } from './github/pullRequestEvent.js';
import { protectedFiles } from './groundTruth/fixtureFiles.js';
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

async function main(): Promise<void> {
  const environment = readEnvironment();
  const pr = pullRequestEventSchema.parse(JSON.parse(readFileSync(environment.eventPath, 'utf8')));
  const jev = createJevClient({
    apiKey: environment.jevApiKey,
    fetchImpl: fetch,
    timeoutMs: JEV_TIMEOUT_MS,
  });
  const result = await review(pr, jev);
  const report = renderReport(result);
  console.log(report);
  writeSummary(environment, report);
  await postComment({ environment, pr }, report);
  process.exitCode = isBlocked(result) ? 1 : 0;
}

async function review(pr: PullRequest, jev: JevClient): Promise<ReviewResult> {
  const files = parseDiff(readDiff(pr));
  const [tolerances, messages] = await Promise.all([
    blockingTolerances(numberChanges(files), jev),
    reviewMessages({ commits: readCommits(pr), prBody: pr.body }, jev),
  ]);
  const approved = pr.labels.includes(APPROVAL_LABEL);
  return { fixtureFiles: protectedFiles(files), tolerances, messages, approved };
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

/** A failed comment must not hide the verdict: the job summary and the log still carry the report. */
async function postComment(
  { environment, pr }: { environment: Environment; pr: PullRequest },
  report: string,
): Promise<void> {
  if (!environment.githubToken) return console.warn('GH_TOKEN is not set; skipping the PR comment');
  const target = {
    fetchImpl: fetch,
    token: environment.githubToken,
    repository: environment.repository,
    issueNumber: pr.number,
  };
  try {
    await upsertComment(target, report);
  } catch (error) {
    console.warn(
      `Could not post the PR comment: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
