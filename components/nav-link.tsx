"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { SidebarMenuButton, useSidebar } from "@/components/ui/sidebar";

type Props = {
  href: string;
  /** Ativo só na rota exata (senão também nas sub-rotas). */
  exato?: boolean;
  tooltip?: string;
  children: ReactNode;
};

// usePathname é dinâmico em rotas com params: o Suspense permite
// prerenderizar o link (inativo) e destacar o ativo no request.
export function NavLink(props: Props) {
  return (
    <Suspense fallback={<Botao {...props} ativo={false} />}>
      <ComRotaAtual {...props} />
    </Suspense>
  );
}

function ComRotaAtual(props: Props) {
  const pathname = usePathname();
  const { href, exato } = props;
  const ativo = exato ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  return <Botao {...props} ativo={ativo} />;
}

function Botao({ href, tooltip, children, ativo }: Props & { ativo: boolean }) {
  const { isMobile, setOpenMobile } = useSidebar();
  return (
    <SidebarMenuButton
      isActive={ativo}
      tooltip={tooltip}
      render={<Link href={href} onClick={() => isMobile && setOpenMobile(false)} />}
    >
      {children}
    </SidebarMenuButton>
  );
}
