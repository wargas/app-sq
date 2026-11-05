import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

const PUBLICAS = ["/login", "/cadastro"];

// Checagem otimista (só olha o cookie). A validação real da sessão
// acontece em getUser() nas páginas e Server Actions.
export function proxy(request: NextRequest) {
  const temSessao = Boolean(getSessionCookie(request));
  const publica = PUBLICAS.includes(request.nextUrl.pathname);

  if (!temSessao && !publica) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (temSessao && publica) {
    return NextResponse.redirect(new URL("/concursos", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
