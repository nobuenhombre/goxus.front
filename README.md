# Goxus Frontend / Front

Frontend SPA for the Goxus SaaS platform — a Next.js App Router application with TypeScript, Tailwind CSS v4, and shadcn/ui (planned), consuming the Go backend over REST.

## Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **UI Components:** [shadcn/ui](https://ui.shadcn.com/) (planned)
- **Backend Communication:** REST API over HTTP

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18 — manage versions with [nvm](https://github.com/nvm-sh/nvm):
  ```sh
  nvm install --lts
  nvm use --lts
  ```
- [npm](https://www.npmjs.com/) (ships with Node.js)

## Getting Started

Clone the repository and install dependencies:

```sh
git clone git@github.com:nobuenhombre/goxus.front.git
cd goxus.front
npm install
```

Start the development server:

```sh
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The app hot-reloads on source changes.

## Available Scripts

| Command           | Description                        |
|-------------------|------------------------------------|
| `npm run dev`     | Start development server           |
| `npm run build`   | Production build                   |
| `npm run start`   | Start production server            |
| `npm run lint`    | Run ESLint across the codebase     |

## Project Structure

```
goxus.front/
├── public/             # Static assets (images, favicon, etc.)
├── src/
│   ├── app/            # Next.js App Router pages and layouts
│   ├── components/     # Shared React components (shadcn/ui primitives planned)
│   ├── lib/            # Utility functions, API client, helpers
│   └── styles/         # Global styles (Tailwind entry point)
├── next.config.ts      # Next.js configuration
├── tailwind.config.ts  # Tailwind CSS configuration
├── tsconfig.json       # TypeScript configuration
└── package.json        # Dependencies and scripts
```

## Backend Integration

This frontend communicates with [goxus.back](https://github.com/nobuenhombre/goxus.back) — the Go API server — over REST.

- **API base URL:** configured via `NEXT_PUBLIC_API_URL` environment variable (defaults to `http://localhost:8080` in development).
- **HTTP client:** `fetch`-based wrapper in `src/lib/api.ts` with typed request/response interfaces, error handling, and auth token injection.
- **CORS:** the backend must allow requests from the frontend origin (`http://localhost:3000` in development).

API endpoints are versioned under `/api/v1/`. See the [goxus.back README](https://github.com/nobuenhombre/goxus.back) for the full API reference.

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.