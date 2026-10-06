import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const parseBody = (body: { nome?: unknown; percentagem?: unknown }) => {
  const nome = typeof body.nome === "string" ? body.nome.trim() : "";
  const percentagem = Number(body.percentagem);
  if (!nome || !Number.isFinite(percentagem) || percentagem < 0 || percentagem > 100) {
    return null;
  }
  return { nome: nome.charAt(0).toUpperCase() + nome.slice(1), percentagem };
};

export async function GET() {
  try {
    const categorias = await prisma.categoria.findMany({
      orderBy: { nome: "asc" },
    });
    return NextResponse.json(categorias);
  } catch (error) {
    console.error("Erro ao buscar categorias:", error);
    return NextResponse.json(
      { error: "Erro ao buscar categorias" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = parseBody(await request.json());
    if (!data) {
      return NextResponse.json(
        { error: "Nome e percentagem (0-100) são obrigatórios" },
        { status: 400 },
      );
    }
    const existente = await prisma.categoria.findUnique({
      where: { nome: data.nome },
    });
    if (existente) {
      return NextResponse.json(
        { error: "Já existe uma categoria com esse nome" },
        { status: 409 },
      );
    }
    const categoria = await prisma.categoria.create({ data });
    return NextResponse.json(categoria, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar categoria:", error);
    return NextResponse.json(
      { error: "Erro ao criar categoria" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const data = parseBody(body);
    if (!body.id || !data) {
      return NextResponse.json(
        { error: "ID, nome e percentagem (0-100) são obrigatórios" },
        { status: 400 },
      );
    }
    const anterior = await prisma.categoria.findUnique({
      where: { id: body.id },
    });
    if (!anterior) {
      return NextResponse.json(
        { error: "Categoria não encontrada" },
        { status: 404 },
      );
    }
    // Renomear a categoria também atualiza os gastos associados
    const [categoria] = await prisma.$transaction([
      prisma.categoria.update({ where: { id: body.id }, data }),
      prisma.expense.updateMany({
        where: { categoria: anterior.nome },
        data: { categoria: data.nome },
      }),
    ]);
    return NextResponse.json(categoria);
  } catch (error) {
    console.error("Erro ao atualizar categoria:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar categoria" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });
    }
    const categoria = await prisma.categoria.findUnique({ where: { id } });
    if (!categoria) {
      return NextResponse.json(
        { error: "Categoria não encontrada" },
        { status: 404 },
      );
    }
    // Os gastos ficam sem categoria em vez de serem apagados
    await prisma.$transaction([
      prisma.expense.updateMany({
        where: { categoria: categoria.nome },
        data: { categoria: null },
      }),
      prisma.categoria.delete({ where: { id } }),
    ]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao excluir categoria:", error);
    return NextResponse.json(
      { error: "Erro ao excluir categoria" },
      { status: 500 },
    );
  }
}
