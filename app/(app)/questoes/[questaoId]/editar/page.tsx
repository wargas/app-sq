import { Suspense } from "react";
import { PageHeader, PageSkeleton } from "@/components/page-header";
import { QuestaoForm } from "@/components/questao-form";
import { salvarQuestao } from "@/lib/actions";
import { obterQuestao } from "@/lib/data";

export default function EditarQuestaoPage({
  params,
}: PageProps<"/questoes/[questaoId]/editar">) {
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
  return (
    <>
      <title>Editar questão</title>
      <PageHeader
        trilha={[
          { label: "Concursos", href: "/concursos" },
          { label: disciplina.concurso.nome, href: `/concursos/${disciplina.concurso.id}` },
          { label: disciplina.nome, href: `/disciplinas/${disciplina.id}` },
          { label: assunto.nome, href: `/assuntos/${assunto.id}` },
          { label: `Questão ${q.posicao}`, href: `/questoes/${q.id}` },
          { label: "Editar" },
        ]}
        titulo={`Editar questão ${q.posicao}`}
      />
      <QuestaoForm
        edicao
        action={salvarQuestao.bind(null, { assuntoId: assunto.id, questaoId: q.id })}
        cancelarHref={`/questoes/${q.id}`}
        inicial={{
          ano: q.ano,
          banca: q.banca,
          enunciado: q.enunciado,
          tipo: q.tipo,
          opcoes: q.opcoes,
          gabarito: q.gabarito,
          comentarios: q.comentarios,
        }}
      />
    </>
  );
}
