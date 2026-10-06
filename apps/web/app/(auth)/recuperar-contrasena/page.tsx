import type { Metadata } from 'next';
import { ACCESO } from '@/content/acceso';
import { ForgotPasswordForm } from './forgot-password-form';

export const metadata: Metadata = { title: ACCESO.recuperar.titulo };

export default function RecuperarContrasenaPage() {
  return (
    <div className="auth-box">
      <ForgotPasswordForm />
    </div>
  );
}
