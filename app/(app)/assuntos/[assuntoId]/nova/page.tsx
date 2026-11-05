import { Suspense } from "react";
import { PageHeader, PageSkeleton } from "@/components/page-header";
import { QuestaoForm } from "@/components/questao-form";
import { salvarQuestao } from "@/lib/actions";
import { obterAssunto } from "@/lib/data";

export default function NovaQuestaoPage({ params }: PageProps<"/assuntos/[assuntoId]/nova">) {
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
  return (
    <>
      <title>Nova questão</title>
      <PageHeader
        trilha={[
          { label: "Concursos", href: "/concursos" },
          { label: disciplina.concurso.nome, href: `/concursos/${disciplina.concurso.id}` },
          { label: disciplina.nome, href: `/disciplinas/${disciplina.id}` },
          { label: assunto.nome, href: `/assuntos/${assunto.id}` },
          { label: "Nova questão" },
        ]}
        titulo="Nova questão"
      />
      <QuestaoForm
        action={salvarQuestao.bind(null, { assuntoId: assunto.id })}
        cancelarHref={`/assuntos/${assunto.id}`}
      />
    </>
  );
}
