# AM Simulations Frontend

React and TypeScript interface for the existing FastAPI backend.

## Run locally

Start the backend from the repository root:

```bash
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

Then start the frontend:

```bash
cd src
pnpm install
pnpm dev
```

Open `http://localhost:5173`.

The API defaults to `http://localhost:8000`. To use another backend URL:

```bash
VITE_API_BASE_URL=http://localhost:8000 pnpm dev
```

## Validation

```bash
pnpm typecheck
pnpm build
```
