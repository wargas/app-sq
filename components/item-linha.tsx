"use client";

import {
  CheckIcon,
  ChevronRightIcon,
  EllipsisVerticalIcon,
  FileJsonIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { type ReactNode, useActionState, useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { FormState } from "@/lib/actions";
import { ExcluirButton } from "./excluir-button";

// Ícones vão por nome: componentes não podem ser passados do servidor para o cliente
const ICONES = { nova: PlusIcon, importar: FileJsonIcon } as const;

export type LinkItem = { href: string; rotulo: string; icone: keyof typeof ICONES };

export function ItemLinha({
  href,
  nome,
  detalhe,
  links,
  renomear,
  excluir,
  confirmacao,
}: {
  href: string;
  nome: string;
  detalhe?: ReactNode;
  /** Quando informado, as ações da linha ficam num menu dropdown. */
  links?: LinkItem[];
  renomear: (state: FormState, formData: FormData) => Promise<FormState>;
  excluir: () => Promise<void>;
  confirmacao: string;
}) {
  const [editando, setEditando] = useState(false);
  const [excluindo, startTransition] = useTransition();

  if (editando) {
    return <RenomearForm nome={nome} action={renomear} fechar={() => setEditando(false)} />;
  }

  return (
    <li className="flex items-center gap-1 pr-2">
      <Link
        href={href}
        className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 hover:bg-muted/50"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{nome}</p>
          {detalhe && <div className="mt-0.5 text-sm text-muted-foreground">{detalhe}</div>}
        </div>
        <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
      </Link>
      {links ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Opções de ${nome}`}
                disabled={excluindo}
              />
            }
          >
            <EllipsisVerticalIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-auto min-w-44">
            {links.map((l) => {
              const Icone = ICONES[l.icone];
              return (
                <DropdownMenuItem key={l.href} render={<Link href={l.href} />}>
                  <Icone />
                  {l.rotulo}
                </DropdownMenuItem>
              );
            })}
            {links.length > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem onClick={() => setEditando(true)}>
              <PencilIcon />
              Renomear
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => {
                if (confirm(confirmacao)) startTransition(() => excluir());
              }}
            >
              <Trash2Icon />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Renomear"
            title="Renomear"
            onClick={() => setEditando(true)}
          >
            <PencilIcon />
          </Button>
          <ExcluirButton action={excluir} confirmacao={confirmacao} />
        </>
      )}
    </li>
  );
}

function RenomearForm({
  nome,
  action,
  fechar,
}: {
  nome: string;
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  fechar: () => void;
}) {
  const [state, formAction, pendente] = useActionState(action, {});

  useEffect(() => {
    if (state.ok) fechar();
  }, [state.ok, fechar]);

  const erro = state.fieldErrors?.nome ?? state.error;

  return (
    <li className="px-4 py-2.5">
      <form action={formAction}>
        <Field data-invalid={Boolean(erro)}>
          <div className="flex items-center gap-1">
            <Input
              name="nome"
              defaultValue={nome}
              aria-label="Novo nome"
              aria-invalid={Boolean(erro)}
              required
              maxLength={255}
              autoComplete="off"
              autoFocus
              onFocus={(e) => e.currentTarget.select()}
              onKeyDown={(e) => {
                if (e.key === "Escape") fechar();
              }}
            />
            <Button
              type="submit"
              variant="ghost"
              size="icon-sm"
              aria-label="Salvar"
              title="Salvar"
              disabled={pendente}
            >
              <CheckIcon />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Cancelar"
              title="Cancelar"
              disabled={pendente}
              onClick={fechar}
            >
              <XIcon />
            </Button>
          </div>
          {erro && <FieldError>{erro}</FieldError>}
        </Field>
      </form>
    </li>
  );
}
