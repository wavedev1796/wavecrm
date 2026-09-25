import { Card } from "@/components/ui/card";
import { ImportForm } from "./import-form";

export default function ImportContactsPage() {
  return (
    <Card className="import-card">
      <h2>Importar contactos desde CSV</h2>
      <p>
        Guarda la hoja desde Excel como «CSV UTF-8» (o «CSV delimitado por
        comas»), elige qué columna corresponde a cada dato e impórtala.
      </p>
      <ul className="import-rules">
        <li>
          Nombre y apellido son obligatorios; el resto de columnas es opcional.
        </li>
        <li>
          Separa las etiquetas con comas dentro de la celda. El RUC debe ser de
          una empresa ya registrada.
        </li>
        <li>Máximo 1 MB y 1000 filas por archivo.</li>
        <li>
          Si alguna fila tiene errores no se guarda ninguna: corrige las filas
          indicadas y vuelve a subir el archivo.
        </li>
      </ul>
      <ImportForm />
    </Card>
  );
}
