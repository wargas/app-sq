import { plural } from "@/lib/plural";
import { TempoEstudado } from "./tempo-estudado";

export type Progresso = { total: number; respondidas: number; acertos: number };

/** Barra de questões respondidas: verde = acertou na última tentativa, vermelho = errou. */
export function BarraProgresso({
  total,
  respondidas,
  acertos,
  segundos = 0,
}: Progresso & { segundos?: number }) {
  const tempo = segundos > 0 && (
    <>
      {" · "}
      <TempoEstudado segundos={segundos} className="align-text-bottom" />
    </>
  );
  if (total === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhuma questão
        {tempo}
      </p>
    );
  }
  const pct = (n: number) => `${(n / total) * 100}%`;
  const erros = respondidas - acertos;

  return (
    <div className="flex flex-col gap-1.5">
      <div
        role="progressbar"
        aria-label="Questões respondidas"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={respondidas}
        className="flex h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-muted"
      >
        <div className="bg-emerald-500" style={{ width: pct(acertos) }} />
        <div className="bg-destructive" style={{ width: pct(erros) }} />
      </div>
      <p className="text-sm text-muted-foreground tabular-nums">
        {respondidas}/{plural(total, "questão respondida", "questões respondidas")}
        {respondidas > 0 && (
          <>
            {" · "}
            <span className="text-emerald-600 dark:text-emerald-400">
              {plural(acertos, "certa", "certas")}
            </span>
            {erros > 0 && (
              <>
                {" · "}
                <span className="text-destructive">{plural(erros, "errada", "erradas")}</span>
              </>
            )}
          </>
        )}
        {tempo}
      </p>
    </div>
  );
}
