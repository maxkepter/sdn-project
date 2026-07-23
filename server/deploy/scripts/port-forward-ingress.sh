#!/usr/bin/env bash
# =============================================================================
# port-forward-ingress.sh — Forward ports từ Ingress-NGINX controller ra host
# Dành cho các cluster chạy local không có external load balancer (như Minikube/K3s)
# Usage:
#   ./scripts/port-forward-ingress.sh
# =============================================================================
set -euo pipefail

PORT="${1:-8080}"
NAMESPACE="ingress-nginx" # Đổi thành "nginx-ingress" nếu dùng Nginx Inc. controller

echo "==> Searching for Ingress Nginx Controller pod in namespace: ${NAMESPACE}..."

# Tìm controller pod
INGRESS_POD=$(kubectl -n "${NAMESPACE}" get pods -l app.kubernetes.io/component=controller -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)

if [ -z "${INGRESS_POD}" ]; then
    # Fallback search nếu không tìm thấy labels chuẩn
    INGRESS_POD=$(kubectl get pods -A -l app=ingress-nginx -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)
    if [ -n "${INGRESS_POD}" ]; then
        NAMESPACE=$(kubectl get pods -A -l app=ingress-nginx -o jsonpath='{.items[0].metadata.namespace}' | head -n 1)
    fi
fi

if [ -z "${INGRESS_POD}" ]; then
    echo "ERROR: Could not find Ingress Nginx Controller pod in your cluster."
    echo "Please verify ingress-nginx is installed: kubectl get pods -A | grep ingress"
    exit 1
fi

echo "==> Port forwarding from pod: ${NAMESPACE}/${INGRESS_POD}"
echo "==> Port Forwarding: http://sdn.local:${PORT} -> local ports [80]"
echo "Press Ctrl+C to stop port forwarding."

# Thực hiện port forward port 80 của controller ra port 8080 (hoặc port truyền vào)
kubectl -n "${NAMESPACE}" port-forward "${INGRESS_POD}" "${PORT}":80