import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MES_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

export async function GET() {
  try {
    const salarios = await prisma.salario.findMany({ orderBy: { mes: "desc" } });
    return NextResponse.json(salarios);
  } catch (error) {
    console.error("Erro ao buscar salários:", error);
    return NextResponse.json(
      { error: "Erro ao buscar salários" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const valor = Number(body.valor);
    if (typeof body.mes !== "string" || !MES_REGEX.test(body.mes) || !Number.isFinite(valor) || valor < 0) {
      return NextResponse.json(
        { error: "Mês (YYYY-MM) e valor válidos são obrigatórios" },
        { status: 400 },
      );
    }
    const salario = await prisma.salario.upsert({
      where: { mes: body.mes },
      create: { mes: body.mes, valor },
      update: { valor },
    });
    return NextResponse.json(salario);
  } catch (error) {
    console.error("Erro ao guardar salário:", error);
    return NextResponse.json(
      { error: "Erro ao guardar salário" },
      { status: 500 },
    );
  }
}
