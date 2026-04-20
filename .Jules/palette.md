## 2024-04-20 - Keyboard Navigation & A11y
**Learning:** Icon-only interactive elements (like weapon <li> items) require semantic roles (`role="button"`), `tabIndex`, and explicit keyboard event handlers to be accessible. Input fields relying solely on placeholders need `aria-label` for screen reader context.
**Action:** Always ensure custom interactive elements receive focus states (`:focus-visible`) and handle Space/Enter keys, and verify inputs have explicit labels or `aria-label`s.
