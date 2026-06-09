import { NextResponse, type NextRequest } from 'next/server';

const tenantAiApiUrl = process.env.TENANT_AI_API_URL;

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!tenantAiApiUrl) {
    return NextResponse.json(
      { message: 'Tenant AI API URL is not configured' },
      { status: 500 },
    );
  }

  const authorization = request.headers.get('authorization');

  if (!authorization) {
    return NextResponse.json(
      { message: 'Missing authorization header' },
      { status: 401 },
    );
  }

  const response = await fetch(`${tenantAiApiUrl}/admin/tenant/summary`, {
    method: 'GET',
    headers: {
      Authorization: authorization,
    },
  });

  const responseBody = await response.json();

  return NextResponse.json(responseBody, {
    status: response.status,
  });
}