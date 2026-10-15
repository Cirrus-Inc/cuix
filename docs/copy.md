# cuix UI copy rules

The copy rules every cuix consumer follows.


**Boundary, stated first:** text that carries meaning stays. Field labels, error and validation messages, state announcements, live-region text, accessible names, and instructions a user needs to complete a task are never "extra text". Removing them breaks screen-reader and low-vision users. The rules below target redundant and decorative prose only.

| Element | Rule | Budget |
|---|---|---|
| Label | noun phrase naming the value; no trailing colon; no verb | ≤3 words |
| Placeholder | example or format, never the label, never instructions | ≤40 chars |
| Helper text | allowed only if it states a fact the label and layout do not: consequence, format, shortcut, scope, security posture, cross-screen effect. Not allowed: restating the label, restating the section heading, "Enter your…" | ≤90 chars, one per field |
| Error | what is wrong + what fixes it | ≤90 chars |
| Empty state | title (≤5 words) + one line (≤90) + at most one action. The line says what would fill it or how, not "nothing here yet" | |
| Section description | banned unless it states a non-obvious rule (e.g. "Rate changes apply to new entries only") | ≤120 chars |
| Reading level | plain language, one idea per sentence, no jargon a first-time operator wouldn't know (AAA 3.1.5 as guidance) | |
| Toast | one sentence; errors sticky; never the only place an outcome is recorded | ≤90 chars |
| Tooltip | name of an icon-only control, or one keyboard hint | ≤60 chars |

Where explanation goes instead: a help panel fed from a markdown source (e.g. a `USER_GUIDE.md` or `messages/help`), a disclosure ("Why?") that opens the help topic, a first-run pass, or a docs link. Never permanently under the control.

Enforcement: the `prose` ratchet (muted/caption/hint text >90 chars) ships in cuix's scripts and is installed in every consumer with a frozen baseline.

