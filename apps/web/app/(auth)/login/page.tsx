import type { Metadata } from 'next';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Iniciar sesión' };

export default function LoginPage() {
  return (
    <div className="auth-box">
      <h1>Inicia sesión</h1>
      <p>Ingresa con tu cuenta del equipo.</p>
      <LoginForm />
    </div>
  );
}
