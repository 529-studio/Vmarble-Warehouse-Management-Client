#!/usr/bin/env bash
# Claude Code PreToolUse hook — block edits on FE API/DTO files when the
# backend swagger.json has changed since types were generated.
#
# Goal: enforce contract-first. Whenever the BE OpenAPI spec drifts, FE typegen
# MUST run before any api/dto file can be edited — drift is impossible at the
# tool-call layer, not relying on memory in skill prompts.
#
# Reads a JSON event from stdin with shape:
#   { "tool_name": "Edit"|"Write"|"MultiEdit",
#     "tool_input": { "file_path": "...", ... }, ... }
#
# Exit codes:
#   0 → allow (file is not api/dto, or digest is fresh).
#   2 → block; stderr is shown to Claude as feedback.
#
# Files guarded (basename match):
#   *api*.ts   *dto*.ts
# Excluded (we WANT to overwrite these when generating):
#   src/types/api-generated/**

set -euo pipefail

input="$(cat)"

tool_name="$(printf '%s' "$input" | python3 -c '
import json, sys
try:
    print(json.load(sys.stdin).get("tool_name", ""))
except Exception:
    pass
')"

case "$tool_name" in
  Edit|Write|MultiEdit) ;;
  *) exit 0 ;;
esac

file_path="$(printf '%s' "$input" | python3 -c '
import json, sys
try:
    d = json.load(sys.stdin)
    print((d.get("tool_input") or {}).get("file_path", ""))
except Exception:
    pass
')"

if [[ -z "$file_path" ]]; then
  exit 0
fi

# Skip the generated artifact dir itself.
case "$file_path" in
  *"/src/types/api-generated/"*) exit 0 ;;
esac

# Match basename: *api*.ts or *dto*.ts (case-insensitive). Excludes .test.ts.
basename_lc="$(basename "$file_path" | tr '[:upper:]' '[:lower:]')"
case "$basename_lc" in
  *.test.ts|*.test.tsx|*.spec.ts|*.spec.tsx) exit 0 ;;
esac

path_lc="$(printf '%s' "$file_path" | tr '[:upper:]' '[:lower:]')"

is_guarded=0
# Path-level: anything under src/lib/api/ or src/types/api* is part of the contract surface.
case "$path_lc" in
  */src/lib/api/*.ts|*/src/lib/api/*.tsx) is_guarded=1 ;;
  */src/types/api.ts|*/src/types/api.tsx|*/src/types/api/*.ts|*/src/types/api/*.tsx) is_guarded=1 ;;
esac
# Basename-level: *api*.ts / *dto*.ts anywhere (TanStack Query hooks like use-pos.ts won't match; a
# file named e.g. work-order-dto.ts will).
case "$basename_lc" in
  *api*.ts|*api*.tsx|*dto*.ts|*dto*.tsx) is_guarded=1 ;;
esac

if (( is_guarded == 0 )); then
  exit 0
fi

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
SWAGGER_SRC="${SWAGGER_SRC:-$PROJECT_DIR/../Vmarble-Warehouse-Management-Service/docs/swagger.json}"
DIGEST_FILE="$PROJECT_DIR/src/types/api-generated/.digest"

if [[ ! -f "$SWAGGER_SRC" ]]; then
  cat >&2 <<EOF
✗ Backend swagger.json not found at:
    $SWAGGER_SRC

  This FE repo expects the backend repo as a sibling:
    Vmarble-project/
      Vmarble-Warehouse-Management-Client/   ← you are here
      Vmarble-Warehouse-Management-Service/

  Either clone the backend repo as a sibling, or set SWAGGER_SRC env var.
EOF
  exit 2
fi

if [[ ! -f "$DIGEST_FILE" ]]; then
  cat >&2 <<EOF
✗ FE generated types are missing — cannot verify contract.

  Edit blocked on: $file_path

  Run first:
    npm run gen:api
EOF
  exit 2
fi

current_digest="$(shasum -a 256 "$SWAGGER_SRC" | awk '{print $1}')"
stored_digest="$(cat "$DIGEST_FILE")"

if [[ "$current_digest" != "$stored_digest" ]]; then
  cat >&2 <<EOF
✗ Backend swagger.json has CHANGED since FE types were generated.

  Edit blocked on: $file_path

  current  swagger digest: $current_digest
  stored   types  digest: $stored_digest

  Contract-first rule: regenerate FE types BEFORE editing any *api*.ts / *dto*.ts.

  Run:
    npm run gen:api

  Then commit src/types/api-generated/ alongside the api/dto change so the FE
  type artifact and the BE spec move forward together.
EOF
  exit 2
fi

exit 0
