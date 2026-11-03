---
name: deskpilot-build-scope
description: "DeskPilot’s frontend and standalone backend are separate deliverables; backend work uses durable SQLite storage and the approved secure owner/agent account model without frontend integration."
type: project
updated: 2026-11-03T07:34:31.563Z
---

Current goal: implement DeskPilot’s standalone backend in a dedicated `backend/` module only; the frontend is being developed separately and must not be edited or integrated in this task. Required SQLite entities: customers, support agents, tickets and comments; required API includes ticket CRUD/list with status/priority filters, customers/agents lists, and dashboard stats; include realistic seeded data, validation, error handling, tests and README API/schema docs. Preserve the earlier decision for secure personal agent accounts/sessions: first-run owner setup, owner provisions sample agents, agents share the queue, owner-only account/settings changes. The existing workspace appears to have no app files; inspect before writing. This is a new backend-only piece and still requires one plan approval before coding. Why it matters: avoid touching concurrent frontend work or dropping the previously chosen auth model. Apply by putting all backend source/config/docs under `backend/` (with only necessary root preview metadata) and wait for plan approval.
