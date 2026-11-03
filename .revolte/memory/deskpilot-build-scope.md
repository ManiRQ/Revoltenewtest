---
name: deskpilot-build-scope
description: "DeskPilot plan approved: isolated UI/API, durable SQLite persistence, owner bootstrap and individual agent accounts; existing backend and knowledge-base modules remain untouched."
type: project
updated: 2026-11-03T07:32:59.731Z
---

Current goal: build DeskPilot, a responsive Freshdesk-inspired support workspace for agents and an owner. Approved scope includes dashboard, paginated ticket search/filter, create/detail/status/priority/replies, customer and agent directories, ticket reports, basic settings, durable persistence, 15 fictional tickets and five agent profiles. User approved a minimal persistence layer now and then explicitly chose secure individual sign-in: one-time owner setup, owner provisions seeded agent profiles with temporary passwords requiring change, and agents share one queue. Keep UI in a dedicated frontend module and the new API separate; do not modify existing backend or knowledge-base modules. Replies stay internal (no external email/channel delivery). The complete plan has been approved; implement only that scope. Why it matters: preserve the agreed auth/access, persistence and feature boundaries and don't ask for another approval gate.
