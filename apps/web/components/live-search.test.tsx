import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { LiveSearch } from "./live-search";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  replace.mockClear();
});

const props = {
  basePath: "/contactos",
  label: "Buscar contacto",
  placeholder: "Buscar",
};

test("espera 300 ms tras la última tecla, conserva los filtros aplicados y vuelve a la página 1", () => {
  render(
    <LiveSearch {...props} params={{ province: "Pichincha", tag: "vip" }} />,
  );
  const input = screen.getByLabelText("Buscar contacto");
  fireEvent.change(input, { target: { value: "Edu" } });
  act(() => vi.advanceTimersByTime(200));
  fireEvent.change(input, { target: { value: " Eduardo " } });
  act(() => vi.advanceTimersByTime(299));
  expect(replace).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(1));
  expect(replace).toHaveBeenCalledTimes(1);
  expect(replace).toHaveBeenCalledWith(
    "/contactos?search=Eduardo&province=Pichincha&tag=vip",
    { scroll: false },
  );
});

test("si la URL cambia por fuera (Limpiar, atrás) el cuadro muestra lo aplicado", () => {
  const view = render(<LiveSearch {...props} params={{ search: "Ana" }} />);
  expect(screen.getByLabelText("Buscar contacto")).toHaveValue("Ana");
  view.rerender(<LiveSearch {...props} params={{}} />);
  expect(screen.getByLabelText("Buscar contacto")).toHaveValue("");
});
