import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";
import { LocationFields } from "./location-fields";

const renderFields = (province = "", canton = "") =>
  render(
    <LocationFields
      idPrefix="contact"
      initialProvince={province}
      initialCanton={canton}
    />,
  );

test("deshabilita el canton hasta elegir una provincia", () => {
  renderFields();
  expect(screen.getByLabelText("Provincia")).toHaveClass("select-control");
  expect(screen.getByLabelText("Cantón")).toHaveClass("select-control");
  expect(screen.getByLabelText("Cantón")).toBeDisabled();
});

test("muestra solo los cantones de la provincia seleccionada", async () => {
  const user = userEvent.setup();
  renderFields();

  await user.selectOptions(screen.getByLabelText("Provincia"), "Pichincha");

  const canton = screen.getByLabelText("Cantón");
  expect(canton).toBeEnabled();
  expect(screen.getByRole("option", { name: "Quito" })).toBeInTheDocument();
  expect(screen.queryByRole("option", { name: "Cuenca" })).toBeNull();
});

test("reinicia el canton cuando cambia la provincia", async () => {
  const user = userEvent.setup();
  renderFields("Pichincha", "Quito");
  expect(screen.getByLabelText("Cantón")).toHaveValue("Quito");

  await user.selectOptions(screen.getByLabelText("Provincia"), "Azuay");

  expect(screen.getByLabelText("Cantón")).toHaveValue("");
  expect(screen.getByRole("option", { name: "Cuenca" })).toBeInTheDocument();
});
