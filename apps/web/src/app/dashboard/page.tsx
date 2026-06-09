'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface TenantSummary {
    tenant: {
        id: string;
        name: string;
        slug: string;
    };
    metrics: {
        documents: number;
        chunks: number;
        usageLogs: number;
    };
    recentUsageLogs: Array<{
        id: string;
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
        createdAt: string;
    }>;
}

interface CreatedApiKey {
    id: string;
    name: string;
    keyPrefix: string;
    apiKey: string;
    createdAt: string;
}

export default function DashboardPage() {
    const router = useRouter();
    const [summary, setSummary] = useState<TenantSummary | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [apiKeyName, setApiKeyName] = useState('Production key');
    const [createdApiKey, setCreatedApiKey] = useState<CreatedApiKey | null>(null);
    const [apiKeyError, setApiKeyError] = useState<string | null>(null);
    const [isCreatingApiKey, setIsCreatingApiKey] = useState(false);

    useEffect(() => {
        async function loadSummary() {
            const token = localStorage.getItem('tenant-ai-admin-token');

            if (!token) {
                router.push('/login');
                return;
            }

            const response = await fetch('/api/admin/tenant/summary', {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const responseBody = await response.json();

            if (!response.ok) {
                setError(responseBody.message ?? 'No fue posible cargar el dashboard');
                return;
            }

            setSummary(responseBody);
        }

        void loadSummary();
    }, [router]);

    async function handleCreateApiKey(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const token = localStorage.getItem('tenant-ai-admin-token');

        if (!token) {
            router.push('/login');
            return;
        }

        setApiKeyError(null);
        setCreatedApiKey(null);
        setIsCreatingApiKey(true);

        const response = await fetch('/api/admin/tenant/api-keys', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: apiKeyName,
            }),
        });

        const responseBody = await response.json();

        setIsCreatingApiKey(false);

        if (!response.ok) {
            setApiKeyError(responseBody.message ?? 'No fue posible crear la API key');
            return;
        }

        setCreatedApiKey(responseBody);
    }

    if (error) {
        return (
            <main className="dashboard-page">
                <p className="form-error">{error}</p>
            </main>
        );
    }

    if (!summary) {
        return (
            <main className="dashboard-page">
                <p>Cargando dashboard...</p>
            </main>
        );
    }

    return (
        <main className="dashboard-page">
            <header className="dashboard-header">
                <div>
                    <p className="eyebrow">Tenant AI Admin</p>
                    <h1>{summary.tenant.name}</h1>
                </div>

                <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                        localStorage.removeItem('tenant-ai-admin-token');
                        router.push('/login');
                    }}
                >
                    Cerrar sesión
                </button>
            </header>

            <section className="dashboard-grid">
                <article className="metric-card">
                    <span>Documentos</span>
                    <strong>{summary.metrics.documents}</strong>
                </article>

                <article className="metric-card">
                    <span>Chunks</span>
                    <strong>{summary.metrics.chunks}</strong>
                </article>

                <article className="metric-card">
                    <span>Usage logs</span>
                    <strong>{summary.metrics.usageLogs}</strong>
                </article>
            </section>

            <section className="admin-section">
                <h2>API keys</h2>
                <p className="muted">
                    Crea una credencial para integrar la API RAG desde sistemas externos del tenant.
                </p>

                <form className="inline-form" onSubmit={handleCreateApiKey}>
                    <label>
                        Nombre de la API key
                        <input
                            type="text"
                            value={apiKeyName}
                            onChange={(event) => setApiKeyName(event.target.value)}
                            required
                        />
                    </label>

                    <button type="submit" disabled={isCreatingApiKey}>
                        {isCreatingApiKey ? 'Creando...' : 'Crear API key'}
                    </button>
                </form>

                {apiKeyError ? <p className="form-error">{apiKeyError}</p> : null}

                {createdApiKey ? (
                    <div className="secret-box">
                        <p className="eyebrow">API key generada</p>
                        <code>{createdApiKey.apiKey}</code>
                        <p>
                            Copia esta API key ahora. Por seguridad, no se volverá a mostrar en texto plano.
                        </p>
                    </div>
                ) : null}
            </section>

            <section className="admin-section">
                <h2>Uso reciente</h2>

                {summary.recentUsageLogs.length === 0 ? (
                    <p className="muted">Todavía no existen consultas registradas para este tenant.</p>
                ) : (
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Provider</th>
                                    <th>Modelo</th>
                                    <th>Tokens</th>
                                    <th>Chunks</th>
                                </tr>
                            </thead>
                            <tbody>
                                {summary.recentUsageLogs.map((usageLog) => (
                                    <tr key={usageLog.id}>
                                        <td>{new Date(usageLog.createdAt).toLocaleString('es-CL')}</td>
                                        <td>{usageLog.provider}</td>
                                        <td>{usageLog.model}</td>
                                        <td>{usageLog.totalTokens ?? '-'}</td>
                                        <td>{usageLog.selectedChunks ?? '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </main>
    );
}