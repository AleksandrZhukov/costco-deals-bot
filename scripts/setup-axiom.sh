#!/bin/bash

# Axiom Dashboards and Alerts Setup Script
# This script helps import dashboards and alerts into Axiom

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if AXIOM_TOKEN is set
if [ -z "$AXIOM_TOKEN" ]; then
    echo -e "${RED}Error: AXIOM_TOKEN environment variable is not set${NC}"
    echo "Please set your Axiom API token:"
    echo "  export AXIOM_TOKEN=xaat-your-token-here"
    exit 1
fi

# Dataset name
DATASET="costco-deals-bot"
AXIOM_API="https://api.axiom.co/v1"

echo -e "${GREEN}Starting Axiom setup for dataset: $DATASET${NC}"
echo ""

# Function to import dashboard
import_dashboard() {
    local dashboard_file=$1
    local dashboard_name=$(basename "$dashboard_file" .json)

    echo -e "${YELLOW}Importing dashboard: $dashboard_name${NC}"

    curl -s -X POST "$AXIOM_API/datasets/$DATASET/dashboards" \
        -H "Authorization: Bearer $AXIOM_TOKEN" \
        -H "Content-Type: application/json" \
        -d @"$dashboard_file"

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Dashboard imported successfully${NC}"
    else
        echo -e "${RED}✗ Failed to import dashboard${NC}"
    fi
    echo ""
}

# Function to import alert
import_alert() {
    local alert_file=$1
    local alert_name=$(basename "$alert_file" .json)

    echo -e "${YELLOW}Importing alert: $alert_name${NC}"

    curl -s -X POST "$AXIOM_API/datasets/$DATASET/alerts" \
        -H "Authorization: Bearer $AXIOM_TOKEN" \
        -H "Content-Type: application/json" \
        -d @"$alert_file"

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Alert imported successfully${NC}"
    else
        echo -e "${RED}✗ Failed to import alert${NC}"
    fi
    echo ""
}

# Check if dataset exists
echo "Checking if dataset exists..."
curl -s -X GET "$AXIOM_API/datasets/$DATASET" \
    -H "Authorization: Bearer $AXIOM_TOKEN" > /dev/null

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Dataset '$DATASET' does not exist${NC}"
    echo "Please create the dataset first in the Axiom UI"
    exit 1
fi

echo -e "${GREEN}✓ Dataset exists${NC}"
echo ""

# Import dashboards
echo -e "${GREEN}=== Importing Dashboards ===${NC}"
echo ""

DASHBOARDS_DIR="./docs/axiom"
if [ -d "$DASHBOARDS_DIR" ]; then
    for dashboard in "$DASHBOARDS_DIR"/*-dashboard.json; do
        if [ -f "$dashboard" ]; then
            import_dashboard "$dashboard"
        fi
    done
else
    echo -e "${RED}Error: Dashboards directory not found: $DASHBOARDS_DIR${NC}"
    exit 1
fi

# Import alerts
echo -e "${GREEN}=== Importing Alerts ===${NC}"
echo ""

ALERTS_DIR="./docs/axiom/alerts"
if [ -d "$ALERTS_DIR" ]; then
    for alert in "$ALERTS_DIR"/*.json; do
        if [ -f "$alert" ]; then
            import_alert "$alert"
        fi
    done
else
    echo -e "${RED}Error: Alerts directory not found: $ALERTS_DIR${NC}"
    exit 1
fi

echo -e "${GREEN}=== Setup Complete ===${NC}"
echo ""
echo "Next steps:"
echo "1. Go to https://axiom.co"
echo "2. Check your dashboards at: Datasets → $DATASET → Dashboards"
echo "3. Configure notification channels: Settings → Notification Channels"
echo "4. Test alerts by triggering some errors in the application"
echo ""
echo "For detailed setup instructions, see: docs/AXIOM_SETUP.md"
