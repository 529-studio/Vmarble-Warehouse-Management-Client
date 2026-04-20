# Frontend Instincts and Lessons Learned

This file serves as the Dynamic Memory for the AI Agent. It records patterns, pitfalls, and instincts discovered during development to prevent regression and repeat mistakes.

## Core Instincts

- [State Management] Never call setState in the render body. It causes infinite loops. Always use useEffect for derived state updates or compute values during render without state.
- [API Integration] Always verify if the backend returns a PagedResult (with .items) or a plain array. Forgetting to unwrap .items is a primary cause of runtime TypeErrors.
- [Mobile UX] For Kiosk mode, touch targets must be at least 48px. Vietnamese labels are mandatory for factory floor operations.
- [Type Safety] Match snake_case from Go exactly in TypeScript definitions. Use optional chaining and nullish coalescing for all API responses to handle Go pointers safely.

## Session Lessons

(New lessons will be appended here at the end of every task by the AI Agent)
