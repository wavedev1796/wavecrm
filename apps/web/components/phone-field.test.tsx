import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { expect, test } from "vitest";
import { PhoneField } from "./phone-field";

test("el servidor no pinta nombres de país: dependen de los datos de idioma de cada entorno", () => {
  // Node y el navegador traen datos de Intl distintos; si el HTML del servidor llevara la lista, la
  // hidratación fallaría ("Hong Kong" en uno, "RAE de Hong Kong (China)" en otro).
  const html = renderToString(
    <PhoneField id="contact-phone" country="CO" number="" />,
  );
  expect(html).toContain("+57");
  expect(html).not.toContain("Colombia");
  expect(html.match(/<option/g)).toHaveLength(1);
});

test("Ecuador por defecto; el país y el número se editan por separado", () => {
  render(<PhoneField id="contact-phone" country="EC" number="" />);
  expect(screen.getByLabelText("País del teléfono")).toHaveValue("EC");
  expect(screen.getByLabelText("Teléfono")).toHaveAttribute("name", "phone");
  expect(screen.getByLabelText("Teléfono")).not.toHaveAttribute("aria-invalid");
});

test("al editar muestra el país guardado y marca el error del número", () => {
  render(
    <PhoneField
      id="contact-phone"
      country="CO"
      number="(601) 2345678"
      error="Escribe un teléfono válido, por ejemplo 0991234567 o +57 601 234 5678."
    />,
  );
  expect(screen.getByLabelText("País del teléfono")).toHaveValue("CO");
  expect(screen.getByLabelText("Teléfono")).toHaveValue("(601) 2345678");
  expect(screen.getByLabelText("Teléfono")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
});
