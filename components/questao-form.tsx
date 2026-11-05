"use client";

import { PlusIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import type { TipoQuestao } from "@/db/schema";
import type { FormState } from "@/lib/actions";
import { LETRAS, MAX_OPCOES, MIN_OPCOES } from "@/lib/letras";

export type QuestaoInicial = {
  ano: number;
  banca: string;
  enunciado: string;
  tipo: TipoQuestao;
  opcoes: string[];
  gabarito: string;
  comentarios: string | null;
};

type Opcao = { key: number; texto: string };

let seq = 0;
const novaOpcao = (texto = ""): Opcao => ({ key: ++seq, texto });

export function QuestaoForm({
  action,
  inicial,
  cancelarHref,
  edicao,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  inicial?: QuestaoInicial;
  cancelarHref: string;
  edicao?: boolean;
}) {
  const [state, formAction, pendente] = useActionState(action, {});
  const [tipo, setTipo] = useState<TipoQuestao>(inicial?.tipo ?? "multipla_escolha");
  const [opcoes, setOpcoes] = useState<Opcao[]>(() =>
    inicial?.tipo === "multipla_escolha"
      ? inicial.opcoes.map((o) => novaOpcao(o))
      : Array.from({ length: MAX_OPCOES }, () => novaOpcao()),
  );
  const [gabarito, setGabarito] = useState(inicial?.gabarito ?? "");
  const formRef = useRef<HTMLFormElement>(null);
  const enunciadoRef = useRef<HTMLTextAreaElement>(null);

  // Após "salvar e adicionar outra": limpa o que muda entre questões,
  // mantendo ano, banca e tipo (normalmente iguais na mesma prova).
  useEffect(() => {
    if (!state.ok || !formRef.current) return;
    const form = formRef.current;
    (form.elements.namedItem("enunciado") as HTMLTextAreaElement).value = "";
    (form.elements.namedItem("comentarios") as HTMLTextAreaElement).value = "";
    setOpcoes((atual) => atual.map(() => novaOpcao()));
    setGabarito("");
    enunciadoRef.current?.focus();
  }, [state.ok]);

  const erro = (campo: string) => state.fieldErrors?.[campo];
  const letras = LETRAS.slice(0, opcoes.length);

  function mudarTipo(novo: TipoQuestao) {
    setTipo(novo);
    setGabarito("");
  }

  function removerOpcao(i: number) {
    const letraRemovida = LETRAS[i];
    setOpcoes((atual) => atual.filter((_, j) => j !== i));
    // Mantém o gabarito apontando para a mesma alternativa
    if (gabarito === letraRemovida) setGabarito("");
    else if (gabarito && LETRAS.indexOf(gabarito as (typeof LETRAS)[number]) > i) {
      setGabarito(LETRAS[LETRAS.indexOf(gabarito as (typeof LETRAS)[number]) - 1]);
    }
  }

  return (
    <form
      ref={formRef}
      // onSubmit em vez de action: o React limparia os campos após cada envio,
      // apagando o que foi digitado quando há erro de validação.
      onSubmit={(e) => {
        e.preventDefault();
        const submitter = (e.nativeEvent as SubmitEvent).submitter;
        const formData = new FormData(e.currentTarget, submitter);
        startTransition(() => formAction(formData));
      }}
    >
      <FieldGroup>
        {state.error && (
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
          <Field data-invalid={Boolean(erro("banca"))}>
            <FieldLabel htmlFor="banca">Banca</FieldLabel>
            <Input
              id="banca"
              name="banca"
              defaultValue={inicial?.banca}
              placeholder="Ex.: Cebraspe, FGV, FCC"
              aria-invalid={Boolean(erro("banca"))}
              maxLength={100}
              required
            />
            <FieldError>{erro("banca")}</FieldError>
          </Field>
          <Field data-invalid={Boolean(erro("ano"))}>
            <FieldLabel htmlFor="ano">Ano</FieldLabel>
            <Input
              id="ano"
              name="ano"
              type="number"
              inputMode="numeric"
              defaultValue={inicial?.ano ?? new Date().getFullYear()}
              aria-invalid={Boolean(erro("ano"))}
              min={1950}
              max={new Date().getFullYear() + 1}
              required
            />
            <FieldError>{erro("ano")}</FieldError>
          </Field>
        </div>

        <Field data-invalid={Boolean(erro("enunciado"))}>
          <FieldLabel htmlFor="enunciado">Enunciado</FieldLabel>
          <Textarea
            ref={enunciadoRef}
            id="enunciado"
            name="enunciado"
            defaultValue={inicial?.enunciado}
            aria-invalid={Boolean(erro("enunciado"))}
            className="min-h-32"
            required
          />
          <FieldError>{erro("enunciado")}</FieldError>
        </Field>

        <FieldSet>
          <FieldLegend variant="label">Tipo</FieldLegend>
          <RadioGroup
            name="tipo"
            value={tipo}
            onValueChange={(v) => mudarTipo(v as TipoQuestao)}
            className="flex flex-wrap gap-4"
          >
            <Field orientation="horizontal" className="w-auto">
              <RadioGroupItem value="multipla_escolha" id="tipo-me" />
              <FieldLabel htmlFor="tipo-me" className="font-normal">
                Múltipla escolha
              </FieldLabel>
            </Field>
            <Field orientation="horizontal" className="w-auto">
              <RadioGroupItem value="certo_errado" id="tipo-ce" />
              <FieldLabel htmlFor="tipo-ce" className="font-normal">
                Certo/Errado
              </FieldLabel>
            </Field>
          </RadioGroup>
        </FieldSet>

        <FieldSet data-invalid={Boolean(erro("opcoes") || erro("gabarito"))}>
          <FieldLegend variant="label">
            {tipo === "multipla_escolha" ? "Alternativas e gabarito" : "Gabarito"}
          </FieldLegend>

          {tipo === "certo_errado" ? (
            <RadioGroup
              name="gabarito"
              value={gabarito}
              onValueChange={(v) => setGabarito(String(v))}
              className="flex gap-4"
            >
              {(["C", "E"] as const).map((v) => (
                <Field key={v} orientation="horizontal" className="w-auto">
                  <RadioGroupItem value={v} id={`gab-${v}`} />
                  <FieldLabel htmlFor={`gab-${v}`} className="font-normal">
                    {v === "C" ? "Certo" : "Errado"}
                  </FieldLabel>
                </Field>
              ))}
            </RadioGroup>
          ) : (
            <>
              <p className="-mt-1 text-sm text-muted-foreground">
                Marque a alternativa correta.
              </p>
              <RadioGroup
                name="gabarito"
                value={gabarito}
                onValueChange={(v) => setGabarito(String(v))}
                className="gap-2"
              >
                {opcoes.map((o, i) => (
                  <div key={o.key} className="flex items-start gap-3">
                    <RadioGroupItem
                      value={letras[i]}
                      id={`gab-${letras[i]}`}
                      aria-label={`Alternativa ${letras[i]} é a correta`}
                      className="mt-2.5"
                    />
                    <label
                      htmlFor={`opcao-${o.key}`}
                      className="w-5 pt-1.5 text-sm font-medium"
                    >
                      {letras[i]}
                    </label>
                    <Textarea
                      id={`opcao-${o.key}`}
                      name="opcao"
                      value={o.texto}
                      onChange={(e) =>
                        setOpcoes((atual) =>
                          atual.map((x) =>
                            x.key === o.key ? { ...x, texto: e.target.value } : x,
                          ),
                        )
                      }
                      rows={1}
                      className="min-h-9 flex-1"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remover alternativa ${letras[i]}`}
                      disabled={opcoes.length <= MIN_OPCOES}
                      onClick={() => removerOpcao(i)}
                      className="mt-1"
                    >
                      <XIcon />
                    </Button>
                  </div>
                ))}
              </RadioGroup>
              {opcoes.length < MAX_OPCOES && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  onClick={() => setOpcoes((atual) => [...atual, novaOpcao()])}
                >
                  <PlusIcon data-icon="inline-start" />
                  Alternativa
                </Button>
              )}
            </>
          )}
          <FieldError>{erro("opcoes") ?? erro("gabarito")}</FieldError>
        </FieldSet>

        <Field>
          <FieldLabel htmlFor="comentarios">Comentários</FieldLabel>
          <Textarea
            id="comentarios"
            name="comentarios"
            defaultValue={inicial?.comentarios ?? ""}
            placeholder="Explicação do gabarito, fundamentação, dicas… (opcional)"
            className="min-h-24"
          />
        </Field>

        {state.ok && !edicao && (
          <p role="status" className="text-sm text-emerald-600 dark:text-emerald-400">
            Questão salva. Cadastre a próxima.
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" render={<Link href={cancelarHref} />} nativeButton={false}>
            {edicao ? "Cancelar" : "Voltar"}
          </Button>
          {!edicao && (
            <Button
              type="submit"
              variant="outline"
              name="continuar"
              value="1"
              disabled={pendente}
            >
              Salvar e adicionar outra
            </Button>
          )}
          <Button type="submit" disabled={pendente}>
            {pendente ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
