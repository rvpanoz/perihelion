import { z } from 'zod';

// The parts of GitHub's pull_request webhook payload the review reads (docs.github.com, "Webhook events and
// payloads"). The labels are the PR's labels at event time, so a `labeled` event already includes the new one.
export const pullRequestEventSchema = z
  .object({
    pull_request: z.object({
      number: z.number().int(),
      body: z.string().nullable(),
      labels: z.array(z.object({ name: z.string() })),
      base: z.object({ sha: z.string() }),
      head: z.object({ sha: z.string() }),
    }),
  })
  .transform(({ pull_request: pr }) => ({
    number: pr.number,
    body: pr.body,
    labels: pr.labels.map((label) => label.name),
    baseSha: pr.base.sha,
    headSha: pr.head.sha,
  }));

export type PullRequest = z.output<typeof pullRequestEventSchema>;
