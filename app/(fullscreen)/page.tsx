import Link from "next/link";
import { Button } from "antd";
import VersionButton from "@/app/components/version/VersionButton";

export default function Home() {
  return (
    <>
      <div className="col-span-4 md:col-start-2 md:col-span-6 xl:col-start-4 xl:col-span-6 bg-surface border border-line shadow-sm p-6 md:p-8 rounded-2xl">
        <div className="flex flex-col items-center gap-4 md:gap-6">
          <h1 className="text-ink text-2xl md:text-3xl font-bold text-center tracking-tight">
            Controle de Gastos
          </h1>
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mt-2 md:mt-4 w-full sm:w-auto">
            <Link href="/registar" className="w-full sm:w-auto">
              <Button type="primary" size="large" className="w-full">
                Registar Gasto
              </Button>
            </Link>
            <Link href="/consultar" className="w-full sm:w-auto">
              <Button size="large" className="w-full">
                Consultar Gastos
              </Button>
            </Link>
            <Link href="/orcamento" className="w-full sm:w-auto">
              <Button size="large" className="w-full">
                Orçamento
              </Button>
            </Link>
            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button size="large" className="w-full">
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
      <VersionButton />
    </>
  );
}
