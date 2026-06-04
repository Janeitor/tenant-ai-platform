'use client';

import { useState } from 'react';

interface AskSource {
  documentId: string;
  documentName: string;
  chunkId: string;
}

interface AskResponse {
  answer: string;
  sources: AskSource[];
}

const suggestedQuestions = [
  'Que documentos necesito para firmar una compraventa?',
  'Cuales son los requisitos para un poder notarial?',
  'Indicame la cobertura por maternidad del seguro complementario',
];

export default function Home() {
  const [question, setQuestion] = useState('');
  const [submittedQuestion, setSubmittedQuestion] = useState<string | null>(null);
  const [response, setResponse] = useState<AskResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function askQuestion(nextQuestion: string) {
    const trimmedQuestion = nextQuestion.trim();

    if (!trimmedQuestion) {
      setErrorMessage('Escribe una consulta antes de enviar.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setResponse(null);
    setSubmittedQuestion(trimmedQuestion);

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
            : 'No fue posible consultar la base documental.';

        throw new Error(message);
      }

      setResponse(data as AskResponse);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Error inesperado al consultar.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAsk(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await askQuestion(question);
  }

  async function handleSuggestionClick(nextQuestion: string) {
    setQuestion(nextQuestion);
    await askQuestion(nextQuestion);
  }

  return (
    <main className="intranet-shell">
      <aside className="sidebar" aria-label="Secciones internas">
        <div className="brand">
          <span className="brand-mark">NSM</span>
          <div>
            <strong>Notaria San Martin</strong>
            <span>Portal interno</span>
          </div>
        </div>

        <nav className="nav-list" aria-label="Navegacion principal">
          <span className="nav-item active">Asistente documental</span>
          <span className="nav-item">Escrituras</span>
          <span className="nav-item">Poderes</span>
          <span className="nav-item">Protocolos</span>
          <span className="nav-item">Circulares</span>
        </nav>
      </aside>

      <section className="portal">
        <header className="portal-header">
          <div>
            <p className="eyebrow">Base documental interna</p>
            <h1>Asistente de consultas notariales</h1>
          </div>
          <div className="user-pill">
            <span>Recepcion</span>
            <strong>Demo Company</strong>
          </div>
        </header>

        <section className="assistant-card">
          <div className="chat-window" aria-live="polite">
            <div className="chat-message assistant">
              <span className="avatar">AI</span>
              <div className="bubble">
                <p>
                  Hola. Puedo ayudarte a consultar la documentacion interna de
                  la notaria.
                </p>
              </div>
            </div>

            {submittedQuestion ? (
              <div className="chat-message user">
                <div className="bubble">
                  <p>{submittedQuestion}</p>
                </div>
                <span className="avatar">TU</span>
              </div>
            ) : null}

            {isLoading ? (
              <div className="chat-message assistant">
                <span className="avatar">AI</span>
                <div className="bubble loading">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            ) : null}

            {response ? (
              <div className="chat-message assistant">
                <span className="avatar">AI</span>
                <div className="bubble">
                  <p>{response.answer}</p>

                  <div className="sources">
                    <strong>Fuentes consultadas</strong>
                    {response.sources.length > 0 ? (
                      <ul>
                        {response.sources.map((source) => (
                          <li key={source.chunkId}>{source.documentName}</li>
                        ))}
                      </ul>
                    ) : (
                      <span>No se encontraron documentos relacionados.</span>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {errorMessage ? (
              <div className="chat-message assistant">
                <span className="avatar">AI</span>
                <div className="bubble error">
                  <p>{errorMessage}</p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="suggestions" aria-label="Consultas sugeridas">
            {suggestedQuestions.map((suggestion) => (
              <button
                className="suggestion"
                disabled={isLoading}
                key={suggestion}
                onClick={() => void handleSuggestionClick(suggestion)}
                type="button"
              >
                {suggestion}
              </button>
            ))}
          </div>

          <form className="composer" onSubmit={handleAsk}>
            <textarea
              aria-label="Consulta"
              placeholder="Escribe una consulta para la base documental..."
              rows={2}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
            />
            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Consultando' : 'Enviar'}
            </button>
          </form>
        </section>
      </section>
    </main>
  );
}
