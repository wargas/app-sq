import { CheckIcon, FileJsonIcon, PlayIcon, PlusIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader, PageSkeleton } from "@/components/page-header";
import { TempoEstudado } from "@/components/tempo-estudado";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { obterAssunto } from "@/lib/data";
import { plural } from "@/lib/plural";
import { ROTULO_TIPO } from "@/lib/rotulos";

export default function AssuntoPage({ params }: PageProps<"/assuntos/[assuntoId]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Conteudo params={params} />
    </Suspense>
  );
}

async function Conteudo({ params }: { params: Promise<{ assuntoId: string }> }) {
  const { assuntoId } = await params;
  const assunto = await obterAssunto(assuntoId);
  const { disciplina } = assunto;
  const questoes = assunto.questoes;

  const respondidas = questoes.filter((q) => q.stats);
  const acertos = respondidas.filter((q) => q.stats?.ultima).length;
  const primeiraPendente = questoes.find((q) => !q.stats) ?? questoes[0];
  const novaHref = `/assuntos/${assunto.id}/nova`;
  const importarHref = `/assuntos/${assunto.id}/importar`;

  return (
    <>
      <title>{assunto.nome}</title>
      <PageHeader
        trilha={[
          { label: "Concursos", href: "/concursos" },
          { label: disciplina.concurso.nome, href: `/concursos/${disciplina.concurso.id}` },
          { label: disciplina.nome, href: `/disciplinas/${disciplina.id}` },
          { label: assunto.nome },
        ]}
        titulo={assunto.nome}
        descricao={
          questoes.length > 0 || assunto.segundos > 0 ? (
            <>
              {questoes.length > 0 &&
                `${plural(questoes.length, "questão", "questões")} · ${respondidas.length} respondidas · ${acertos} certas na última tentativa`}
              {questoes.length > 0 && assunto.segundos > 0 && " · "}
              <TempoEstudado segundos={assunto.segundos} className="align-text-bottom" />
            </>
          ) : undefined
        }
        acao={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" render={<Link href={importarHref} />} nativeButton={false}>
              <FileJsonIcon data-icon="inline-start" />
              Importar JSON
            </Button>
            <Button variant="outline" render={<Link href={novaHref} />} nativeButton={false}>
              <PlusIcon data-icon="inline-start" />
              Nova questão
            </Button>
            {primeiraPendente && (
              <Button
                render={<Link href={`/questoes/${primeiraPendente.id}`} />}
                nativeButton={false}
              >
                <PlayIcon data-icon="inline-start" />
                Resolver
              </Button>
            )}
          </div>
        }
      />

      {questoes.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyTitle>Nenhuma questão</EmptyTitle>
            <EmptyDescription>Cadastre questões deste assunto para resolvê-las.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent className="flex-row justify-center">
            <Button render={<Link href={novaHref} />} nativeButton={false}>
              <PlusIcon data-icon="inline-start" />
              Nova questão
            </Button>
            <Button variant="outline" render={<Link href={importarHref} />} nativeButton={false}>
              <FileJsonIcon data-icon="inline-start" />
              Importar JSON
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <ol className="divide-y rounded-lg border">
          {questoes.map((q, i) => (
            <li key={q.id}>
              <Link
                href={`/questoes/${q.id}`}
                className="flex gap-4 px-4 py-3 hover:bg-muted/50"
              >
                <span className="w-6 shrink-0 pt-0.5 text-sm text-muted-foreground tabular-nums">
                  {i + 1}.
                </span>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm">{q.enunciado}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge variant="secondary">{q.banca}</Badge>
                    <Badge variant="secondary">{q.ano}</Badge>
                    <Badge variant="outline">{ROTULO_TIPO[q.tipo]}</Badge>
                  </div>
                </div>
                <Desempenho stats={q.stats} />
              </Link>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}

function Desempenho({
  stats,
}: {
  stats: { total: number; acertos: number; ultima: boolean } | null;
}) {
  if (!stats) {
    return <span className="shrink-0 text-xs text-muted-foreground">Não respondida</span>;
  }
  return (
    <div className="flex shrink-0 flex-col items-end gap-1 text-xs">
      {stats.ultima ? (
        <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
          <CheckIcon className="size-3.5" /> Acertou
        </span>
      ) : (
        <span className="flex items-center gap-1 font-medium text-destructive">
          <XIcon className="size-3.5" /> Errou
        </span>
      )}
      <span className="text-muted-foreground tabular-nums">
        {stats.acertos}/{stats.total} acertos
      </span>
    </div>
  );
}
