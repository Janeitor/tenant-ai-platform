import { NextResponse, type NextRequest } from 'next/server';

const tenantAiApiUrl = process.env.TENANT_AI_API_URL;

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!tenantAiApiUrl) {
    return NextResponse.json(
      { message: 'Tenant AI API URL is not configured' },
      { status: 500 },
    );
  }

  const body = await request.json();

  const response = await fetch(`${tenantAiApiUrl}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const responseBody = await response.json();

  return NextResponse.json(responseBody, {
    status: response.status,
  });
}