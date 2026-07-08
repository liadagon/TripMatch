# TripMatch Cleanup Report

## Summary

The working frontend is inside `client/`.

The root-level React/Vite files were unnecessary duplicates because the root no longer had a `src/` or `public/` folder, while `client/` contains the complete Vite app source, assets, package files, and build output.

No files were deleted. The unnecessary root React/Vite files were moved into `_backup_root_react_duplicate/`.

## Duplicates Found

These root-level files and folders duplicated the frontend setup that already exists in `client/`:

- `package.json`
- `package-lock.json`
- `index.html`
- `vite.config.js`
- `tsconfig.json`
- `eslint.config.js`
- `.env`
- `.env.example`
- `node_modules/`
- `.vite/`

Notes:

- `package.json` matched the `client/package.json` file exactly by hash.
- Several root files had the same names, sizes, and timestamps as the matching `client/` files.
- Some root files were OneDrive cloud placeholders and could not be byte-read before moving, so they were treated conservatively and backed up instead of deleted.
- Root `src/` and root `public/` were not found.

## Moved To Backup

The following items were moved to:

`_backup_root_react_duplicate/`

- `_backup_root_react_duplicate/package.json`
- `_backup_root_react_duplicate/package-lock.json`
- `_backup_root_react_duplicate/index.html`
- `_backup_root_react_duplicate/vite.config.js`
- `_backup_root_react_duplicate/tsconfig.json`
- `_backup_root_react_duplicate/eslint.config.js`
- `_backup_root_react_duplicate/.env`
- `_backup_root_react_duplicate/.env.example`
- `_backup_root_react_duplicate/node_modules/`
- `_backup_root_react_duplicate/.vite/`

## Git Ignore Check

The root `.gitignore` already ignores:

- `node_modules/`
- `.env`
- `dist/`

It also includes client-specific ignore entries for `client/node_modules/`, `client/dist/`, and `client/.env`.

The backup folder `_backup_root_react_duplicate/` was added to `.gitignore` so the duplicate root files are not accidentally committed.

## Final Project Structure

```text
tripmatch/
  client/
    public/
    src/
    package.json
    package-lock.json
    index.html
    vite.config.js
    tsconfig.json
    eslint.config.js
    .env
    .env.example
    dist/
    node_modules/
  server/
    .gitkeep
  _backup_root_react_duplicate/
    .env
    .env.example
    .vite/
    node_modules/
    package.json
    package-lock.json
    index.html
    vite.config.js
    tsconfig.json
    eslint.config.js
  README.md
  .gitignore
  CLEANUP_REPORT.md
```

## How To Run The Frontend

From the project root:

```bash
cd client
npm run dev
```

If dependencies are missing on a fresh machine, run this first:

```bash
cd client
npm install
```

Verification completed:

```bash
npm --prefix client run build
```

The frontend build passed successfully.

## How To Run The Backend

The `server/` folder currently exists, but it only contains `.gitkeep`.

No `server/package.json`, `server/app.js`, or `server/server.js` file was found, so there is not currently a backend app to run from this checkout.

When the backend files are added under `server/`, the usual flow will be:

```bash
cd server
npm install
npm run dev
```

or:

```bash
cd server
npm start
```

depending on the scripts defined in `server/package.json`.
