import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { assunto, concurso, disciplina, questao, resposta, sessaoEstudo } from "@/db/schema";
import { getUser } from "./session";

// Todas as consultas filtram pelo usuário logado: ninguém vê dados de outro.

/** Segundos estudados (cronômetro) por assunto. Assuntos sem sessão ficam fora do mapa. */
async function tempoPorAssunto(userId: string, assuntoIds: string[]) {
  const mapa = new Map<string, number>();
  if (assuntoIds.length === 0) return mapa;
  const linhas = await db
    .select({
      assuntoId: sessaoEstudo.assuntoId,
      total: sql<string>`SUM(${sessaoEstudo.segundos})`,
    })
    .from(sessaoEstudo)
    .where(and(eq(sessaoEstudo.userId, userId), inArray(sessaoEstudo.assuntoId, assuntoIds)))
    .groupBy(sessaoEstudo.assuntoId);
  for (const l of linhas) mapa.set(l.assuntoId, Number(l.total));
  return mapa;
}

const somar = (valores: number[]) => valores.reduce((a, b) => a + b, 0);

export async function listarConcursos() {
  const user = await getUser();
  return db.query.concurso.findMany({
    where: eq(concurso.userId, user.id),
    orderBy: asc(concurso.nome),
    with: {
      disciplinas: { columns: { id: true, nome: true }, orderBy: asc(disciplina.nome) },
    },
  });
}

export async function obterConcurso(id: string) {
  const user = await getUser();
  const item = await db.query.concurso.findFirst({
    where: and(eq(concurso.id, id), eq(concurso.userId, user.id)),
    with: {
      disciplinas: {
        orderBy: asc(disciplina.nome),
        with: { assuntos: { columns: { id: true } } },
      },
    },
  });
  if (!item) notFound();

  const tempo = await tempoPorAssunto(
    user.id,
    item.disciplinas.flatMap((d) => d.assuntos.map((a) => a.id)),
  );
  const disciplinas = item.disciplinas.map((d) => ({
    ...d,
    segundos: somar(d.assuntos.map((a) => tempo.get(a.id) ?? 0)),
  }));
  return { ...item, disciplinas, segundos: somar(disciplinas.map((d) => d.segundos)) };
}

export async function obterDisciplina(id: string) {
  const user = await getUser();
  const item = await db.query.disciplina.findFirst({
    where: and(eq(disciplina.id, id), eq(disciplina.userId, user.id)),
    with: {
      concurso: true,
      assuntos: {
        orderBy: asc(assunto.nome),
        with: { questoes: { columns: { id: true } } },
      },
    },
  });
  if (!item) notFound();

  // Última resposta de cada questão (a primeira na ordem decrescente)
  const ids = item.assuntos.flatMap((a) => a.questoes.map((q) => q.id));
  const [tentativas, tempo] = await Promise.all([
    ids.length
      ? db
          .select({ questaoId: resposta.questaoId, correta: resposta.correta })
          .from(resposta)
          .where(and(eq(resposta.userId, user.id), inArray(resposta.questaoId, ids)))
          .orderBy(desc(resposta.createdAt), desc(resposta.id))
      : [],
    tempoPorAssunto(
      user.id,
      item.assuntos.map((a) => a.id),
    ),
  ]);
  const ultima = new Map<string, boolean>();
  for (const t of tentativas) if (!ultima.has(t.questaoId)) ultima.set(t.questaoId, t.correta);

  return {
    ...item,
    segundos: somar([...tempo.values()]),
    assuntos: item.assuntos.map((a) => {
      const respondidas = a.questoes.filter((q) => ultima.has(q.id));
      return {
        ...a,
        segundos: tempo.get(a.id) ?? 0,
        progresso: {
          total: a.questoes.length,
          respondidas: respondidas.length,
          acertos: respondidas.filter((q) => ultima.get(q.id)).length,
        },
      };
    }),
  };
}

export async function obterAssunto(id: string) {
  const user = await getUser();
  const item = await db.query.assunto.findFirst({
    where: and(eq(assunto.id, id), eq(assunto.userId, user.id)),
    with: {
      disciplina: { with: { concurso: true } },
      questoes: { orderBy: [asc(questao.createdAt), asc(questao.id)] },
    },
  });
  if (!item) notFound();

  // Desempenho por questão: total de tentativas, acertos e o último resultado
  const ids = item.questoes.map((q) => q.id);
  const tentativas = ids.length
    ? await db
        .select({
          questaoId: resposta.questaoId,
          correta: resposta.correta,
        })
        .from(resposta)
        .where(and(eq(resposta.userId, user.id), inArray(resposta.questaoId, ids)))
        .orderBy(desc(resposta.createdAt), desc(resposta.id))
    : [];

  const stats = new Map<string, { total: number; acertos: number; ultima: boolean }>();
  for (const t of tentativas) {
    const s = stats.get(t.questaoId);
    if (s) {
      s.total++;
      if (t.correta) s.acertos++;
    } else {
      stats.set(t.questaoId, { total: 1, acertos: t.correta ? 1 : 0, ultima: t.correta });
    }
  }

  const tempo = await tempoPorAssunto(user.id, [item.id]);

  return {
    ...item,
    segundos: tempo.get(item.id) ?? 0,
    questoes: item.questoes.map((q) => ({ ...q, stats: stats.get(q.id) ?? null })),
  };
}

export async function obterQuestao(id: string) {
  const user = await getUser();
  const item = await db.query.questao.findFirst({
    where: and(eq(questao.id, id), eq(questao.userId, user.id)),
    with: {
      assunto: {
        with: {
          disciplina: { with: { concurso: true } },
          questoes: {
            columns: { id: true },
            orderBy: [asc(questao.createdAt), asc(questao.id)],
          },
        },
      },
    },
  });
  if (!item) notFound();

  const irmas = item.assunto.questoes.map((q) => q.id);
  const pos = irmas.indexOf(item.id);
  return {
    ...item,
    posicao: pos + 1,
    total: irmas.length,
    anteriorId: irmas[pos - 1] ?? null,
    proximaId: irmas[pos + 1] ?? null,
  };
}

/**
 * Tempo estudado no assunto (soma das sessões do cronômetro) e a sessão mais
 * recente, para o cliente não contar duas vezes a sessão que ainda está aberta.
 */
export async function obterTempoEstudo(assuntoId: string) {
  const user = await getUser();
  const filtro = and(eq(sessaoEstudo.userId, user.id), eq(sessaoEstudo.assuntoId, assuntoId));
  const [[soma], ultima] = await Promise.all([
    db
      .select({ total: sql<string | null>`SUM(${sessaoEstudo.segundos})` })
      .from(sessaoEstudo)
      .where(filtro),
    db.query.sessaoEstudo.findFirst({
      where: filtro,
      orderBy: [desc(sessaoEstudo.createdAt), desc(sessaoEstudo.id)],
      columns: { id: true, segundos: true },
    }),
  ]);
  return { totalSegundos: Number(soma?.total ?? 0), ultimaSessao: ultima ?? null };
}

// ---------- Dashboard ----------

const FUSO = "America/Sao_Paulo";
export const DIAS_DASHBOARD = 15;

/** Data no fuso do app, como "2026-11-05". */
const chaveDia = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);

export type DiaDashboard = { dia: string; certas: number; erradas: number; segundos: number };

export async function obterDashboard() {
  const user = await getUser();
  const agora = new Date();
  const DIA_MS = 86_400_000;

  // Os últimos 15 dias, de hoje para trás, e uma margem para cobrir o fuso
  const dias = Array.from({ length: DIAS_DASHBOARD }, (_, i) =>
    chaveDia(new Date(agora.getTime() - (DIAS_DASHBOARD - 1 - i) * DIA_MS)),
  );
  const desde = new Date(agora.getTime() - (DIAS_DASHBOARD + 1) * DIA_MS);
  const doUsuarioResp = eq(resposta.userId, user.id);
  const doUsuarioEstudo = eq(sessaoEstudo.userId, user.id);

  const [[totResp], [totEstudo], respostas, sessoes] = await Promise.all([
    db
      .select({
        tentativas: sql<string>`COUNT(*)`,
        acertos: sql<string | null>`SUM(${resposta.correta})`,
        questoes: sql<string>`COUNT(DISTINCT ${resposta.questaoId})`,
      })
      .from(resposta)
      .where(doUsuarioResp),
    db
      .select({ segundos: sql<string | null>`SUM(${sessaoEstudo.segundos})` })
      .from(sessaoEstudo)
      .where(doUsuarioEstudo),
    db
      .select({ createdAt: resposta.createdAt, correta: resposta.correta })
      .from(resposta)
      .where(and(doUsuarioResp, gte(resposta.createdAt, desde))),
    // O tempo da sessão entra no dia em que ela começou
    db
      .select({ createdAt: sessaoEstudo.createdAt, segundos: sessaoEstudo.segundos })
      .from(sessaoEstudo)
      .where(and(doUsuarioEstudo, gte(sessaoEstudo.createdAt, desde))),
  ]);

  const porDia = new Map<string, DiaDashboard>(
    dias.map((dia) => [dia, { dia, certas: 0, erradas: 0, segundos: 0 }]),
  );
  for (const r of respostas) {
    const d = porDia.get(chaveDia(r.createdAt));
    if (d) d[r.correta ? "certas" : "erradas"]++;
  }
  for (const s of sessoes) {
    const d = porDia.get(chaveDia(s.createdAt));
    if (d) d.segundos += s.segundos;
  }
  const serie = [...porDia.values()];

  return {
    total: {
      questoes: Number(totResp?.questoes ?? 0),
      tentativas: Number(totResp?.tentativas ?? 0),
      acertos: Number(totResp?.acertos ?? 0),
      segundos: Number(totEstudo?.segundos ?? 0),
    },
    periodo: {
      tentativas: somar(serie.map((d) => d.certas + d.erradas)),
      acertos: somar(serie.map((d) => d.certas)),
      segundos: somar(serie.map((d) => d.segundos)),
    },
    dias: serie,
  };
}
