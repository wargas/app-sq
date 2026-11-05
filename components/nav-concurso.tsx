"use client";

import { ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";

type Props = {
  concurso: { id: string; nome: string; disciplinas: { id: string; nome: string }[] };
};

// usePathname é dinâmico em rotas com params: o Suspense permite
// prerenderizar o item (fechado e inativo) e destacar o ativo no request.
export function NavConcurso(props: Props) {
  return (
    <Suspense fallback={<Item {...props} pathname={null} />}>
      <ComRotaAtual {...props} />
    </Suspense>
  );
}

function ComRotaAtual(props: Props) {
  return <Item {...props} pathname={usePathname()} />;
}

function Item({ concurso, pathname }: Props & { pathname: string | null }) {
  const { isMobile, setOpenMobile } = useSidebar();
  // null = usuário ainda não abriu/fechou: segue a rota atual
  const [abertoManual, setAbertoManual] = useState<boolean | null>(null);

  const href = `/concursos/${concurso.id}`;
  const disciplinaAtiva = concurso.disciplinas.find(
    (d) => pathname === `/disciplinas/${d.id}`,
  )?.id;
  const concursoAtivo = pathname === href;
  const aberto = abertoManual ?? (concursoAtivo || Boolean(disciplinaAtiva));
  const fecharMobile = () => isMobile && setOpenMobile(false);

  return (
    <Collapsible
      open={aberto}
      onOpenChange={setAbertoManual}
      render={<SidebarMenuItem />}
    >
      <SidebarMenuButton
        isActive={concursoAtivo}
        tooltip={concurso.nome}
        render={<Link href={href} onClick={fecharMobile} />}
      >
        <span className="flex size-4 shrink-0 items-center justify-center rounded-sm bg-sidebar-accent text-[10px] font-semibold uppercase">
          {concurso.nome.charAt(0)}
        </span>
        <span>{concurso.nome}</span>
      </SidebarMenuButton>

      {concurso.disciplinas.length > 0 && (
        <>
          <CollapsibleTrigger
            render={
              <SidebarMenuAction
                className="transition-transform data-panel-open:rotate-90"
                aria-label={aberto ? "Recolher disciplinas" : "Mostrar disciplinas"}
              />
            }
          >
            <ChevronRightIcon />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              {concurso.disciplinas.map((d) => (
                <SidebarMenuSubItem key={d.id}>
                  <SidebarMenuSubButton
                    isActive={d.id === disciplinaAtiva}
                    render={<Link href={`/disciplinas/${d.id}`} onClick={fecharMobile} />}
                  >
                    <span>{d.nome}</span>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </>
      )}
    </Collapsible>
  );
}
