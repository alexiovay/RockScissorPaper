## 2024-05-15 - Accessible Emoji-only List Items
**Learning:** List-based, emoji-only interactive elements (like weapon choices) are completely invisible to screen readers without explicit ARIA labels and roles. Furthermore, they cannot be navigated via keyboard without a `tabIndex` and an explicit keyboard event handler for `Enter`/`Space`.
**Action:** When using `<li>` or similar non-interactive tags as buttons, always add `role="button"`, `tabIndex={0}`, an appropriate `aria-label`, and an `onKeyDown` handler to support `Enter` and `Space` key actions.
