"use server";

import { and, eq, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { assunto, concurso, disciplina, questao, resposta, sessaoEstudo } from "@/db/schema";
import { LETRAS, MAX_OPCOES, MIN_OPCOES } from "./letras";
import { getUser } from "./session";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: number; // muda a cada sucesso, para o formulário se limpar
};

const nomeSchema = z.string().trim().min(1, "Informe o nome").max(255, "Nome muito longo");

function lerNome(formData: FormData): { nome: string } | { state: FormState } {
  const parsed = nomeSchema.safeParse(formData.get("nome"));
  if (!parsed.success) {
    return { state: { fieldErrors: { nome: parsed.error.issues[0].message } } };
  }
  return { nome: parsed.data };
}

type TabelaComNome = typeof concurso | typeof disciplina | typeof assunto;

async function renomear(
  tabela: TabelaComNome,
  id: string,
  naoEncontrado: string,
  formData: FormData,
): Promise<FormState> {
  const user = await getUser();
  const r = lerNome(formData);
  if ("state" in r) return r.state;
  const res = await db
    .update(tabela)
    .set({ nome: r.nome })
    .where(and(eq(tabela.id, id), eq(tabela.userId, user.id)));
  if (res[0].affectedRows === 0) return { error: naoEncontrado };
  refresh();
  return { ok: Date.now() };
}

// ---------- Concursos ----------

export async function criarConcurso(_: FormState, formData: FormData): Promise<FormState> {
  const user = await getUser();
  const r = lerNome(formData);
  if ("state" in r) return r.state;
  await db.insert(concurso).values({ userId: user.id, nome: r.nome });
  refresh();
  return { ok: Date.now() };
}

export async function renomearConcurso(
  id: string,
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  return renomear(concurso, id, "Concurso não encontrado", formData);
}

export async function excluirConcurso(id: string) {
  const user = await getUser();
  await db.delete(concurso).where(and(eq(concurso.id, id), eq(concurso.userId, user.id)));
  refresh();
}

// ---------- Disciplinas ----------

export async function criarDisciplina(
  concursoId: string,
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await getUser();
  const r = lerNome(formData);
  if ("state" in r) return r.state;

  const pai = await db.query.concurso.findFirst({
    where: and(eq(concurso.id, concursoId), eq(concurso.userId, user.id)),
    columns: { id: true },
  });
  if (!pai) return { error: "Concurso não encontrado" };

  await db.insert(disciplina).values({ userId: user.id, concursoId, nome: r.nome });
  refresh();
  return { ok: Date.now() };
}

export async function renomearDisciplina(
  id: string,
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  return renomear(disciplina, id, "Disciplina não encontrada", formData);
}

export async function excluirDisciplina(id: string) {
  const user = await getUser();
  await db
    .delete(disciplina)
    .where(and(eq(disciplina.id, id), eq(disciplina.userId, user.id)));
  refresh();
}

// ---------- Assuntos ----------

export async function criarAssunto(
  disciplinaId: string,
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await getUser();
  const r = lerNome(formData);
  if ("state" in r) return r.state;

  const pai = await db.query.disciplina.findFirst({
    where: and(eq(disciplina.id, disciplinaId), eq(disciplina.userId, user.id)),
    columns: { id: true },
  });
  if (!pai) return { error: "Disciplina não encontrada" };

  await db.insert(assunto).values({ userId: user.id, disciplinaId, nome: r.nome });
  refresh();
  return { ok: Date.now() };
}

export type LoteState = { error?: string; erros?: string[]; mensagem?: string; ok?: number };

const MAX_LOTE = 200;

/** Cria vários assuntos de uma vez: um por linha. Ignora linhas vazias e repetidas. */
export async function criarAssuntosEmLote(
  disciplinaId: string,
  _: LoteState,
  formData: FormData,
): Promise<LoteState> {
  const user = await getUser();
  const linhas = String(formData.get("nomes") ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/\s+/g, " "));

  const erros = linhas.flatMap((l, i) =>
    l.length > 255 ? [`Linha ${i + 1}: nome muito longo (máx. 255 caracteres)`] : [],
  );
  if (erros.length) return { error: "Nenhum assunto foi adicionado.", erros };

  // Dedup sem diferenciar maiúsculas/minúsculas, mantendo a ordem da lista
  const vistos = new Set<string>();
  const nomes = linhas.filter((l) => {
    const chave = l.toLocaleLowerCase("pt-BR");
    if (!l || vistos.has(chave)) return false;
    vistos.add(chave);
    return true;
  });
  if (nomes.length === 0) return { error: "Informe ao menos um assunto." };
  if (nomes.length > MAX_LOTE) {
    return { error: `Adicione no máximo ${MAX_LOTE} assuntos por vez.` };
  }

  const pai = await db.query.disciplina.findFirst({
    where: and(eq(disciplina.id, disciplinaId), eq(disciplina.userId, user.id)),
    columns: { id: true },
    with: { assuntos: { columns: { nome: true } } },
  });
  if (!pai) return { error: "Disciplina não encontrada" };

  const existentes = new Set(pai.assuntos.map((a) => a.nome.toLocaleLowerCase("pt-BR")));
  const novos = nomes.filter((n) => !existentes.has(n.toLocaleLowerCase("pt-BR")));
  const ignorados = nomes.length - novos.length;

  if (novos.length) {
    await db
      .insert(assunto)
      .values(novos.map((nome) => ({ userId: user.id, disciplinaId, nome })));
    refresh();
  }

  let mensagem =
    novos.length === 1 ? "1 assunto adicionado" : `${novos.length} assuntos adicionados`;
  if (ignorados === 1) mensagem += "; 1 já existia e foi ignorado";
  else if (ignorados > 1) mensagem += `; ${ignorados} já existiam e foram ignorados`;
  return { ok: Date.now(), mensagem: `${mensagem}.` };
}

export async function renomearAssunto(
  id: string,
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  return renomear(assunto, id, "Assunto não encontrado", formData);
}

export async function excluirAssunto(id: string) {
  const user = await getUser();
  await db.delete(assunto).where(and(eq(assunto.id, id), eq(assunto.userId, user.id)));
  refresh();
}

// ---------- Questões ----------

const anoMax = new Date().getFullYear() + 1;

const questaoSchema = z
  .object({
    ano: z.coerce
      .number({ error: "Informe o ano" })
      .int("Ano inválido")
      .min(1950, "Ano inválido")
      .max(anoMax, "Ano inválido"),
    banca: z.string().trim().min(1, "Informe a banca").max(100, "Banca muito longa"),
    enunciado: z.string().trim().min(1, "Informe o enunciado"),
    tipo: z.enum(["certo_errado", "multipla_escolha"], { error: "Escolha o tipo" }),
    opcoes: z.array(z.string().trim()),
    gabarito: z.string({ error: "Marque o gabarito" }).min(1, "Marque o gabarito"),
    comentarios: z.string().trim().optional(),
  })
  .superRefine((q, ctx) => {
    if (q.tipo === "certo_errado") {
      if (q.gabarito !== "C" && q.gabarito !== "E") {
        ctx.addIssue({ code: "custom", path: ["gabarito"], message: "Marque Certo ou Errado" });
      }
      return;
    }
    if (q.opcoes.length < MIN_OPCOES || q.opcoes.length > MAX_OPCOES) {
      ctx.addIssue({
        code: "custom",
        path: ["opcoes"],
        message: `Use de ${MIN_OPCOES} a ${MAX_OPCOES} alternativas`,
      });
    } else if (q.opcoes.some((o) => !o)) {
      ctx.addIssue({ code: "custom", path: ["opcoes"], message: "Preencha todas as alternativas" });
    }
    if (!LETRAS.slice(0, q.opcoes.length).includes(q.gabarito as (typeof LETRAS)[number])) {
      ctx.addIssue({ code: "custom", path: ["gabarito"], message: "Marque a alternativa correta" });
    }
  });

function lerQuestao(formData: FormData) {
  const tipo = formData.get("tipo");
  return questaoSchema.safeParse({
    ano: formData.get("ano"),
    banca: formData.get("banca"),
    enunciado: formData.get("enunciado"),
    tipo,
    opcoes: tipo === "multipla_escolha" ? formData.getAll("opcao").map(String) : [],
    gabarito: formData.get("gabarito") ?? undefined,
    comentarios: formData.get("comentarios") ?? undefined,
  });
}

function errosPorCampo(error: z.ZodError): FormState {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const campo = String(issue.path[0] ?? "form");
    fieldErrors[campo] ??= issue.message;
  }
  return { fieldErrors };
}

export async function salvarQuestao(
  alvo: { assuntoId: string; questaoId?: string },
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await getUser();
  const parsed = lerQuestao(formData);
  if (!parsed.success) return errosPorCampo(parsed.error);

  const dados = {
    ...parsed.data,
    comentarios: parsed.data.comentarios || null,
  };

  if (alvo.questaoId) {
    const res = await db
      .update(questao)
      .set(dados)
      .where(and(eq(questao.id, alvo.questaoId), eq(questao.userId, user.id)));
    if (res[0].affectedRows === 0) return { error: "Questão não encontrada" };
    redirect(`/questoes/${alvo.questaoId}`);
  }

  const pai = await db.query.assunto.findFirst({
    where: and(eq(assunto.id, alvo.assuntoId), eq(assunto.userId, user.id)),
    columns: { id: true },
  });
  if (!pai) return { error: "Assunto não encontrado" };

  await db.insert(questao).values({ ...dados, userId: user.id, assuntoId: alvo.assuntoId });

  if (formData.get("continuar") === "1") {
    refresh();
    return { ok: Date.now() };
  }
  redirect(`/assuntos/${alvo.assuntoId}`);
}

// ---------- Importação em lote (formato: questoes.schema.json) ----------

export type ImportState = { error?: string; erros?: string[] };

const MAX_IMPORTACAO = 500;
const CAMPOS_IMPORTACAO = new Set([
  "banca",
  "ano",
  "enunciado",
  "tipo",
  "alternativas",
  "gabarito",
  "comentarios",
]);

function validarItem(item: unknown): { dados: z.infer<typeof questaoSchema> } | { erros: string[] } {
  if (typeof item !== "object" || item === null || Array.isArray(item)) {
    return { erros: ["deve ser um objeto"] };
  }
  const q = item as Record<string, unknown>;
  const desconhecidos = Object.keys(q).filter((k) => !CAMPOS_IMPORTACAO.has(k));
  if (desconhecidos.length) {
    return { erros: [`campo desconhecido: ${desconhecidos.join(", ")}`] };
  }
  if (typeof q.ano !== "number") return { erros: ["ano: informe um número"] };
  if (q.tipo === "certo_errado" && q.alternativas !== undefined) {
    return { erros: ["alternativas: não use em questões certo/errado"] };
  }

  const parsed = questaoSchema.safeParse({
    ...q,
    opcoes: q.tipo === "multipla_escolha" ? (q.alternativas ?? []) : [],
  });
  if (parsed.success) return { dados: parsed.data };
  return {
    erros: parsed.error.issues.map((issue) => {
      const campo = String(issue.path[0] ?? "");
      const nome = campo === "opcoes" ? "alternativas" : campo;
      return nome ? `${nome}: ${issue.message}` : issue.message;
    }),
  };
}

export async function importarQuestoes(
  assuntoId: string,
  _: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const user = await getUser();

  let json: unknown;
  try {
    json = JSON.parse(String(formData.get("conteudo") ?? ""));
  } catch {
    return { error: "O arquivo não é um JSON válido." };
  }
  const lista =
    typeof json === "object" && json !== null && !Array.isArray(json)
      ? (json as { questoes?: unknown }).questoes
      : undefined;
  if (!Array.isArray(lista)) {
    return { error: 'O arquivo deve ter o formato { "questoes": [ ... ] }.' };
  }
  if (lista.length === 0) return { error: "O arquivo não tem questões." };
  if (lista.length > MAX_IMPORTACAO) {
    return { error: `Importe no máximo ${MAX_IMPORTACAO} questões por arquivo.` };
  }

  const validas: z.infer<typeof questaoSchema>[] = [];
  const erros: string[] = [];
  lista.forEach((item, i) => {
    const r = validarItem(item);
    if ("dados" in r) validas.push(r.dados);
    else for (const e of r.erros) erros.push(`Questão ${i + 1} — ${e}`);
  });
  if (erros.length) {
    return { error: "Nenhuma questão foi importada. Corrija o arquivo e tente de novo.", erros };
  }

  const pai = await db.query.assunto.findFirst({
    where: and(eq(assunto.id, assuntoId), eq(assunto.userId, user.id)),
    columns: { id: true },
  });
  if (!pai) return { error: "Assunto não encontrado" };

  // Um único INSERT: ou entram todas, ou nenhuma. Cada linha ganha +1 ms
  // no created_at para preservar a ordem do arquivo na listagem.
  await db.insert(questao).values(
    validas.map((q, i) => ({
      ...q,
      comentarios: q.comentarios || null,
      userId: user.id,
      assuntoId,
      createdAt: sql`TIMESTAMPADD(MICROSECOND, ${sql.raw(String(i * 1000))}, CURRENT_TIMESTAMP(3))`,
    })),
  );

  redirect(`/assuntos/${assuntoId}`);
}

export async function excluirQuestao(id: string) {
  const user = await getUser();
  const q = await db.query.questao.findFirst({
    where: and(eq(questao.id, id), eq(questao.userId, user.id)),
    columns: { assuntoId: true },
  });
  if (!q) return;
  await db.delete(questao).where(and(eq(questao.id, id), eq(questao.userId, user.id)));
  redirect(`/assuntos/${q.assuntoId}`);
}

// ---------- Responder ----------

export type Correcao = {
  correta: boolean;
  gabarito: string;
  comentarios: string | null;
};

export async function responderQuestao(
  questaoId: string,
  escolha: string,
): Promise<Correcao | { error: string }> {
  const user = await getUser();
  const q = await db.query.questao.findFirst({
    where: and(eq(questao.id, questaoId), eq(questao.userId, user.id)),
    columns: { gabarito: true, comentarios: true, tipo: true, opcoes: true },
  });
  if (!q) return { error: "Questão não encontrada" };

  const validas = q.tipo === "certo_errado" ? ["C", "E"] : LETRAS.slice(0, q.opcoes.length);
  if (!(validas as readonly string[]).includes(escolha)) return { error: "Resposta inválida" };

  const correta = escolha === q.gabarito;
  await db.insert(resposta).values({ userId: user.id, questaoId, resposta: escolha, correta });

  return { correta, gabarito: q.gabarito, comentarios: q.comentarios };
}

// ---------- Tempo de estudo (cronômetro) ----------

export async function iniciarSessaoEstudo(
  assuntoId: string,
): Promise<{ id: string } | { error: string }> {
  const user = await getUser();
  const pai = await db.query.assunto.findFirst({
    where: and(eq(assunto.id, assuntoId), eq(assunto.userId, user.id)),
    columns: { id: true },
  });
  if (!pai) return { error: "Assunto não encontrado" };

  const id = crypto.randomUUID();
  await db.insert(sessaoEstudo).values({ id, userId: user.id, assuntoId });
  return { id };
}

/**
 * Grava o tempo efetivo da sessão. Nunca diminui o valor salvo e nunca passa
 * do tempo decorrido desde a criação da sessão (com 5 s de folga).
 * Não chama refresh(): é chamada a cada poucos segundos enquanto o relógio corre.
 */
export async function salvarSessaoEstudo(
  sessaoId: string,
  segundos: number,
): Promise<{ error?: string }> {
  const user = await getUser();
  const s = Math.floor(Number(segundos));
  if (!Number.isFinite(s) || s < 0) return { error: "Tempo inválido" };

  await db
    .update(sessaoEstudo)
    .set({
      segundos: sql`LEAST(GREATEST(${sessaoEstudo.segundos}, ${s}), TIMESTAMPDIFF(SECOND, ${sessaoEstudo.createdAt}, CURRENT_TIMESTAMP(3)) + 5)`,
    })
    .where(and(eq(sessaoEstudo.id, sessaoId), eq(sessaoEstudo.userId, user.id)));
  return {};
}
