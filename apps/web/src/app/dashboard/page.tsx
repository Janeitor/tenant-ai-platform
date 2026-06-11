'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AdminShell } from '../../components/admin-shell';

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

export default function DashboardPage() {
    const router = useRouter();
    const [summary, setSummary] = useState<TenantSummary | null>(null);
    const [error, setError] = useState<string | null>(null);

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
        <AdminShell
            title="Dashboard"
            actions={
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
            }
        >

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
        </AdminShell>
    );
}