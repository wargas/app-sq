"use client";

import { CheckCircle2Icon, RotateCcwIcon, XCircleIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { TipoQuestao } from "@/db/schema";
import { type Correcao, responderQuestao } from "@/lib/actions";
import { LETRAS } from "@/lib/letras";
import { rotuloResposta } from "@/lib/rotulos";
import { cn } from "@/lib/utils";

export function Responder({
  questaoId,
  tipo,
  opcoes,
}: {
  questaoId: string;
  tipo: TipoQuestao;
  opcoes: string[];
}) {
  const [escolha, setEscolha] = useState<string | null>(null);
  const [correcao, setCorrecao] = useState<Correcao | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();

  const alternativas =
    tipo === "certo_errado"
      ? [
          { letra: "C", texto: "Certo" },
          { letra: "E", texto: "Errado" },
        ]
      : opcoes.map((texto, i) => ({ letra: LETRAS[i], texto }));

  function confirmar() {
    if (!escolha) return;
    setErro(null);
    startTransition(async () => {
      const r = await responderQuestao(questaoId, escolha);
      if ("error" in r) setErro(r.error);
      else setCorrecao(r);
    });
  }

  function refazer() {
    setEscolha(null);
    setCorrecao(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        role="radiogroup"
        aria-label="Alternativas"
        className={cn("flex flex-col gap-2", tipo === "certo_errado" && "sm:flex-row")}
      >
        {alternativas.map(({ letra, texto }) => {
          const selecionada = escolha === letra;
          const certa = correcao && letra === correcao.gabarito;
          const errada = correcao && selecionada && !correcao.correta;
          return (
            <button
              key={letra}
              type="button"
              role="radio"
              aria-checked={selecionada}
              disabled={Boolean(correcao) || pendente}
              onClick={() => setEscolha(letra)}
              className={cn(
                "flex flex-1 items-start gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors outline-none",
                "focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default",
                !correcao && "hover:bg-muted/50",
                selecionada && !correcao && "border-primary bg-primary/5",
                certa && "border-emerald-500 bg-emerald-500/10",
                errada && "border-destructive bg-destructive/10",
              )}
            >
              {tipo === "multipla_escolha" && (
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium",
                    selecionada && !correcao && "border-primary bg-primary text-primary-foreground",
                    certa && "border-emerald-500 bg-emerald-500 text-white",
                    errada && "border-destructive bg-destructive text-white",
                  )}
                >
                  {letra}
                </span>
              )}
              <span className={cn("pt-0.5 whitespace-pre-wrap", tipo === "certo_errado" && "font-medium")}>
                {texto}
              </span>
            </button>
          );
        })}
      </div>

      {erro && (
        <Alert variant="destructive">
          <AlertDescription>{erro}</AlertDescription>
        </Alert>
      )}

      {correcao ? (
        <>
          <Alert
            className={cn(
              correcao.correta
                ? "border-emerald-500/50 text-emerald-700 dark:text-emerald-400"
                : "border-destructive/50 text-destructive",
            )}
          >
            {correcao.correta ? <CheckCircle2Icon /> : <XCircleIcon />}
            <AlertTitle>{correcao.correta ? "Você acertou!" : "Você errou."}</AlertTitle>
            <AlertDescription>
              Gabarito: {rotuloResposta(tipo, correcao.gabarito)}
            </AlertDescription>
          </Alert>

          {correcao.comentarios && (
            <section className="rounded-lg bg-muted/50 p-4">
              <h2 className="mb-2 text-sm font-medium">Comentários</h2>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {correcao.comentarios}
              </p>
            </section>
          )}

          <Button variant="outline" className="w-fit" onClick={refazer}>
            <RotateCcwIcon data-icon="inline-start" />
            Responder novamente
          </Button>
        </>
      ) : (
        <Button className="w-fit" disabled={!escolha || pendente} onClick={confirmar}>
          {pendente ? "Corrigindo…" : "Responder"}
        </Button>
      )}
    </div>
  );
}
