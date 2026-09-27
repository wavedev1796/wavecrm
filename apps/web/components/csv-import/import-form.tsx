"use client";

import { FileUp } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldError, invalidProps } from "@/components/ui/field-error";
import { Table } from "@/components/ui/table";
import type { ImportState } from "@/lib/csv-import";
import {
  guessMapping,
  readCsvHeader,
  type ImportFieldSpec,
} from "./csv-header";

type Mapping = Record<string, string>;

// Mismo límite que el API. Se revisa al elegir el archivo porque Next rechaza por su cuenta
// una server action de más de 2 MB y esa respuesta rompe la página en vez de mostrar un aviso.
const MAX_FILE_BYTES = 1024 * 1024;

/** Solo los campos con una columna que exista en el archivo. */
const chosen = (mapping: Mapping, columns: string[]): Mapping =>
  Object.fromEntries(
    Object.entries(mapping).filter(
      ([, column]) => column && columns.includes(column),
    ),
  );

type Props = Readonly<{
  fields: readonly ImportFieldSpec[];
  action: (state: ImportState, formData: FormData) => Promise<ImportState>;
  /** "contactos", "empresas": botón "Importar …" y enlace "Ver …". */
  noun: string;
  listHref: string;
}>;

export function ImportForm({ fields, action, noun, listHref }: Props) {
  const [state, formAction, pending] = useActionState<ImportState, FormData>(
    async (previous, formData) => {
      const next = await action(previous, formData);
      // React vacía el formulario al terminar la acción: se vuelve a elegir el archivo (el corregido,
      // si hubo errores) y el mapeo hecho a mano se conserva para él.
      setColumns([]);
      return next;
    },
    null,
  );
  const [columns, setColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Mapping>({});
  const [fileError, setFileError] = useState<string | null>(null);

  async function chooseFile(file: File | undefined) {
    const tooLarge = file && file.size > MAX_FILE_BYTES;
    const header = file && !tooLarge ? await readCsvHeader(file) : [];
    setColumns(header);
    if (tooLarge)
      setFileError("El archivo supera 1 MB. Divídelo en partes más pequeñas.");
    else if (file && !header.length)
      setFileError("El archivo no tiene una fila de cabecera.");
    else setFileError(null);
    // Lo elegido a mano se conserva si el archivo corregido trae la misma columna.
    setMapping((current) => ({
      ...guessMapping(header, fields),
      ...chosen(current, header),
    }));
  }

  return (
    <>
      <form
        action={formAction}
        className="import-form"
        noValidate
        aria-busy={pending || undefined}
      >
        <div className="form-field">
          <label>
            Archivo CSV{" "}
            <input
              name="file"
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => chooseFile(event.currentTarget.files?.[0])}
              {...invalidProps("import-file", fileError)}
            />
          </label>
          <FieldError id="import-file" message={fileError} />
        </div>

        {columns.length > 0 && (
          <fieldset className="import-mapping">
            <legend>¿Qué columna del archivo corresponde a cada dato?</legend>
            {fields.map(({ field, label, required }) => (
              <label key={field} className="form-field">
                {required ? `${label} *` : label}
                <select
                  value={mapping[field] ?? ""}
                  onChange={(event) =>
                    setMapping({ ...mapping, [field]: event.target.value })
                  }
                >
                  <option value="">
                    {required ? "Elige una columna" : "No importar"}
                  </option>
                  {columns.map((column) => (
                    <option key={column} value={column}>
                      {column}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </fieldset>
        )}

        <input
          type="hidden"
          name="mapping"
          value={JSON.stringify(chosen(mapping, columns))}
        />
        <Button type="submit" loading={pending} disabled={!columns.length}>
          <FileUp aria-hidden />
          {`Importar ${noun}`}
        </Button>
      </form>

      {/* Fuera del form: al terminar la acción React lo resetea, y el reset de <output> borra su contenido. */}
      {state && (
        <Alert tone={state.tone}>
          {state.message}
          {state.tone === "success" && (
            <>
              {" "}
              <Link href={listHref}>{`Ver ${noun}`}</Link>
            </>
          )}
        </Alert>
      )}
      {state?.errors.length ? (
        <>
          <Table className="import-errors" aria-label="Errores por fila">
            <thead>
              <tr>
                <th scope="col">Fila</th>
                <th scope="col">Columna</th>
                <th scope="col">Error</th>
              </tr>
            </thead>
            <tbody>
              {state.errors.map(({ row, column, message }) => (
                <tr key={`${row}-${column}-${message}`}>
                  <td>{row}</td>
                  <td>{column}</td>
                  <td>{message}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          <p className="import-hint">
            Corrige esas filas en el archivo y vuelve a elegirlo para
            importarlo.
          </p>
        </>
      ) : null}
    </>
  );
}
