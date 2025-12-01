#!/usr/bin/env bash
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

info() { echo -e "${GREEN}[✓]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
err() { echo -e "${RED}[✗]${NC} $*"; }

echo "Running comprehensive safety checks..."
echo ""

# Frontend checks
info "Checking frontend..."
if pnpm --dir apps/dao-dapp exec eslint . --ext .ts,.tsx; then
  info "Frontend linting passed"
else
  err "Frontend linting failed"
  exit 1
fi

if pnpm web:build; then
  info "Frontend build passed"
else
  err "Frontend build failed"
  exit 1
fi

echo ""

# Contract checks
info "Checking contracts..."
if pnpm contracts:compile; then
  info "Contract compilation passed"
else
  err "Contract compilation failed"
  exit 1
fi

if pnpm contracts:test; then
  info "Hardhat tests passed"
else
  err "Hardhat tests failed"
  exit 1
fi

if command -v forge >/dev/null 2>&1; then
  if pnpm forge:test; then
    info "Foundry tests passed"
  else
    err "Foundry tests failed"
    exit 1
  fi
else
  warn "Foundry not found, skipping Foundry tests"
fi

echo ""
info "All checks passed! ✅"
