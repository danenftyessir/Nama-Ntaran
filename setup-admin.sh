#!/bin/bash

# Setup Script for Admin Panel
# This script helps you create an admin account and test the admin endpoints

echo "=================================================="
echo "   NutriTrack Admin Panel Setup Script"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# API Base URL
API_URL="http://localhost:5000"

# Function to check if backend is running
check_backend() {
    echo -n "Checking backend status... "
    if curl -s "$API_URL/api/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend is running${NC}"
        return 0
    else
        echo -e "${RED}✗ Backend is not running${NC}"
        echo ""
        echo "Please start the backend first:"
        echo "  cd backend && npm run dev"
        return 1
    fi
}

# Function to create admin account
create_admin() {
    echo ""
    echo "Creating admin account..."
    echo ""

    read -p "Enter admin email (default: admin@nutritrack.com): " ADMIN_EMAIL
    ADMIN_EMAIL=${ADMIN_EMAIL:-admin@nutritrack.com}

    read -s -p "Enter admin password (default: admin12345): " ADMIN_PASSWORD
    echo ""
    ADMIN_PASSWORD=${ADMIN_PASSWORD:-admin12345}

    read -p "Enter admin name (default: Super Admin): " ADMIN_NAME
    ADMIN_NAME=${ADMIN_NAME:-Super Admin}

    echo ""
    echo "Creating admin with:"
    echo "  Email: $ADMIN_EMAIL"
    echo "  Name: $ADMIN_NAME"
    echo ""

    RESPONSE=$(curl -s -X POST "$API_URL/api/auth/register-admin" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"$ADMIN_EMAIL\",
            \"password\": \"$ADMIN_PASSWORD\",
            \"name\": \"$ADMIN_NAME\",
            \"inviteCode\": \"MBG-ADMIN-2025\"
        }")

    if echo "$RESPONSE" | grep -q "token"; then
        echo -e "${GREEN}✓ Admin account created successfully!${NC}"
        echo ""
        echo "Login credentials:"
        echo "  Email: $ADMIN_EMAIL"
        echo "  Password: $ADMIN_PASSWORD"
        echo ""
        return 0
    else
        echo -e "${RED}✗ Failed to create admin account${NC}"
        echo "Response: $RESPONSE"
        return 1
    fi
}

# Function to test login
test_login() {
    echo ""
    echo "Testing admin login..."

    read -p "Enter admin email: " ADMIN_EMAIL
    read -s -p "Enter admin password: " ADMIN_PASSWORD
    echo ""

    RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"$ADMIN_EMAIL\",
            \"password\": \"$ADMIN_PASSWORD\"
        }")

    TOKEN=$(echo "$RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

    if [ -n "$TOKEN" ]; then
        echo -e "${GREEN}✓ Login successful!${NC}"
        echo ""
        echo "Token: $TOKEN"
        echo ""
        export ADMIN_TOKEN="$TOKEN"
        return 0
    else
        echo -e "${RED}✗ Login failed${NC}"
        echo "Response: $RESPONSE"
        return 1
    fi
}

# Function to test endpoints
test_endpoints() {
    if [ -z "$ADMIN_TOKEN" ]; then
        echo -e "${YELLOW}⚠ No token available. Please login first.${NC}"
        return 1
    fi

    echo ""
    echo "Testing admin endpoints..."
    echo ""

    # Test Dashboard
    echo -n "1. Testing /api/admin/dashboard... "
    if curl -s -H "Authorization: Bearer $ADMIN_TOKEN" "$API_URL/api/admin/dashboard" | grep -q "success"; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗${NC}"
    fi

    # Test Users
    echo -n "2. Testing /api/admin/users... "
    if curl -s -H "Authorization: Bearer $ADMIN_TOKEN" "$API_URL/api/admin/users" | grep -q "success"; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗${NC}"
    fi

    # Test Issues
    echo -n "3. Testing /api/issues... "
    if curl -s -H "Authorization: Bearer $ADMIN_TOKEN" "$API_URL/api/issues" | grep -q "success"; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗${NC}"
    fi

    # Test Manual Review
    echo -n "4. Testing /api/manual-review/pending... "
    if curl -s -H "Authorization: Bearer $ADMIN_TOKEN" "$API_URL/api/manual-review/pending" | grep -q "success"; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗${NC}"
    fi

    echo ""
}

# Main menu
show_menu() {
    echo ""
    echo "What would you like to do?"
    echo ""
    echo "1. Create new admin account"
    echo "2. Test admin login"
    echo "3. Test all endpoints"
    echo "4. Exit"
    echo ""
    read -p "Enter your choice [1-4]: " choice

    case $choice in
        1)
            create_admin
            ;;
        2)
            test_login
            ;;
        3)
            test_endpoints
            ;;
        4)
            echo "Goodbye!"
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid choice${NC}"
            ;;
    esac

    show_menu
}

# Main execution
if check_backend; then
    show_menu
else
    exit 1
fi
