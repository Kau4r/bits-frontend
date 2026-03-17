# BITS Frontend

## Stack
- React 19 + TypeScript + Vite
- Tailwind CSS v4 (with @import syntax)
- UI primitives: shadcn/ui pattern (Radix UI + CVA) in `src/ui/`
- Icons: Lucide React (consolidated from 3 libraries)
- State: React Context (Auth, Notification, Heartbeat, Modal)
- Routing: React Router v7
- HTTP: Axios with auto-unwrapping interceptor

## Project Structure
```
src/
├── app/          # Entry points (App.tsx, main.tsx)
├── ui/           # shadcn/ui primitives (Button, Modal, Card, Badge, Search, etc.)
├── components/   # Global shared components
├── pages/        # Role-based: labtech/, labhead/, student/, faculty/, secretary/, sysad/, monitoring/, notifications/, tickets/, scheduling/
│   └── <role>/components/  # Role-specific components
├── services/     # Centralized API calls (auto-unwrapped envelope)
├── hooks/        # Custom hooks
├── context/      # React context providers
├── layout/       # Layout + Navbar
├── lib/          # Utilities (cn, constants, networkUtils)
├── types/        # TypeScript type definitions
└── styles/       # CSS files
```

## Conventions
- Path alias: `@/` maps to `src/`
- Use `@/` imports everywhere (not relative paths between directories)
- UI primitives in `src/ui/` — use these instead of inline styling for buttons, modals, cards, badges
- Status colors centralized in `src/lib/constants.ts`
- Primary color: indigo-600
- Desktop-first responsive design
- API responses auto-unwrapped by axios interceptor — `response.data` is the payload directly
- Service naming: `getX`, `createX`, `updateX`, `deleteX`

## Commands
```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm test         # Run Vitest tests
npm run lint     # ESLint
```

## Design Reference
- InventoryPage is the gold standard for spacing/layout
- Spacing: p-6, mb-6 between sections
- Cards: rounded-xl, border-gray-200, shadow-sm
- Buttons: rounded-lg, font-semibold
