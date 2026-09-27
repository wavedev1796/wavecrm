"use client";

import { CheckCircle2, ExternalLink, FileText, X } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";

const PDF_URL = "/documents/terminos-y-privacidad-wave-crm.pdf";

type Props = Readonly<{
  accepted: boolean;
  onAcceptedChange: (accepted: boolean) => void;
}>;

export function TermsConsent({ accepted, onAcceptedChange }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [reachedEnd, setReachedEnd] = useState(false);

  const openTerms = () => dialogRef.current?.showModal();
  const closeTerms = () => dialogRef.current?.close();

  return (
    <>
      <input type="hidden" name="termsAccepted" value={accepted ? "true" : "false"} />

      <div className={`terms-consent${accepted ? " is-accepted" : ""}`}>
        <input
          id="termsAccepted"
          className="terms-checkbox"
          type="checkbox"
          checked={accepted}
          onChange={() => {
            if (accepted) onAcceptedChange(false);
            else openTerms();
          }}
        />
        <div>
          <label htmlFor="termsAccepted">
            Acepto los términos y condiciones y la política de privacidad
          </label>
          <button className="terms-review" type="button" onClick={openTerms}>
            {accepted ? "Volver a leer el documento" : "Leer antes de aceptar"}
          </button>
        </div>
        {accepted && <CheckCircle2 className="terms-status" aria-label="Términos aceptados" />}
      </div>

      <dialog
        ref={dialogRef}
        className="terms-dialog"
        aria-labelledby="terms-title"
        onCancel={closeTerms}
      >
        <div className="terms-dialog-header">
          <div className="terms-dialog-icon"><FileText aria-hidden /></div>
          <div>
            <span>Documento legal · Versión 1.0</span>
            <h2 id="terms-title">Términos y política de privacidad</h2>
          </div>
          <button className="terms-close" type="button" onClick={closeTerms} aria-label="Cerrar">
            <X aria-hidden />
          </button>
        </div>

        <div
          className="terms-scroll"
          tabIndex={0} // NOSONAR: sin foco, con teclado no se puede desplazar hasta "Aceptar y continuar".
          onScroll={(event) => {
            const element = event.currentTarget;
            if (element.scrollHeight - element.scrollTop - element.clientHeight <= 12) {
              setReachedEnd(true);
            }
          }}
        >
          <div className="terms-document">
            <p className="terms-intro">
              Este documento explica cómo Wave CRM trata tus datos personales y las condiciones
              que aceptas al activar tu cuenta. Desplázate hasta el final para habilitar la aceptación.
            </p>

            <h3>1. Responsable y alcance</h3>
            <p>
              Wave CRM es una plataforma de gestión comercial operada por The Wave Sea. Estas
              condiciones se aplican a las personas invitadas por una organización para usar la
              plataforma y a los datos que tratan dentro de ella.
            </p>

            <h3>2. Datos que tratamos</h3>
            <p>
              Podemos tratar tu nombre, correo, rol, credenciales protegidas, datos de sesión y
              registros de auditoría. También procesamos los datos de contactos, empresas,
              actividades y negocios que la organización ingresa en el CRM.
            </p>

            <h3>3. Finalidades y base del tratamiento</h3>
            <p>
              Usamos la información para crear y proteger tu cuenta, prestar las funciones del CRM,
              mantener trazabilidad, prevenir accesos indebidos, brindar soporte y cumplir
              obligaciones legales. El tratamiento se sustenta en tu consentimiento, en la relación
              con la organización que te invita y en las obligaciones aplicables.
            </p>

            <h3>4. Tus responsabilidades</h3>
            <p>
              Debes mantener tus credenciales seguras, usar información exacta, respetar los permisos
              asignados y no ingresar ni utilizar datos personales sin autorización. No puedes intentar
              vulnerar la seguridad, interferir con el servicio o usarlo para fines ilícitos.
            </p>

            <h3>5. Conservación y destinatarios</h3>
            <p>
              Conservamos los datos durante el tiempo necesario para prestar el servicio, mantener la
              seguridad y atender obligaciones legales. Solo se comparten con proveedores necesarios
              para operar la plataforma, autoridades cuando la ley lo exige o terceros autorizados.
              No comercializamos tus datos personales.
            </p>

            <h3>6. Tus derechos</h3>
            <p>
              Puedes solicitar acceso, actualización, rectificación, eliminación, oposición,
              suspensión o portabilidad según corresponda. Puedes ejercerlos por medio del
              administrador de tu organización o mediante los canales publicados por The Wave Sea.
            </p>

            <h3>7. Seguridad, cookies y cambios</h3>
            <p>
              Aplicamos controles técnicos y organizativos razonables, aunque ningún sistema elimina
              por completo el riesgo. Utilizamos cookies o almacenamiento indispensable para sesión y
              seguridad. Si existe un cambio material en estas condiciones, se publicará una nueva
              versión y podrá solicitarse una nueva aceptación.
            </p>

            <h3>8. Declaración de aceptación</h3>
            <p>
              Al seleccionar “Aceptar y continuar” declaras que leíste este documento completo,
              comprendiste su contenido y aceptas los términos de uso y el tratamiento de datos aquí
              descrito. Tu aceptación se registra junto con la fecha y la versión vigente.
            </p>

            <div className="terms-document-end">
              <CheckCircle2 aria-hidden />
              <div>
                <strong>Fin del documento</strong>
                <span>Ya puedes aceptar y continuar con la activación.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="terms-dialog-footer">
          <a href={PDF_URL} target="_blank" rel="noreferrer">
            <ExternalLink aria-hidden /> Abrir PDF completo
          </a>
          <div>
            {!reachedEnd && <span>Lee hasta el final para continuar</span>}
            <Button
              type="button"
              disabled={!reachedEnd}
              onClick={() => {
                onAcceptedChange(true);
                closeTerms();
              }}
            >
              Aceptar y continuar
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
