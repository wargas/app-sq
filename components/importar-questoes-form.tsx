"use client";

import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { ImportState } from "@/lib/actions";
import { plural } from "@/lib/plural";

// Server Actions aceitam até 1 MB por padrão; deixa folga para o multipart
const TAMANHO_MAX = 950 * 1024;

type Arquivo = { conteudo: string; total: number } | { erro: string } | null;

export function ImportarQuestoesForm({
  action,
  cancelarHref,
}: {
  action: (state: ImportState, formData: FormData) => Promise<ImportState>;
  cancelarHref: string;
}) {
  const [state, formAction, pendente] = useActionState(action, {});
  const [arquivo, setArquivo] = useState<Arquivo>(null);

  async function lerArquivo(file: File | undefined) {
    if (!file) return setArquivo(null);
    if (file.size > TAMANHO_MAX) {
      return setArquivo({ erro: "Arquivo muito grande (máx. ~950 KB). Divida em partes." });
    }
    const conteudo = await file.text();
    try {
      const json = JSON.parse(conteudo);
      const lista = json?.questoes;
      if (!Array.isArray(lista)) {
        return setArquivo({ erro: 'Formato esperado: { "questoes": [ ... ] }' });
      }
      setArquivo({ conteudo, total: lista.length });
    } catch {
      setArquivo({ erro: "O arquivo não é um JSON válido." });
    }
  }

  const pronto = arquivo && "conteudo" in arquivo;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!pronto) return;
        const formData = new FormData();
        formData.set("conteudo", arquivo.conteudo);
        startTransition(() => formAction(formData));
      }}
    >
      <FieldGroup>
        {state.error && (
          <Alert variant="destructive">
            <AlertDescription>
              <p>{state.error}</p>
              {state.erros && (
                <ul className="mt-2 list-disc space-y-0.5 pl-4">
                  {state.erros.slice(0, 20).map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                  {state.erros.length > 20 && <li>… e mais {state.erros.length - 20} erros</li>}
                </ul>
              )}
            </AlertDescription>
          </Alert>
        )}

        <Field data-invalid={Boolean(arquivo && "erro" in arquivo)}>
          <FieldLabel htmlFor="arquivo">Arquivo JSON</FieldLabel>
          <Input
            id="arquivo"
            type="file"
            accept="application/json,.json"
            onChange={(e) => lerArquivo(e.target.files?.[0])}
            required
          />
          {pronto ? (
            <FieldDescription>
              {plural(arquivo.total, "questão encontrada", "questões encontradas")}.
            </FieldDescription>
          ) : (
            <FieldError>{arquivo && "erro" in arquivo ? arquivo.erro : undefined}</FieldError>
          )}
        </Field>

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" render={<Link href={cancelarHref} />} nativeButton={false}>
            Voltar
          </Button>
          <Button type="submit" disabled={!pronto || pendente}>
            {pendente ? "Importando…" : "Importar"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
