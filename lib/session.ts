import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "./auth";

/** Usuário autenticado; redireciona para /login se não houver sessão. */
export const getUser = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  return { id: session.user.id, name: session.user.name, email: session.user.email };
});
