"use client";

import { useState } from "react";
import { Field } from "@/components/form-field";
import { invalidProps } from "@/components/ui/field-error";
import { Select } from "@/components/ui/select";
import { COMUN } from "@/content/comun";
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
      <Field id={provinceId} label={COMUN.formulario.provincia} error={provinceError}>
        <Select
          id={provinceId}
          name="province"
          value={province}
          onChange={(event) => {
            setProvince(event.target.value);
            setCanton("");
          }}
          {...invalidProps(provinceId, provinceError)}
        >
          <option value="">{COMUN.formulario.sinProvincia}</option>
          {PROVINCES.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </Select>
      </Field>
      <Field id={cantonId} label={COMUN.formulario.canton} error={cantonError}>
        <Select
          id={cantonId}
          name="city"
          value={canton}
          onChange={(event) => setCanton(event.target.value)}
          disabled={!province}
          {...invalidProps(cantonId, cantonError)}
        >
          <option value="">
            {province
              ? COMUN.formulario.sinCanton
              : COMUN.formulario.eligeProvincia}
          </option>
          {cantons.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </Select>
      </Field>
    </>
  );
}
