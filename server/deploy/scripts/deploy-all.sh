#!/usr/bin/env bash
# =============================================================================
# deploy-all.sh — Apply Kubernetes manifests lên cluster
# Usage:
#   ./scripts/deploy-all.sh
# =============================================================================
set -euo pipefail

# ---- Config ----------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
K8S_DIR="$(cd "${SCRIPT_DIR}/../k8s" && pwd)"

echo "==> Deploying sdn-project manifests from: ${K8S_DIR}..."

# ---- Pre-flight checks -----------------------------------------------------
if ! command -v kubectl >/dev/null 2>&1; then
    echo "ERROR: kubectl command not found. Please install kubectl first."
    exit 1
fi

if ! kubectl cluster-info >/dev/null 2>&1; then
    echo "ERROR: Cannot connect to Kubernetes cluster. Ensure your cluster is running."
    exit 1
fi

# ---- Apply kustomization ---------------------------------------------------
echo ""
echo "==> [1/3] Applying K8s resources using Kustomize..."
kubectl apply -k "${K8S_DIR}"

# ---- Wait for pods to be ready ---------------------------------------------
echo ""
echo "==> [2/3] Waiting for pods to initialize (timeout 180s)..."

echo "Waiting for MongoDB StatefulSet..."
kubectl -n sdn wait --for=jsonpath='{.status.readyReplicas}'=1 statefulset/mongo --timeout=180s || {
    echo "WARN: MongoDB statefulset not fully ready yet. Checking logs..."
    kubectl -n sdn logs statefulset/mongo --tail=50
}

echo "Waiting for Backend deployment..."
kubectl -n sdn wait --for=condition=available deployment/sdn-backend --timeout=180s || {
    echo "WARN: Backend deployment not fully ready yet. Pod status:"
    kubectl -n sdn get pods -l app=sdn-backend
}

echo "Waiting for Frontend deployment..."
kubectl -n sdn wait --for=condition=available deployment/sdn-frontend --timeout=120s || {
    echo "WARN: Frontend deployment not fully ready yet. Pod status:"
    kubectl -n sdn get pods -l app=sdn-frontend
}

# ---- Final status ----------------------------------------------------------
echo ""
echo "==> [3/3] Current K8s resource status:"
kubectl -n sdn get all,pvc,ingress

echo ""
echo "==> Deployment complete!"
echo "Next step: Run DB seed with ./scripts/seed-mongo.sh"
echo "To test locally, run ./scripts/port-forward-ingress.sh and add '127.0.0.1 sdn.local' to your hosts file."