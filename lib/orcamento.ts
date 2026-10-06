import type { Categoria, Expense, Salario } from "@/types";

export type EstadoOrcamento = "ok" | "alerta" | "excedido";

export interface OrcamentoCategoria {
  nome: string;
  percentagem: number;
  limite: number;
  gasto: number;
  usado: number; // fração do limite usada (1 = 100%)
  estado: EstadoOrcamento;
}

// A partir desta fração do limite a categoria fica em alerta (laranja)
export const LIMIAR_ALERTA = 0.8;

const round2 = (n: number) => Math.round(n * 100) / 100;

export const chaveMes = (year: number, month: number) =>
  `${year}-${String(month + 1).padStart(2, "0")}`;

/** Salário do mês, ou o do mês anterior mais recente se não houver registo. */
export function salarioDoMes(
  salarios: Salario[],
  year: number,
  month: number,
): Salario | null {
  const chave = chaveMes(year, month);
  return (
    [...salarios]
      .filter((s) => s.mes <= chave)
      .sort((a, b) => b.mes.localeCompare(a.mes))[0] ?? null
  );
}

export function estadoDe(usado: number): EstadoOrcamento {
  if (usado > 1) return "excedido";
  if (usado >= LIMIAR_ALERTA) return "alerta";
  return "ok";
}

export function orcamentoDoMes(
  expenses: Expense[],
  categorias: Categoria[],
  salario: number,
  year: number,
  month: number,
): OrcamentoCategoria[] {
  const gastos = new Map<string, number>();
  for (const e of expenses) {
    if (!e.categoria) continue;
    const d = new Date(e.data);
    if (d.getFullYear() !== year || d.getMonth() !== month) continue;
    gastos.set(e.categoria, (gastos.get(e.categoria) ?? 0) + (e.custoEUR ?? 0));
  }

  return categorias.map((c) => {
    const limite = round2((salario * c.percentagem) / 100);
    const gasto = round2(gastos.get(c.nome) ?? 0);
    const usado = limite > 0 ? gasto / limite : gasto > 0 ? Infinity : 0;
    return {
      nome: c.nome,
      percentagem: c.percentagem,
      limite,
      gasto,
      usado,
      estado: estadoDe(usado),
    };
  });
}
