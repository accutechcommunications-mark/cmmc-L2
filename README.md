# CMMC Dashboard Cloudflare Scaffold

This package is a repo-ready starter for a CMMC Level 2 dashboard using:

- Cloudflare Pages for the frontend
- Cloudflare Pages Functions for the API routes
- Cloudflare D1 for relational data
- Cloudflare R2 for artifact storage

## Included structure

- `public/` — static frontend assets
- `functions/api/` — API endpoints
- `db/` — D1 schema and seed SQL
- `docs/` — setup guides and deployment checklist
- `wrangler.toml` — D1 and R2 bindings
- `_routes.json` — route control for Pages Functions

## Files to review first

1. `docs/cloudflare-setup-guide.md`
2. `docs/deployment-checklist.md`
3. `wrangler.toml`
4. `db/cmmc-dashboard-schema.sql`
5. `db/cmmc-dashboard-seed.sql`

## Notes

- Replace `REPLACE_WITH_D1_DATABASE_ID` in `wrangler.toml` before deploying.
- The artifact upload route is still a placeholder response until you wire it to R2 and the artifact metadata tables.
- The frontend now pulls live family and family-detail data from the API routes backed by D1.
