"use client";

import { useState } from "react";
import { formatarDuracao } from "@/lib/tempo";
import { cn } from "@/lib/utils";

export type Serie = { nome: string; /** classe de fundo, ex.: "bg-viz-1" */ cor: string };
export type Ponto = { dia: string; valores: number[] };
type Formato = "numero" | "duracao";

const ALTURA = 160; // px da área de plotagem

const fmtDiaCurto = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", timeZone: "UTC" });
const fmtDiaLongo = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});
const paraData = (dia: string) => new Date(`${dia}T12:00:00Z`);

function formatar(v: number, formato: Formato) {
  return formato === "duracao" ? formatarDuracao(v) : v.toLocaleString("pt-BR");
}

/** Teto "redondo" para o eixo: 1, 2, 2,5, 5 × 10ⁿ. Duração arredonda em minutos. */
function tetoRedondo(max: number, formato: Formato) {
  const escala = formato === "duracao" ? 60 : 1;
  const v = max / escala;
  if (v <= 0) return formato === "duracao" ? 60 : 4; // eixo padrão sem dados: 1h / 4
  const exp = 10 ** Math.floor(Math.log10(v));
  const passo = [1, 2, 2.5, 5, 10].find((m) => m * exp >= v)! * exp;
  // Contagens precisam de divisões inteiras (metade do teto)
  const teto = formato === "numero" ? Math.max(2, Math.ceil(passo / 2) * 2) : passo;
  return teto * escala;
}

export function GraficoColunas({
  titulo,
  descricao,
  series,
  pontos,
  formato = "numero",
}: {
  titulo: string;
  descricao?: string;
  series: Serie[];
  pontos: Ponto[];
  formato?: Formato;
}) {
  const [ativo, setAtivo] = useState<number | null>(null);
  const totais = pontos.map((p) => p.valores.reduce((a, b) => a + b, 0));
  const teto = tetoRedondo(Math.max(0, ...totais), formato);
  const ultimo = pontos.length - 1;

  return (
    <section className="flex flex-col gap-4 rounded-lg border p-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-medium">{titulo}</h2>
          {descricao && <p className="text-sm text-muted-foreground">{descricao}</p>}
        </div>
        {series.length > 1 && (
          <ul className="flex gap-3 text-xs text-muted-foreground">
            {series.map((s) => (
              <li key={s.nome} className="flex items-center gap-1.5">
                <span className={cn("size-2.5 rounded-sm", s.cor)} aria-hidden />
                {s.nome}
              </li>
            ))}
          </ul>
        )}
      </header>

      <div className="flex gap-2">
        {/* Eixo Y: 0, metade e teto */}
        <div
          className="relative w-12 shrink-0 text-right text-[11px] text-muted-foreground tabular-nums"
          style={{ height: ALTURA }}
          aria-hidden
        >
          {[1, 0.5, 0].map((f) => (
            <span
              key={f}
              className="absolute right-0 -translate-y-1/2"
              style={{ top: (1 - f) * ALTURA }}
            >
              {formatar(teto * f, formato)}
            </span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          {/* Grade recessiva */}
          <div className="pointer-events-none absolute inset-x-0 top-0" style={{ height: ALTURA }}>
            {[0, 0.5].map((f) => (
              <div
                key={f}
                className="absolute inset-x-0 border-t border-dashed border-border/70"
                style={{ top: f * ALTURA }}
              />
            ))}
            <div className="absolute inset-x-0 bottom-0 border-t border-border" />
          </div>

          <div
            role="list"
            aria-label={titulo}
            className="relative flex"
            style={{ height: ALTURA }}
            onMouseLeave={() => setAtivo(null)}
          >
            {pontos.map((p, i) => {
              const total = totais[i];
              const rotulo = `${fmtDiaLongo.format(paraData(p.dia))}: ${series
                .map((s, k) => `${s.nome} ${formatar(p.valores[k], formato)}`)
                .join(", ")}`;
              return (
                <div
                  key={p.dia}
                  role="listitem"
                  tabIndex={0}
                  aria-label={rotulo}
                  className="group relative flex h-full flex-1 cursor-default items-end justify-center outline-none"
                  onMouseEnter={() => setAtivo(i)}
                  onFocus={() => setAtivo(i)}
                  onBlur={() => setAtivo(null)}
                >
                  {/* Coluna empilhada: 2px de respiro entre segmentos, ponta arredondada só no topo */}
                  <div
                    className={cn(
                      "flex w-full max-w-6 flex-col-reverse gap-0.5 transition-opacity",
                      ativo !== null && ativo !== i && "opacity-50",
                    )}
                    style={{ height: `${(total / teto) * 100}%` }}
                  >
                    {series.map((s, k) => {
                      const v = p.valores[k];
                      if (v <= 0) return null;
                      const topo = p.valores.slice(k + 1).every((x) => x <= 0);
                      return (
                        <div
                          key={s.nome}
                          className={cn(s.cor, "min-h-0.5", topo && "rounded-t")}
                          style={{ flexGrow: v, flexBasis: 0 }}
                        />
                      );
                    })}
                  </div>

                  {ativo === i && (
                    <div
                      role="tooltip"
                      className={cn(
                        "pointer-events-none absolute bottom-full z-10 mb-2 min-w-36 rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md",
                        i < 3 ? "left-0" : i > ultimo - 3 ? "right-0" : "left-1/2 -translate-x-1/2",
                      )}
                    >
                      <p className="mb-1 text-muted-foreground capitalize">
                        {fmtDiaLongo.format(paraData(p.dia))}
                      </p>
                      {series.map((s, k) => (
                        <p key={s.nome} className="flex items-center gap-2">
                          <span className={cn("h-0.5 w-3 rounded-full", s.cor)} aria-hidden />
                          <span className="font-semibold tabular-nums">
                            {formatar(p.valores[k], formato)}
                          </span>
                          <span className="text-muted-foreground">{s.nome}</span>
                        </p>
                      ))}
                      {series.length > 1 && (
                        <p className="mt-1 border-t pt-1 tabular-nums">
                          <span className="font-semibold">{formatar(total, formato)}</span>{" "}
                          <span className="text-muted-foreground">no total</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Eixo X: dia do mês, em dias alternados contando a partir de hoje */}
          <div className="mt-1.5 flex text-[11px] text-muted-foreground tabular-nums" aria-hidden>
            {pontos.map((p, i) => (
              <span key={p.dia} className="flex-1 text-center">
                {(ultimo - i) % 2 === 0
                  ? i === ultimo
                    ? "Hoje"
                    : fmtDiaCurto.format(paraData(p.dia))
                  : ""}
              </span>
            ))}
          </div>
        </div>
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
          Ver tabela
        </summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left tabular-nums">
            <thead className="text-muted-foreground">
              <tr className="border-b">
                <th className="py-1.5 pr-4 font-normal">Dia</th>
                {series.map((s) => (
                  <th key={s.nome} className="py-1.5 pr-4 text-right font-normal">
                    {s.nome}
                  </th>
                ))}
                {series.length > 1 && <th className="py-1.5 text-right font-normal">Total</th>}
              </tr>
            </thead>
            <tbody>
              {pontos.map((p, i) => (
                <tr key={p.dia} className="border-b last:border-0">
                  <td className="py-1.5 pr-4 capitalize">{fmtDiaLongo.format(paraData(p.dia))}</td>
                  {p.valores.map((v, k) => (
                    <td key={k} className="py-1.5 pr-4 text-right">
                      {formatar(v, formato)}
                    </td>
                  ))}
                  {series.length > 1 && (
                    <td className="py-1.5 text-right">{formatar(totais[i], formato)}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
