'use client';

import { useRouter } from 'next/navigation';
import { type SyntheticEvent, useEffect, useState } from 'react';

import { AdminShell } from '../../components/admin-shell';

interface TenantDocument {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function requestTenantDocuments(token: string): Promise<TenantDocument[]> {
  const response = await fetch('/api/admin/tenant/documents', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const responseBody = await response.json();

  if (!response.ok) {
    throw new Error(responseBody.message ?? 'No fue posible cargar documentos');
  }

  return responseBody;
}

export default function DocumentsPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<TenantDocument[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [ingestingDocumentId, setIngestingDocumentId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    async function loadDocuments(): Promise<void> {
      const token = localStorage.getItem('tenant-ai-admin-token');

      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const responseBody = await requestTenantDocuments(token);
        setDocuments(responseBody);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'No fue posible cargar documentos',
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadDocuments();
  }, [router]);

  async function handleUploadDocument(
    event: SyntheticEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setError(null);

    if (!selectedFile) {
      setError('Selecciona un archivo antes de subirlo');
      return;
    }

    const token = localStorage.getItem('tenant-ai-admin-token');

    if (!token) {
      router.push('/login');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);

    setIsUploading(true);

    const response = await fetch('/api/admin/tenant/documents', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const responseBody = await response.json();

    setIsUploading(false);

    if (!response.ok) {
      setError(responseBody.message ?? 'No fue posible subir el documento');
      return;
    }

    setSelectedFile(null);
    setDocuments(await requestTenantDocuments(token));
  }

  async function handleIngestDocument(documentId: string): Promise<void> {
    setError(null);

    const token = localStorage.getItem('tenant-ai-admin-token');

    if (!token) {
      router.push('/login');
      return;
    }

    setIngestingDocumentId(documentId);

    const response = await fetch(
      `/api/admin/tenant/documents/${documentId}/ingest`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const responseBody = await response.json();

    setIngestingDocumentId(null);

    if (!response.ok) {
      setError(responseBody.message ?? 'No fue posible ingestar el documento');
      return;
    }

    setDocuments(await requestTenantDocuments(token));
  }

  return (
    <AdminShell title="Documentos">
      <section className="admin-section">
        <h2>Subir documento</h2>
        <p className="muted">
          Carga archivos del tenant para dejarlos disponibles para el proceso de
          ingestion.
        </p>

        <form className="inline-form" onSubmit={handleUploadDocument}>
          <input
            type="file"
            accept=".txt,.pdf,text/plain,application/pdf"
            onChange={(event) => {
              setSelectedFile(event.target.files?.[0] ?? null);
            }}
          />
          <button type="submit" disabled={isUploading}>
            {isUploading ? 'Subiendo...' : 'Subir documento'}
          </button>
        </form>
      </section>

      <section className="admin-section">
        <h2>Documentos del tenant</h2>
        <p className="muted">
          Lista de documentos registrados para el tenant autenticado.
        </p>

        {error ? <p className="form-error">{error}</p> : null}

        {isLoading ? <p className="muted">Cargando documentos...</p> : null}

        {!isLoading && documents.length === 0 ? (
          <p className="muted">
            Todavia no hay documentos cargados para este tenant.
          </p>
        ) : null}

        {documents.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  <th>Tamano</th>
                  <th>Estado</th>
                  <th>Creado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((document) => (
                  <tr key={document.id}>
                    <td>{document.name}</td>
                    <td>{document.mimeType}</td>
                    <td>{formatBytes(document.sizeBytes)}</td>
                    <td>{document.status}</td>
                    <td>{new Date(document.createdAt).toLocaleString('es-CL')}</td>
                    <td>
                      {document.status === 'ready' ? (
                        <span className="muted">Listo</span>
                      ) : null}

                      {document.status === 'processing' ? (
                        <span className="muted">Procesando</span>
                      ) : null}

                      {document.status === 'uploaded' || document.status === 'failed' ? (
                        <button
                          type="button"
                          className="secondary-button"
                          disabled={ingestingDocumentId === document.id}
                          onClick={() => {
                            void handleIngestDocument(document.id);
                          }}
                        >
                          {ingestingDocumentId === document.id
                            ? 'Ingestando...'
                            : document.status === 'failed'
                              ? 'Reintentar'
                              : 'Ingestar'}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </AdminShell>
  );
}
