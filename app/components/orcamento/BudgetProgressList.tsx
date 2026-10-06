"use client";

import { Progress, Tag } from "antd";
import type { OrcamentoCategoria, EstadoOrcamento } from "@/lib/orcamento";
import { formatCurrency } from "@/utils";

const CORES: Record<EstadoOrcamento, string> = {
  ok: "#16a34a",
  alerta: "#f59e0b",
  excedido: "#dc2626",
};

interface BudgetProgressListProps {
  itens: OrcamentoCategoria[];
}

export default function BudgetProgressList({ itens }: BudgetProgressListProps) {
  if (itens.length === 0) {
    return (
      <p className="text-ink-soft text-sm">Ainda não definiste categorias.</p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {itens.map((item) => {
        const excedido = item.estado === "excedido";
        const pct = Number.isFinite(item.usado) ? Math.round(item.usado * 100) : 100;
        return (
          <div
            key={item.nome}
            className={`border rounded-xl p-4 transition ${
              excedido
                ? "border-red-300 bg-red-50"
                : "border-line bg-surface"
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="font-medium text-ink truncate">
                {item.nome}{" "}
                <span className="text-ink-soft text-xs font-normal">
                  ({item.percentagem}% do salário)
                </span>
              </span>
              {excedido && <Tag color="red">Excedido</Tag>}
              {item.estado === "alerta" && <Tag color="orange">Quase no limite</Tag>}
            </div>
            <Progress
              percent={Math.min(pct, 100)}
              strokeColor={CORES[item.estado]}
              showInfo={false}
            />
            <div className="flex justify-between text-sm mt-1">
              <span className={excedido ? "text-red-600 font-semibold" : "text-ink"}>
                {formatCurrency(item.gasto, "EUR")} de{" "}
                {formatCurrency(item.limite, "EUR")}
              </span>
              <span className={excedido ? "text-red-600 font-semibold" : "text-ink-soft"}>
                {excedido
                  ? `+${formatCurrency(item.gasto - item.limite, "EUR")}`
                  : `${pct}%`}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
