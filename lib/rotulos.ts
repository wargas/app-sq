import type { TipoQuestao } from "@/db/schema";

export const ROTULO_TIPO: Record<TipoQuestao, string> = {
  certo_errado: "Certo/Errado",
  multipla_escolha: "Múltipla escolha",
};

export function rotuloResposta(tipo: TipoQuestao, letra: string) {
  if (tipo === "certo_errado") return letra === "C" ? "Certo" : "Errado";
  return letra;
}
