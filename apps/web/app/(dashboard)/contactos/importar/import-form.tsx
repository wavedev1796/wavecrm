"use client";

import { FileUp } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Table } from "@/components/ui/table";
import { importContacts, type ImportState } from "./actions";
import {
  guessMapping,
  IMPORT_FIELDS,
  readCsvHeader,
  type ImportField,
} from "./csv-header";

type Mapping = Partial<Record<ImportField, string>>;

/** Solo los campos con una columna que exista en el archivo. */
const chosen = (mapping: Mapping, columns: string[]): Mapping =>
  Object.fromEntries(
    Object.entries(mapping).filter(
      ([, column]) => column && columns.includes(column),
    ),
  );

export function ImportForm() {
  const [state, formAction, pending] = useActionState<ImportState, FormData>(
    importContacts,
    null,
  );
  const [columns, setColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Mapping>({});

  async function chooseFile(file: File | undefined) {
    const header = file ? await readCsvHeader(file) : [];
    setColumns(header);
    // Lo elegido a mano se conserva si el archivo corregido trae la misma columna.
    setMapping((current) => ({
      ...guessMapping(header),
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
        <label className="form-field">
          Archivo CSV
          <input
            name="file"
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => chooseFile(event.currentTarget.files?.[0])}
          />
        </label>

        {columns.length > 0 && (
          <fieldset className="import-mapping">
            <legend>¿Qué columna del archivo corresponde a cada dato?</legend>
            {IMPORT_FIELDS.map(({ field, label, ...rules }) => {
              const required = "required" in rules;
              return (
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
              );
            })}
          </fieldset>
        )}

        <input
          type="hidden"
          name="mapping"
          value={JSON.stringify(chosen(mapping, columns))}
        />
        <Button type="submit" loading={pending} disabled={!columns.length}>
          <FileUp aria-hidden />
          Importar contactos
        </Button>
      </form>

      {/* Fuera del form: al terminar la acción React lo resetea, y el reset de <output> borra su contenido. */}
      {state && (
        <Alert tone={state.tone}>
          {state.message}
          {state.tone === "success" && (
            <>
              {" "}
              <Link href="/contactos">Ver contactos</Link>
            </>
          )}
        </Alert>
      )}
      {state?.errors.length ? (
        <>
          <Table aria-label="Errores por fila">
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
