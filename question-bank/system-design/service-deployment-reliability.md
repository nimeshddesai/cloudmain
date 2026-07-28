# Improving service deployment reliability

## Interview overview

**Level:** Mid-level to senior

**Suggested duration:** 45–60 minutes

**Focus:** Requirements discovery, test strategy, deployment safety,
progressive delivery, observability, and failure recovery

## Candidate prompt

> A company is experiencing reliability problems when deploying its services.
> Design an approach to improve deployment reliability.

Start with only this prompt. Let the candidate clarify the problem before
providing more detail.

## What a strong candidate should clarify

The candidate should avoid jumping directly to a solution. Look for questions
in the following areas.

### Meaning and impact of "reliability"

- What is failing: builds, deployments, service startup, dependencies, data
  migrations, or runtime behavior?
- How often do failures happen, and at which deployment stage?
- How are failures detected today?
- What is the user and business impact? Ask about availability, latency,
  correctness, data loss, and security.
- What service-level objectives and error budgets exist?
- Are failures global, regional, tenant-specific, or isolated to a version?

### Current architecture and release process

- Is the service a monolith or a set of independently deployed services?
- What environments, regions, availability zones, clusters, tenants, or
  deployment rings exist?
- Is traffic or capacity partitioned? How are users assigned to partitions?
- What do the build, pull-request, continuous-integration, and
  continuous-delivery pipelines currently validate?
- How frequently is the service deployed, and how large are releases?
- Are database or contract changes backward-compatible?
- What telemetry, alerting, rollback, and incident-response mechanisms exist?

If the candidate does not ask about partitioning, prompt with:

> How could the deployment topology limit the blast radius of a bad release?

## Expected solution areas

There is no single correct design. A good answer should build multiple layers
of protection and explain which failures each layer catches.

### 1. Establish a baseline

- Classify recent failures by cause and deployment stage.
- Define measurable service-level indicators and objectives.
- Track deployment health, change failure rate, rollback rate, time to detect,
  and time to recover.
- Prioritize the most common or highest-impact failure modes.

### 2. Catch defects while developing a feature

- Use unit tests for isolated business logic and edge cases.
- Use component tests for a service with controlled dependencies.
- Use contract tests to keep APIs, events, and schemas compatible.
- Use integration tests for real interactions among services, data stores, and
  infrastructure.
- Add static analysis, security checks, and reproducible builds.

The candidate should describe a balanced test pyramid and avoid relying only
on slow end-to-end tests.

### 3. Add pre-deployment pipeline gates

- Run fast, deterministic checks as pull-request gates.
- Run broader integration, compatibility, security, and artifact checks in the
  continuous-integration pipeline.
- Build an immutable artifact once and promote the same artifact through every
  environment.
- Require policy or human approval for high-risk changes.
- Validate infrastructure configuration and database migrations before
  rollout.

Probe whether the candidate can explain which checks belong in the
pull-request gate versus the CI/CD gate, and why.

### 4. Validate a deployment

- Run smoke tests and synthetic end-to-end user journeys after deployment.
- Compare health signals such as errors, latency, saturation, and business
  metrics against a known-good baseline.
- Use automated health gates with clear evaluation windows and thresholds.
- Make deployments observable by version, region, ring, and other partitions.
- Stop promotion and roll back or roll forward automatically when a gate fails.

End-to-end tests should run in integration and during progressive rollout so a
bad release is caught before it reaches wider production traffic.

### 5. Roll out progressively

A candidate may propose a sequence such as:

1. Development
2. Integration
3. Ring 0 or internal/canary users
4. Broader public-production rings
5. Sovereign clouds

The exact names matter less than the principles:

- Begin with a small, representative, low-impact partition.
- Increase exposure only after the previous partition meets health criteria.
- Pause between stages long enough to observe meaningful traffic.
- Limit concurrent changes so regressions can be attributed to a release.
- Support feature flags, traffic shifting, and fast rollback.

Clarify that an integration environment is one validation partition, not a
substitute for production-like canary validation.

## Deep-dive probes

Use these questions when the candidate has covered the basic design.

### Partition and ring design

- How would you select Ring 0 users or capacity?
- What happens if a bug affects only one region, tenant type, or dependency?
- How do you prevent a shared dependency from defeating partition isolation?
- How much traffic and observation time are enough before promotion?
- How would you handle a schema migration that cannot be rolled back?

### Sovereign clouds

- What partitions might exist beyond public production?
- Where would sovereign clouds sit in the rollout sequence, and why?
- How would you validate them when traffic and test data are limited?

A strong answer recognizes that sovereign clouds may follow broad public
production because they often operate in fewer regions, have distinct
dependencies or compliance constraints, and offer less redundancy. A failure
can therefore have proportionally higher impact. The candidate should also
challenge a rigid ordering: regulatory deadlines, architecture differences,
or the inability to reproduce sovereign-only behavior may require
representative pre-production validation or a dedicated canary within each
sovereign cloud.

### Operations and recovery

- Which signals should automatically halt a rollout?
- When is rollback unsafe, and when is roll-forward preferable?
- How do feature flags interact with deployment rollback?
- How do you prevent alert noise or flaky tests from blocking every release?
- How will incident findings improve future gates and tests?

## Evaluation rubric

Score each area from 1 to 4.

| Area | 1 — Limited | 2 — Developing | 3 — Strong | 4 — Exceptional |
| --- | --- | --- | --- | --- |
| Problem framing | Assumes the failure mode | Asks a few generic questions | Clarifies impact, failure modes, topology, and constraints | Uses SLOs, data, and risk to prioritize the design |
| Test strategy | Relies on manual or E2E testing | Lists test types without placement | Layers unit, component, contract, integration, and E2E tests appropriately | Explains ownership, determinism, coverage trade-offs, and feedback speed |
| Pipeline safety | Suggests a basic CI gate | Adds several checks but no promotion model | Uses immutable artifacts, targeted gates, and deployment validation | Designs risk-based policy and addresses migrations and compatibility |
| Progressive delivery | Deploys directly to production | Mentions canary or rollback | Defines staged rings, health gates, blast-radius control, and recovery | Handles multidimensional partitions, dependencies, and promotion evidence |
| Observability and recovery | Relies on manual monitoring | Names basic metrics or rollback | Connects versioned telemetry to automated halt and recovery decisions | Covers baselines, business signals, error budgets, learning, and safe roll-forward |
| Trade-offs | Presents one solution as universal | Acknowledges cost or speed | Balances confidence, speed, cost, and operational complexity | Adapts the design to risk and explicitly tests its assumptions |

### Overall guidance

- **6–11:** Does not yet demonstrate the required system-design depth.
- **12–17:** Meets expectations with some interviewer guidance.
- **18–21:** Strong, independent design with sound trade-offs.
- **22–24:** Exceptional depth; anticipates difficult operational edge cases.

Do not use the numeric score alone. Record evidence from the candidate's
reasoning and calibrate it against the role's level.

## Interviewer notes

- Reveal details incrementally; do not turn the interview into a checklist.
- Reward justified alternatives rather than exact terminology.
- Probe depth in one or two areas instead of requiring exhaustive coverage.
- Watch for solutions that add gates but omit detection, blast-radius control,
  or recovery.
- Ask the candidate to summarize the final release flow and identify its
  remaining risks.
