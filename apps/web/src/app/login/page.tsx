'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: formData.get('email'),
        password: formData.get('password'),
      }),
    });

    const responseBody = await response.json();

    setIsSubmitting(false);

    if (!response.ok) {
      setError(responseBody.message ?? 'No fue posible iniciar sesión');
      return;
    }

    localStorage.setItem('tenant-ai-admin-token', responseBody.accessToken);
    router.push('/dashboard');
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-copy">
          <p className="eyebrow">Tenant AI Admin</p>
          <h1>Acceso administrador</h1>
          <p>
            Ingresa al panel para administrar documentos, API keys y visibilidad
            de uso de tu tenant.
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              name="email"
              placeholder="admin@empresa.cl"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              name="password"
              placeholder="password"
              required
            />
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Ingresando...' : 'Ingresar'}
          </button>

          <p className="form-footer">
            ¿Aún no tienes cuenta? <Link href="/register">Crear cuenta</Link>
          </p>
        </form>
      </section>
    </main>
  );
}