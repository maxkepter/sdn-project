#!/usr/bin/env bash
# =============================================================================
# tear-down.sh — Xoá toàn bộ resource của sdn-project khỏi cluster
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
K8S_DIR="$(cd "${SCRIPT_DIR}/../k8s" && pwd)"

echo "WARNING: This will delete all sdn-project resources in the 'sdn' namespace!"
echo "Including: deployments, services, configmaps, secrets, ingress, HPA, PVC, MongoDB data."
read -p "Are you sure? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

echo "==> Tearing down resources..."
kubectl delete -k "${K8S_DIR}" --ignore-not-found

echo ""
echo "==> Optionally removing the namespace 'sdn'..."
read -p "Delete namespace 'sdn'? This is irreversible if no backups! (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    kubectl delete namespace sdn --ignore-not-found
    echo "==> Namespace 'sdn' deleted."
fi

echo "==> Tear-down complete."