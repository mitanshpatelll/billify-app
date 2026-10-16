#!/bin/zsh
# Runs the Maestro flows one after another against the installed development build and prints
# PASS / FAIL per flow. Needs the API (DEV_SIGN_IN=true) and Metro running.
#   DEVICE=<simulator udid> METRO_URL=http://localhost:8083 scripts/e2e-all.sh [flow ...]
# Flows that need a seeded shop get a fresh one from scripts/e2e-seed-customer.mjs.
# offline-bill / wait-synced need the API stopped and restarted by hand, so they're not here.
cd "${0:A:h}/.."
export PATH="$PATH:$HOME/.maestro/bin" MAESTRO_CLI_NO_ANALYTICS=1 MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED=true
OUT=${OUT:-${TMPDIR:-/tmp}/billify-e2e}
mkdir -p "$OUT"
device=()
[[ -n $DEVICE ]] && device=(--device "$DEVICE")
flows=("$@")
(( ${#flows} )) || flows=(first-bill khata more scan stock loose-discount customer shop-queries khata-page)
for f in $flows; do
  args=(-e "METRO_URL=${METRO_URL:-http://localhost:8081}")
  if [[ $f == customer || $f == shop-queries || $f == khata-page ]]; then
    for kv in ${=$(node scripts/e2e-seed-customer.mjs)}; do args+=(-e "$kv"); done
  fi
  if maestro "${device[@]}" test "${args[@]}" --test-output-dir "$OUT" "e2e/$f.yaml" > "$OUT/$f.log" 2>&1; then
    echo "PASS $f"
  else
    echo "FAIL $f ($(grep -E 'FAILED' "$OUT/$f.log" | tail -1)) · log: $OUT/$f.log"
  fi
done
