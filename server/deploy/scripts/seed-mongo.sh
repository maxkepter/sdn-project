#!/usr/bin/env bash
# =============================================================================
# seed-mongo.sh — Run DB seed script in-cluster or via port-forward
# Usage:
#   ./scripts/seed-mongo.sh
# =============================================================================
set -euo pipefail

# ---- Config ----------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

echo "==> Preparing to seed MongoDB..."

# Check if server/src/seed.js exists
if [ ! -f "${ROOT_DIR}/server/src/seed.js" ]; then
    echo "ERROR: seed.js not found at ${ROOT_DIR}/server/src/seed.js"
    exit 1
fi

# ---- Method 1: Chạy trực tiếp qua pod backend (Recommended) -----------------
BACKEND_POD=$(kubectl -n sdn get pods -l app=sdn-backend -o jsonpath='{.items[0].metadata.name}' --field-selector=status.phase=Running 2>/dev/null || true)

if [ -n "${BACKEND_POD}" ]; then
    echo "==> Found running backend pod: ${BACKEND_POD}"
    echo "==> Running npm run seed inside backend container..."
    kubectl -n sdn exec -it "${BACKEND_POD}" -- npm run seed
    echo "==> Seeding completed successfully inside the cluster!"
    exit 0
fi

# ---- Method 2: Port-forward và seed từ local (Fallback nếu backend pod chưa ready)
echo "WARN: No running backend pod found. Falling back to local port-forward method..."
echo "==> Setting up port-forward to MongoDB StatefulSet (27017:27017)..."

# Bắt đầu port-forward trong background
kubectl -n sdn port-forward svc/mongo-headless 27017:27017 >/dev/null 2>&1 &
PF_PID=$!

# Đảm bảo tắt port-forward khi kết thúc script (thành công hay thất bại)
trap 'kill $PF_PID 2>/dev/null || true' EXIT

# Đợi port-forward sẵn sàng
sleep 2

echo "==> Executing seed script from local machine..."
if [ -d "${ROOT_DIR}/server/node_modules" ]; then
    # Chạy script seed cục bộ với DATABASE_URL trỏ vào local port-forward
    DATABASE_URL="mongodb://localhost:27017/sdn_db" JWT_SECRET="temp-secret" \
    node "${ROOT_DIR}/server/src/seed.js"
    echo "==> Seeding completed successfully via local port-forward!"
else
    echo "ERROR: Local server/node_modules not found. Cannot run seed script from host."
    echo "Please run 'npm install' inside '${ROOT_DIR}/server' folder, or wait for backend pods to be ready."
    exit 1
fi