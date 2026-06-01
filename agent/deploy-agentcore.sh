#!/usr/bin/env bash
# AG-UI 에이전트를 AgentCore Runtime에 배포하고(Cognito 인증),
# 프론트엔드(.env.local)에 클라우드 연결 정보를 자동으로 기록한다.
#
# 사전조건: 이 폴더(agent/)의 .venv 활성화 + AWS 자격증명 설정
#   python3.12 -m venv .venv && source .venv/bin/activate
#   pip install -r requirements.txt bedrock-agentcore-starter-toolkit
set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
AGENT_NAME="petcare_agent"
FRONTEND_ENV="../frontend/.env.local"

echo "==> [1/5] Cognito 사용자 풀 생성 (user flow)"
agentcore identity setup-cognito --region "$REGION"
# setup-cognito는 .agentcore_identity_user.env 에 RUNTIME_* 변수를 저장한다
set -a; source .agentcore_identity_user.env; set +a

echo "==> [2/5] AG-UI + JWT(Cognito) 배포 설정"
agentcore configure \
  -e main.py \
  --name "$AGENT_NAME" \
  --protocol AGUI \
  --disable-memory \
  --non-interactive \
  --region "$REGION" \
  --authorizer-config "{\"customJWTAuthorizer\":{\"discoveryUrl\":\"$RUNTIME_DISCOVERY_URL\",\"allowedClients\":[\"$RUNTIME_CLIENT_ID\"]}}"

echo "==> [3/5] AWS에 배포 (CodeBuild → arm64 → Runtime)"
agentcore deploy --auto-update-on-conflict

echo "==> [4/5] 배포된 Runtime ARN 조회"
AGENT_ARN=$(aws bedrock-agentcore-control list-agent-runtimes --region "$REGION" \
  --query "agentRuntimes[?agentRuntimeName=='$AGENT_NAME'].agentRuntimeArn | [0]" --output text)
echo "    ARN: $AGENT_ARN"

echo "==> [5/5] 프론트엔드 .env.local에 클라우드 연결 정보 기록"
cat > "$FRONTEND_ENV" <<EOF
# === 클라우드 모드 (AgentCore Runtime + Cognito) — 스크립트가 자동 생성 ===
AGENTCORE_RUNTIME_ARN=$AGENT_ARN
AGENTCORE_REGION=$REGION
COGNITO_POOL_REGION=$REGION
COGNITO_CLIENT_ID=$RUNTIME_CLIENT_ID
COGNITO_USERNAME=$RUNTIME_USERNAME
COGNITO_PASSWORD=$RUNTIME_PASSWORD

# === 로컬 모드로 되돌리려면: 위 6줄을 지우고 아래 한 줄만 남기세요 ===
# AGENT_URL=http://localhost:8080
EOF

echo ""
echo "✅ 완료! 이제 프론트엔드에서 'npm run dev' 하면 클라우드 에이전트에 연결됩니다."
echo "   되돌리기: $FRONTEND_ENV 의 주석 안내 참고"
