"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Alert,
  Button,
  DatePicker,
  Input,
  InputNumber,
  Popconfirm,
  Spin,
  message,
} from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import type { Categoria, Expense, Salario } from "@/types";
import { chaveMes, orcamentoDoMes, salarioDoMes } from "@/lib/orcamento";
import { formatCurrency } from "@/utils";
import BudgetProgressList from "@/app/components/orcamento/BudgetProgressList";

export default function OrcamentoPage() {
  const [loading, setLoading] = useState(true);
  const [mes, setMes] = useState<Dayjs>(dayjs());
  const [salarios, setSalarios] = useState<Salario[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [salarioInput, setSalarioInput] = useState<number | null>(null);
  const [novoNome, setNovoNome] = useState("");
  const [novaPct, setNovaPct] = useState<number | null>(null);

  const carregar = useCallback(async () => {
    try {
      const [s, c, e] = await Promise.all([
        fetch("/api/salario").then((r) => r.json()),
        fetch("/api/categorias").then((r) => r.json()),
        fetch("/api/expenses").then((r) => r.json()),
      ]);
      setSalarios(s);
      setCategorias(c);
      setExpenses(e);
    } catch (error) {
      console.error(error);
      message.error("Erro ao carregar orçamento");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const year = mes.year();
  const month = mes.month();
  const salarioAtual = salarioDoMes(salarios, year, month);
  const herdado = salarioAtual && salarioAtual.mes !== chaveMes(year, month);

  useEffect(() => {
    setSalarioInput(salarioAtual?.valor ?? null);
  }, [salarioAtual?.valor, salarioAtual?.mes]);

  const salario = salarioAtual?.valor ?? 0;
  const totalPct = categorias.reduce((acc, c) => acc + c.percentagem, 0);
  const itens = useMemo(
    () => orcamentoDoMes(expenses, categorias, salario, year, month),
    [expenses, categorias, salario, year, month],
  );

  const guardarSalario = async () => {
    if (salarioInput == null) return;
    const res = await fetch("/api/salario", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mes: chaveMes(year, month), valor: salarioInput }),
    });
    if (!res.ok) return message.error("Erro ao guardar salário");
    message.success("Salário guardado");
    carregar();
  };

  const adicionarCategoria = async () => {
    if (!novoNome.trim() || novaPct == null) return;
    const res = await fetch("/api/categorias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: novoNome, percentagem: novaPct }),
    });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: null }));
      return message.error(error ?? "Erro ao criar categoria");
    }
    setNovoNome("");
    setNovaPct(null);
    carregar();
  };

  const atualizarPct = async (c: Categoria, percentagem: number | null) => {
    if (percentagem == null || percentagem === c.percentagem) return;
    const res = await fetch("/api/categorias", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: c.id, nome: c.nome, percentagem }),
    });
    if (!res.ok) return message.error("Erro ao atualizar categoria");
    carregar();
  };

  const removerCategoria = async (id: string) => {
    const res = await fetch(`/api/categorias?id=${id}`, { method: "DELETE" });
    if (!res.ok) return message.error("Erro ao excluir categoria");
    carregar();
  };

  if (loading) {
    return (
      <div className="col-span-4 md:col-span-8 xl:col-span-12 flex justify-center items-center py-20">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="col-span-4 md:col-start-2 md:col-span-6 xl:col-start-3 xl:col-span-8 bg-surface border border-line shadow-sm p-4 md:p-6 rounded-xl md:rounded-2xl flex flex-col gap-6 overflow-y-auto thin-scrollbar">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-ink text-xl md:text-2xl font-bold tracking-tight">
          Orçamento
        </h1>
        <DatePicker
          picker="month"
          value={mes}
          onChange={(v) => v && setMes(v)}
          allowClear={false}
          format="MM/YYYY"
        />
      </div>

      <section className="bg-canvas border border-line rounded-lg p-4 flex flex-col gap-3">
        <h2 className="text-ink font-semibold">Salário do mês</h2>
        <div className="flex gap-2">
          <InputNumber
            className="w-full!"
            size="large"
            prefix="€"
            precision={2}
            min={0}
            controls={false}
            decimalSeparator=","
            placeholder="Salário em EUR"
            value={salarioInput}
            onChange={setSalarioInput}
          />
          <Button type="primary" size="large" onClick={guardarSalario}>
            Guardar
          </Button>
        </div>
        {herdado && (
          <p className="text-ink-soft text-xs">
            A usar o salário de {dayjs(salarioAtual!.mes).format("MM/YYYY")}.
            Guarda para definir um valor específico para este mês.
          </p>
        )}
        {!salarioAtual && (
          <p className="text-ink-soft text-xs">
            Define o salário para calcular os limites das categorias.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-ink font-semibold">Categorias</h2>
        {totalPct > 100 && (
          <Alert
            type="warning"
            showIcon
            message={`As categorias somam ${totalPct}% do salário (mais de 100%).`}
          />
        )}
        {categorias.map((c) => (
          <div key={c.id} className="flex items-center gap-2">
            <span className="flex-1 text-ink truncate">{c.nome}</span>
            <InputNumber
              key={`${c.id}-${c.percentagem}`}
              defaultValue={c.percentagem}
              min={0}
              max={100}
              suffix="%"
              className="w-28!"
              onBlur={(e) =>
                atualizarPct(c, Number(e.target.value.replace(",", ".")))
              }
            />
            <span className="w-28 text-right text-ink-soft text-sm tabular-nums">
              {formatCurrency((salario * c.percentagem) / 100, "EUR")}
            </span>
            <Popconfirm
              title="Excluir categoria"
              description="Os gastos desta categoria ficam sem categoria."
              onConfirm={() => removerCategoria(c.id)}
              okText="Sim"
              cancelText="Não"
              okButtonProps={{ danger: true }}
            >
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <Input
            className="flex-1"
            placeholder="Nova categoria (ex: Aluguel)"
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            onPressEnter={adicionarCategoria}
          />
          <InputNumber
            min={0}
            max={100}
            suffix="%"
            className="w-28!"
            placeholder="%"
            value={novaPct}
            onChange={setNovaPct}
          />
          <Button
            icon={<PlusOutlined />}
            onClick={adicionarCategoria}
            disabled={!novoNome.trim() || novaPct == null}
          >
            Adicionar
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-ink font-semibold capitalize">
          Uso em {mes.toDate().toLocaleDateString("pt-PT", { month: "long", year: "numeric" })}
        </h2>
        <BudgetProgressList itens={itens} />
      </section>

      <Link href="/">
        <Button size="large" className="w-full sm:w-auto">
          Voltar
        </Button>
      </Link>
    </div>
  );
}
