# Event-Driven Address Processing POC (Agent-Optimized)

This bundle contains a machine-readable delivery plan (YAML tickets + DAG), JSON Schemas,
executable acceptance checks, and concise docs for an AI agent to implement a working POC.

## Structure

- `/work/plan.yaml` — Task DAG for ticket sequencing and parallelization.
- `/work/items/*.yaml` — Individual tickets with deliverables, env, DoD, and checks.
- `/schemas/*.json` — Single source of truth for HTTP bodies and event envelopes.
- `/ops/checks/*.sh` — Executable acceptance checks used by tickets.
- `/docs/*.md` — Human-readable specs and examples (API, events, architecture, tests).
- `/AGENT_PLAYBOOK.md` — Step-by-step loop for autonomous execution.
- `/archive/*.md` — Historical design docs and notes preserved for reference.

### Getting Started (for the agent)

1) Read `/AGENT_PLAYBOOK.md` and `/work/plan.yaml`
2) Pick the next unblocked ticket from the DAG
3) Apply file changes listed in `deliverables.files`
4) Run `setup.commands` (if any)
5) Run all `acceptance.exec` checks until they pass
6) Commit with `ticket.id: ticket.title` and proceed
