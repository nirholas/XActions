#!/usr/bin/env bash
# One-shot provisioning for the XActions API on Google Cloud Run.
#
# Creates everything cloudbuild-api.yaml expects: a Cloud SQL Postgres
# instance, Secret Manager entries for the app secrets, and the IAM
# bindings the build/runtime service accounts need. Safe to re-run — every
# step checks for the existing resource first.
#
# Requires: gcloud authenticated against the aerial-vehicle-466722-p5 project
# (run `gcloud auth login` first if you see a reauthentication error).
#
# Usage (repo root): bash deploy/gcp/provision-api.sh
set -euo pipefail

PROJECT=aerial-vehicle-466722-p5
REGION=us-central1
SQL_INSTANCE=xactions-db
SQL_DB=xactions
SQL_USER=xactions_app
BUILD_SA="three-ws-build@${PROJECT}.iam.gserviceaccount.com"
RUNTIME_SA="three-ws@${PROJECT}.iam.gserviceaccount.com"

echo "==> Verifying gcloud auth"
gcloud config set project "$PROJECT" >/dev/null
gcloud projects describe "$PROJECT" --format="value(projectId)" >/dev/null || {
  echo "gcloud is not authenticated. Run: gcloud auth login" >&2
  exit 1
}

echo "==> Enabling required APIs"
gcloud services enable sqladmin.googleapis.com secretmanager.googleapis.com \
  run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com \
  vpcaccess.googleapis.com --project "$PROJECT"

echo "==> Cloud SQL Postgres instance ($SQL_INSTANCE)"
if ! gcloud sql instances describe "$SQL_INSTANCE" --project "$PROJECT" >/dev/null 2>&1; then
  SQL_ROOT_PASSWORD=$(openssl rand -base64 24)
  gcloud sql instances create "$SQL_INSTANCE" \
    --project "$PROJECT" \
    --database-version=POSTGRES_16 \
    --tier=db-g1-small \
    --region="$REGION" \
    --storage-auto-increase \
    --backup-start-time=03:00 \
    --root-password="$SQL_ROOT_PASSWORD"
  echo "  created (root password not needed again — app user is created below)"
else
  echo "  already exists, skipping create"
fi

echo "==> Database + app user"
gcloud sql databases create "$SQL_DB" --instance="$SQL_INSTANCE" --project "$PROJECT" 2>/dev/null || echo "  database already exists"

if ! gcloud sql users list --instance="$SQL_INSTANCE" --project "$PROJECT" --format="value(name)" | grep -qx "$SQL_USER"; then
  APP_DB_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=')
  gcloud sql users create "$SQL_USER" --instance="$SQL_INSTANCE" --project "$PROJECT" --password="$APP_DB_PASSWORD"
else
  echo "  app user already exists — reusing stored secret if present, otherwise rotating password"
  APP_DB_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=')
  gcloud sql users set-password "$SQL_USER" --instance="$SQL_INSTANCE" --project "$PROJECT" --password="$APP_DB_PASSWORD"
fi

CONNECTION_NAME=$(gcloud sql instances describe "$SQL_INSTANCE" --project "$PROJECT" --format="value(connectionName)")
DATABASE_URL="postgresql://${SQL_USER}:${APP_DB_PASSWORD}@localhost/${SQL_DB}?host=/cloudsql/${CONNECTION_NAME}"

echo "==> Secret Manager"
create_or_update_secret() {
  local name=$1 value=$2
  if gcloud secrets describe "$name" --project "$PROJECT" >/dev/null 2>&1; then
    printf '%s' "$value" | gcloud secrets versions add "$name" --project "$PROJECT" --data-file=-
  else
    printf '%s' "$value" | gcloud secrets create "$name" --project "$PROJECT" --data-file=- --replication-policy=automatic
  fi
}
create_or_update_secret xactions-database-url "$DATABASE_URL"
create_or_update_secret xactions-jwt-secret "$(openssl rand -hex 32)"
create_or_update_secret xactions-session-secret "$(openssl rand -hex 32)"
create_or_update_secret xactions-admin-api-key "$(openssl rand -hex 32)"

echo "==> IAM: grant runtime + build service accounts access to the secrets"
for secret in xactions-database-url xactions-jwt-secret xactions-session-secret xactions-admin-api-key; do
  gcloud secrets add-iam-policy-binding "$secret" --project "$PROJECT" \
    --member="serviceAccount:${RUNTIME_SA}" --role="roles/secretmanager.secretAccessor" >/dev/null
done

echo "==> IAM: grant runtime SA Cloud SQL Client + Redis access"
gcloud projects add-iam-policy-binding "$PROJECT" \
  --member="serviceAccount:${RUNTIME_SA}" --role="roles/cloudsql.client" >/dev/null
gcloud projects add-iam-policy-binding "$PROJECT" \
  --member="serviceAccount:${RUNTIME_SA}" --role="roles/redis.viewer" >/dev/null

echo "==> Artifact Registry repo"
gcloud artifacts repositories describe containers --location "$REGION" --project "$PROJECT" >/dev/null 2>&1 || \
  gcloud artifacts repositories create containers --repository-format=docker --location="$REGION" --project "$PROJECT"

echo "==> Building + deploying via Cloud Build"
gcloud builds submit --config deploy/gcp/cloudbuild-api.yaml --region "$REGION" --project "$PROJECT" \
  --substitutions="_IMAGE=${REGION}-docker.pkg.dev/${PROJECT}/containers/xactions-api:manual$(date +%s)"

SERVICE_URL=$(gcloud run services describe xactions-api --region "$REGION" --project "$PROJECT" --format="value(status.url)")
echo ""
echo "==> Deployed: $SERVICE_URL"
echo "==> Health check:"
curl -fsS "${SERVICE_URL}/api/health" && echo ""
echo ""
echo "Next: map api.xactions.app to this service:"
echo "  gcloud run domain-mappings create --service=xactions-api --domain=api.xactions.app --region=$REGION --project=$PROJECT"
echo "Then add the CNAME it prints to Cloudflare DNS for api.xactions.app (proxy OFF / DNS-only,"
echo "so Google can validate the mapping and issue the cert)."
