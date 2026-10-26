import "../../../styles/pipeline.css";

// Una sola importación para el tablero, la ficha, la papelera y el esqueleto: si loading.tsx importa la hoja,
// Next le da un chunk propio que solo se precarga y Chrome avisa "preloaded but not used" en cada refresh.
export default function PipelineLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
