# billify-app

Expo app for Billify: offline-first billing for kirana shops (Android, iOS, and the public bill page on the web).
Backend lives in `billify-api`.

## Setup

```sh
pnpm install
cp .env.example .env   # EXPO_PUBLIC_API_URL: use your LAN IP on a real phone
pnpm start
```

## Scripts

| Script           | Does                    |
| ---------------- | ----------------------- |
| `pnpm start`     | Expo dev server         |
| `pnpm lint`      | ESLint + Prettier check |
| `pnpm typecheck` | `tsc --noEmit`          |
| `pnpm format`    | Prettier write          |
| `pnpm doctor`    | `expo-doctor`           |

Add packages with `pnpm expo install <pkg>` so versions match the Expo SDK.

## Structure

```text
src/
├─ app/        # Expo Router routes only; thin, render screens from features
├─ features/   # one folder per feature; import other features only via their index.ts
├─ config/     # env values per build variant
└─ theme/      # colour tokens (Unistyles theme later)
```

More folders (`db/`, `sync/`, `api/`, `ui/`, `lib/`, `i18n/`) are added when the first feature needs them.

## Build variants

`APP_VARIANT` (set per profile in `eas.json`) picks the app name and bundle id, so development, preview and production installs live side by side.
