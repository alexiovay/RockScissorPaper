## 2024-05-18 - Interactive Lists Need Keyboard Support
**Learning:** Custom interactive elements (like `<li>` tags used as buttons for weapons) aren't naturally focusable or operable via keyboard by default. While clicking works for mouse users, keyboard users and screen readers are completely blocked from playing. Making these elements inline-block also helps ensure focus rings render properly.
**Action:** When using non-semantic elements for actions, always add `role="button"`, `tabIndex={0}`, an `aria-label`, an `onKeyDown` handler for Enter/Space, and clear `:focus-visible` styles.
