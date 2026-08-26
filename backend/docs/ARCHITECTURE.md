# Architecture

- Stateless services communicate via Redpanda (Kafka-compatible).
- Persistence via Redis repositories (replaceable later).
- Shared package provides types and helpers.
- Event topics follow `<noun>.<operation>`; envelopes include {type, ts, data}.

See `EVENTS.md` for event payloads.
