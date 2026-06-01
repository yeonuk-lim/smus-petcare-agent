import {
  CopilotRuntime,
  ExperimentalEmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { HttpAgent } from "@ag-ui/client";
import { NextRequest, NextResponse } from "next/server";

// .env.local에 AGENTCORE_RUNTIME_ARN이 있으면 클라우드(Cognito) 모드, 없으면 로컬 모드
const AGENT_URL = process.env.AGENT_URL || "http://localhost:8080";
const RUNTIME_ARN = process.env.AGENTCORE_RUNTIME_ARN || "";

// Cognito에서 Access Token 발급 (USER_PASSWORD_AUTH, 클라이언트 시크릿 없음)
async function getAccessToken(): Promise<string> {
  const res = await fetch(`https://cognito-idp.${process.env.COGNITO_POOL_REGION}.amazonaws.com/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-amz-json-1.1",
      "X-Amz-Target": "AWSCognitoIdentityProviderService.InitiateAuth",
    },
    body: JSON.stringify({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: process.env.COGNITO_CLIENT_ID,
      AuthParameters: {
        USERNAME: process.env.COGNITO_USERNAME,
        PASSWORD: process.env.COGNITO_PASSWORD,
      },
    }),
  });
  const data = await res.json();
  if (!data.AuthenticationResult?.AccessToken) {
    throw new Error(`Cognito 인증 실패: ${JSON.stringify(data)}`);
  }
  return data.AuthenticationResult.AccessToken;
}

async function getRuntime(): Promise<CopilotRuntime> {
  if (RUNTIME_ARN) {
    // 클라우드 모드: AgentCore Runtime invoke URL + Cognito Bearer 토큰
    const token = await getAccessToken();
    const url = `https://bedrock-agentcore.${process.env.AGENTCORE_REGION}.amazonaws.com/runtimes/${encodeURIComponent(RUNTIME_ARN)}/invocations?qualifier=DEFAULT`;
    return new CopilotRuntime({
      agents: {
        petcare_agent: new HttpAgent({
          url,
          headers: {
            Authorization: `Bearer ${token}`,
            "X-Amzn-Bedrock-AgentCore-Runtime-Session-Id": `web-${Date.now()}-${Math.random().toString(36).slice(2)}-petcare-session`,
          },
        }),
      },
    });
  }
  // 로컬 모드: 인증 없이 localhost 에이전트
  return new CopilotRuntime({
    agents: { petcare_agent: new HttpAgent({ url: AGENT_URL }) },
  });
}

const serviceAdapter = new ExperimentalEmptyAdapter();

export const GET = async () =>
  NextResponse.json({
    agents: {
      petcare_agent: {
        name: "petcare_agent",
        description: "스마트싱스 펫케어 에이전트",
      },
    },
  });

export const POST = async (req: NextRequest) => {
  const runtime = await getRuntime();
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: "/api/copilotkit",
  });
  return handleRequest(req);
};
