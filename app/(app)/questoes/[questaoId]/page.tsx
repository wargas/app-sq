import { ChevronLeftIcon, ChevronRightIcon, PencilIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Cronometro } from "@/components/cronometro";
import { ExcluirButton } from "@/components/excluir-button";
import { PageHeader, PageSkeleton } from "@/components/page-header";
import { Responder } from "@/components/responder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { excluirQuestao } from "@/lib/actions";
import { obterQuestao, obterTempoEstudo } from "@/lib/data";
import { ROTULO_TIPO } from "@/lib/rotulos";

export default function QuestaoPage({ params }: PageProps<"/questoes/[questaoId]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Conteudo params={params} />
    </Suspense>
  );
}

async function Conteudo({ params }: { params: Promise<{ questaoId: string }> }) {
  const { questaoId } = await params;
  const q = await obterQuestao(questaoId);
  const { assunto } = q;
  const { disciplina } = assunto;
  const tempo = await obterTempoEstudo(assunto.id);

  return (
    <>
      <title>{`Questão ${q.posicao} · ${assunto.nome}`}</title>
      <Cronometro
        assuntoId={assunto.id}
        totalSegundos={tempo.totalSegundos}
        ultimaSessao={tempo.ultimaSessao}
      />
      <PageHeader
        trilha={[
          { label: "Concursos", href: "/concursos" },
          { label: disciplina.concurso.nome, href: `/concursos/${disciplina.concurso.id}` },
          { label: disciplina.nome, href: `/disciplinas/${disciplina.id}` },
          { label: assunto.nome, href: `/assuntos/${assunto.id}` },
          { label: `Questão ${q.posicao}` },
        ]}
        titulo={`Questão ${q.posicao} de ${q.total}`}
        acao={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              render={<Link href={`/questoes/${q.id}/editar`} />}
              nativeButton={false}
            >
              <PencilIcon data-icon="inline-start" />
              Editar
            </Button>
            <ExcluirButton
              action={excluirQuestao.bind(null, q.id)}
              confirmacao="Excluir esta questão e o histórico de respostas?"
              rotulo="Excluir"
            />
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-1.5">
        <Badge variant="secondary">{q.banca}</Badge>
        <Badge variant="secondary">{q.ano}</Badge>
        <Badge variant="outline">{ROTULO_TIPO[q.tipo]}</Badge>
      </div>

      <p className="mb-6 leading-relaxed whitespace-pre-wrap">{q.enunciado}</p>

      {/* key: reinicia o estado ao navegar para outra questão */}
      {/* Gabarito e comentários não vão para o cliente: chegam só após responder */}
      <Responder key={q.id} questaoId={q.id} tipo={q.tipo} opcoes={q.opcoes} />

      <nav className="mt-8 flex justify-between border-t pt-4">
        {q.anteriorId ? (
          <Button
            variant="ghost"
            render={<Link href={`/questoes/${q.anteriorId}`} />}
            nativeButton={false}
          >
            <ChevronLeftIcon data-icon="inline-start" />
            Anterior
          </Button>
        ) : (
          <span />
        )}
        {q.proximaId ? (
          <Button
            variant="ghost"
            render={<Link href={`/questoes/${q.proximaId}`} />}
            nativeButton={false}
          >
            Próxima
            <ChevronRightIcon data-icon="inline-end" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            render={<Link href={`/assuntos/${assunto.id}`} />}
            nativeButton={false}
          >
            Concluir
            <ChevronRightIcon data-icon="inline-end" />
          </Button>
        )}
      </nav>
    </>
  );
}
