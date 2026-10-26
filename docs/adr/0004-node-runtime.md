# ADR-0004: Run the backend on a supported Node LTS (22 now, 24 by April 2027)

## Status
Accepted (26 Oct 2026, fixes PR).

## Context
`backend/Dockerfile` built and ran on `node:20-alpine`, and the backend CI job used Node 20. Node 20 reached end of life on 30 April 2026, so the production image would receive no security fixes. The app, dashboard and website CI jobs already use Node 22. The full backend suite (jest and e2e) was run on Node 22.22 in this audit and passed.

## Decision
Use `node:22-alpine` for both Dockerfile stages and Node 22 for the backend CI job now. Move every app to Node 24 LTS together, before Node 22's end of life on 30 April 2027 (tracked as OPS-09).

## Alternatives considered
- **Node 24 now**: longer support (to April 2028), but would put the backend on a different runtime from the other three apps and CI, and `argon2` native builds would need re-checking at the same time as everything else.
- **Stay on 20**: no work, but no security fixes for the process that holds health data.

## Consequences
- Positive: supported runtime; one Node major across the repo.
- Negative: another upgrade within six months.

## References
- Node.js release schedule, https://github.com/nodejs/release#release-schedule
