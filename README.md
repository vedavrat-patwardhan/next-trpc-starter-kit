# NextJs + tRPC starter kit

## Prerequisites

- Node.js 20+
- pnpm
- Git

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Database:** Postegresql
- **ORM:** Prisma
- **Authentication:** Next-Auth + 2FA
- **UI:** shadcn/ui
- **Forms:** React Hook Form + Zod
- **API:** tRPC
- **Deployment:** Vercel | AWS

## Folder Structure

The project follows a modular folder structure:

```
TrainerDB/
├── public/             # Static assets
├── src/
│   ├── components/     # Reusable UI components (PascalCase)
│   ├── hooks/          # Custom React hooks (camelCase)
│   ├── pages/          # Application routes (kebab-case)
│   ├── styles/         # Global and component-specific styles
│   ├── utils/          # Utility functions (camelCase)
│   ├── config/         # Configuration files (snake_case)
│   ├── prisma/         # Prisma schema and migrations
│   └── lib/            # Shared libraries and helpers
├── .env                # Environment variables (snake_case)
├── package.json        # Project metadata and dependencies
└── README.md           # Project documentation
```

## Naming Conventions

- **Components:** Use `PascalCase` (e.g., `UserCard.tsx`).
- **Utility Functions and Hooks:** Use `camelCase` (e.g., `fetchData.ts`, `useAuth.ts`).
- **Routes and Files:** Use `kebab-case` (e.g., `user-profile.tsx`, `api-handler.ts`).
- **Config Files:** Use `snake_case` (e.g., `database_config.ts`).
- **Environment Files:** Use `snake_case` (e.g., `.env.local`).

## Getting Started

1. Clone the repository:

   ```bash
   git clone https://github.com/vedavrat-patwardhan/next-trpc-starter-kit.git
   cd fms
   ```

2. Install Node.js 20.15.0 using nvm:

   ```bash
   nvm install 20.15.0
   nvm use
   ```

3. Install pnpm if you don't have it:

   - **macOS/Linux**:

     ```bash
     curl -fsSL https://get.pnpm.io/install.sh | sh -
     ```

   - **Windows**:

     ```powershell
     iwr https://get.pnpm.io/install.ps1 -useb | iex
     ```

4. Install dependencies:

   ```bash
   pnpm install
   ```

5. Setup husky:

   ```bash
   pnpm prepare-husky
   ```

6. Start the development server:

   ```bash
   pnpm dev
   ```

## Notes

1. Make sure to follow conventional commits: [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
2. Use Prettier for code formatting.
3. We are using ESLint for lint checks.
4. Do not disable/ignore the pre-commit hook while creating commits.
5. Ensure your code passes all linting and formatting checks before pushing changes.
