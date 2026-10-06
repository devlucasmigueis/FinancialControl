"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Table,
  Tag,
  Spin,
  Button,
  Statistic,
  Select,
  message,
  Popconfirm,
  Input,
  Modal,
  Form,
  InputNumber,
  DatePicker,
} from "antd";
import { CalendarOutlined, DeleteOutlined, SearchOutlined, EditOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { Categoria, Expense } from "@/types";
import { formatCurrency } from "@/utils";
import Link from "antd/es/typography/Link";
import dayjs from "dayjs";
import TextArea from "antd/es/input/TextArea";

export default function ConsultarPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [form] = Form.useForm();
  const [categorias, setCategorias] = useState<Categoria[]>([]);

  useEffect(() => {
    fetchExpenses();
    fetch("/api/categorias")
      .then((r) => (r.ok ? r.json() : []))
      .then(setCategorias)
      .catch((error) => console.error("Erro ao buscar categorias:", error));
  }, []);

  const fetchExpenses = async () => {
    try {
      const response = await fetch("/api/expenses");
      const data = await response.json();
      setExpenses(data);
    } catch (error) {
      console.error("Erro ao buscar gastos:", error);
    } finally {
      setLoading(false);
    }
  };

  const availableMonths = useMemo(() => {
    const monthsMap = new Map<
      string,
      { month: number; year: number; label: string }
    >();

    expenses.forEach((expense) => {
      const date = new Date(expense.data);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      if (!monthsMap.has(key)) {
        monthsMap.set(key, {
          month: date.getMonth(),
          year: date.getFullYear(),
          label: date.toLocaleDateString("pt-BR", {
            month: "long",
            year: "numeric",
          }),
        });
      }
    });

    return Array.from(monthsMap.entries()).sort((a, b) => {
      const [yearA, monthA] = a[0].split("-").map(Number);
      const [yearB, monthB] = b[0].split("-").map(Number);
      return yearB - yearA || monthB - monthA;
    });
  }, [expenses]);

  useEffect(() => {
    if (availableMonths.length > 0 && !selectedMonth) {
      setSelectedMonth(availableMonths[0][0]);
    }
  }, [availableMonths, selectedMonth]);

  const filteredExpenses = useMemo(() => {
    let filtered = expenses;

    // Filtrar por mês
    if (selectedMonth) {
      const [year, month] = selectedMonth.split("-").map(Number);
      filtered = filtered.filter((expense) => {
        const date = new Date(expense.data);
        return date.getMonth() === month && date.getFullYear() === year;
      });
    }

    // Filtrar por termo de pesquisa
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter((expense) =>
        expense.descricao.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [expenses, selectedMonth, searchTerm]);

  const monthlyTotals = useMemo(() => {
    const selectedMonthData = availableMonths.find(
      ([key]) => key === selectedMonth,
    );

    return {
      totalEUR: filteredExpenses.reduce((sum, exp) => sum + (exp.custoEUR ?? 0), 0),
      totalBRL: filteredExpenses.reduce((sum, exp) => sum + (exp.custoBRL ?? 0), 0),
      count: filteredExpenses.length,
      monthName: selectedMonthData?.[1]?.label || "Sem dados",
    };
  }, [filteredExpenses, selectedMonth, availableMonths]);

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/expenses?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Erro ao excluir");

      await fetchExpenses();
      message.success("Gasto excluído com sucesso!");
    } catch (error) {
      console.error(error);
      message.error("Erro ao excluir gasto");
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    form.setFieldsValue({
      custoEUR: expense.custoEUR,
      custoBRL: expense.custoBRL,
      data: dayjs(expense.data),
      descricao: expense.descricao,
      categoria: expense.categoria ?? undefined,
    });
    setEditModalOpen(true);
  };

  const handleEditSubmit = async () => {
    try {
      const values = await form.validateFields();
      setEditLoading(true);

      const response = await fetch("/api/expenses", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingExpense?.id,
          custoEUR: values.custoEUR,
          custoBRL: values.custoBRL,
          data: values.data.toISOString(),
          descricao: values.descricao,
          categoria: values.categoria ?? null,
        }),
      });

      if (!response.ok) throw new Error("Erro ao atualizar");

      const updatedExpense = await response.json();
      setExpenses(expenses.map((exp) => 
        exp.id === updatedExpense.id ? { ...exp, ...updatedExpense } : exp
      ));
      
      message.success("Gasto atualizado com sucesso!");
      setEditModalOpen(false);
      setEditingExpense(null);
      form.resetFields();
    } catch (error) {
      console.error(error);
      message.error("Erro ao atualizar gasto");
    } finally {
      setEditLoading(false);
    }
  };

  const columns: ColumnsType<Expense> = [
    {
      title: "Descrição",
      dataIndex: "descricao",
      key: "descricao",
      ellipsis: { showTitle: true },
      fixed: "left" as const,
      width: 120,
      render: (value: string, record: Expense) => (
        <div className="flex flex-col">
          <span>{value}</span>
          {record.categoria && (
            <Tag color="geekblue" className="w-fit mt-1">
              {record.categoria}
            </Tag>
          )}
          {record.parcelado && record.parcelaAtual && record.numeroParcelas && (
            <Tag color="purple" className="w-fit mt-1">
              {record.parcelaAtual}/{record.numeroParcelas}
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: "EUR",
      dataIndex: "custoEUR",
      key: "custoEUR",
      width: 90,
      align: "center" as const,
      render: (value: number | null) =>
        value != null ? (
          <Tag color="blue">{formatCurrency(value, "EUR")}</Tag>
        ) : (
          <span className="text-ink-soft">-</span>
        ),
    },
    {
      title: "BRL",
      dataIndex: "custoBRL",
      key: "custoBRL",
      width: 95,
      align: "center" as const,
      render: (value: number | null) =>
        value != null ? (
          <Tag color="green">{formatCurrency(value, "BRL")}</Tag>
        ) : (
          <span className="text-ink-soft">-</span>
        ),
    },
    {
      title: "Data",
      dataIndex: "data",
      key: "data",
      width: 90,
      align: "center" as const,
      render: (value: string) =>
        new Date(value).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }),
    },
    {
      title: "",
      key: "actions",
      width: 80,
      align: "center" as const,
      render: (_, record) => (
        <div className="flex gap-1">
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            size="small"
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Excluir gasto"
            description={
              record.parcelado 
                ? "Este é um gasto parcelado. Todas as parcelas serão excluídas. Tens a certeza?" 
                : "Tens a certeza que queres excluir este gasto?"
            }
            onConfirm={() => handleDelete(record.id)}
            okText="Sim"
            cancelText="Não"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" danger icon={<DeleteOutlined />} size="small" />
          </Popconfirm>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="col-span-4 md:col-span-8 xl:col-span-12 flex justify-center items-center py-20">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="col-span-4 md:col-span-8 xl:col-span-12 flex flex-col lg:flex-row gap-3 md:gap-4 h-full max-h-full overflow-hidden">
      {/* Mobile/Tablet: Dropdown selector */}
      <div className="lg:hidden bg-surface border border-line text-ink shadow-sm p-3 rounded-xl">
        <div className="flex items-center gap-2 mb-2">
          <CalendarOutlined />
          <span className="font-semibold">Selecionar Mês</span>
        </div>
        <Select
          className="w-full"
          size="large"
          value={selectedMonth}
          onChange={(value) => setSelectedMonth(value)}
          options={availableMonths.map(([key, { label }]) => ({
            value: key,
            label: <span className="capitalize">{label}</span>,
          }))}
          placeholder="Selecione um mês"
        />
      </div>

      <div className="hidden lg:flex w-48 bg-surface border border-line text-ink shadow-sm p-4 rounded-2xl shrink-0 flex-col max-h-full">
        <h2 className="text-ink text-lg font-semibold mb-4 flex items-center gap-2">
          <CalendarOutlined /> Meses
        </h2>
        <div className="flex flex-col gap-1 overflow-y-auto pr-1 thin-scrollbar">
          {availableMonths.map(([key, { label }]) => (
            <button
              key={key}
              onClick={() => setSelectedMonth(key)}
              className={`text-left px-3 py-2 rounded-lg capitalize transition-colors ${
                selectedMonth === key
                  ? "bg-brand text-white shadow-sm"
                  : "text-ink-soft hover:bg-canvas hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {availableMonths.length === 0 && (
          <p className="text-ink-soft text-sm">Nenhum gasto registado</p>
        )}
      </div>

      <div className="flex-1 bg-surface border border-line shadow-sm p-3 md:p-4 rounded-xl md:rounded-2xl min-w-0 overflow-hidden flex flex-col">
        <div className="flex justify-center mb-3 md:mb-4">
          <h1 className="text-ink text-lg md:text-2xl font-bold capitalize text-center truncate tracking-tight">
            Gastos de {monthlyTotals.monthName}
          </h1>
        </div>
        <div className="mb-3 md:mb-4">
          <Input
            placeholder="Pesquisar por descrição..."
            prefix={<SearchOutlined className="text-ink-soft" />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            allowClear
            size="large"
          />
        </div>
        <div className="overflow-auto flex-1 min-h-0">
          <Table
            dataSource={filteredExpenses}
            columns={columns}
            rowKey="id"
            pagination={{ pageSize: 9, placement: ["bottomCenter"] }}
            className="expense-table"
            size="small"
            scroll={{ x: 300 }}
          />
        </div>

        <div className="mt-auto pt-3 md:pt-4 bg-canvas border border-line flex flex-col p-3 md:p-4 rounded-lg shrink-0">
          <h2 className="text-ink text-sm md:text-lg font-semibold mb-3 md:mb-4 capitalize text-center">
            Total de {monthlyTotals.monthName}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
            <Statistic
              title={
                <span className="text-ink-soft text-xs md:text-sm">Gastos</span>
              }
              value={monthlyTotals.count}
              styles={{
                content: {
                  color: "#0f172a",
                  fontSize: "1.25rem",
                  fontWeight: 600,
                },
              }}
            />
            <Statistic
              title={
                <span className="text-ink-soft text-xs md:text-sm">
                  Total EUR
                </span>
              }
              value={monthlyTotals.totalEUR}
              precision={2}
              prefix="€"
              styles={{
                content: {
                  color: "#2563eb",
                  fontSize: "1.25rem",
                  fontWeight: 600,
                },
              }}
            />
            <Statistic
              title={
                <span className="text-ink-soft text-xs md:text-sm">
                  Total BRL
                </span>
              }
              value={monthlyTotals.totalBRL}
              precision={2}
              prefix="R$"
              styles={{
                content: {
                  color: "#60a5fa",
                  fontSize: "1.25rem",
                  fontWeight: 600,
                },
              }}
            />
          </div>
        </div>

        <div className="mt-3 md:mt-4">
          <Link href="/">
            <Button size="large" htmlType="button" className="w-full sm:w-auto">
              Voltar
            </Button>
          </Link>
        </div>
      </div>

      <Modal
        title="Editar Gasto"
        open={editModalOpen}
        onCancel={() => {
          setEditModalOpen(false);
          setEditingExpense(null);
          form.resetFields();
        }}
        onOk={handleEditSubmit}
        confirmLoading={editLoading}
        okText="Guardar"
        cancelText="Cancelar"
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item name="custoEUR" label="Custo em EUR">
            <InputNumber
              placeholder="Custo em EUR"
              className="w-full!"
              size="large"
              prefix="€"
              precision={2}
              min={0}
              controls={false}
              decimalSeparator=","
            />
          </Form.Item>
          <Form.Item name="custoBRL" label="Custo em BRL">
            <InputNumber
              placeholder="Custo em R$"
              className="w-full!"
              size="large"
              prefix="R$"
              precision={2}
              min={0}
              controls={false}
              decimalSeparator=","
            />
          </Form.Item>
          <Form.Item
            name="data"
            label="Data"
            rules={[{ required: true, message: "Selecione a data" }]}
          >
            <DatePicker
              className="w-full"
              size="large"
              format="DD/MM/YYYY"
            />
          </Form.Item>
          <Form.Item
            name="descricao"
            label="Descrição"
            rules={[{ required: true, message: "Insira a descrição" }]}
          >
            <TextArea
              rows={3}
              placeholder="Descrição"
              size="large"
            />
          </Form.Item>
          <Form.Item name="categoria" label="Categoria">
            <Select
              placeholder="Sem categoria"
              size="large"
              allowClear
              options={categorias.map((c) => ({ value: c.nome, label: c.nome }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
