"use client";

import { PauseIcon, PlayIcon, SquareIcon, TimerIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { iniciarSessaoEstudo, salvarSessaoEstudo } from "@/lib/actions";
import {
  assinar,
  decorrido,
  gravar,
  interpretar,
  lerBruto,
} from "@/lib/cronometro-store";
import { formatarDuracao, formatarRelogio } from "@/lib/tempo";
import { cn } from "@/lib/utils";

/** De quanto em quanto tempo o tempo é salvo no banco enquanto o relógio corre. */
const INTERVALO_SALVAR = 15_000;
/** Sem sinal de vida por mais que isso, o relógio é tratado como abandonado. */
const LIMITE_ABANDONO = 3 * 60_000;

export function Cronometro({
  assuntoId,
  totalSegundos,
  ultimaSessao,
}: {
  assuntoId: string;
  /** Soma das sessões salvas no banco no momento do render. */
  totalSegundos: number;
  ultimaSessao: { id: string; segundos: number } | null;
}) {
  const router = useRouter();
  const bruto = useSyncExternalStore(
    assinar,
    () => lerBruto(assuntoId),
    () => null,
  );
  const estado = useMemo(() => interpretar(bruto), [bruto]);
  const rodando = estado.inicio !== null;

  const [agora, setAgora] = useState(0);
  const [pendente, setPendente] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const atual = useCallback(() => interpretar(lerBruto(assuntoId)), [assuntoId]);

  const salvar = useCallback((sessaoId: string | null, ms: number) => {
    if (!sessaoId) return Promise.resolve();
    return salvarSessaoEstudo(sessaoId, Math.floor(ms / 1000)).then(
      (r) => setErro(r.error ?? null),
      () => setErro("Não foi possível salvar o tempo. Tentaremos de novo."),
    );
  }, []);

  // Relógio aberto e esquecido (aba fechada, computador desligado): ao voltar,
  // conta só até o último sinal de vida e deixa pausado.
  useEffect(() => {
    const e = atual();
    if (e.inicio !== null && Date.now() - e.batida > LIMITE_ABANDONO) {
      const acumulado = decorrido(e, e.batida);
      gravar(assuntoId, { ...e, acumulado, inicio: null });
      salvar(e.sessaoId, acumulado);
    }
  }, [assuntoId, atual, salvar]);

  // Atualiza o mostrador a cada segundo
  useEffect(() => {
    if (!rodando) return;
    const tick = () => setAgora(Date.now());
    const primeiro = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(primeiro);
      clearInterval(id);
    };
  }, [rodando]);

  // Salva periodicamente e ao sair da aba
  useEffect(() => {
    if (!rodando) return;
    const persistir = () => {
      const e = atual();
      if (e.inicio === null) return;
      const t = Date.now();
      gravar(assuntoId, { ...e, batida: t });
      salvar(e.sessaoId, decorrido(e, t));
    };
    const id = setInterval(persistir, INTERVALO_SALVAR);
    const aoEsconder = () => document.visibilityState === "hidden" && persistir();
    document.addEventListener("visibilitychange", aoEsconder);
    window.addEventListener("pagehide", persistir);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", aoEsconder);
      window.removeEventListener("pagehide", persistir);
    };
  }, [rodando, assuntoId, atual, salvar]);

  async function iniciar() {
    setErro(null);
    let { sessaoId } = atual();
    if (!sessaoId) {
      setPendente(true);
      const r = await iniciarSessaoEstudo(assuntoId).catch(() => ({ error: "Falha de conexão" }));
      setPendente(false);
      if ("error" in r) return setErro(r.error);
      sessaoId = r.id;
    }
    const t = Date.now();
    setAgora(t);
    gravar(assuntoId, { ...atual(), sessaoId, inicio: t, batida: t });
  }

  function pausar() {
    const e = atual();
    const t = Date.now();
    const acumulado = decorrido(e, t);
    gravar(assuntoId, { ...e, acumulado, inicio: null, batida: t });
    return salvar(e.sessaoId, acumulado);
  }

  async function finalizar() {
    setPendente(true);
    await pausar();
    gravar(assuntoId, null);
    setPendente(false);
    router.refresh(); // atualiza o total vindo do banco
  }

  const sessaoSeg = Math.floor(
    decorrido(estado, rodando ? Math.max(agora, estado.inicio ?? 0) : 0) / 1000,
  );
  // O total do banco já inclui o que foi salvo desta sessão: desconta para não somar duas vezes
  const base =
    ultimaSessao && ultimaSessao.id === estado.sessaoId
      ? totalSegundos - ultimaSessao.segundos
      : totalSegundos;
  const totalAgora = base + (estado.sessaoId ? sessaoSeg : 0);

  return (
    <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-lg border bg-muted/30 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="relative flex size-8 items-center justify-center rounded-full bg-background ring-1 ring-border">
          <TimerIcon className="size-4 text-muted-foreground" />
          {rodando && (
            <span className="absolute -top-0.5 -right-0.5 size-2.5 animate-pulse rounded-full bg-emerald-500 ring-2 ring-background" />
          )}
        </span>
        <div className="flex flex-col">
          <span
            className={cn(
              "font-mono text-xl leading-none font-semibold tabular-nums",
              !rodando && estado.sessaoId && "text-muted-foreground",
            )}
            aria-live="off"
          >
            {formatarRelogio(sessaoSeg)}
          </span>
          <span className="mt-1 text-xs text-muted-foreground">
            {rodando ? "Estudando" : estado.sessaoId ? "Pausado" : "Tempo de estudo"} · Total no
            assunto: <span className="tabular-nums">{formatarDuracao(totalAgora)}</span>
          </span>
        </div>
      </div>

      <div className="ml-auto flex gap-2">
        {rodando ? (
          <Button variant="outline" size="sm" onClick={pausar}>
            <PauseIcon data-icon="inline-start" />
            Pausar
          </Button>
        ) : (
          <Button size="sm" onClick={iniciar} disabled={pendente}>
            <PlayIcon data-icon="inline-start" />
            {estado.sessaoId ? "Continuar" : "Iniciar"}
          </Button>
        )}
        {estado.sessaoId && (
          <Button
            variant="ghost"
            size="sm"
            onClick={finalizar}
            disabled={pendente}
            title="Salva o tempo e zera o relógio para uma nova sessão"
          >
            <SquareIcon data-icon="inline-start" />
            Finalizar
          </Button>
        )}
      </div>

      {erro && <p className="w-full text-xs text-destructive">{erro}</p>}
    </div>
  );
}
