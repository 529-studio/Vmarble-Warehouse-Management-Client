#!/usr/bin/env bash
# deploy-fe.sh — Chạy trên staging server, được gọi bởi GitHub Actions qua SSH
#
# Usage: /opt/vwms-staging-fe/deploy-fe.sh <full-image-path>
# Ví dụ: /opt/vwms-staging-fe/deploy-fe.sh ghcr.io/giangdq202/vmarble-warehouse-client:sha-a1b2c3d
#
# Luồng:
#   1. Lưu image hiện tại để rollback nếu cần
#   2. Pull image mới
#   3. Restart frontend container
#   4. Health check tối đa 60s
#   5a. OK    → Cập nhật state, exit 0
#   5b. FAIL  → Rollback về image cũ, exit 1

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
DEPLOY_DIR="/home/deploy_vwms/projects/vwms-staging-fe"
COMPOSE_FILE="${DEPLOY_DIR}/docker-compose.fe.staging.yml"
ENV_FILE="${DEPLOY_DIR}/.env.fe.staging"
STATE_FILE="${DEPLOY_DIR}/.last_good_image"
HEALTH_URL="http://localhost:3000"
HEALTH_RETRIES=12                               # 12 lần × 5s = 60s timeout
HEALTH_INTERVAL=5

# ── Input ─────────────────────────────────────────────────────────────────────
NEW_IMAGE="${1:?[deploy-fe] Thiếu argument: full image path}"

log() { echo "[deploy-fe $(date -u +%H:%M:%S)] $*"; }

cd "$DEPLOY_DIR"

# ── 1. Lưu image hiện tại cho rollback ────────────────────────────────────────
PREV_IMAGE=$(cat "$STATE_FILE" 2>/dev/null || true)
log "Image cũ   : ${PREV_IMAGE:-<chưa có>}"
log "Image mới  : $NEW_IMAGE"

# ── 2. Pull image mới từ GHCR ─────────────────────────────────────────────────
log "Pulling $NEW_IMAGE ..."
docker pull "$NEW_IMAGE"

# ── 3. Restart frontend container ─────────────────────────────────────────────
log "Khởi động lại frontend container ..."
FE_IMAGE="$NEW_IMAGE" docker compose \
    -f "$COMPOSE_FILE" \
    --env-file "$ENV_FILE" \
    up -d frontend

# ── 4. Health check loop ───────────────────────────────────────────────────────
log "Chờ health check ($HEALTH_URL) ..."
IS_HEALTHY=false
for i in $(seq 1 $HEALTH_RETRIES); do
    sleep "$HEALTH_INTERVAL"
    if curl -sf --max-time 3 "$HEALTH_URL" > /dev/null 2>&1; then
        IS_HEALTHY=true
        break
    fi
    log "  Lần thử ${i}/${HEALTH_RETRIES} — chưa ready ..."
done

# ── 5a. SUCCESS ────────────────────────────────────────────────────────────────
if $IS_HEALTHY; then
    log "✅ Deploy FE thành công: $NEW_IMAGE"
    echo "$NEW_IMAGE" > "$STATE_FILE"
    
    # Tự động dọn dẹp Docker sau khi deploy thành công (dọn images cũ, v.v.)
    log "🧹 Đang dọn dẹp Docker rác ..."
    docker system prune -af > /dev/null 2>&1 || true
    
    exit 0
fi

# ── 5b. FAILURE → ROLLBACK ────────────────────────────────────────────────────
log "❌ Health check thất bại sau ${HEALTH_RETRIES} lần thử!"

if [ -z "$PREV_IMAGE" ]; then
    log "⚠️  Không có version cũ để rollback. Cần can thiệp thủ công!"
    exit 1
fi

log "🔄 Đang rollback về: $PREV_IMAGE ..."
FE_IMAGE="$PREV_IMAGE" docker compose \
    -f "$COMPOSE_FILE" \
    --env-file "$ENV_FILE" \
    up -d frontend

ROLLBACK_OK=false
for i in $(seq 1 6); do
    sleep 5
    if curl -sf --max-time 3 "$HEALTH_URL" > /dev/null 2>&1; then
        ROLLBACK_OK=true
        break
    fi
done

if $ROLLBACK_OK; then
    log "↩️  Rollback thành công — đang chạy: $PREV_IMAGE"
    echo "$PREV_IMAGE" > "$STATE_FILE"
else
    log "💥 NGHIÊM TRỌNG: Rollback cũng thất bại! Cần can thiệp thủ công ngay!"
fi

exit 1
