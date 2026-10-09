# Protalone

A personal launchpad: a curated catalog of popular websites, and a private list of the sites you commonly visit.

Each email address is one account. Signing in with another email opens that account's portal. Saves are never published to the catalog.

## Run

Requires Node.js 22.14 or newer.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Create an account, then create a second account in another browser to see that the two portals stay separate.

The database is the SQLite file `data/protalone.sqlite`. It is created on first launch and is not committed. This file is the whole database, so keep a copy if you care about the data. One long-running Node process should own it. A host that wipes the disk between requests will not keep accounts.

```bash
npm test
npm run import-catalog
```

`npm run import-catalog` reloads `catalog/catalog.json` without deleting anyone's saves.

Set `PROTALONE_SECURE_COOKIES=0` only when you run `next start` over plain HTTP. Leave it unset behind HTTPS.

## Plan

- Architecture, in Traditional Chinese: [docs/ARCHITECTURE.zh-Hant.md](docs/ARCHITECTURE.zh-Hant.md)
- Product plan: [docs/PLAN.md](docs/PLAN.md)
- Working checklist: [Protalone — Product and Implementation Plan](https://app.notion.com/p/3f42ea02e00081b085e8f5b06aa1c6cf)
