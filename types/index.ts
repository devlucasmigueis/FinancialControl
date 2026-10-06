export interface ExpenseFormValues {
  custoEUR?: number | null;
  custoBRL?: number | null;
  data: Date;
  descricao: string;
  categoria?: string | null;
  parcelado?: boolean;
  numeroParcelas?: number;
}

export interface Expense {
  id: string;
  custoEUR: number | null;
  custoBRL: number | null;
  data: Date;
  descricao: string;
  categoria: string | null;
  createdAt: Date;
  updatedAt: Date;
  parcelado: boolean;
  numeroParcelas: number | null;
  parcelaAtual: number | null;
  parcelamentoId: string | null;
  dataInicio: Date | null;
  dataFim: Date | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface ExchangeRate {
  rate: number;
  timestamp: string;
}

export interface Categoria {
  id: string;
  nome: string;
  percentagem: number;
}

export interface Salario {
  mes: string;
  valor: number;
}
