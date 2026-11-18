# Angular SPA (Enterprise Auth)

Project guide: [docs/ANGULAR.md](../../docs/ANGULAR.md). Contract: [docs/FRONTEND_API_INTEGRATION.md](../../docs/FRONTEND_API_INTEGRATION.md).

```bash
npm install
npm start                 # http://localhost:4200 (API at http://localhost:8080)
npm run test:ci           # Phase 22 suite
```

Use one authenticated SPA at a time (not with React). Generated with [Angular CLI](https://github.com/angular/angular-cli) 21.x.

## Development server

```bash
ng serve
# or: npm start
```

Open `http://localhost:4200/`. The app reloads on source changes.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

Vitest via Angular CLI:

```bash
npm test              # watch mode
npm run test:ci       # CI / single run (Phase 22)
```

Security-critical coverage: CSRF memory, auth refresh single-flight, 401/403/503 handling, guards, login/MFA forms. See [docs/FRONTEND_TESTING.md](../../docs/FRONTEND_TESTING.md).

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
