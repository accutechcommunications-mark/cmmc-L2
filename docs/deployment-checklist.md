# Deployment Checklist

## Repo prep

- [ ] Create a Git repository for the project.
- [ ] Copy all scaffold files into the repo root.
- [ ] Confirm the folder structure matches the setup guide.
- [ ] Commit the initial scaffold to the default branch.

## Cloudflare resources

- [ ] Create a D1 database named `cmmc-dashboard`.
- [ ] Copy the D1 `database_id` into `wrangler.toml`.
- [ ] Create an R2 bucket named `cmmc-artifacts`.
- [ ] Confirm the binding names in `wrangler.toml` are `DB` and `ARTIFACTS`.

## D1 setup

- [ ] Run the schema SQL against the D1 database.
- [ ] Run the seed SQL against the D1 database.
- [ ] Verify the `control_families` and `controls` tables contain seed data.

## Pages project

- [ ] Create a Cloudflare Pages project connected to the Git repo.
- [ ] Set the build output directory to `public`.
- [ ] Confirm Functions are enabled from the repo's `functions/` folder.
- [ ] Add the D1 binding to the Pages project environment.
- [ ] Add the R2 binding to the Pages project environment.

## Validation

- [ ] Open `/dashboard.html` and confirm families load from `/api/families`.
- [ ] Open `/family.html?family=AC` and confirm controls load from `/api/families/AC`.
- [ ] Test the upload form and confirm the placeholder route responds.
- [ ] Review browser console and Pages logs for binding or route errors.

## Next build steps

- [ ] Wire artifact upload to R2.
- [ ] Insert artifact metadata into D1.
- [ ] Add authentication and role enforcement.
- [ ] Add status editing, notes, and review-event routes.
