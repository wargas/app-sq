import { TimerIcon } from "lucide-react";
import { formatarDuracao } from "@/lib/tempo";
import { cn } from "@/lib/utils";

/** "⏱ 1h 05min estudados". Não renderiza nada sem tempo registrado. */
export function TempoEstudado({ segundos, className }: { segundos: number; className?: string }) {
  if (segundos <= 0) return null;
  return (
    <span
      className={cn("inline-flex items-center gap-1 tabular-nums", className)}
      title="Tempo estudado (cronômetro)"
    >
      <TimerIcon className="size-3.5 shrink-0" aria-hidden />
      {formatarDuracao(segundos)} estudados
    </span>
  );
}
