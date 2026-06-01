# SMUS Petcare Agent (Workshop Sample)

스마트싱스 펫케어 - 강아지 불안 케어 에이전트. Strands Agents + AG-UI + CopilotKit.

- `agent/` : Strands 에이전트 백엔드 (4 mock tool, AgentCore Runtime 호환)
- `frontend/` : Next.js + CopilotKit 채팅 UI (인증 없는 로컬 모드)

## Quick Start
```bash
# 1) 백엔드 (Python 3.12 권장)
cd agent && python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
AGENT_PATH=/ AWS_REGION=us-west-2 python main.py   # :8080

# 2) 프론트엔드
cd frontend && cp .env.local.example .env.local && npm install && npm run dev   # :3300
```
