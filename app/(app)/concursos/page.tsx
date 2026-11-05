import type { Metadata } from "next";
import { Suspense } from "react";
import { ListaItens } from "@/components/lista-itens";
import { NomeForm } from "@/components/nome-form";
import { PageHeader, PageSkeleton } from "@/components/page-header";
import { criarConcurso, excluirConcurso, renomearConcurso } from "@/lib/actions";
import { listarConcursos } from "@/lib/data";
import { plural } from "@/lib/plural";

export const metadata: Metadata = { title: "Concursos" };

export default function ConcursosPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Conteudo />
    </Suspense>
  );
}

async function Conteudo() {
  const concursos = await listarConcursos();
  return (
    <>
      <PageHeader titulo="Concursos" descricao="Organize suas questões por concurso." />
      <NomeForm action={criarConcurso} placeholder="Nome do concurso" rotulo="Adicionar" />
      <ListaItens
        vazio={{
          titulo: "Nenhum concurso",
          descricao: "Adicione o primeiro concurso para começar.",
        }}
        itens={concursos.map((c) => ({
          id: c.id,
          href: `/concursos/${c.id}`,
          nome: c.nome,
          detalhe: plural(c.disciplinas.length, "disciplina", "disciplinas"),
          renomear: renomearConcurso.bind(null, c.id),
          excluir: excluirConcurso.bind(null, c.id),
          confirmacao: `Excluir "${c.nome}" com todas as disciplinas, assuntos e questões?`,
        }))}
      />
    </>
  );
}
