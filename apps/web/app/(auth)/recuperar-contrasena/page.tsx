import type { Metadata } from 'next';
import { ForgotPasswordForm } from './forgot-password-form';

export const metadata: Metadata = { title: 'Recuperar contraseña' };

export default function RecuperarContrasenaPage() {
  return (
    <div className="auth-box">
      <ForgotPasswordForm />
    </div>
  );
}
