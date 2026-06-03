import { NextResponse } from 'next/server';

interface AskRequestBody {
  question?: unknown;
}

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as AskRequestBody;
  const question = typeof body.question === 'string' ? body.question.trim() : '';

  if (!question) {
    return NextResponse.json(
      {
        message: 'Question is required',
      },
      {
        status: 400,
      },
    );
  }

  const apiUrl = process.env.TENANT_AI_API_URL;
  const apiKey = process.env.TENANT_AI_API_KEY;

  if (!apiUrl || !apiKey) {
    return NextResponse.json(
      {
        message: 'Tenant AI integration is not configured',
      },
      {
        status: 500,
      },
    );
  }

  const response = await fetch(`${apiUrl}/ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      question,
      limit: 5,
    }),
  });

  const data = (await response.json()) as unknown;

  return NextResponse.json(data, {
    status: response.status,
  });
}