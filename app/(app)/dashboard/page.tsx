import type { Metadata } from "next";
import { Suspense } from "react";
import { GraficoColunas } from "@/components/grafico-colunas";
import { PageHeader, PageSkeleton } from "@/components/page-header";
import { DIAS_DASHBOARD, obterDashboard } from "@/lib/data";
import { formatarDuracao } from "@/lib/tempo";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Conteudo />
    </Suspense>
  );
}

const pct = (parte: number, todo: number) =>
  todo > 0 ? `${Math.round((parte / todo) * 100)}%` : "—";

async function Conteudo() {
  const { total, periodo, dias } = await obterDashboard();
  const ultimos = `nos últimos ${DIAS_DASHBOARD} dias`;

  return (
    <>
      <PageHeader titulo="Dashboard" descricao="Seu desempenho e tempo de estudo." />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Indicador
          rotulo="Questões respondidas"
          valor={total.questoes.toLocaleString("pt-BR")}
          detalhe={`${periodo.tentativas.toLocaleString("pt-BR")} respostas ${ultimos}`}
        />
        <Indicador
          rotulo="Taxa de acerto"
          valor={pct(total.acertos, total.tentativas)}
          detalhe={`${pct(periodo.acertos, periodo.tentativas)} ${ultimos}`}
        />
        <Indicador
          rotulo="Tempo estudado"
          valor={formatarDuracao(total.segundos)}
          detalhe={`${formatarDuracao(periodo.segundos)} ${ultimos}`}
        />
      </div>

      <div className="flex flex-col gap-4">
        <GraficoColunas
          titulo="Respostas por dia"
          descricao="Cada tentativa conta, inclusive ao refazer uma questão."
          series={[
            { nome: "Certas", cor: "bg-viz-1" },
            { nome: "Erradas", cor: "bg-viz-2" },
          ]}
          pontos={dias.map((d) => ({ dia: d.dia, valores: [d.certas, d.erradas] }))}
        />
        <GraficoColunas
          titulo="Tempo estudado por dia"
          descricao="Pelo cronômetro; cada sessão conta no dia em que começou."
          formato="duracao"
          series={[{ nome: "Tempo", cor: "bg-viz-3" }]}
          pontos={dias.map((d) => ({ dia: d.dia, valores: [d.segundos] }))}
        />
      </div>
    </>
  );
}

function Indicador({ rotulo, valor, detalhe }: { rotulo: string; valor: string; detalhe: string }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">{rotulo}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{valor}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detalhe}</p>
    </div>
  );
}
