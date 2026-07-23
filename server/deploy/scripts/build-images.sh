#!/usr/bin/env bash
# =============================================================================
# build-images.sh — Build Docker images cho backend & frontend
# Usage:
#   IMAGE_TAG=1.0.0 ./scripts/build-images.sh
#   REACT_APP_API_URL=/api/v1 ./scripts/build-images.sh
# =============================================================================
set -euo pipefail

# ---- Config ----------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

IMAGE_TAG="${IMAGE_TAG:-1.0.0}"
REGISTRY="${REGISTRY:-sdn}"
REACT_APP_API_URL="${REACT_APP_API_URL:-/api/v1}"

BACKEND_IMAGE="${REGISTRY}/sdn-backend:${IMAGE_TAG}"
FRONTEND_IMAGE="${REGISTRY}/sdn-frontend:${IMAGE_TAG}"

# ---- Detect cluster type ---------------------------------------------------
IS_MINIKUBE=false
if command -v minikube >/dev/null 2>&1 && minikube status >/dev/null 2>&1; then
    IS_MINIKUBE=true
fi

echo "==> Build context: ${ROOT_DIR}"
echo "==> Backend image:  ${BACKEND_IMAGE}"
echo "==> Frontend image: ${FRONTEND_IMAGE}"
echo "==> REACT_APP_API_URL = ${REACT_APP_API_URL}"

# ---- Build backend ---------------------------------------------------------
echo ""
echo "==> [1/2] Building backend image..."
docker build \
    -f "${ROOT_DIR}/server/deploy/docker/Dockerfile.backend" \
    -t "${BACKEND_IMAGE}" \
    "${ROOT_DIR}"

# ---- Build frontend --------------------------------------------------------
echo ""
echo "==> [2/2] Building frontend image..."
docker build \
    -f "${ROOT_DIR}/server/deploy/docker/Dockerfile.frontend" \
    --build-arg "REACT_APP_API_URL=${REACT_APP_API_URL}" \
    -t "${FRONTEND_IMAGE}" \
    "${ROOT_DIR}"

# ---- Load images vào Minikube (nếu dùng Minikube) ---------------------------
if [ "${IS_MINIKUBE}" = true ]; then
    echo ""
    echo "==> Minikube detected — loading images into Minikube's Docker daemon..."
    minikube image load "${BACKEND_IMAGE}"
    minikube image load "${FRONTEND_IMAGE}"
fi

echo ""
echo "==> Done. Images built:"
docker images | grep -E "(sdn-backend|sdn-frontend)" || true
echo ""
echo "Next step: ./scripts/deploy-all.sh"