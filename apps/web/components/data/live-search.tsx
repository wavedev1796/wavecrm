"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { listHref, type ListParams } from "@/lib/list-params";
import { SEARCH_MAX } from "@/lib/validation";

const DELAY_MS = 300;

type Props = Readonly<{
  basePath: string;
  params: ListParams;
  label: string;
  placeholder: string;
}>;

/** Filtra mientras se escribe: 300 ms después de la última tecla cambia `search` en la URL. */
export function LiveSearch({ basePath, params, label, placeholder }: Props) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const sent = useRef(params.search ?? "");

  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    // La URL cambió sin escribir aquí (Limpiar, atrás): el cuadro muestra la búsqueda aplicada.
    const applied = params.search ?? "";
    if (applied !== sent.current && input.current) {
      input.current.value = applied;
      sent.current = applied;
    }
  }, [params.search]);

  return (
    <label className="contact-search">
      <Search aria-hidden />
      <span className="sr-only">{label}</span>
      <Input
        ref={input}
        name="search"
        defaultValue={params.search}
        maxLength={SEARCH_MAX}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(event) => {
          const search = event.currentTarget.value.trim();
          clearTimeout(timer.current);
          timer.current = setTimeout(() => {
            sent.current = search;
            router.replace(listHref(basePath, { ...params, search }), {
              scroll: false,
            });
          }, DELAY_MS);
        }}
      />
    </label>
  );
}
