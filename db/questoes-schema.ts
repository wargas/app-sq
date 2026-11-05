import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";
import { user } from "./auth-schema";

const id = () =>
  varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const userId = () =>
  varchar("user_id", { length: 36 })
    .notNull()
    .references(() => user.id, { onDelete: "cascade" });

// now() do MySQL tem precisão de segundos; CURRENT_TIMESTAMP(3) guarda ms,
// para que questões criadas em sequência mantenham a ordem
const createdAt = () =>
  timestamp("created_at", { fsp: 3 })
    .default(sql`(CURRENT_TIMESTAMP(3))`)
    .notNull();

export const concurso = mysqlTable(
  "concurso",
  {
    id: id(),
    userId: userId(),
    nome: varchar("nome", { length: 255 }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("concurso_user_idx").on(t.userId)],
);

export const disciplina = mysqlTable(
  "disciplina",
  {
    id: id(),
    userId: userId(),
    concursoId: varchar("concurso_id", { length: 36 })
      .notNull()
      .references(() => concurso.id, { onDelete: "cascade" }),
    nome: varchar("nome", { length: 255 }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("disciplina_concurso_idx").on(t.concursoId)],
);

export const assunto = mysqlTable(
  "assunto",
  {
    id: id(),
    userId: userId(),
    disciplinaId: varchar("disciplina_id", { length: 36 })
      .notNull()
      .references(() => disciplina.id, { onDelete: "cascade" }),
    nome: varchar("nome", { length: 255 }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("assunto_disciplina_idx").on(t.disciplinaId)],
);

export const TIPOS_QUESTAO = ["certo_errado", "multipla_escolha"] as const;
export type TipoQuestao = (typeof TIPOS_QUESTAO)[number];

export const questao = mysqlTable(
  "questao",
  {
    id: id(),
    userId: userId(),
    assuntoId: varchar("assunto_id", { length: 36 })
      .notNull()
      .references(() => assunto.id, { onDelete: "cascade" }),
    ano: int("ano").notNull(),
    banca: varchar("banca", { length: 100 }).notNull(),
    enunciado: text("enunciado").notNull(),
    tipo: mysqlEnum("tipo", TIPOS_QUESTAO).notNull(),
    // Texto das alternativas na ordem A, B, C...; vazio em certo/errado
    opcoes: json("opcoes").$type<string[]>().notNull(),
    // "C" ou "E" em certo/errado; letra da alternativa em múltipla escolha
    gabarito: varchar("gabarito", { length: 1 }).notNull(),
    comentarios: text("comentarios"),
    createdAt: createdAt(),
  },
  (t) => [index("questao_assunto_idx").on(t.assuntoId)],
);

// Histórico: cada tentativa gera uma linha
export const resposta = mysqlTable(
  "resposta",
  {
    id: id(),
    userId: userId(),
    questaoId: varchar("questao_id", { length: 36 })
      .notNull()
      .references(() => questao.id, { onDelete: "cascade" }),
    resposta: varchar("resposta", { length: 1 }).notNull(),
    correta: boolean("correta").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("resposta_questao_user_idx").on(t.questaoId, t.userId)],
);

// Tempo de estudo: cada sessão do cronômetro (início → última pausa) gera uma linha.
// O cliente atualiza `segundos` (tempo efetivo, sem as pausas) enquanto o
// relógio corre e ao pausar.
export const sessaoEstudo = mysqlTable(
  "sessao_estudo",
  {
    id: id(),
    userId: userId(),
    assuntoId: varchar("assunto_id", { length: 36 })
      .notNull()
      .references(() => assunto.id, { onDelete: "cascade" }),
    segundos: int("segundos").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("sessao_estudo_assunto_user_idx").on(t.assuntoId, t.userId)],
);

export const concursoRelations = relations(concurso, ({ many }) => ({
  disciplinas: many(disciplina),
}));

export const disciplinaRelations = relations(disciplina, ({ one, many }) => ({
  concurso: one(concurso, {
    fields: [disciplina.concursoId],
    references: [concurso.id],
  }),
  assuntos: many(assunto),
}));

export const assuntoRelations = relations(assunto, ({ one, many }) => ({
  disciplina: one(disciplina, {
    fields: [assunto.disciplinaId],
    references: [disciplina.id],
  }),
  questoes: many(questao),
  sessoesEstudo: many(sessaoEstudo),
}));

export const questaoRelations = relations(questao, ({ one, many }) => ({
  assunto: one(assunto, {
    fields: [questao.assuntoId],
    references: [assunto.id],
  }),
  respostas: many(resposta),
}));

export const respostaRelations = relations(resposta, ({ one }) => ({
  questao: one(questao, {
    fields: [resposta.questaoId],
    references: [questao.id],
  }),
}));

export const sessaoEstudoRelations = relations(sessaoEstudo, ({ one }) => ({
  assunto: one(assunto, {
    fields: [sessaoEstudo.assuntoId],
    references: [assunto.id],
  }),
}));
