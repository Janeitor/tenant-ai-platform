'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface AdminShellProps {
    children: React.ReactNode;
    title: string;
    actions?: React.ReactNode;
}

interface TenantSummary {
    tenant: {
        name: string;
    };
}

const navItems = [
    {
        href: '/dashboard',
        label: 'Dashboard',
    },
    {
        href: '/documents',
        label: 'Documentos',
    },
    {
        href: '/api-keys',
        label: 'API keys',
    },
    {
        href: '/usage',
        label: 'Uso',
    },
];

export function AdminShell({
    children,
    title,
    actions,
}: AdminShellProps) {
    const [tenantName, setTenantName] = useState<string | null>(null);

    useEffect(() => {
        async function loadTenantName() {
            const token = localStorage.getItem('tenant-ai-admin-token');

            if (!token) {
                return;
            }

            const response = await fetch('/api/admin/tenant/summary', {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                return;
            }

            const summary = (await response.json()) as TenantSummary;
            setTenantName(summary.tenant.name);
        }

        void loadTenantName();
    }, []);

    return (
        <main className="admin-layout">
            <aside className="sidebar">
                <div className="sidebar-brand">
                    <span>{tenantName ?? 'Tenant activo'}</span>
                    <strong>Admin</strong>
                </div>

                <nav className="sidebar-nav" aria-label="Admin navigation">
                    {navItems.map((item) => (
                        <Link key={item.href} href={item.href}>
                            {item.label}
                        </Link>
                    ))}
                </nav>
            </aside>

            <section className="admin-main">
                <header className="dashboard-header">
                    <div>
                        <h1>{title}</h1>
                    </div>

                    {actions}
                </header>

                {children}
            </section>
        </main>
    );
}