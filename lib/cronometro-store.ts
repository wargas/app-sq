// Estado do cronômetro no localStorage, por assunto. Assim o relógio continua
// ao navegar entre questões, ao recarregar a página e entre abas.

export type EstadoCronometro = {
  /** Sessão no banco; null antes do primeiro "Iniciar". */
  sessaoId: string | null;
  /** Tempo efetivo (ms) acumulado antes do trecho atual. */
  acumulado: number;
  /** Início (epoch ms) do trecho atual; null = pausado. */
  inicio: number | null;
  /** Último sinal de vida (epoch ms) enquanto rodava. */
  batida: number;
};

export const ESTADO_INICIAL: EstadoCronometro = {
  sessaoId: null,
  acumulado: 0,
  inicio: null,
  batida: 0,
};

const chave = (assuntoId: string) => `estudo:${assuntoId}`;
const ouvintes = new Set<() => void>();
// Reserva em memória se o localStorage não estiver disponível (aba privada etc.)
const memoria = new Map<string, string>();

export function assinar(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  window.addEventListener("storage", ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
    window.removeEventListener("storage", ouvinte);
  };
}

/** Texto bruto (estável entre leituras, como pede o useSyncExternalStore). */
export function lerBruto(assuntoId: string): string | null {
  try {
    return localStorage.getItem(chave(assuntoId));
  } catch {
    return memoria.get(chave(assuntoId)) ?? null;
  }
}

export function interpretar(bruto: string | null): EstadoCronometro {
  if (!bruto) return ESTADO_INICIAL;
  try {
    const e = JSON.parse(bruto) as Partial<EstadoCronometro>;
    return {
      sessaoId: typeof e.sessaoId === "string" ? e.sessaoId : null,
      acumulado: Number(e.acumulado) || 0,
      inicio: typeof e.inicio === "number" ? e.inicio : null,
      batida: Number(e.batida) || 0,
    };
  } catch {
    return ESTADO_INICIAL;
  }
}

export function gravar(assuntoId: string, estado: EstadoCronometro | null) {
  const k = chave(assuntoId);
  try {
    if (estado) localStorage.setItem(k, JSON.stringify(estado));
    else localStorage.removeItem(k);
  } catch {
    // Sem localStorage: guarda só em memória (não sobrevive a recarregar a página)
    if (estado) memoria.set(k, JSON.stringify(estado));
    else memoria.delete(k);
  }
  for (const o of ouvintes) o();
}

/** Tempo efetivo (ms) num instante. */
export function decorrido(e: EstadoCronometro, agora: number) {
  return e.acumulado + (e.inicio !== null ? Math.max(0, agora - e.inicio) : 0);
}
