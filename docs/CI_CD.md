# CI/CD

The GitHub Actions workflow in `.github/workflows/ci-cd.yml` runs on pull
requests, pushes to `english-version` or `main`, and manual dispatches.

## CI

The Node job installs the workspace dependencies, audits dependencies,
typechecks the backend and frontend, builds both apps, and runs the local web
prototype tests.

The Python job installs the project requirements and runs the Python test suite
for the pronunciation pipeline and local server guardrails.

## CD

Deployments run only after CI passes on pushes to `english-version` or `main`.
The deploy job targets the separate Vercel backend and frontend projects and
skips deployment until these repository secrets are configured:

```text
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_BACKEND_PROJECT_ID
VERCEL_FRONTEND_PROJECT_ID
```

Production runtime variables such as `MONGODB_URI`, `KV_REST_API_URL`,
`KV_REST_API_TOKEN`, `FRONTEND_ORIGIN`, and optional model service variables
should be configured in the corresponding Vercel projects.
