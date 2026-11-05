import type { ReactNode } from "react";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import type { FormState } from "@/lib/actions";
import { ItemLinha, type LinkItem } from "./item-linha";

export type Item = {
  id: string;
  href: string;
  nome: string;
  detalhe?: ReactNode;
  links?: LinkItem[];
  renomear: (state: FormState, formData: FormData) => Promise<FormState>;
  excluir: () => Promise<void>;
  confirmacao: string;
};

export function ListaItens({
  itens,
  vazio,
}: {
  itens: Item[];
  vazio: { titulo: string; descricao: string };
}) {
  if (itens.length === 0) {
    return (
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyTitle>{vazio.titulo}</EmptyTitle>
          <EmptyDescription>{vazio.descricao}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ul className="divide-y rounded-lg border">
      {itens.map(({ id, ...item }) => (
        <ItemLinha key={id} {...item} />
      ))}
    </ul>
  );
}
