import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Iniciar sesión' };

export default async function LoginPage() {
  if (await getSession()) redirect('/pipeline');

  return (
    <div className="auth-box">
      <h1>Inicia sesión</h1>
      <p>Ingresa con tu cuenta del equipo.</p>
      <LoginForm />
    </div>
  );
}
