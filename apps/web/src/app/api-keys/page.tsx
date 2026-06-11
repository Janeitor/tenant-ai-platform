'use client';

import { useRouter } from 'next/navigation';
import { type SyntheticEvent, useEffect, useState } from 'react';

import { AdminShell } from '../../components/admin-shell';

interface CreatedApiKey {
    id: string;
    name: string;
    keyPrefix: string;
    apiKey: string;
    createdAt: string;
}

interface ListedApiKey {
    id: string;
    name: string;
    keyPrefix: string;
    createdAt: string;
    revokedAt: string | null;
}

export default function ApiKeysPage() {
    const router = useRouter();
    const [apiKeyName, setApiKeyName] = useState('Production key');
    const [createdApiKey, setCreatedApiKey] = useState<CreatedApiKey | null>(null);
    const [apiKeyError, setApiKeyError] = useState<string | null>(null);
    const [isCreatingApiKey, setIsCreatingApiKey] = useState(false);
    const [apiKeys, setApiKeys] = useState<ListedApiKey[]>([]);
    const [isLoadingApiKeys, setIsLoadingApiKeys] = useState(true);

    async function handleCreateApiKey(event: SyntheticEvent<HTMLFormElement>) {
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
        setApiKeys((currentApiKeys) => [
            {
                id: responseBody.id,
                name: responseBody.name,
                keyPrefix: responseBody.keyPrefix,
                createdAt: responseBody.createdAt,
                revokedAt: null,
            },
            ...currentApiKeys,
        ]);
    }

    useEffect(() => {
        async function loadInitialApiKeys() {
            const token = localStorage.getItem('tenant-ai-admin-token');

            if (!token) {
                router.push('/login');
                return;
            }

            const response = await fetch('/api/admin/tenant/api-keys', {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const responseBody = await response.json();

            setIsLoadingApiKeys(false);

            if (!response.ok) {
                setApiKeyError(responseBody.message ?? 'No fue posible cargar API keys');
                return;
            }

            setApiKeys(responseBody);
        }

        void loadInitialApiKeys();
    }, [router]);

    return (
        <AdminShell title="API keys">
            <section className="admin-section">
                <h2>Crear API key</h2>
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
                <h2>API keys existentes</h2>

                {isLoadingApiKeys ? <p className="muted">Cargando API keys...</p> : null}

                {!isLoadingApiKeys && apiKeys.length === 0 ? (
                    <p className="muted">Todavía no hay API keys creadas para este tenant.</p>
                ) : null}

                {apiKeys.length > 0 ? (
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    <th>Prefijo</th>
                                    <th>Estado</th>
                                    <th>Creada</th>
                                </tr>
                            </thead>
                            <tbody>
                                {apiKeys.map((apiKey) => (
                                    <tr key={apiKey.id}>
                                        <td>{apiKey.name}</td>
                                        <td>{apiKey.keyPrefix}</td>
                                        <td>{apiKey.revokedAt ? 'Revocada' : 'Activa'}</td>
                                        <td>{new Date(apiKey.createdAt).toLocaleString('es-CL')}</td>
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