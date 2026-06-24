#!/usr/bin/env bash

set -e

# Webhook notification script for deployment updates
# This script should be copied to the orchestrator repository at .github/scripts/send-webhook.sh
#
# Usage: ./send-webhook.sh --url <webhook_url> --secret <webhook_secret> --stage <stage> --status <status> [--message <message>] [--github-repo <url>] [--staging-domain <url>]

# Initialize variables
WEBHOOK_URL=""
WEBHOOK_SECRET=""
STAGE=""
STATUS=""
MESSAGE=""
GITHUB_REPO_URL=""
STAGING_DOMAIN=""
PRODUCTION_DOMAIN=""

# Parse keyword arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --url)
      WEBHOOK_URL="$2"
      shift 2
      ;;
    --secret)
      WEBHOOK_SECRET="$2"
      shift 2
      ;;
    --stage)
      STAGE="$2"
      shift 2
      ;;
    --status)
      STATUS="$2"
      shift 2
      ;;
    --message)
      MESSAGE="$2"
      shift 2
      ;;
    --github-repo)
      GITHUB_REPO_URL="$2"
      shift 2
      ;;
    --staging-domain)
      STAGING_DOMAIN="$2"
      shift 2
      ;;
    --production-domain)
      PRODUCTION_DOMAIN="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 --url <webhook_url> --secret <webhook_secret> --stage <stage> --status <status> [OPTIONS]"
      echo ""
      echo "Required arguments:"
      echo "  --url <url>              Full webhook URL including deployment ID"
      echo "  --secret <secret>        Secret for HMAC signature"
      echo "  --stage <stage>          Deployment stage (cloning, provisioning, deploying, completed)"
      echo "  --status <status>        Deployment status (started, success, error, cancelled)"
      echo ""
      echo "Optional arguments:"
      echo "  --message <message>      Status message"
      echo "  --github-repo <url>      GitHub repository URL"
      echo "  --staging-domain <url>   Staging domain URL"
      echo "  --production-domain <url> Production domain URL"
      echo "  -h, --help               Show this help message"
      echo ""
      echo "Examples:"
      echo "  # Basic usage (required parameters only)"
      echo "  $0 --url 'https://api.example.com/api/webhooks/deployment/550e8400-...' \\"
      echo "     --secret 'my-webhook-secret' \\"
      echo "     --stage 'deploying' \\"
      echo "     --status 'success'"
      echo ""
      echo "  # With optional parameters"
      echo "  $0 --url 'https://api.example.com/api/webhooks/deployment/550e8400-...' \\"
      echo "     --secret 'my-webhook-secret' \\"
      echo "     --stage 'completed' \\"
      echo "     --status 'success' \\"
      echo "     --message 'Deployment successful' \\"
      echo "     --github-repo 'https://github.com/org/repo' \\"
      echo "     --staging-domain 'https://staging.example.com'"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Validate required parameters
if [ -z "$WEBHOOK_URL" ] || [ -z "$WEBHOOK_SECRET" ] || [ -z "$STAGE" ] || [ -z "$STATUS" ]; then
  echo "Error: Missing required parameters"
  echo ""
  echo "Required: --url, --secret, --stage, --status"
  echo "Use --help for full usage information"
  exit 1
fi

# Build the payload object using jq
# Only include fields that have values
PAYLOAD_ARGS=(
  --arg stage "$STAGE"
  --arg status "$STATUS"
)

PAYLOAD_FIELDS='stage: $stage, status: $status'

# Add optional fields only if provided
if [ -n "$MESSAGE" ]; then
  PAYLOAD_ARGS+=(--arg message "$MESSAGE")
  PAYLOAD_FIELDS+=', message: $message'
fi

if [ -n "$GITHUB_REPO_URL" ]; then
  PAYLOAD_ARGS+=(--arg githubRepoUrl "$GITHUB_REPO_URL")
  PAYLOAD_FIELDS+=', githubRepoUrl: $githubRepoUrl'
fi

if [ -n "$STAGING_DOMAIN" ]; then
  PAYLOAD_ARGS+=(--arg stagingDomain "$STAGING_DOMAIN")
  PAYLOAD_FIELDS+=', stagingDomain: $stagingDomain'
fi

if [ -n "$PRODUCTION_DOMAIN" ]; then
  PAYLOAD_ARGS+=(--arg productionDomain "$PRODUCTION_DOMAIN")
  PAYLOAD_FIELDS+=', productionDomain: $productionDomain'
fi

# Generate compact JSON payload
PAYLOAD=$(jq -n -c "${PAYLOAD_ARGS[@]}" "{$PAYLOAD_FIELDS}")

echo "Payload to sign: $PAYLOAD"

# Generate HMAC-SHA256 signature of the payload
# CRITICAL: Must sign the exact payload string (no extra whitespace)
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | sed 's/^.*= //')

echo "Generated signature: $SIGNATURE"

# Build the request body with payload and signature
REQUEST_BODY=$(jq -n \
  --arg signature "$SIGNATURE" \
  --argjson payload "$PAYLOAD" \
  '{payload: $payload, signature: $signature}')

echo "Sending webhook to: $WEBHOOK_URL"

# Send the webhook request
HTTP_CODE=$(curl -w "%{http_code}" -o /tmp/webhook_response.txt -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "$REQUEST_BODY")

# Read and display response
RESPONSE=$(cat /tmp/webhook_response.txt)
echo "Response (HTTP $HTTP_CODE): $RESPONSE"

# Check if request was successful
if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
  echo "✅ Webhook sent successfully"
  exit 0
else
  echo "❌ Webhook failed with HTTP $HTTP_CODE"
  exit 1
fi
