"use client";

import { useState } from "react";
import { Field } from "@/components/form-field";
import { invalidProps } from "@/components/ui/field-error";
import { cantonsForProvince } from "@/lib/cantons";
import { PROVINCES } from "@/lib/ecuador";

type Props = Readonly<{
  idPrefix: string;
  initialProvince: string;
  initialCanton: string;
  provinceError?: string;
  cantonError?: string;
}>;

export function LocationFields({
  idPrefix,
  initialProvince,
  initialCanton,
  provinceError,
  cantonError,
}: Props) {
  const [province, setProvince] = useState(initialProvince);
  const [canton, setCanton] = useState(initialCanton);
  const cantons = cantonsForProvince(province);

  const provinceId = `${idPrefix}-province`;
  const cantonId = `${idPrefix}-city`;

  return (
    <>
      <Field id={provinceId} label="Provincia" error={provinceError}>
        <select
          name="province"
          value={province}
          onChange={(event) => {
            setProvince(event.target.value);
            setCanton("");
          }}
          {...invalidProps(provinceId, provinceError)}
        >
          <option value="">Sin provincia</option>
          {PROVINCES.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </Field>
      <Field id={cantonId} label="Cantón" error={cantonError}>
        <select
          name="city"
          value={canton}
          onChange={(event) => setCanton(event.target.value)}
          disabled={!province}
          {...invalidProps(cantonId, cantonError)}
        >
          <option value="">
            {province ? "Sin cantón" : "Elige una provincia"}
          </option>
          {cantons.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </Field>
    </>
  );
}
