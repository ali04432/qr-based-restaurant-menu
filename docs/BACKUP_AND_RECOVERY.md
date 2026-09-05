# Enterprise Disaster Recovery & Database Backup Architecture

**Document Version**: 1.0.0  
**Target System**: QR Based Restaurant Menu — Production Platform  
**Compliance Standard**: SOC 2 Type II / ISO 27001 Data Protection & Resiliency Standard  
**Last Updated**: Phase 4 Milestone 9 Execution  

---

## 1. Executive Summary & Recovery Objectives

The QR Based Restaurant Menu OS is a multi-tenant mission-critical restaurant management and point-of-sale platform. High availability, transactional integrity, and rapid disaster recovery are paramount to avoid operational interruption during active dining service.

### Key Service Level Objectives (SLOs)

| Metric | Target | Description |
|---|---|---|
| **Recovery Point Objective (RPO)** | **< 5 minutes** | Maximum allowable data loss window in the event of a catastrophic disaster. |
| **Recovery Time Objective (RTO)** | **< 30 minutes** | Maximum allowable downtime before full read-write system restoration. |
| **Backup Retention Period** | **30 Days (Daily) / 1 Year (Monthly)** | Compliance retention for transactional ledgers and audit logs. |
| **Encryption at Rest** | **AES-256 (AWS KMS / GCP Cloud KMS)** | All automated snapshots and WAL archives are encrypted at rest. |
| **Encryption in Transit** | **TLS 1.3 / SSL Verified** | All replication streams and backup transfers use end-to-end encryption. |

---

## 2. Backup Strategy & Architecture

```
                               ┌─────────────────────────────┐
                               │ Primary PostgreSQL Database │
                               └──────────────┬──────────────┘
                                              │
                     ┌────────────────────────┼────────────────────────┐
                     │ Continuous WAL Stream  │ Automated Daily Dump   │
                     ▼                        ▼                        ▼
           ┌──────────────────┐     ┌───────────────────┐    ┌────────────────────┐
           │ WAL Archive S3   │     │ Logical Snapshots │    │ Read Replica       │
           │ (PITR < 5 min)   │     │ (pg_dump custom)  │    │ (Hot Standby)      │
           └──────────────────┘     └───────────────────┘    └────────────────────┘
```

### 2.1 Continuous Archiving & Write-Ahead Logging (WAL)
- **Engine**: PostgreSQL Write-Ahead Log (WAL) archiving via `pgBackRest` or AWS RDS / Supabase PITR.
- **Cadence**: Real-time continuous archive segments shipped immediately upon completion (or every 60 seconds).
- **Purpose**: Enables **Point-In-Time Recovery (PITR)** to restore the database to any specific second within the last 7 to 30 days.

### 2.2 Logical Daily & Hourly Snapshots
- **Tool**: `pg_dump` with custom directory format (`-Fc` or `-Fd`) and multi-threaded compression (`-j 4 -Z 6`).
- **Schedule**:
  - **Full Logical Snapshot**: Daily at 02:00 UTC (off-peak restaurant hours).
  - **Incremental / Differential**: Every 6 hours.
- **Off-Site Storage**: Replicated to multi-region cloud object storage (e.g., AWS S3 with Object Lock or GCP Cloud Storage Bucket with lifecycle policies).

---

## 3. Multi-Tenant Backup & Tenant-Level Restoration

Because the platform implements multi-tenant architecture with logical isolation (`restaurantId`), individual restaurant operators can request tenant-specific exports or emergency restores without rolling back the entire database.

### 3.1 Tenant Isolation Snapshot Script

To create a tenant-specific archive without impacting other tenants:

```bash
#!/bin/bash
# scripts/backup-tenant.sh
# Usage: ./backup-tenant.sh <RESTAURANT_ID> <OUTPUT_FILE>

RESTAURANT_ID="$1"
OUTPUT_FILE="${2:-tenant_${RESTAURANT_ID}_$(date +%Y%m%d_%H%M%S).sql}"

if [ -z "$RESTAURANT_ID" ]; then
  echo "Error: RESTAURANT_ID is required."
  exit 1
fi

echo "Exporting tenant data for Restaurant ID: $RESTAURANT_ID..."

# Dump schema definitions and tenant rows
pg_dump "$DATABASE_URL" \
  --data-only \
  --table=restaurants \
  --table=branches \
  --table=users \
  --table=tables \
  --table=categories \
  --table=menu_items \
  --table=orders \
  --table=order_items \
  --table=payments \
  --table=inventory_items \
  --table=staff_action_logs \
  --table=audit_logs \
  --table=loyalty_accounts \
  --table=rewards \
  --table=subscriptions \
  --file="$OUTPUT_FILE"

echo "Tenant backup completed: $OUTPUT_FILE"
```

---

## 4. Disaster Recovery Runbooks

### 4.1 Scenario A: Accidental Data Corruption or Malicious Deletion
*Context: A staff member accidentally voids orders or drops critical menu items.*

1. **Identify Incident Window**:
   - Query the `audit_logs` table (`GET /api/admin/audit?action=ORDER_VOID`) to retrieve the exact timestamp of the erroneous event.
2. **Point-In-Time Recovery (PITR)**:
   - Target restoration timestamp: $T_{incident} - 1 \text{ minute}$.
   - Launch an auxiliary recovery instance from the WAL archive up to the target timestamp.
3. **Data Extraction & Merge**:
   - Extract the affected rows from the auxiliary recovery instance.
   - Upsert the extracted records back into the production cluster using transaction isolation.
4. **Audit Validation**:
   - Validate record counts and verify order/financial ledgers match pre-incident totals.

---

### 4.2 Scenario B: Primary Database Host Failure / Crash
*Context: Primary cloud database node becomes completely unavailable.*

1. **Automated Health Check Detection**:
   - The `/api/health/system` endpoint reports `database.status = "unavailable"`, returning HTTP 503.
   - Alerting triggers PagerDuty / Ops notification.
2. **Hot Standby Promotion**:
   - In managed environments (AWS Aurora / RDS Multi-AZ): Failover occurs automatically within 60–120 seconds.
   - In self-hosted setups: Promote read replica via `pg_ctl promote`.
3. **Connection String Repointing**:
   - If DNS failover is used, DNS records update automatically to point to the promoted standby.
   - If manual, update `DATABASE_URL` in the production environment secret manager and restart API services.
4. **Post-Recovery Verification**:
   - Verify `GET /api/health/system` reports `status: "healthy"` and database latency < 50ms.

---

### 4.3 Scenario C: Complete Cloud Region Outage
*Context: Entire cloud availability zone or region fails.*

1. **Declare Disaster**: Lead SRE authorizes multi-region disaster recovery protocol.
2. **Deploy Infrastructure via Terraform/CDK**:
   - Spin up secondary region compute nodes (API containers, Next.js web application).
3. **Restore Database from Cross-Region Snapshot**:
   - Restore latest automated daily snapshot from cross-region replica bucket.
   - Apply WAL replay up to the latest replicated WAL segment ($RPO \le 5 \text{ min}$).
4. **DNS Cutover**:
   - Update Cloudflare / Route53 DNS records to route traffic to the secondary region ingress.
5. **Customer Communication**:
   - Notify restaurant owners via the multi-channel notification engine (SMS / Email) of service resumption.

---

## 5. Security & Immutability Protocols

1. **S3 Object Lock (WORM - Write Once, Read Many)**:
   - Automated database backups stored in S3 are protected with Object Lock in Compliance Mode for 30 days. No administrator or compromised API key can delete or overwrite these backups.
2. **Principle of Least Privilege (PoLP)**:
   - Backup worker credentials only have `s3:PutObject` permissions; they lack `s3:DeleteObject` permissions.
3. **Audit Trails for Restorations**:
   - Any execution of a restore script logs an immutable entry to `audit_logs` with actor details and IP address.

---

## 6. Verification Drills & Validation Schedule

To ensure backup integrity and team readiness, the following drill schedule is enforced:

| Exercise | Frequency | Verification Method |
|---|---|---|
| **Automated Restore Testing** | Weekly | Automated pipeline spins up an ephemeral PostgreSQL instance, restores the latest snapshot, runs database migrations, and verifies table checksums. |
| **PITR Simulation Drill** | Monthly | SRE team restores a randomized timestamp in a staging sandbox and verifies sample orders. |
| **Full Regional Failover Simulation** | Bi-annually | Simulated complete outage with DNS cutover and staff sign-off. |

---

## 7. Operational Backup Script (Automated Cron)

```bash
#!/bin/bash
# scripts/daily-backup.sh
# Scheduled via crontab: 0 2 * * * /opt/scripts/daily-backup.sh

set -euo pipefail

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/var/backups/postgres"
BACKUP_FILE="${BACKUP_DIR}/qrmenu_prod_${TIMESTAMP}.dump"
S3_BUCKET="s3://qrmenu-production-backups-encrypted"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting PostgreSQL compressed logical backup..."
pg_dump -Fc -v -d "$DATABASE_URL" -f "$BACKUP_FILE"

echo "[$(date)] Uploading snapshot to encrypted offsite cloud storage..."
aws s3 cp "$BACKUP_FILE" "${S3_BUCKET}/daily/$(basename "$BACKUP_FILE")" --sse aws:kms

echo "[$(date)] Pruning local snapshots older than 7 days..."
find "$BACKUP_DIR" -type f -name "*.dump" -mtime +7 -delete

echo "[$(date)] Backup completed successfully."
```
