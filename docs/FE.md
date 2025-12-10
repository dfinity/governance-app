# Frontend Application

## Overview

The application utilizes [shadcn/ui](https://ui.shadcn.com/) as its primary UI library. Shadcn UI provides a set of re-usable components built using Radix UI and Tailwind CSS.

Unlike traditional component libraries, shadcn/ui components are not installed as a dependency. Instead, the code for each component is added directly to your project, allowing for full customization.

## Directory Structure

The application follows a modular architecture organized into four main levels:

```
│ src/
├── app/                 # Global app setup (providers, configs, env, main.tsx)
├── common/              # Reusable code (everything shared by 2+ features/XXX)
│   ├── components/      # All shared components (Shadcn primitives, custom reusable components)
│   ├── constants/       # All shared constants (CANISTER_ID_ICP_LEDGER, ...)
│   ├── hooks/           # All shared hooks (useMediaQuery, useDebounce, ...)
│   │   ├── icpLedger/   # IcpLedger hooks
│   │   ├── icpIndex/    # IcpIndex hooks
│   │   ├── governance/  # Governance hooks
│   │   └── ...
│   ├── types/           # All shared types (NeuronInfo, ...)
│   └── utils/           # Formatting, analytics...
├── features/            # THE MAIN CONTENT (Business Logic & UI)
│   ├── dashboard/       # Dashboard Feature
│   │   ├── components/  # Dashboard-specific components (e.g. StatsWidget)
│   │   ├── constants/   # Dashboard specific constants
│   │   ├── hooks/       # Dashboard specific hooks
│   │   ├── types/       # Dashboard specific types
│   │   └── utils/       # Dashboard specific utils
│   ├── staking/         # Staking Feature (Neurons)
│   │   ├── components/  # Staking specific components (e.g. NeuronCard, StakeModal)
│   │   └── ...
│   └── ...
├── routes/              # The "Wiring" (TanStack Router)
│   ├── dashboard/       # Dashboard routes
│   │   ├── index.tsx    # Imports from features/dashboard
│   ├── staking/         # Staking routes
│   │   ├── index.tsx    # Imports from features/staking
│   │   └── $id.tsx      # Detail view wiring
│   └── ...
```

### Main Levels

1.  **`app/`**: Contains global application setup, such as:
    *   Providers (`QueryClientProvider`, `ThemeProvider`).
    *   Global configurations (`env`, `i18n`).
    *   Entry point (`main.tsx`).

2.  **`common/`**: Contains code that is reused across multiple features.
    *   **Rule of Thumb**: If it's used by 2 or more features, it belongs here.
    *   `src/common/components`: Location for all Shadcn UI primitives and shared custom components.

3.  **`features/`**: The core of the application logic and UI.
    *   Contains business logic broken down by domain (e.g., `dashboard`, `staking`).
    *   Each feature folder is self-contained with its own components, hooks, and utils.

4.  **`routes/`**: Handles the routing logic using TanStack Router.
    *   This layer acts as the "wiring" that connects URLs to `features`.
    *   Ideally, route files should be thin wrappers that import and render components from `features/`.
5. **`dev/`**: Contains development utilities.

## Icons

Icons are provided by [Lucide](https://lucide.dev/), which is the default icon library for shadcn/ui.

## Adding a New Component

To add a new shadcn/ui component:

1. Navigate to the frontend directory:
   ```bash
   cd src/governance-app-frontend
   ```

2. Run the add command:
   ```bash
   npx shadcn@latest add [component-name]
   ```
   Example: `npx shadcn@latest add button`

3. The component will be installed in `src/common/components/[component-name].tsx`.

## Testing

### E2E

If your branch is failing E2E due to outdated snapshots, run the `scripts/update-snapshots.sh` script. It will download the updated files so you can review and commit them.
