#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════════
# DropShip - Automated Supabase Setup Script
# This script automates linking, secrets configuration, and edge function deployment
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Print banner
echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║     █████╗ ███████╗███████╗██╗     ██╗   ██╗██╗  ██╗         ║"
echo "║    ██╔══██╗██╔════╝██╔════╝██║     ██║   ██║╚██╗██╔╝         ║"
echo "║    ███████║█████╗  █████╗  ██║     ██║   ██║ ╚███╔╝          ║"
echo "║    ██╔══██║██╔══╝  ██╔══╝  ██║     ██║   ██║ ██╔██╗          ║"
echo "║    ██║  ██║██║     ██║     ███████╗╚██████╔╝██╔╝ ██╗         ║"
echo "║    ╚═╝  ╚═╝╚═╝     ╚═╝     ╚══════╝ ╚═════╝ ╚═╝  ╚═╝         ║"
echo "║                                                               ║"
echo "║           Automated Supabase Setup Script                     ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Function to print step headers
print_step() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}▶ $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Function to print error
print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Function to print info
print_info() {
    echo -e "${CYAN}ℹ $1${NC}"
}

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 1: Check Prerequisites
# ═══════════════════════════════════════════════════════════════════════════════

print_step "Step 1: Checking Prerequisites"

# Check if Node.js is installed
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_success "Node.js installed: $NODE_VERSION"
else
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if npm is installed
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    print_success "npm installed: v$NPM_VERSION"
else
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

# Check if Supabase CLI is installed
if command -v supabase &> /dev/null; then
    SUPABASE_VERSION=$(supabase --version 2>&1 | head -n 1)
    print_success "Supabase CLI installed: $SUPABASE_VERSION"
else
    print_warning "Supabase CLI not found. Installing now..."
    npm install -g supabase
    print_success "Supabase CLI installed successfully"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 2: Login to Supabase
# ═══════════════════════════════════════════════════════════════════════════════

print_step "Step 2: Supabase Authentication"

echo -e "${CYAN}Checking Supabase login status...${NC}"

# Check if already logged in
if supabase projects list &> /dev/null; then
    print_success "Already logged in to Supabase"
else
    print_info "Opening browser for Supabase login..."
    supabase login
    print_success "Logged in to Supabase"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 3: Get Project Credentials
# ═══════════════════════════════════════════════════════════════════════════════

print_step "Step 3: Project Configuration"

echo -e "${CYAN}Please enter your Supabase project credentials:${NC}"
echo -e "${YELLOW}(Find these in Supabase Dashboard → Project Settings → API)${NC}\n"

# Get Project Reference ID
echo -e "${CYAN}Enter your Project Reference ID:${NC}"
echo -e "${YELLOW}(The xxxx part from https://xxxx.supabase.co)${NC}"
read -p "> " PROJECT_REF

if [ -z "$PROJECT_REF" ]; then
    print_error "Project Reference ID cannot be empty"
    exit 1
fi

# Get Supabase URL
SUPABASE_URL="https://${PROJECT_REF}.supabase.co"
print_info "Supabase URL: $SUPABASE_URL"

# Get Anon Key
echo -e "\n${CYAN}Enter your anon/public key:${NC}"
echo -e "${YELLOW}(The long eyJhbGci... string under 'anon public')${NC}"
read -p "> " SUPABASE_ANON_KEY

if [ -z "$SUPABASE_ANON_KEY" ]; then
    print_error "Anon key cannot be empty"
    exit 1
fi

# Get Service Role Key
echo -e "\n${CYAN}Enter your service_role key:${NC}"
echo -e "${YELLOW}(The long eyJhbGci... string under 'service_role' - KEEP SECRET!)${NC}"
read -sp "> " SUPABASE_SERVICE_ROLE_KEY
echo ""

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    print_error "Service role key cannot be empty"
    exit 1
fi

print_success "Credentials collected"

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 4: Link Supabase Project
# ═══════════════════════════════════════════════════════════════════════════════

print_step "Step 4: Linking Supabase Project"

echo -e "${CYAN}Linking to project: $PROJECT_REF${NC}"

supabase link --project-ref "$PROJECT_REF"

print_success "Project linked successfully"

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 5: Set Edge Function Secrets (Optional)
# ═══════════════════════════════════════════════════════════════════════════════

print_step "Step 5: Setting Edge Function Secrets"

echo -e "${CYAN}Setting optional secrets for edge functions...${NC}"
echo -e "${GREEN}Note: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are automatically provided by Supabase!${NC}"
echo -e "${YELLOW}You only need to set external API keys like RESEND_API_KEY.${NC}\n"

# Only set RESEND_API_KEY if needed - the SUPABASE_* secrets are auto-injected
echo -e "${CYAN}Do you want to set a Resend API key for email notifications? (y/n)${NC}"
read -p "> " SET_RESEND

if [ "$SET_RESEND" = "y" ] || [ "$SET_RESEND" = "Y" ]; then
    echo -e "${CYAN}Enter your Resend API key (get from resend.com):${NC}"
    read -sp "> " RESEND_API_KEY
    echo ""
    
    if [ -n "$RESEND_API_KEY" ]; then
        supabase secrets set RESEND_API_KEY="$RESEND_API_KEY"
        print_success "Set RESEND_API_KEY"
    fi
fi

print_success "Secrets configuration complete"

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 6: Deploy Edge Functions
# ═══════════════════════════════════════════════════════════════════════════════

print_step "Step 6: Deploying Edge Functions"

# Check if supabase/functions directory exists
if [ -d "supabase/functions" ]; then
    echo -e "${CYAN}Found edge functions directory. Deploying all functions...${NC}\n"
    
    # List and deploy each function
    for dir in supabase/functions/*/; do
        if [ -d "$dir" ]; then
            FUNC_NAME=$(basename "$dir")
            echo -e "${CYAN}Deploying: $FUNC_NAME${NC}"
            supabase functions deploy "$FUNC_NAME" --no-verify-jwt
            print_success "Deployed $FUNC_NAME"
        fi
    done
    
    print_success "All edge functions deployed"
else
    print_warning "No edge functions directory found at supabase/functions/"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 7: Create .env File
# ═══════════════════════════════════════════════════════════════════════════════

print_step "Step 7: Creating Environment File"

ENV_FILE=".env"

# Backup existing .env if it exists
if [ -f "$ENV_FILE" ]; then
    print_warning "Existing .env file found. Creating backup..."
    cp "$ENV_FILE" "${ENV_FILE}.backup"
    print_success "Backup created: ${ENV_FILE}.backup"
fi

# Create new .env file
cat > "$ENV_FILE" << EOF
# Supabase Configuration (Frontend - exposed to browser)
VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY=$SUPABASE_ANON_KEY
VITE_SUPABASE_PROJECT_ID=$PROJECT_REF

# Supabase Configuration (Edge Functions - server-side only)
SUPABASE_URL=$SUPABASE_URL
SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
EOF

print_success "Created .env file"

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 8: Install Dependencies & Build
# ═══════════════════════════════════════════════════════════════════════════════

print_step "Step 8: Installing Dependencies"

echo -e "${CYAN}Running npm install...${NC}"
npm install
print_success "Dependencies installed"

# Ask if user wants to build
echo -e "\n${CYAN}Do you want to build the project for production? (y/n)${NC}"
read -p "> " BUILD_CHOICE

if [ "$BUILD_CHOICE" = "y" ] || [ "$BUILD_CHOICE" = "Y" ]; then
    print_step "Building for Production"
    npm run build
    print_success "Production build created in ./dist folder"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# COMPLETE
# ═══════════════════════════════════════════════════════════════════════════════

echo -e "\n${GREEN}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║                    ✓ SETUP COMPLETE!                          ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${CYAN}Summary:${NC}"
echo -e "  • Project linked: ${GREEN}$PROJECT_REF${NC}"
echo -e "  • Secrets configured: ${GREEN}3 secrets${NC}"
echo -e "  • Edge functions: ${GREEN}Deployed${NC}"
echo -e "  • Environment file: ${GREEN}.env created${NC}"

echo -e "\n${CYAN}Next Steps:${NC}"
echo -e "  1. Import DATABASE_SCHEMA.sql into Supabase SQL Editor"
echo -e "  2. Create storage buckets in Supabase Dashboard"
echo -e "  3. Run ${YELLOW}npm run dev${NC} to start local development"
echo -e "  4. Upload ${YELLOW}./dist${NC} folder to Hostinger"

echo -e "\n${CYAN}Useful Commands:${NC}"
echo -e "  ${YELLOW}npm run dev${NC}                    - Start development server"
echo -e "  ${YELLOW}npm run build${NC}                  - Build for production"
echo -e "  ${YELLOW}supabase functions logs NAME${NC}   - View function logs"
echo -e "  ${YELLOW}supabase secrets list${NC}          - List configured secrets"

echo -e "\n${GREEN}Happy coding! 🚀${NC}\n"
