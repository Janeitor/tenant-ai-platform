'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: formData.get('name'),
        email: formData.get('email'),
        password: formData.get('password'),
        companyName: formData.get('companyName'),
      }),
    });

    const responseBody = await response.json();

    setIsSubmitting(false);

    if (!response.ok) {
      setError(responseBody.message ?? 'No fue posible crear la cuenta');
      return;
    }

    localStorage.setItem('tenant-ai-admin-token', responseBody.accessToken);
    router.push('/dashboard');
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-copy">
          <p className="eyebrow">Nuevo tenant</p>
          <h1>Crear cuenta administradora</h1>
          <p>
            Este registro crea el tenant inicial y el primer usuario administrador
            de la empresa.
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Nombre
            <input
              type="text"
              name="name"
              placeholder="Admin Empresa"
              required
            />
          </label>

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
              placeholder="mínimo 8 caracteres"
              minLength={8}
              required
            />
          </label>

          <label>
            Empresa
            <input
              type="text"
              name="companyName"
              placeholder="Empresa Demo"
              required
            />
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>

          <p className="form-footer">
            ¿Ya tienes cuenta? <Link href="/login">Ingresar</Link>
          </p>
        </form>
      </section>
    </main>
  );
}