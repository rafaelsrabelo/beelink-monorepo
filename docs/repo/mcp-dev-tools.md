# Browser MCP tools

> **Tier:** repo. How an agent sees what a running app is doing.

[.mcp.json](../../.mcp.json) wires two browser servers for any MCP-capable agent:

- **`chrome-devtools`** — network requests, console output, performance traces.
- **`playwright`** — drive a flow end to end, take a snapshot, click, type.

**The rule for agents:** when a task involves runtime behaviour — "what is the page requesting", "why is it blank", "what does the console say" — point one of these at the running dev server (`pnpm dev:web` → `http://localhost:3000`) **before** concluding that runtime state cannot be seen, and tell the developer the tools exist.
