# Cloudflare Setup Guide

This guide walks through the first deployment of the CMMC dashboard scaffold using Cloudflare Pages, Pages Functions, D1, and R2.

## 1. Create the local repo structure

Your repository root should look like this:

```text
cmmc-dashboard/
├── public/
│   ├── dashboard.html
│   ├── family.html
│   ├── styles.css
│   └── app.js
├── functions/
│   └── api/
│       ├── families/
│       │   ├── index.js
│       │   └── [code].js
│       ├── controls/
│       │   └── [id].js
│       └── artifacts/
│           └── upload.js
├── db/
│   ├── cmmc-dashboard-schema.sql
│   └── cmmc-dashboard-seed.sql
├── docs/
│   ├── cloudflare-setup-guide.md
│   └── deployment-checklist.md
├── _routes.json
├── wrangler.toml
└── README.md
```

## 2. Create the D1 database

In the Cloudflare dashboard:

1. Open **Workers & Pages**.
2. Open **D1**.
3. Create a database named `cmmc-dashboard`.
4. Copy the generated `database_id`.

Update `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "cmmc-dashboard"
database_id = "PASTE_REAL_DATABASE_ID_HERE"
```

## 3. Create the R2 bucket

In the Cloudflare dashboard:

1. Open **R2**.
2. Create a bucket named `cmmc-artifacts`.
3. Confirm the bucket name matches `wrangler.toml`.

The scaffold already expects:

```toml
[[r2_buckets]]
binding = "ARTIFACTS"
bucket_name = "cmmc-artifacts"
```

## 4. Load the D1 schema and seed data

You can load D1 from the Cloudflare dashboard SQL console or from Wrangler locally.

### Option A: Cloudflare dashboard

1. Open the `cmmc-dashboard` D1 database.
2. Open the SQL editor.
3. Run `db/cmmc-dashboard-schema.sql`.
4. Run `db/cmmc-dashboard-seed.sql`.
5. Verify that `control_families` and `controls` contain data.

### Option B: Wrangler CLI

Install Wrangler if needed:

```bash
npm install -g wrangler
```

Authenticate:

```bash
wrangler login
```

Run the schema:

```bash
wrangler d1 execute cmmc-dashboard --file=./db/cmmc-dashboard-schema.sql
```

Run the seed:

```bash
wrangler d1 execute cmmc-dashboard --file=./db/cmmc-dashboard-seed.sql
```

Check the family count:

```bash
wrangler d1 execute cmmc-dashboard --command="SELECT code, name FROM control_families ORDER BY code;"
```

## 5. Create the Cloudflare Pages project

In the Cloudflare dashboard:

1. Open **Workers & Pages**.
2. Choose **Create application**.
3. Choose **Pages**.
4. Connect your Git repository.
5. Select the branch to deploy.

Build settings:

- **Framework preset**: None
- **Build command**: leave blank if not building
- **Build output directory**: `public`

Cloudflare Pages will serve the files in `public/` as static assets. It will also detect the `functions/` directory and use it for Pages Functions routing.

## 6. Add bindings to the Pages project

For the Pages project, add the same bindings used in `wrangler.toml`.

### D1 binding

1. Open the Pages project.
2. Open **Settings**.
3. Open **Functions** or **Bindings**.
4. Add a D1 binding:
   - Variable name: `DB`
   - Database: `cmmc-dashboard`

### R2 binding

1. In the same project settings area, add an R2 binding:
   - Variable name: `ARTIFACTS`
   - Bucket: `cmmc-artifacts`

## 7. Understand the route mapping

The file-based routes work like this:

- `public/dashboard.html` → `/dashboard.html`
- `public/family.html` → `/family.html`
- `functions/api/families/index.js` → `/api/families`
- `functions/api/families/[code].js` → `/api/families/:code`
- `functions/api/controls/[id].js` → `/api/controls/:id`
- `functions/api/artifacts/upload.js` → `/api/artifacts/upload`

`_routes.json` tells Pages to run Functions for `/api/*` and to serve the frontend files directly.

## 8. Verify the live data wiring

After deployment:

1. Open `/dashboard.html`.
2. Confirm family cards load without demo data.
3. Open `/family.html?family=AC`.
4. Confirm Access Control data loads from D1.
5. Open browser developer tools and confirm:
   - `/api/families` returns JSON
   - `/api/families/AC` returns JSON

## 9. Known scaffold limitation

The upload route currently returns a successful placeholder JSON response but does not yet write files to R2 or metadata to D1. That is expected in this build.

## 10. Recommended next implementation step

After first deployment, the next backend work should be:

1. Persist uploaded artifacts to R2.
2. Create artifact and artifact_version rows in D1.
3. Add authentication and role-based access control.
4. Add edit routes for statuses, notes, and review events.
