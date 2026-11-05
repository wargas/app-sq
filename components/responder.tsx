"use client";

import { CheckCircle2Icon, RotateCcwIcon, Trash2Icon, XCircleIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState, useTransition } from "react";
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
  anteriorHref,
  proximaHref,
}: {
  questaoId: string;
  tipo: TipoQuestao;
  opcoes: string[];
  anteriorHref?: string;
  proximaHref?: string;
}) {
  const router = useRouter();
  const grupoRef = useRef<HTMLDivElement>(null);
  const [escolha, setEscolha] = useState<string | null>(null);
  // Alternativas eliminadas pelo usuário: só visual, não é salvo
  const [riscadas, setRiscadas] = useState<ReadonlySet<string>>(new Set());
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

  function escolher(letra: string) {
    setEscolha(letra);
    // Escolher uma alternativa riscada desfaz o risco
    if (riscadas.has(letra)) alternarRisco(letra);
  }

  function alternarRisco(letra: string) {
    const nova = new Set(riscadas);
    if (nova.has(letra)) nova.delete(letra);
    else {
      nova.add(letra);
      if (escolha === letra) setEscolha(null);
    }
    setRiscadas(nova);
  }

  function refazer() {
    setEscolha(null);
    setCorrecao(null);
    setRiscadas(new Set());
  }

  // Atalhos: ←/→ navegam, letra seleciona, Shift+letra risca, Enter responde
  const aoTeclar = useEffectEvent((e: KeyboardEvent) => {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    const alvo = e.target as HTMLElement | null;
    if (
      alvo?.closest("input, textarea, select, [contenteditable=true], [role=menu], [role=dialog]")
    ) {
      return;
    }

    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      if (e.shiftKey) return;
      const href = e.key === "ArrowLeft" ? anteriorHref : proximaHref;
      if (href) {
        e.preventDefault();
        router.push(href);
      }
      return;
    }

    if (e.key === "Enter") {
      // Fora das alternativas, Enter mantém o comportamento normal (ex.: botão focado)
      const noGrupo = alvo === document.body || grupoRef.current?.contains(alvo);
      if (!noGrupo || e.shiftKey || e.repeat || correcao || pendente || !escolha) return;
      e.preventDefault();
      confirmar();
      return;
    }

    // e.code ignora Caps Lock e layout: "KeyA" → "A"
    const letra = /^Key([A-Z])$/.exec(e.code)?.[1];
    if (!letra || correcao || pendente) return;
    if (!alternativas.some((a) => a.letra === letra)) return;
    e.preventDefault();
    if (e.shiftKey) alternarRisco(letra);
    else escolher(letra);
  });

  useEffect(() => {
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div
        ref={grupoRef}
        role="radiogroup"
        aria-label="Alternativas"
        className={cn("flex flex-col gap-2", tipo === "certo_errado" && "sm:flex-row")}
      >
        {alternativas.map(({ letra, texto }) => {
          const selecionada = escolha === letra;
          const certa = correcao && letra === correcao.gabarito;
          const errada = correcao && selecionada && !correcao.correta;
          const riscada = riscadas.has(letra);
          const rotulo = tipo === "certo_errado" ? texto : `alternativa ${letra}`;
          return (
            <div key={letra} className="group/opcao flex flex-1 items-start gap-1">
              <button
                type="button"
                role="radio"
                aria-checked={selecionada}
                disabled={Boolean(correcao) || pendente}
                onClick={() => escolher(letra)}
                className={cn(
                  "flex flex-1 items-start gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors outline-none",
                  "focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default",
                  !correcao && "hover:bg-muted/50",
                  selecionada && !correcao && "border-primary bg-primary/5",
                  certa && "border-emerald-500 bg-emerald-500/10",
                  errada && "border-destructive bg-destructive/10",
                  riscada && !certa && !errada && "opacity-50",
                )}
              >
                {tipo === "multipla_escolha" && (
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium",
                      selecionada &&
                        !correcao &&
                        "border-primary bg-primary text-primary-foreground",
                      certa && "border-emerald-500 bg-emerald-500 text-white",
                      errada && "border-destructive bg-destructive text-white",
                    )}
                  >
                    {letra}
                  </span>
                )}
                <span
                  className={cn(
                    "pt-0.5 whitespace-pre-wrap",
                    tipo === "certo_errado" && "font-medium",
                    riscada && "line-through",
                  )}
                >
                  {texto}
                </span>
              </button>
              <Button
                type="button"
                variant={riscada ? "secondary" : "ghost"}
                size="icon-sm"
                // Com mouse, só aparece ao passar sobre a opção (ou com foco do teclado);
                // em telas de toque fica sempre visível
                className="mt-2 shrink-0 transition-opacity pointer-fine:not-group-hover/opcao:not-focus-visible:opacity-0"
                aria-pressed={riscada}
                aria-label={riscada ? `Desfazer risco da ${rotulo}` : `Riscar ${rotulo}`}
                title={riscada ? "Desfazer risco" : "Riscar"}
                disabled={Boolean(correcao) || pendente}
                onClick={() => alternarRisco(letra)}
              >
                <Trash2Icon />
              </Button>
            </div>
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
            <AlertDescription>Gabarito: {rotuloResposta(tipo, correcao.gabarito)}</AlertDescription>
          </Alert>

          {correcao.comentarios && (
            <section className="rounded-lg bg-muted/50 p-4">
              <h2 className="mb-2 text-sm font-medium">Comentários</h2>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{correcao.comentarios}</p>
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

      <Atalhos letras={alternativas.map((a) => a.letra)} />
    </div>
  );
}

function Atalhos({ letras }: { letras: string[] }) {
  const tecla = "rounded border bg-muted px-1 font-mono text-[0.7rem] text-foreground";
  const faixa = letras.length > 2 ? `${letras[0]}–${letras.at(-1)}` : letras.join("/");
  return (
    <p className="hidden flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground pointer-fine:flex">
      <span>
        <kbd className={tecla}>{faixa}</kbd> selecionar
      </span>
      <span>
        <kbd className={tecla}>Shift</kbd>+<kbd className={tecla}>{faixa}</kbd> riscar
      </span>
      <span>
        <kbd className={tecla}>Enter</kbd> responder
      </span>
      <span>
        <kbd className={tecla}>←</kbd> <kbd className={tecla}>→</kbd> navegar
      </span>
      <span>
        <kbd className={tecla}>Espaço</kbd> pausar/continuar relógio
      </span>
    </p>
  );
}
