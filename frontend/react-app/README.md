# React SPA (Enterprise Auth)

Project guide: [docs/REACT.md](../../docs/REACT.md). Contract: [docs/FRONTEND_API_INTEGRATION.md](../../docs/FRONTEND_API_INTEGRATION.md).

## Scripts

```bash
cp -n .env.example .env   # VITE_API_BASE_URL=http://localhost:8080
npm install
npm run dev               # http://localhost:5173
npm run build
npm test                  # vitest watch
npm run test:ci           # CI / single run (Phase 26)
npm run lint              # Oxlint
```

Security-critical coverage: CSRF memory, auth refresh single-flight, 401/403/503 handling, guards, login/MFA forms. See [docs/FRONTEND_TESTING.md](../../docs/FRONTEND_TESTING.md).

Use one authenticated SPA at a time (not with Angular).

---

Stack: Vite + React 19. Plugins: [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react) (Oxc).
