#!/usr/bin/env bash
# =============================================================================
# deploy-all.sh — Apply Kubernetes manifests lên cluster & auto-seed DB
# Usage:
#   ./scripts/deploy-all.sh              # Full deploy + auto-seed (mặc định)
#   ./scripts/deploy-all.sh --no-seed    # Skip seed Job (chỉ deploy cluster)
#   ./scripts/deploy-all.sh --reset-seed # Xoá Job cũ trước khi tạo Job mới (chạy lại seed)
# =============================================================================
set -euo pipefail

# ---- Parse flags -----------------------------------------------------------
RESEED=false
SKIP_SEED=false
while [[ $# -gt 0 ]]; do
    case "$1" in
        --no-seed)     SKIP_SEED=true; shift ;;
        --reset-seed)  RESEED=true;    shift ;;
        --help|-h)
            cat <<EOF
Usage: $0 [OPTIONS]

  (default)          Apply manifests + auto-trigger seed Job
  --no-seed          Apply manifests only (bỏ qua seed; nếu cần, gọi ./scripts/seed-mongo.sh)
  --reset-seed       Xoá Job seed cũ (nếu có) trước khi tạo Job mới — buộc seed chạy lại
  --help, -h         Hiện hướng dẫn này
EOF
            exit 0 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

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

# ---- [PHASE 1] Apply kustomization ----------------------------------------
echo ""
echo "==> [1/4] Applying K8s resources using Kustomize..."
kubectl apply -k "${K8S_DIR}"

# ---- [PHASE 2] Wait for core services -------------------------------------
echo ""
echo "==> [2/4] Waiting for core services to become Ready (timeout 180s)..."
echo " - MongoDB StatefulSet..."
kubectl -n sdn wait --for=jsonpath='{.status.readyReplicas}'=1 statefulset/mongo --timeout=180s || {
    echo "WARN: MongoDB statefulset not fully ready yet. Tail logs:"
    kubectl -n sdn logs statefulset/mongo --tail=20 || true
}

echo " - Backend Deployment..."
kubectl -n sdn wait --for=condition=available deployment/sdn-backend --timeout=180s || {
    echo "WARN: Backend deployment not fully ready yet. Pod status:"
    kubectl -n sdn get pods -n sdn -l app=sdn-backend
}

echo " - Frontend Deployment..."
kubectl -n sdn wait --for=condition=available deployment/sdn-frontend --timeout=120s || {
    echo "WARN: Frontend deployment not fully ready yet. Pod status:"
    kubectl -n sdn get pods -n sdn -l app=sdn-frontend
}

# ---- [PHASE 3] Trigger seed Job (optional) --------------------------------
if [ "$SKIP_SEED" = true ]; then
    echo ""
    echo "==> [3/4] Skipping seed (--no-seed flag set)."
else
    echo ""
    echo "==> [3/4] Triggering seed Job..."
    if [ "$RESEED" = true ]; then
        # Xoá Job cũ (nếu có) để chạy lại sạch sẽ
        if kubectl -n sdn get job sdn-seed >/dev/null 2>&1; then
            echo "    - Deleting previous seed Job (--reset-seed)..."
            kubectl -n sdn delete job sdn-seed --ignore-not-found
            sleep 3
        fi
    fi
    # Apply lại Job (nếu --reset-seed đã xoá Job ở PHASE 1, Kustomize apply ở trên sẽ tự tạo lại)
    # Nếu Job đã complete từ lần deploy trước, Kustomize apply sẽ không chạy lại vì pod cũ vẫn còn.
    # Do đó nếu chưa có Job nào đang chạy, ta create thẳng:
    if ! kubectl -n sdn get job sdn-seed >/dev/null 2>&1; then
        echo "    - Creating seed Job (no existing Job found)..."
        kubectl create -f "${K8S_DIR}/11-seed-job.yaml"
    else
        echo "    - Using existing seed Job (already created by Kustomize)..."
    fi

    echo "    - Waiting for seed Job to complete (timeout 300s — tải ảnh Unsplash)..."
    if kubectl -n sdn wait --for=condition=complete --timeout=300s job/sdn-seed 2>/dev/null; then
        echo "    ✅ Seed Job hoàn tất — database đã có dữ liệu mẫu!"
        # In tóm tắt kết quả
        SEED_POD=$(kubectl -n sdn get pods -l app.kubernetes.io/component=seed -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)
        if [ -n "$SEED_POD" ]; then
            echo ""
            echo "    >> Seed summary (last lines from $SEED_POD):"
            kubectl -n sdn logs "$SEED_POD" 2>/dev/null | grep -E '^(Seeded|✅|❌|Found|Recalculated)' | head -20 \
                | sed 's/^/       /'
        fi
    else
        echo "    WARN: Seed Job chưa hoàn tất (timeout hoặc fail). Kiểm tra logs:"
        kubectl -n sdn describe job sdn-seed | sed 's/^/       /'
        kubectl -n sdn logs -l app.kubernetes.io/component=seed --tail=30 2>/dev/null | sed 's/^/       /'
    fi
fi

# ---- [PHASE 4] Final status ----------------------------------------------
echo ""
echo "==> [4/4] Current K8s resource status:"
echo "----- Pods & Services -----"
kubectl -n sdn get pods,services -o wide | sed 's/^/  /'
echo "----- HPA -----"
kubectl -n sdn get hpa 2>&1 | sed 's/^/  /' || true
echo "----- Ingress -----"
kubectl -n sdn get ingress 2>&1 | sed 's/^/  /' || true
echo "----- PVC -----"
kubectl -n sdn get pvc 2>&1 | sed 's/^/  /' || true
echo "----- Jobs -----"
kubectl -n sdn get jobs 2>&1 | sed 's/^/  /' || true

echo ""
echo "==================================================================="
echo "✅ DEPLOY HOÀN TẤT"
echo "==================================================================="
if [ "$SKIP_SEED" = false ]; then
    echo "Database đã có dữ liệu mẫu (37 sản phẩm + 40 orders + reviews + disputes)."
fi
echo ""
echo "Bước tiếp theo:"
echo "  - Test local:    ./scripts/port-forward-ingress.sh    (mở một terminal khác)"
echo "                   rồi truy cập http://localhost:8080/"
echo "  - Seed lại:      ./scripts/deploy-all.sh --reset-seed"
echo "  - Gỡ cluster:    ./scripts/tear-down.sh"
echo "==================================================================="