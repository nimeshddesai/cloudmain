# Improving service deployment reliability

## Interview overview

**Level:** Mid-level to senior

**Suggested duration:** 45–60 minutes

**Focus:** Test strategy, deployment safety, progressive delivery, and recovery

## Candidate prompt

> A company is experiencing reliability problems when deploying its services.
> Design an approach to improve deployment reliability.

Start with only this prompt and let the candidate clarify the problem.

### Scope note for the interviewer

The failures originate in code defects that escape into production. They may
appear during builds, deployment, service startup, or runtime. Keep the
discussion focused on preventing, detecting, and containing those defects
rather than on general API availability design.

## What a strong candidate should clarify

Look for questions about:

- the failure symptoms, frequency, affected deployment stage, and detection;
- the current test coverage and PR, CI, and CD validation;
- the environments, regions, rings, or other deployment partitions;
- how traffic is assigned and how failures are contained;
- telemetry, health gates, rollback, and incident response.

If the candidate does not ask about partitioning, prompt with:

> How could the deployment topology limit the blast radius of a bad release?

## Expected solution

A good answer creates several layers of protection and explains what each
layer catches.

### 1. Catch defects early

- Use unit tests for business logic and component tests for service behavior.
- Use contract and integration tests for APIs, schemas, dependencies, and data
  stores.

### 2. Add pipeline gates

- Run unit, component, and contract checks in the PR gate, with broader
  integration, compatibility, security, and artifact checks in CI.
- Build an immutable artifact once and promote it through every environment.
- Validate deployment configuration against a schema and test database
  migrations on production-like data, including backward compatibility and
  rollback behavior.
- Require explicit PR approval before merging high-risk code and a deployment
  approval before promoting it to production.

Ask the candidate which checks belong in the PR gate versus CI/CD and why.

### 3. Validate the deployment before cutover

Deploy the build to a staging slot or isolated target without sending it normal
user traffic. Before cutover:

- confirm the process starts and its critical dependencies are reachable;
- run smoke tests and synthetic end-to-end journeys against the new instance;
- compare errors, latency, saturation, and business signals with the known-good
  version; and
- send traffic to the new build only when the validation gate passes.

For the interviewer: a synthetic test calls a deployed service as a user would,
for example by completing a test checkout. A health probe checks a focused
signal such as process readiness, dependency connectivity, or a critical API
response.

The pipeline should call these checks against the new live instance, evaluate
the results for a defined period, and block cutover when thresholds are
breached. After cutover, it should continue monitoring and stop promotion or
roll back when the new version becomes unhealthy.

These checks should run in integration and during rollout so defects are caught
before they reach wider production traffic.

### 4. Partition user traffic and roll out builds progressively

First, look for the candidate to partition users or capacity so a bad build
cannot affect everyone at once. They should explain the partitioning dimension,
such as internal versus external users, tenant groups, regions, or a percentage
of capacity, and how users are assigned consistently.

They may then propose a rollout sequence:

1. Development
2. Integration
3. A lower ring or internal canary
4. Broader public-production rings
5. Sovereign clouds

Look for a small, representative first partition; promotion based on health
criteria; enough observation time; and support for feature flags, traffic
shifting, and fast recovery. Integration is a validation environment, not a
user-traffic partition or a substitute for a production-like canary.

## Partition and recovery probes

Select a few based on the candidate's answer:

- How would you select lower-ring users, capacity, and observation time?
- What if a defect affects only one region, tenant type, or dependency?
- How would you handle a database migration that cannot be rolled back?
- Which signals should automatically halt a rollout?
- When is roll-forward safer than rollback?
- How do you keep flaky tests from blocking every release?

### Sovereign clouds

Ask:

- What partitions might exist beyond public production?
- Where would sovereign clouds sit in the rollout sequence, and why?

A strong candidate may place sovereign clouds after public production because
they often have fewer regions, distinct dependencies, and less redundancy, so
a failure can have greater impact. They should also recognize the need for
representative pre-production validation or a dedicated canary when
sovereign-only behavior cannot be tested elsewhere.

## Evaluation rubric

Mark each signal as **missing**, **partial**, or **strong**:

| Signal | Strong evidence |
| --- | --- |
| Clarifies the problem | Identifies where defects surface and asks about the current release topology and controls |
| Builds layered prevention | Places unit, component, contract, integration, and E2E tests at appropriate stages |
| Designs safe promotion | Uses PR/CI gates, deployment validation, and staged rings with measurable health criteria |
| Limits and recovers from failure | Controls blast radius and explains when to halt, roll back, or roll forward |
| Explains trade-offs | Balances confidence, delivery speed, cost, and operational complexity |

Overall guidance:

- **Below expectations:** Most signals are missing or require heavy prompting.
- **Meets expectations:** Most signals are partial or strong; the proposal is
  workable and explains key trade-offs.
- **Exceeds expectations:** Most signals are strong; the candidate anticipates
  partition-specific failures and difficult recovery cases.

Record examples from the candidate's reasoning, not just the rating.

## Interviewer notes

- Reveal details incrementally; do not turn the interview into a checklist.
- Reward justified alternatives rather than exact terminology.
- Probe one or two areas deeply instead of requiring exhaustive coverage.
- Ask the candidate to summarize the final release flow and remaining risks.
