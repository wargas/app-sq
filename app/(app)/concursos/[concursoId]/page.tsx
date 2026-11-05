import { Suspense } from "react";
import { ListaItens } from "@/components/lista-itens";
import { NomeForm } from "@/components/nome-form";
import { PageHeader, PageSkeleton } from "@/components/page-header";
import { TempoEstudado } from "@/components/tempo-estudado";
import { criarDisciplina, excluirDisciplina, renomearDisciplina } from "@/lib/actions";
import { obterConcurso } from "@/lib/data";
import { plural } from "@/lib/plural";

export default function ConcursoPage({ params }: PageProps<"/concursos/[concursoId]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Conteudo params={params} />
    </Suspense>
  );
}

async function Conteudo({ params }: { params: Promise<{ concursoId: string }> }) {
  const { concursoId } = await params;
  const concurso = await obterConcurso(concursoId);
  return (
    <>
      <title>{concurso.nome}</title>
      <PageHeader
        trilha={[{ label: "Concursos", href: "/concursos" }, { label: concurso.nome }]}
        titulo={concurso.nome}
        descricao={
          <>
            Disciplinas deste concurso.
            {concurso.segundos > 0 && (
              <>
                {" "}
                <TempoEstudado segundos={concurso.segundos} className="align-text-bottom" />
              </>
            )}
          </>
        }
      />
      <NomeForm
        action={criarDisciplina.bind(null, concurso.id)}
        placeholder="Nome da disciplina"
        rotulo="Adicionar"
      />
      <ListaItens
        vazio={{
          titulo: "Nenhuma disciplina",
          descricao: "Adicione as disciplinas cobradas neste concurso.",
        }}
        itens={concurso.disciplinas.map((d) => ({
          id: d.id,
          href: `/disciplinas/${d.id}`,
          nome: d.nome,
          detalhe: (
            <>
              {plural(d.assuntos.length, "assunto", "assuntos")}
              {d.segundos > 0 && (
                <>
                  {" · "}
                  <TempoEstudado segundos={d.segundos} className="align-text-bottom" />
                </>
              )}
            </>
          ),
          renomear: renomearDisciplina.bind(null, d.id),
          excluir: excluirDisciplina.bind(null, d.id),
          confirmacao: `Excluir "${d.nome}" com todos os assuntos e questões?`,
        }))}
      />
    </>
  );
}
