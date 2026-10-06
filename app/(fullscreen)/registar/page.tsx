"use client";

import { useCallback, useEffect, useState } from "react";
import { message } from "antd";
import ExpenseForm from "@/app/components/expense-form/ExpenseForm";
import { Categoria, Expense, ExpenseFormValues, Salario } from "@/types";
import { orcamentoDoMes, salarioDoMes } from "@/lib/orcamento";
import { formatCurrency } from "@/utils";

export default function RegistarPage() {
  const [loading, setLoading] = useState(false);
  const [descricoes, setDescricoes] = useState<string[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);

  const fetchDescricoes = useCallback(async () => {
    try {
      const response = await fetch("/api/expenses/descriptions");
      if (!response.ok) return;
      const data: string[] = await response.json();
      setDescricoes(data);
    } catch (error) {
      console.error("Erro ao buscar descrições:", error);
    }
  }, []);

  useEffect(() => {
    fetchDescricoes();
    fetch("/api/categorias")
      .then((r) => (r.ok ? r.json() : []))
      .then(setCategorias)
      .catch((error) => console.error("Erro ao buscar categorias:", error));
  }, [fetchDescricoes]);

  // Avisa se o gasto registado fez a categoria passar do limite do mês
  const verificarOrcamento = async (values: ExpenseFormValues) => {
    const categoria = categorias.find((c) => c.nome === values.categoria);
    if (!categoria) return;
    const [expenses, salarios]: [Expense[], Salario[]] = await Promise.all([
      fetch("/api/expenses").then((r) => r.json()),
      fetch("/api/salario").then((r) => r.json()),
    ]);
    const data = new Date(values.data);
    const salario = salarioDoMes(salarios, data.getFullYear(), data.getMonth());
    if (!salario) return;
    const [item] = orcamentoDoMes(
      expenses,
      [categoria],
      salario.valor,
      data.getFullYear(),
      data.getMonth(),
    );
    if (item.estado === "excedido") {
      message.error(
        `Passaste o orçamento de ${item.nome}: ${formatCurrency(item.gasto, "EUR")} de ${formatCurrency(item.limite, "EUR")}`,
        6,
      );
    } else if (item.estado === "alerta") {
      message.warning(
        `${item.nome} está quase no limite: ${formatCurrency(item.gasto, "EUR")} de ${formatCurrency(item.limite, "EUR")}`,
        5,
      );
    }
  };

  const handleSubmit = async (values: ExpenseFormValues) => {
    setLoading(true);
    try {
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) throw new Error("Erro ao guardar");

      message.success("Gasto registado com sucesso!");
      fetchDescricoes();
      verificarOrcamento(values).catch((error) => console.error(error));
    } catch (error) {
      console.error(error);
      message.error("Erro ao registar gasto");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="col-span-4 md:col-start-2 md:col-span-6 xl:col-start-4 xl:col-span-6 bg-surface border border-line shadow-sm p-3 md:p-4 rounded-xl md:rounded-2xl">
      <div className="flex justify-center">
        <h1 className="text-ink text-xl md:text-2xl font-bold mb-3 md:mb-4 tracking-tight">Registar Gasto</h1>
      </div>
      <ExpenseForm
        onSubmit={handleSubmit}
        loading={loading}
        descricoesAnteriores={descricoes}
        categorias={categorias.map((c) => c.nome)}
      />
    </div>
  );
}
