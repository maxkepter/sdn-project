# Hướng dẫn triển khai sdn-project lên Kubernetes

> Triển khai hệ thống **sdn-project** (Express + React + MongoDB) lên cụm Kubernetes bất kỳ
> với **Nginx Ingress Controller** đóng vai trò Load Balancer L7.
> Toàn bộ tài nguyên đặt trong namespace `sdn`.

---

## 1. Kiến trúc tổng quan

```
                      ┌─────────────────────────────────────┐
                      │   Ingress-NGINX (Load Balancer L7)  │
                      │  - /api/*     -> sdn-backend:80     │
                      │  - /uploads/* -> sdn-backend:80     │
                      │  - /*         -> sdn-frontend:80    │
                      └──────────────┬──────────────────────┘
                                     │
            ┌────────────────────────┼─────────────────────────┐
            │                                                  │
   ┌────────▼────────┐                                ┌────────▼────────┐
   │ sdn-backend     │                                │ sdn-frontend    │
   │ (3-10 replicas) │                                │ (2-6 replicas)  │
   │ Express 5       │                                │ Nginx + React   │
   │ Port 5000       │                                │ static build    │
   └─┬───────────────┘                                └─────────────────┘
     │  /data/uploads (PVC RWX - shared storage)
     ▼
   ┌────────────────┐
   │ sdn-uploads-pvc│  ← RWX 5Gi (NFS/Longhorn)
   └────────────────┘
     │
     │  MongoDB connection
     ▼
   ┌────────────────────────────┐
   │ mongo (StatefulSet)        │
   │ mongo:7 image              │
   │ replSet=rs0                │
   └────────────────────────────┘
```

---

## 2. Yêu cầu trước khi cài đặt

- **Docker Desktop** (bật Kubernetes) hoặc **Minikube** hoặc cluster thật (EKS/GKE/AKS/...)
- **kubectl** đã cấu hình cluster context
- **ingress-nginx** đã cài đặt:
  ```bash
  # Minikube
  minikube addons enable ingress

  # Docker Desktop / cluster tổng quát
  kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.11.2/deploy/static/provider/cloud/deploy.yaml
  ```
- **metrics-server** (cần thiết cho HPA):
  ```bash
  # Minikube
  minikube addons enable metrics-server

  # Cluster khác — cài bằng Helm
  helm repo add metrics-server https://kubernetes-sigs.github.io/metrics-server/
  helm install metrics-server metrics-server/metrics-server -n kube-system
  ```
- **StorageClass hỗ trợ ReadWriteMany (RWX)** để chia sẻ uploads giữa các pod backend.
  Nếu cluster mặc định không có, cài **nfs-subdir-external-provisioner**:
  ```bash
  helm repo add nfs-subdir-external-provisioner https://kubernetes-sigs.github.io/nfs-subdir-external-provisioner/
  helm install nfs-provisioner nfs-subdir-external-provisioner/nfs-subdir-external-provisioner \
      --set nfs.server=<NFS_SERVER_IP> \
      --set nfs.path=/exported/path
  ```

---

## 3. Build Docker Images

```bash
# Mặc định tag = 1.0.0, registry = sdn
./scripts/build-images.sh

# Hoặc tuỳ biến
IMAGE_TAG=2.0.0 REGISTRY=ghcr.io/myorg REACT_APP_API_URL=/api/v1 ./scripts/build-images.sh
```

Script sẽ:
1. Build `sdn-backend:${IMAGE_TAG}` từ `server/deploy/docker/Dockerfile.backend`.
2. Build `sdn-frontend:${IMAGE_TAG}` từ `server/deploy/docker/Dockerfile.frontend`.
3. Nếu phát hiện Minikube đang chạy, tự động `minikube image load`.

---

## 4. Cấu hình Secrets

Trước khi apply, **BẮT BUỘC** cập nhật Secret `sdn-secrets` trong `k8s/01-secret.yaml`:

```bash
# Tạo giá trị base64
echo -n 'your-strong-jwt-secret-here' | base64
echo -n 'mongodb://mongo-0.mongo-headless.sdn.svc.cluster.local:27017/sdn_db' | base64
```

Hoặc đơn giản hơn: sửa trực tiếp phần `stringData` (Kubernetes sẽ tự encode lúc apply).

**Chuyển sang MongoDB Atlas**:
```yaml
stringData:
  DATABASE_URL: "mongodb+srv://user:password@cluster0.mongodb.net/sdn_db"
  JWT_SECRET: "your-strong-secret"
```

---

## 5. Deploy

```bash
# Apply toàn bộ manifests (namespace + secret + pvc + mongodb + backend + frontend + ingress + hpa)
./scripts/deploy-all.sh
```

Script sẽ tự động:
1. Áp dụng `kustomization.yaml`.
2. Đợi MongoDB StatefulSet sẵn sàng.
3. Đợi Backend/Frontend Deployments sẵn sàng.
4. In ra trạng thái cuối cùng.

Kiểm tra thủ công:
```bash
kubectl -n sdn get all,pvc,ingress
```

---

## 6. Truy cập Ingress (Local Dev)

Nếu cluster không có external LB (Minikube/K3s), dùng port-forward:

```bash
# Terminal 1
./scripts/port-forward-ingress.sh          # mặc định port 8080

# Thêm vào /etc/hosts (Windows: C:\Windows\System32\drivers\etc\hosts)
127.0.0.1 sdn.local
```

Sau đó truy cập:
- Frontend: http://sdn.local:8080/
- API: http://sdn.local:8080/api/v1/categories
- Health: http://sdn.local:8080/health
- Static uploads: http://sdn.local:8080/uploads/<file>

---

## 7. Seed dữ liệu mẫu

```bash
./scripts/seed-mongo.sh
```

Script sẽ:
1. **Ưu tiên**: chạy `npm run seed` bên trong backend pod (đã có `node_modules`).
2. **Fallback**: nếu không có backend pod running, port-forward MongoDB và chạy seed cục bộ.

---

## 8. Kiểm tra Autoscaling (HPA)

```bash
# Xem metrics CPU/Memory hiện tại (cần metrics-server chạy)
kubectl top pods -n sdn

# Xem trạng thái HPA
kubectl -n sdn get hpa

# Tạo tải giả lập trên backend
kubectl -n sdn exec -it deploy/sdn-backend -- \
  sh -c 'for i in $(seq 1 5000); do wget -q -O- http://localhost:5000/health > /dev/null & done'

# Watch HPA scale lên
kubectl -n sdn get hpa -w
```

---

## 9. Troubleshooting

### Backend pods ở trạng thái `Pending`
- Kiểm tra PVC `sdn-uploads-pvc`: `kubectl -n sdn get pvc`.
- Nếu PVC `Pending` vì không tìm thấy StorageClass, đổi `storageClassName` trong `02-pv-pvc-uploads.yaml` thành tên có sẵn trong cluster (vd `longhorn`, `standard`, `hostpath`).
- Nếu cluster không hỗ trợ RWX, **dự phòng**: scale backend xuống 1 replica và đổi accessMode sang `ReadWriteOnce` trong PVC.

### Backend pods `CrashLoopBackOff`
- Xem log: `kubectl -n sdn logs deploy/sdn-backend --tail=100`.
- Kiểm tra secret: `kubectl -n sdn get secret sdn-secrets -o yaml`.
- MongoDB chưa sẵn sàng: `kubectl -n sdn get pods -l app=mongo`.

### HPA hiển thị `<unknown>/70%`
- metrics-server chưa được cài hoặc chưa warm-up. Đợi ~1-2 phút.

### Ingress không route đúng
- `kubectl -n sdn describe ingress sdn-ingress`.
- Kiểm tra host header: request phải gửi `Host: sdn.local` (xem `/etc/hosts`).

---

## 10. Cấu trúc thư mục

```
server/deploy/
├── README.md                           ← File này
├── .env.example                        ← Mẫu biến môi trường tham khảo
├── docker/
│   ├── Dockerfile.backend              ← Image Express backend
│   ├── Dockerfile.frontend             ← Multi-stage Node build -> Nginx
│   ├── nginx.conf                      ← SPA routing + gzip + cache
│   ├── package.runtime.json            ← Backend package.json sạch (bỏ workspace link)
│   ├── package.frontend.runtime.json   ← Frontend package.json sạch
│   └── .dockerignore
├── k8s/
│   ├── kustomization.yaml              ← Gom nhóm manifests
│   ├── 00-namespace.yaml
│   ├── 01-secret.yaml
│   ├── 02-pv-pvc-uploads.yaml          ← RWX shared storage
│   ├── 03-pvc-mongo-data.yaml          ← Tham khảo, không apply mặc định
│   ├── 04-mongodb.yaml                 ← StatefulSet + headless Service
│   ├── 05-backend.yaml                 ← Deployment + Service + ConfigMap
│   ├── 06-frontend.yaml                ← Deployment + Service
│   ├── 07-ingress.yaml                 ← Nginx Ingress routing
│   ├── 08-hpa-backend.yaml
│   └── 09-hpa-frontend.yaml
└── scripts/
    ├── build-images.sh
    ├── deploy-all.sh
    ├── seed-mongo.sh
    ├── port-forward-ingress.sh
    └── tear-down.sh
```

---

## 11. Gỡ bỏ (Tear-down)

```bash
./scripts/tear-down.sh
```

Sẽ xoá toàn bộ resource trong namespace `sdn` (hỏi xác nhận).
**Lưu ý**: dữ liệu MongoDB trong PVC sẽ bị mất. Cần backup trước nếu cần.

---

## 12. Mở rộng cho Production

- **TLS**: thêm `spec.tls` vào Ingress với cert-manager (Let's Encrypt).
- **External DNS**: cài external-dns để tự động tạo DNS records.
- **MongoDB HA**: chuyển `04-mongodb.yaml` từ 1 replica lên 3 replicas (đã bật replSet `rs0`).
- **Monitoring**: cài Prometheus + Grafana + nginx-ingress exporter.
- **Logging**: cài EFK stack (Elasticsearch, Fluentd, Kibana) hoặc Loki.
- **CI/CD**: đẩy images lên registry thật (Docker Hub, GHCR, ECR...) rồi dùng ArgoCD/Flux.
- **Secrets**: chuyển sang External Secrets Operator + AWS Secrets Manager / Vault.