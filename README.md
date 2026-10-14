# billify-app

Expo app for Billify: offline-first billing for kirana shops (Android, iOS, and the public bill page on the web).
Backend lives in `billify-api`.

## Setup

The app has native code (Unistyles, Nitro), so it runs in a **development build**, not Expo Go.

```sh
pnpm install
cp .env.example .env   # EXPO_PUBLIC_API_URL / EXPO_PUBLIC_WEB_URL; use your LAN IP on a real phone
pnpm android           # first time: builds + installs "Billify Dev" (about 13 min), starts Metro
pnpm start             # after that: Metro for the installed build, press a
pnpm start --web       # the public bill page: http://localhost:8081/b/<token>
```

## Scripts

| Script            | Does                                                                 |
| ----------------- | -------------------------------------------------------------------- |
| `pnpm android`    | Build + install the development build, then start Metro              |
| `pnpm start`      | Metro for an installed development build (`--web` for the web build) |
| `pnpm lint`       | ESLint + Prettier check                                              |
| `pnpm typecheck`  | `tsc --noEmit`                                                       |
| `pnpm api:types`  | Regenerate `src/api/schema.d.ts` from the API's OpenAPI file         |
| `pnpm format`     | Prettier write                                                       |
| `pnpm run doctor` | `expo-doctor` (plain `pnpm doctor` is pnpm's own command)            |

Add packages with `pnpm expo install <pkg>` so versions match the Expo SDK.

## Structure

```text
src/
├─ app/        # Expo Router routes only (one-line re-exports): (auth)/, shop/, me/, b/[token]
├─ features/   # screens, stores and hooks per feature (billing, shop, public-bill, ...)
├─ api/        # generated API types, openapi-fetch client, TanStack Query client
├─ ui/         # UI kit: Text, Money, Button, Tile, Badge, ListGroup, TextField, ...
├─ theme/      # tokens.ts (DESIGN.md values) + unistyles.ts (light only)
├─ lib/        # money (paise), payments, units, upi, ids
└─ config/     # env values per build variant
```

More folders (`db/`, `sync/`, `i18n/`) are added when the first feature needs them.
The shop screens are native only; the web build serves the public bill page (and customer screens in M2).

## Build variants

`APP_VARIANT` (set per profile in `eas.json`) picks the app name and bundle id, so development, preview and production installs live side by side.
