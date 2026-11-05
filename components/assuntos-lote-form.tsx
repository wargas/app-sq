"use client";

import { ListPlusIcon } from "lucide-react";
import { useActionState, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import type { LoteState } from "@/lib/actions";

export function AssuntosLoteForm({
  action,
}: {
  action: (state: LoteState, formData: FormData) => Promise<LoteState>;
}) {
  const [state, formAction, pendente] = useActionState(action, {});
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Limpa a lista após adicionar com sucesso
  const [okAnterior, setOkAnterior] = useState(state.ok);
  if (state.ok !== okAnterior) {
    setOkAnterior(state.ok);
    setTexto("");
  }

  const total = new Set(
    texto
      .split(/\r?\n/)
      .map((l) => l.trim().toLocaleLowerCase("pt-BR"))
      .filter(Boolean),
  ).size;

  if (!aberto) {
    return (
      <div className="-mt-4 mb-6 flex flex-col gap-3">
        {state.mensagem && <Mensagem texto={state.mensagem} />}
        <Button
          variant="link"
          size="sm"
          className="self-start px-0"
          onClick={() => {
            setAberto(true);
            requestAnimationFrame(() => textareaRef.current?.focus());
          }}
        >
          <ListPlusIcon data-icon="inline-start" />
          Adicionar vários de uma vez
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="mb-6 flex flex-col gap-3 rounded-lg border p-4">
      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>
            <p>{state.error}</p>
            {state.erros && (
              <ul className="mt-2 list-disc space-y-0.5 pl-4">
                {state.erros.slice(0, 10).map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
                {state.erros.length > 10 && <li>… e mais {state.erros.length - 10} erros</li>}
              </ul>
            )}
          </AlertDescription>
        </Alert>
      )}
      {state.mensagem && <Mensagem texto={state.mensagem} />}

      <Field>
        <FieldLabel htmlFor="assuntos-lote">Assuntos em lote</FieldLabel>
        <Textarea
          ref={textareaRef}
          id="assuntos-lote"
          name="nomes"
          rows={8}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={"Princípios fundamentais\nDireitos e garantias fundamentais\nOrganização do Estado"}
          className="font-mono text-sm"
        />
        <FieldDescription>
          Um assunto por linha. Linhas vazias, repetidas ou de assuntos que já existem são
          ignoradas.
        </FieldDescription>
      </Field>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => setAberto(false)}>
          Fechar
        </Button>
        <Button type="submit" disabled={total === 0 || pendente}>
          <ListPlusIcon data-icon="inline-start" />
          {pendente
            ? "Adicionando…"
            : total > 0
              ? `Adicionar ${total} ${total === 1 ? "assunto" : "assuntos"}`
              : "Adicionar"}
        </Button>
      </div>
    </form>
  );
}

function Mensagem({ texto }: { texto: string }) {
  return (
    <Alert>
      <AlertDescription>{texto}</AlertDescription>
    </Alert>
  );
}
