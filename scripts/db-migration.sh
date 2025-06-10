#!/bin/bash

RELEASE_NAME="postgres"
NAMESPACE="dev"
MIGRATION_FILE="db_initiation.sql"

set -e

echo "Starting database migration..."
echo "Release Name: $RELEASE_NAME"
echo "Namespace:    $NAMESPACE"
echo "SQL File:     $MIGRATION_FILE"

# 1. Check if the SQL file exists
if [ ! -f "$MIGRATION_FILE" ]; then
    echo "ERROR: Migration file not found at '$MIGRATION_FILE'"
    exit 1
fi

# 2. Construct the name of the Kubernetes secret and database service
SECRET_NAME="${RELEASE_NAME}-postgresql"
DB_HOST="${RELEASE_NAME}-postgresql"
DB_USER="postgres"
DB_NAME="simulated-activity"

echo "Fetching database credentials from secret '$SECRET_NAME'..."

# 3. Retrieve the database password from the Kubernetes secret.
# The `|| echo` part prevents the password from being printed to the log if the script fails here.
DB_PASSWORD=$(kubectl get secret --namespace "$NAMESPACE" "$SECRET_NAME" -o jsonpath="{.data.postgres-password}" | base64 -d) ||
    (echo "ERROR: Could not retrieve password from secret '$SECRET_NAME'. Please check release name and namespace." && exit 1)

if [ -z "$DB_PASSWORD" ]; then
    echo "ERROR: Password retrieved from secret is empty."
    exit 1
fi

echo "Credentials fetched successfully."
echo "Running migration pod..."

# 4. Run a temporary pod with the PostgreSQL client (psql).
# It reads the SQL file and pipes it into the psql command inside the pod.
cat "$MIGRATION_FILE" | kubectl run "db-migration-$(date +%s)" \
    --namespace "$NAMESPACE" \
    --image=docker.io/bitnami/postgresql:latest \
    --restart=Never \
    --rm -i \
    --env="PGPASSWORD=$DB_PASSWORD" \
    -- psql --host="$DB_HOST" --username="$DB_USER" --dbname="$DB_NAME"

echo "-------------------------------------"
echo "✅ Database migration completed successfully!"
echo "-------------------------------------"
