#!/bin/bash
set -e

echo "🚀 Starting deployment process..."

# Check if solana-test-validator is running
if ! pgrep -f "solana-test-validator" > /dev/null; then
    echo "⚠️  solana-test-validator is not running."
    echo "🔄 Starting solana-test-validator..."
    
    # Start validator in the background and log output
    solana-test-validator > validator.log 2>&1 &
    VALIDATOR_PID=$!
    
    echo "⏳ Waiting for validator to start..."
    # Wait for the validator to be ready (checking RPC port)
    while ! curl -s http://localhost:8899/health > /dev/null; do
        sleep 1
        echo -n "."
    done
    echo ""
    echo "✅ Validator started (PID: $VALIDATOR_PID)"
else
    echo "✅ solana-test-validator is already running."
fi

echo "1️⃣  Configuring Solana CLI to localhost..."
solana config set --url localhost

echo "2️⃣  Airdropping SOL for deployment..."
# Try to airdrop, but don't fail script if it fails (e.g. rate limit)
solana airdrop 5 2>/dev/null || echo "⚠️  Airdrop skipped or failed (check balance if deployment fails)"

# Change to anchor directory
cd anchor

echo "3️⃣  Building Anchor project..."
anchor build

echo "4️⃣  Syncing programs ID..."
# sync programs id
anchor keys sync

cd ..

npm run codama:js

cd anchor

echo "5️⃣  Deploying programs..."
anchor deploy

