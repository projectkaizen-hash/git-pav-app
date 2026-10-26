# ADR-0006: Gate deploys on CI and run migrations as a pre-deploy step

## Status
Proposed. Needs the owner to change GitHub and Render settings (the repo can't change them itself).

## Context
Render deploys `main` as soon as a commit lands, whether or not CI passed. Migrations are run by hand from a laptop. On 26 Oct four commits reached `main` without a pull request or review, and changed plan items to "Done" without evidence. CI already runs typecheck, lint, tests, a dependency gate, a migration drift check and CodeQL.

## Decision
1. Protect `main`: pull requests only, required checks = all CI jobs, at least one review (the owner) for changes by tools.
2. Set Render's auto-deploy to **After CI Checks Pass**.
3. Run `npx prisma migrate deploy` as Render's pre-deploy command (paid instances), using the direct database URL, so the schema is migrated before the new code starts and a failed migration stops the deploy.
4. Keep migrations backwards-compatible with the previous release (expand, then contract), as `docs/completion/migrations.md` already requires, so a code rollback never needs a schema rollback.
5. Roll back by redeploying the previous successful deploy in Render.

## Alternatives considered
- **Migrate on container start** (in `CMD`): works on any plan, but a failing migration crash-loops the service and two instances could race.
- **GitHub Actions deploy job calling a Render deploy hook**: more control, but another secret to manage; Render's built-in CI gate does the same.

## Consequences
- Positive: no untested commit reaches patients; schema and code ship in order; rollback is one click.
- Negative: deploys wait for CI (~10 minutes); emergency fixes still need a PR.

## References
- Render deploys, https://render.com/docs/deploys
- Render pre-deploy command, https://render.com/changelog/predeploy-command
- GitHub protected branches, https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
