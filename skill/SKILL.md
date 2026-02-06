---
name: swimmeret
description: Collective LLM token purchasing for Clawdbot users experiencing throttling. Use when user mentions being throttled, rate-limited, or banned by an LLM provider (Claude, OpenAI, etc.), or wants to join a builder pool for better API terms.
---

# Swimmeret

Aggregate purchasing power for LLM tokens. Helps builders who get flagged by consumer risk systems join a collective pool for better terms.

## When to Use

- User reports being throttled/rate-limited/banned by Claude, OpenAI, etc.
- User wants better API terms through collective bargaining
- User asks about "swimmeret", "builder pool", or "stability plan"

## Flow

### 1. Intake — Collect incident details
```bash
swimmeret intake
```
Interactive prompts for: provider, incident type, paid seats, agents running, urgency, telemetry consent.

### 2. Plan — Generate stability plan with guardrails
```bash
swimmeret plan --intake-file <path>
```
Analyzes usage patterns, suggests "good citizen" guardrails to apply.

### 3. Pool — Join builder pool with pledge
```bash
swimmeret pool --plan-file <path>
```
Submit pledge to join collective demand pool.

## Quick Start

Full guided flow:
```bash
swimmeret wizard
```

Or step by step:
```bash
swimmeret intake              # Collect incident info
swimmeret plan                # Generate stability plan
swimmeret pool                # Join builder pool
```

## Commands

| Command | Description |
|---------|-------------|
| `swimmeret wizard` | Full guided flow (intake → plan → pool) |
| `swimmeret intake` | Report throttling incident |
| `swimmeret plan` | Generate stability plan with guardrails |
| `swimmeret pool` | Join builder pool with pledge |
| `swimmeret status` | Check current pool status |

## Output

All commands support `--json` for machine-readable output.

## Location

CLI: `{baseDir}/scripts/swimmeret`
