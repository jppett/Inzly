# AGENT PLAYBOOK

This playbook defines the loop an autonomous coding agent should follow.

## Loop

1. **Load plan**: Parse `/work/plan.yaml` to determine the next unblocked ticket.
2. **Read ticket**: Load `/work/items/<ticket>.yaml`.
3. **Prepare env**:
   - Ensure required env vars from `setup.env.required` are set or inject defaults for local dev.
   - Execute `setup.commands` (non-fatal if missing, but fail ticket if any command returns non-zero).
4. **Implement**:
   - Create/modify `deliverables.files` exactly as listed.
   - Use `/schemas` as single source of truth for models and validation.
   - Adhere to event topic naming `<noun>.<operation>`.
5. **Self-verify**:
   - Run all `acceptance.exec` scripts in order. Stop on first failure and fix.
6. **Commit**:
   - Commit with message: `<id>: <title>`.
7. **Advance**:
   - Mark ticket as done and select the next unblocked one.

### Notes

- TypeScript runs natively (no transpilation). Prefer `tsx` runtime.
- Minimal error handling; focus on proof-of-concept behavior.
- Use async/await, environment variables, and Docker for local orchestration.
