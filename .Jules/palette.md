## 2024-04-18 - Added Accessibility to Game Components
**Learning:** Icon-only or generic interactive elements, like <li> representing buttons, often lack keyboard nav support, role attributes, and descriptive ARIA labels in simple React games, significantly hurting screen reader access.
**Action:** When creating custom interactive lists, immediately add `role="button"`, `tabIndex={0}`, `onKeyDown` handlers for Enter/Space, and clear `aria-label`s.
