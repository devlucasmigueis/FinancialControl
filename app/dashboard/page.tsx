"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import type { Categoria, Expense, Salario } from "@/types";
import { orcamentoDoMes, salarioDoMes } from "@/lib/orcamento";
import BudgetProgressList from "@/app/components/orcamento/BudgetProgressList";
import {
  deltaVsMesAnterior,
  gastosDoMes,
  gastosPorDiaDoMes,
  gastosPorMes,
  mediaDiaria,
  mesesDisponiveis,
  topDescricoes,
} from "./utils/aggregations";
import HeroKpi from "./components/HeroKpi";
import KpiCard from "./components/KpiCard";
import MonthSelector from "./components/MonthSelector";
import Section from "./components/Section";
import MonthlyAreaChart from "./components/MonthlyAreaChart";
import MonthlyBarChart from "./components/MonthlyBarChart";
import TopDescricoesChart from "./components/TopDescricoesChart";

export default function DashboardPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [salarios, setSalarios] = useState<Salario[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/expenses").then((r) => r.json()),
      fetch("/api/categorias").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/salario").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([e, c, s]: [Expense[], Categoria[], Salario[]]) => {
        setExpenses(e);
        setCategorias(c);
        setSalarios(s);
      })
      .catch((err) => console.error("Erro ao carregar gastos:", err))
      .finally(() => setLoading(false));
  }, []);

  const meses = useMemo(() => mesesDisponiveis(expenses), [expenses]);

  const effectiveKey = selectedKey ?? meses[0]?.key ?? null;

  const selected = useMemo(
    () => meses.find((m) => m.key === effectiveKey) ?? null,
    [meses, effectiveKey],
  );

  const stats = useMemo(() => {
    if (!selected) return null;
    const { year, month } = selected;
    return {
      bucket: gastosDoMes(expenses, year, month),
      porDia: gastosPorDiaDoMes(expenses, year, month),
      porMes: gastosPorMes(expenses, 12, new Date(year, month, 1)),
      top: topDescricoes(expenses, year, month, 5),
      media: mediaDiaria(expenses, year, month),
      delta: deltaVsMesAnterior(expenses, year, month),
      orcamento: orcamentoDoMes(
        expenses,
        categorias,
        salarioDoMes(salarios, year, month)?.valor ?? 0,
        year,
        month,
      ),
      year,
      month,
    };
  }, [expenses, categorias, salarios, selected]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-ink-soft">
        <p className="text-base">A carregar…</p>
      </div>
    );
  }

  if (!selected || !stats) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 text-ink-soft px-6">
        <p className="text-2xl font-medium text-ink">Ainda sem gastos</p>
        <p className="text-sm">
          Regista o teu primeiro gasto para veres estatísticas.
        </p>
        <Link
          href="/registar"
          className="px-6 py-3 rounded-full bg-brand text-white hover:bg-brand/90 transition shadow-sm"
        >
          Registar gasto
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-14">
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center justify-between mb-10"
      >
        <Link
          href="/"
          className="text-ink-soft hover:text-ink text-sm tracking-wide flex items-center gap-2 transition"
        >
          <span aria-hidden>←</span> Voltar
        </Link>
        <p className="text-brand text-xs font-semibold tracking-widest uppercase">
          Dashboard
        </p>
      </motion.header>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="mb-10"
      >
        <MonthSelector
          meses={meses}
          selectedKey={effectiveKey}
          onChange={setSelectedKey}
        />
      </motion.div>

      <Section title={selected.label} delay={0.05}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10">
          <div className="lg:col-span-7 lg:pr-6">
            <HeroKpi
              key={`hero-${selected.key}`}
              totalEUR={stats.bucket.totalEUR}
              totalBRL={stats.bucket.totalBRL}
              deltaEUR={stats.delta.pctEUR}
              monthLabel={selected.label}
            />
          </div>
          <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            <KpiCard
              key={`media-${selected.key}`}
              label="Média / dia"
              value={stats.media.eur}
              currency="EUR"
              fractionDigits={2}
              delay={0.1}
            />
            <KpiCard
              key={`count-${selected.key}`}
              label="Nº de gastos"
              value={stats.bucket.count}
              fractionDigits={0}
              delay={0.2}
            />
            <KpiCard
              key={`maior-${selected.key}`}
              label="Maior gasto"
              value={stats.bucket.maiorGasto?.valor ?? 0}
              currency="EUR"
              hint={stats.bucket.maiorGasto?.descricao}
              delay={0.3}
            />
          </div>
        </div>
      </Section>

      {categorias.length > 0 && (
        <Section
          title="Orçamento por categoria"
          description="Quanto do limite (baseado no salário) já usaste em cada categoria."
        >
          <BudgetProgressList itens={stats.orcamento} />
        </Section>
      )}

      <Section
        title="Tendência diária"
        description="Quanto gastaste em cada dia do mês selecionado."
      >
        <MonthlyAreaChart
          key={`area-${selected.key}`}
          data={stats.porDia}
          monthLabel={selected.label}
        />
      </Section>

      <Section
        title="Onde gastaste"
        description="Top 5 descrições por valor total no mês."
      >
        <TopDescricoesChart
          key={`top-${selected.key}`}
          data={stats.top}
          monthLabel={selected.label}
        />
      </Section>

      <Section
        title="Últimos 12 meses"
        description="Comparação mês a mês. Clica numa barra para selecionar esse mês."
      >
        <MonthlyBarChart
          data={stats.porMes}
          selectedKey={effectiveKey}
          onSelect={setSelectedKey}
        />
      </Section>

      <div className="h-12" />
    </div>
  );
}
