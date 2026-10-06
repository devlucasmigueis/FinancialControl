"use client";

import { useEffect, useRef, useState } from "react";
import { Form, InputNumber, Button, DatePicker, Select, Switch } from "antd";
import { CalendarOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { ExpenseFormValues, ExchangeRate } from "@/types";
import { normalizeNumber, normalizeText } from "@/utils";
import {
  FORM_RULES,
  DATE_FORMAT,
  CURRENCY_SYMBOLS,
  VALIDATION_MESSAGES,
} from "@/constants";
import TextArea from "antd/es/input/TextArea";
import Link from "next/link";
import ExchangeRateBanner from "./ExchangeRateBanner";

interface ExpenseFormProps {
  onSubmit: (values: ExpenseFormValues) => void;
  loading?: boolean;
  descricoesAnteriores?: string[];
  categorias?: string[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export default function ExpenseForm({
  onSubmit,
  loading,
  descricoesAnteriores = [],
  categorias = [],
}: ExpenseFormProps) {
  const [form] = Form.useForm<ExpenseFormValues>();
  const [isParcelado, setIsParcelado] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<ExchangeRate | null>(null);
  const [rateLoading, setRateLoading] = useState(true);
  const [rateError, setRateError] = useState(false);
  const submitModeRef = useRef<"reset" | "keep-date">("reset");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/exchange-rate")
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data: ExchangeRate) => {
        if (cancelled) return;
        if (Number.isFinite(data.rate) && data.rate > 0) {
          setExchangeRate(data);
        } else {
          setRateError(true);
        }
      })
      .catch(() => {
        if (!cancelled) setRateError(true);
      })
      .finally(() => {
        if (!cancelled) setRateLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleFinish = (values: ExpenseFormValues) => {
    onSubmit({
      ...values,
      parcelado: isParcelado,
      numeroParcelas: isParcelado ? values.numeroParcelas : undefined,
    });
    if (submitModeRef.current === "keep-date") {
      const dataAtual = form.getFieldValue("data");
      form.resetFields();
      form.setFieldsValue({ data: dataAtual });
    } else {
      form.resetFields();
    }
    setIsParcelado(false);
    submitModeRef.current = "reset";
  };

  const setToday = () => {
    form.setFieldsValue({ data: dayjs() });
  };

  const handleValuesChange = (changedValues: Partial<ExpenseFormValues>) => {
    const rate = exchangeRate?.rate;
    if (!rate) return;
    if ("custoEUR" in changedValues && changedValues.custoEUR != null) {
      form.setFieldsValue({ custoBRL: round2(changedValues.custoEUR * rate) });
    } else if ("custoBRL" in changedValues && changedValues.custoBRL != null) {
      form.setFieldsValue({ custoEUR: round2(changedValues.custoBRL / rate) });
    }
  };

  return (
    <Form
      form={form}
      onFinish={handleFinish}
      onValuesChange={handleValuesChange}
      validateTrigger={["onBlur", "onChange"]}
      initialValues={{ data: dayjs() }}
    >
      <ExchangeRateBanner
        rate={exchangeRate?.rate ?? null}
        timestamp={exchangeRate?.timestamp ?? null}
        error={rateError}
        loading={rateLoading}
      />
      <Form.Item
        name="custoEUR"
        rules={[
          {
            type: "number",
            min: FORM_RULES.minCurrencyValue,
            message: VALIDATION_MESSAGES.minValue,
          },
        ]}
        normalize={normalizeNumber}
      >
        <InputNumber
          placeholder="Custo em EUR"
          className="w-full! h-15"
          size="large"
          prefix={CURRENCY_SYMBOLS.EUR}
          precision={2}
          min={0}
          controls={false}
          decimalSeparator=","
        />
      </Form.Item>
      <Form.Item
        name="custoBRL"
        rules={[
          {
            type: "number",
            min: FORM_RULES.minCurrencyValue,
            message: VALIDATION_MESSAGES.minValue,
          },
        ]}
        normalize={normalizeNumber}
      >
        <InputNumber
          placeholder="Custo em R$"
          className="w-full! h-15"
          size="large"
          prefix={CURRENCY_SYMBOLS.BRL}
          precision={2}
          min={0}
          decimalSeparator=","
          controls={false}
        />
      </Form.Item>
      <div className="flex gap-2 items-start">
        <Form.Item
          name="data"
          rules={[{ required: true, message: "Por favor, selecione a data" }]}
          className="flex-1 mb-6"
        >
          <DatePicker
            showTime={false}
            placeholder="Data"
            className="w-full h-15"
            size="large"
            format={DATE_FORMAT}
          />
        </Form.Item>
        <Button
          size="large"
          icon={<CalendarOutlined />}
          onClick={setToday}
          className="h-15"
        >
          Hoje
        </Button>
      </div>
      {descricoesAnteriores.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {descricoesAnteriores.slice(0, 8).map((d) => (
            <Button
              key={d}
              size="small"
              type="default"
              onClick={() => form.setFieldsValue({ descricao: d })}
              className="max-w-full"
            >
              <span className="truncate">{d}</span>
            </Button>
          ))}
        </div>
      )}
      <Form.Item
        name="descricao"
        rules={[
          { required: true, message: "Por favor, insira uma descrição" },
          {
            min: FORM_RULES.descricaoMinLength,
            message: VALIDATION_MESSAGES.minLength(
              FORM_RULES.descricaoMinLength,
            ),
          },
          {
            max: FORM_RULES.descricaoMaxLength,
            message: VALIDATION_MESSAGES.maxLength(
              FORM_RULES.descricaoMaxLength,
            ),
          },
          {
            pattern: /^[a-zA-ZÀ-ÿ0-9\s.,!?:\-\n]+$/,
            message: VALIDATION_MESSAGES.invalidCharacters,
          },
        ]}
        normalize={normalizeText}
      >
        <TextArea
          rows={5}
          placeholder="Descrição"
          size="large"
          maxLength={FORM_RULES.descricaoMaxLength}
          autoSize={{ minRows: 3, maxRows: 6 }}
        />
      </Form.Item>
      <Form.Item name="categoria">
        <Select
          placeholder={
            categorias.length > 0
              ? "Categoria (opcional)"
              : "Sem categorias — cria-as em Orçamento"
          }
          size="large"
          allowClear
          disabled={categorias.length === 0}
          options={categorias.map((c) => ({ value: c, label: c }))}
        />
      </Form.Item>
      <div className="bg-canvas border border-line p-4 rounded-lg mb-6 flex flex-col gap-5">
        <div className="flex items-center justify-between ">
          <span className="text-ink font-medium">Pagamento parcelado?</span>
          <Switch
            checked={isParcelado}
            onChange={(checked) => {
              setIsParcelado(checked);
              if (!checked) {
                form.setFieldsValue({ numeroParcelas: undefined });
              }
            }}
          />
        </div>
        {isParcelado && (
          <Form.Item
            name="numeroParcelas"
            rules={[
              {
                required: isParcelado,
                message: "Informe o número de parcelas",
              },
            ]}
          >
            <InputNumber
              placeholder="Número de parcelas"
              className="w-full! "
              size="large"
              min={2}
              max={48}
              controls={true}
              precision={0}
            />
          </Form.Item>
        )}
      </div>
      <Form.Item>
        <div className="flex flex-col gap-3 md:gap-4">
          <Button
            type="primary"
            size="large"
            htmlType="submit"
            loading={loading}
            onClick={() => {
              submitModeRef.current = "reset";
            }}
            className="w-full"
          >
            Registar
          </Button>
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <Link href="/consultar">
              <Button size="large" htmlType="button" className="w-full">
                Consultar
              </Button>
            </Link>
            <Button
              size="large"
              htmlType="submit"
              loading={loading}
              onClick={() => {
                submitModeRef.current = "keep-date";
              }}
              className="w-full"
            >
              Guardar e novo
            </Button>
          </div>
        </div>
      </Form.Item>
    </Form>
  );
}
