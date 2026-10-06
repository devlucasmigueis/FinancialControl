import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const expenses = await prisma.expense.findMany({
      orderBy: [{ createdAt: "desc" }, { data: "desc" }],
    });

    const formattedExpenses = expenses.map((expense) => ({
      ...expense,
      descricao: expense.descricao
        ? expense.descricao.charAt(0).toUpperCase() + expense.descricao.slice(1)
        : expense.descricao,
    }));

    return NextResponse.json(formattedExpenses);
  } catch (error) {
    console.error("Erro ao buscar gastos:", error);
    return NextResponse.json(
      { error: "Erro ao buscar gastos" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const dataInicial = new Date(body.data);

    if (body.parcelado && body.numeroParcelas && body.numeroParcelas > 1) {
      const parcelamentoId = crypto.randomUUID();
      const numeroParcelas = body.numeroParcelas;
      const custoEURParcela = body.custoEUR / numeroParcelas;
      const custoBRLParcela = body.custoBRL / numeroParcelas;

      const dataFim = new Date(dataInicial);
      dataFim.setMonth(dataFim.getMonth() + numeroParcelas - 1);

      const parcelas = [];
      for (let i = 0; i < numeroParcelas; i++) {
        const dataParcela = new Date(dataInicial);
        dataParcela.setMonth(dataParcela.getMonth() + i);

        parcelas.push({
          custoEUR: Math.round(custoEURParcela * 100) / 100,
          custoBRL: Math.round(custoBRLParcela * 100) / 100,
          data: dataParcela,
          descricao: body.descricao,
          categoria: body.categoria || null,
          parcelado: true,
          numeroParcelas: numeroParcelas,
          parcelaAtual: i + 1,
          parcelamentoId: parcelamentoId,
          dataInicio: dataInicial,
          dataFim: dataFim,
        });
      }

      const expenses = await prisma.expense.createMany({
        data: parcelas,
      });

      return NextResponse.json(
        {
          message: `${numeroParcelas} parcelas criadas com sucesso`,
          count: expenses.count,
        },
        { status: 201 },
      );
    }

    const expense = await prisma.expense.create({
      data: {
        custoEUR: body.custoEUR ?? null,
        custoBRL: body.custoBRL ?? null,
        data: dataInicial,
        descricao: body.descricao,
        categoria: body.categoria || null,
        parcelado: false,
      },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar gasto:", error);
    return NextResponse.json({ error: "Erro ao criar gasto" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });
    }

    const expense = await prisma.expense.findUnique({
      where: { id },
    });

    if (!expense) {
      return NextResponse.json(
        { error: "Gasto não encontrado" },
        { status: 404 },
      );
    }

    if (expense.parcelado && expense.parcelamentoId) {
      await prisma.expense.deleteMany({
        where: { parcelamentoId: expense.parcelamentoId },
      });

      return NextResponse.json(
        {
          success: true,
          message: "Todas as parcelas foram excluídas",
        },
        { status: 200 },
      );
    }

    await prisma.expense.delete({
      where: { id },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Erro ao excluir gasto:", error);
    return NextResponse.json(
      { error: "Erro ao excluir gasto" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, custoEUR, custoBRL, data, descricao, categoria } = body;

    if (!id) {
      return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });
    }

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        custoEUR: custoEUR ?? null,
        custoBRL: custoBRL ?? null,
        data: new Date(data),
        descricao,
        ...(categoria !== undefined && { categoria: categoria || null }),
      },
    });

    return NextResponse.json(expense, { status: 200 });
  } catch (error) {
    console.error("Erro ao atualizar gasto:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar gasto" },
      { status: 500 },
    );
  }
}
