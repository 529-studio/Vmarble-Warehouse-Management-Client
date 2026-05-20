#!/usr/bin/env bash
# Generate FE TypeScript types from the BE swagger spec.
#
# Source of truth: ../Vmarble-Warehouse-Management-Service/docs/swagger.json
#                  (Swagger 2.0; converted to OpenAPI 3 in-memory before typegen)
#
# Outputs:
#   src/types/api-generated/index.ts   — TypeScript types
#   src/types/api-generated/.digest    — sha256 of the source swagger.json
#                                        (used by the swagger-drift PreToolUse hook)
#
# Modes:
#   gen:api          → regenerate types + digest
#   gen:api:check    → fail (exit 2) if digest is stale; touches no files

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SWAGGER_SRC="${SWAGGER_SRC:-$ROOT_DIR/../Vmarble-Warehouse-Management-Service/docs/swagger.json}"
OUT_DIR="$ROOT_DIR/src/types/api-generated"
OUT_TS="$OUT_DIR/index.ts"
OUT_DIGEST="$OUT_DIR/.digest"

if [[ ! -f "$SWAGGER_SRC" ]]; then
  echo "✗ swagger.json not found at: $SWAGGER_SRC" >&2
  echo "  Set SWAGGER_SRC env var to override the path." >&2
  exit 1
fi

current_digest="$(shasum -a 256 "$SWAGGER_SRC" | awk '{print $1}')"

if [[ "${1:-}" == "--check" ]]; then
  if [[ ! -f "$OUT_DIGEST" ]]; then
    echo "✗ Generated types missing. Run: npm run gen:api" >&2
    exit 2
  fi
  stored_digest="$(cat "$OUT_DIGEST")"
  if [[ "$current_digest" != "$stored_digest" ]]; then
    echo "✗ swagger.json has changed since types were generated." >&2
    echo "  current: $current_digest" >&2
    echo "  stored : $stored_digest" >&2
    echo "  Run: npm run gen:api" >&2
    exit 2
  fi
  echo "✓ FE types are in sync with backend swagger.json"
  exit 0
fi

mkdir -p "$OUT_DIR"

# Convert swagger 2.0 → OpenAPI 3 in a temp file, then run openapi-typescript.
TMP_OAS3="$(mktemp -t vmarble-oas3.XXXXXX.json)"
trap 'rm -f "$TMP_OAS3"' EXIT

npx --yes swagger2openapi --outfile "$TMP_OAS3" "$SWAGGER_SRC" >/dev/null

{
  echo "// AUTO-GENERATED. DO NOT EDIT."
  echo "// Source: $(basename "$(dirname "$(dirname "$SWAGGER_SRC")")")/$(basename "$(dirname "$SWAGGER_SRC")")/$(basename "$SWAGGER_SRC")"
  echo "// Run \`npm run gen:api\` to regenerate."
  echo ""
  npx --yes openapi-typescript "$TMP_OAS3"
} > "$OUT_TS"

echo "$current_digest" > "$OUT_DIGEST"

echo "✓ Wrote $OUT_TS"
echo "✓ Wrote $OUT_DIGEST ($current_digest)"
