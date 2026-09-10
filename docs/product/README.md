# Product

> **Tier:** product — true no matter which app is rewritten. See [the tier map](../README.md).

## Tasks

A **task** is one piece of work a person wants to track.

- It has a **title** and a **status**: `todo`, `doing` or `done`.
- A task moves forward one step at a time — `todo → doing → done`. It never jumps from `todo` straight to `done`.
- A `done` task may be reopened, and reopening always sends it back to `todo`.
- Every surface shows the same list in the same order: most recently updated first.

The API enforces these rules. The apps display them; they never re-decide them — a transition rule written twice will disagree with itself within a quarter.
