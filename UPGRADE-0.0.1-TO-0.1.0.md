# Upgrade guide: 0.0.1 → 0.1.0

This upgrade is **backwards compatible** and does not introduce any schema
changes. It is primarily a documentation/packaging release.

## If you installed from the 0.0.1 snapshot zip

1. Stop your running TripCTRL containers / dev processes.
2. Make a backup copy of your existing TripCTRL folder (optional but recommended).
3. Download the `tripctrl-patch-0.1.0-from-0.0.1.zip` archive.
4. Extract it **on top of** your existing TripCTRL folder, allowing files to be
   overwritten when prompted.
5. Start TripCTRL again:
   - Dev: run the backend and frontend as before.
   - Docker: `docker-compose up -d`.

Because there are no database changes in 0.1.0, you do **not** need to rerun
Prisma migrations for this upgrade.

## Fresh install

For a fresh install, simply use the full 0.1.0 snapshot of the repo (or clone
the repository at the matching tag/commit) and follow the README instructions.
