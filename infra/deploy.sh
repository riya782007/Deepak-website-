#!/usr/bin/env bash
# Deploys or updates everything: infrastructure, API code, website and console.
# Needs the AWS CLI signed in to the company account, Node 20+ and zip.
#   ALERT_EMAIL=accounts@yourcompany.in ./infra/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."
REGION="${AWS_REGION:-ap-south-1}"
STACK="${STACK:-soft-binomials}"
: "${ALERT_EMAIL:?Set ALERT_EMAIL to the address that should get cost alerts}"

echo "1/4 Infrastructure"
aws cloudformation deploy --region "$REGION" --stack-name "$STACK" \
  --template-file infra/template.yaml --capabilities CAPABILITY_IAM --no-fail-on-empty-changeset \
  --parameter-overrides "AlertEmail=$ALERT_EMAIL" ${EXTRA_ORIGINS:+"ExtraOrigins=$EXTRA_ORIGINS"}

out() { aws cloudformation describe-stacks --region "$REGION" --stack-name "$STACK" --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text; }

echo "2/4 API code"
rm -rf build && mkdir -p build
(cd infra/api && zip -q -r ../../build/api.zip .)
aws lambda update-function-code --region "$REGION" --function-name sb-console-api --zip-file fileb://build/api.zip --output text --query LastUpdateStatus

echo "3/4 Build"
cat > .env.production.local <<EOF
VITE_CONSOLE_API_URL=$(out ApiUrl)
VITE_AWS_REGION=$REGION
VITE_COGNITO_CLIENT_ID=$(out UserPoolClientId)
EOF
npm run build

echo "4/4 Upload"
BUCKET=$(out SiteBucketName)
aws s3 sync dist/assets "s3://$BUCKET/assets" --region "$REGION" --cache-control "public,max-age=31536000,immutable"
aws s3 sync dist "s3://$BUCKET" --region "$REGION" --delete --exclude "assets/*" --exclude "media/*" --cache-control "public,max-age=0,must-revalidate"
aws cloudfront create-invalidation --distribution-id "$(out DistributionId)" --paths "/*" --output text --query Invalidation.Status

echo "Done: $(out SiteUrl)  console: $(out ConsoleUrl)"
