'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { AdminShell } from '../../components/admin-shell';

interface UsageLog {
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
}

interface TenantSummary {
    recentUsageLogs: UsageLog[];
}

export default function UsagePage() {
    const router = useRouter();
    const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function loadUsage() {
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

            setIsLoading(false);

            if (!response.ok) {
                setError(responseBody.message ?? 'No fue posible cargar uso');
                return;
            }

            const summary = responseBody as TenantSummary;
            setUsageLogs(summary.recentUsageLogs);
        }

        void loadUsage();
    }, [router]);

    return (
        <AdminShell title="Uso">
            <section className="admin-section">
                <h2>Uso reciente</h2>
                <p className="muted">
                    Últimas consultas registradas para el tenant autenticado.
                </p>

                {error ? <p className="form-error">{error}</p> : null}

                {isLoading ? <p className="muted">Cargando uso...</p> : null}

                {!isLoading && usageLogs.length === 0 ? (
                    <p className="muted">Todavía no existen consultas registradas para este tenant.</p>
                ) : null}

                {usageLogs.length > 0 ? (
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Provider</th>
                                    <th>Modelo</th>
                                    <th>Input</th>
                                    <th>Output</th>
                                    <th>Total</th>
                                    <th>Chunks</th>
                                </tr>
                            </thead>
                            <tbody>
                                {usageLogs.map((usageLog) => (
                                    <tr key={usageLog.id}>
                                        <td>{new Date(usageLog.createdAt).toLocaleString('es-CL')}</td>
                                        <td>{usageLog.provider}</td>
                                        <td>{usageLog.model}</td>
                                        <td>{usageLog.inputTokens ?? '-'}</td>
                                        <td>{usageLog.outputTokens ?? '-'}</td>
                                        <td>{usageLog.totalTokens ?? '-'}</td>
                                        <td>{usageLog.selectedChunks ?? '-'}</td>
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