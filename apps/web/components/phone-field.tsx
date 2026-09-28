"use client";

import { useEffect, useState } from "react";
import { FieldError, invalidProps } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { callingCodeLabel, COUNTRIES, countryOrEcuador } from "@/lib/phone";

type Props = Readonly<{
  id: string;
  country: string;
  number: string;
  error?: string;
}>;

/** Prefijo del país (Ecuador por defecto) y número. Un número escrito con `+` manda sobre el selector. */
export function PhoneField({ id, country, number, error }: Props) {
  // Los nombres de país salen de Intl y Node no trae los mismos datos de idioma que el navegador: si el
  // servidor pintara la lista, la hidratación fallaría. Hasta montar se ve solo el país actual con su prefijo.
  const selected = countryOrEcuador(country);
  const [countries, setCountries] = useState<
    readonly { code: string; label: string }[]
  >([{ code: selected, label: callingCodeLabel(selected) }]);
  useEffect(() => setCountries(COUNTRIES), []);

  return (
    <div className="form-field">
      <label htmlFor={id}>Teléfono</label>
      <div className="phone-field">
        <select
          name="phoneCountry"
          defaultValue={selected}
          aria-label="País del teléfono"
        >
          {countries.map(({ code, label }) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </select>
        <Input
          id={id}
          name="phone"
          type="tel"
          defaultValue={number}
          placeholder="0991234567"
          {...invalidProps(id, error)}
        />
      </div>
      <FieldError id={id} message={error} />
    </div>
  );
}
