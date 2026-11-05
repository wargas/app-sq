import { Suspense } from "react";
import { AssuntosLoteForm } from "@/components/assuntos-lote-form";
import { ListaItens } from "@/components/lista-itens";
import { NomeForm } from "@/components/nome-form";
import { PageHeader, PageSkeleton } from "@/components/page-header";
import { BarraProgresso } from "@/components/progresso";
import { TempoEstudado } from "@/components/tempo-estudado";
import { criarAssunto, criarAssuntosEmLote, excluirAssunto, renomearAssunto } from "@/lib/actions";
import { obterDisciplina } from "@/lib/data";

export default function DisciplinaPage({ params }: PageProps<"/disciplinas/[disciplinaId]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Conteudo params={params} />
    </Suspense>
  );
}

async function Conteudo({ params }: { params: Promise<{ disciplinaId: string }> }) {
  const { disciplinaId } = await params;
  const disciplina = await obterDisciplina(disciplinaId);
  return (
    <>
      <title>{disciplina.nome}</title>
      <PageHeader
        trilha={[
          { label: "Concursos", href: "/concursos" },
          { label: disciplina.concurso.nome, href: `/concursos/${disciplina.concurso.id}` },
          { label: disciplina.nome },
        ]}
        titulo={disciplina.nome}
        descricao={
          <>
            Assuntos desta disciplina.
            {disciplina.segundos > 0 && (
              <>
                {" "}
                <TempoEstudado segundos={disciplina.segundos} className="align-text-bottom" />
              </>
            )}
          </>
        }
      />
      <NomeForm
        action={criarAssunto.bind(null, disciplina.id)}
        placeholder="Nome do assunto"
        rotulo="Adicionar"
      />
      <AssuntosLoteForm action={criarAssuntosEmLote.bind(null, disciplina.id)} />
      <ListaItens
        vazio={{
          titulo: "Nenhum assunto",
          descricao: "Adicione os assuntos para cadastrar questões.",
        }}
        itens={disciplina.assuntos.map((a) => ({
          id: a.id,
          href: `/assuntos/${a.id}`,
          nome: a.nome,
          detalhe: <BarraProgresso {...a.progresso} segundos={a.segundos} />,
          links: [
            { href: `/assuntos/${a.id}/nova`, rotulo: "Nova questão", icone: "nova" },
            { href: `/assuntos/${a.id}/importar`, rotulo: "Importar JSON", icone: "importar" },
          ],
          renomear: renomearAssunto.bind(null, a.id),
          excluir: excluirAssunto.bind(null, a.id),
          confirmacao: `Excluir "${a.nome}" com todas as questões?`,
        }))}
      />
    </>
  );
}
