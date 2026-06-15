import { NextResponse, type NextRequest } from 'next/server';

const tenantAiApiUrl = process.env.TENANT_AI_API_URL;

interface RouteContext {
  params: Promise<{
    documentId: string;
  }>;
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
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

  const { documentId } = await context.params;

  try {
    const response = await fetch(
      `${tenantAiApiUrl}/admin/tenant/documents/${documentId}/ingest`,
      {
        method: 'POST',
        headers: {
          Authorization: authorization,
        },
      },
    );

    const responseBody = await response.json();

    return NextResponse.json(responseBody, {
      status: response.status,
    });
  } catch {
    return NextResponse.json(
      { message: 'Tenant AI API is not available' },
      { status: 503 },
    );
  }
}
