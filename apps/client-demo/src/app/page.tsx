'use client';

import { useState } from 'react';

interface AskSource {
  documentId: string;
  documentName: string;
  chunkId: string;
}

interface AskUsage {
  provider: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  estimatedCostUsd: number | null;
  contextTokens: number | null;
  selectedChunks: number | null;
  maxContextTokens: number | null;
  candidateLimit: number | null;
}

interface AskResponse {
  answer: string;
  sources: AskSource[];
  usage: AskUsage;
}

export default function Home() {
  const [question, setQuestion] = useState('A quien visita Caperucita Roja?');
  const [response, setResponse] = useState<AskResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleAsk(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedQuestion = question.trim();

    if (!trimmedQuestion) {
      setErrorMessage('Write a question before asking.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setResponse(null);

    try {
      const result = await fetch('/api/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: trimmedQuestion,
        }),
      });

      const data = (await result.json()) as unknown;

      if (!result.ok) {
        const message =
          typeof data === 'object' &&
          data !== null &&
          'message' in data &&
          typeof data.message === 'string'
            ? data.message
            : 'Tenant AI API request failed';

        throw new Error(message);
      }

      setResponse(data as AskResponse);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unexpected request error',
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="shell">
      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Demo Company</p>
            <h1>Knowledge Assistant</h1>
          </div>
          <span className="status">Tenant AI connected</span>
        </header>

        <section className="panel">
          <div className="conversation">
            <div className="message assistant">
              <p>
                Ask a question about the company documents. This demo portal
                calls Tenant AI API from a server-side integration route.
              </p>
            </div>

            {response ? (
              <div className="result">
                <div className="message user">
                  <p>{question}</p>
                </div>

                <div className="message assistant">
                  <p>{response.answer}</p>
                </div>

                <section className="details">
                  <div>
                    <h2>Sources</h2>
                    {response.sources.length > 0 ? (
                      <ul>
                        {response.sources.map((source) => (
                          <li key={source.chunkId}>
                            <strong>{source.documentName}</strong>
                            <span>{source.chunkId}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="muted">No sources returned.</p>
                    )}
                  </div>

                  <div>
                    <h2>Usage</h2>
                    <dl>
                      <div>
                        <dt>Provider</dt>
                        <dd>{response.usage.provider}</dd>
                      </div>
                      <div>
                        <dt>Model</dt>
                        <dd>{response.usage.model}</dd>
                      </div>
                      <div>
                        <dt>Total tokens</dt>
                        <dd>{response.usage.totalTokens ?? 'N/A'}</dd>
                      </div>
                      <div>
                        <dt>Selected chunks</dt>
                        <dd>{response.usage.selectedChunks ?? 'N/A'}</dd>
                      </div>
                    </dl>
                  </div>
                </section>
              </div>
            ) : null}

            {errorMessage ? (
              <div className="message error">
                <p>{errorMessage}</p>
              </div>
            ) : null}
          </div>

          <form className="composer" onSubmit={handleAsk}>
            <textarea
              aria-label="Question"
              placeholder="Ask about internal documents..."
              rows={3}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
            />
            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Asking...' : 'Ask'}
            </button>
          </form>
        </section>
      </section>
    </main>
  );
}