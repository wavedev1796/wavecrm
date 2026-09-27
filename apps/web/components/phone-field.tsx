import { FieldError, invalidProps } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { COUNTRIES } from "@/lib/phone";

type Props = Readonly<{
  id: string;
  country: string;
  number: string;
  error?: string;
}>;

/** Prefijo del país (Ecuador por defecto) y número. Un número escrito con `+` manda sobre el selector. */
export function PhoneField({ id, country, number, error }: Props) {
  return (
    <div className="form-field">
      <label htmlFor={id}>Teléfono</label>
      <div className="phone-field">
        <select
          name="phoneCountry"
          defaultValue={country}
          aria-label="País del teléfono"
        >
          {COUNTRIES.map(({ code, label }) => (
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
