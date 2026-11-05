import { Suspense } from "react";
import { ImportarQuestoesForm } from "@/components/importar-questoes-form";
import { PageHeader, PageSkeleton } from "@/components/page-header";
import { importarQuestoes } from "@/lib/actions";
import { obterAssunto } from "@/lib/data";

const EXEMPLO = `{
  "$schema": "./questoes.schema.json",
  "questoes": [
    {
      "banca": "FGV",
      "ano": 2024,
      "enunciado": "Qual é a capital do Brasil?",
      "tipo": "multipla_escolha",
      "alternativas": ["São Paulo", "Rio de Janeiro", "Brasília", "Salvador"],
      "gabarito": "C",
      "comentarios": "Opcional."
    },
    {
      "banca": "Cebraspe",
      "ano": 2023,
      "enunciado": "A CF/88 é classificada como rígida.",
      "tipo": "certo_errado",
      "gabarito": "C"
    }
  ]
}`;

export default function ImportarQuestoesPage({
  params,
}: PageProps<"/assuntos/[assuntoId]/importar">) {
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
      <title>Importar questões</title>
      <PageHeader
        trilha={[
          { label: "Concursos", href: "/concursos" },
          { label: disciplina.concurso.nome, href: `/concursos/${disciplina.concurso.id}` },
          { label: disciplina.nome, href: `/disciplinas/${disciplina.id}` },
          { label: assunto.nome, href: `/assuntos/${assunto.id}` },
          { label: "Importar" },
        ]}
        titulo="Importar questões"
        descricao="Envie um arquivo JSON para cadastrar várias questões de uma vez neste assunto."
      />
      <ImportarQuestoesForm
        action={importarQuestoes.bind(null, assunto.id)}
        cancelarHref={`/assuntos/${assunto.id}`}
      />

      <section className="mt-10 flex flex-col gap-3 text-sm">
        <h2 className="font-medium">Formato do arquivo</h2>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>
            <code>tipo</code>: <code>multipla_escolha</code> ou <code>certo_errado</code>.
          </li>
          <li>
            Múltipla escolha: <code>alternativas</code> com 2 a 5 itens (A–E) e{" "}
            <code>gabarito</code> com a letra correta.
          </li>
          <li>
            Certo/Errado: sem <code>alternativas</code>; <code>gabarito</code> é <code>C</code>{" "}
            ou <code>E</code>.
          </li>
          <li>
            <code>comentarios</code> é opcional. Até 500 questões por arquivo; se alguma tiver
            erro, nenhuma é importada.
          </li>
        </ul>
        <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-4 text-xs">
          {EXEMPLO}
        </pre>
      </section>
    </>
  );
}
