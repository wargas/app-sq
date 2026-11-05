import { BookOpenCheckIcon, LayoutDashboardIcon, LibraryIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarRail,
} from "@/components/ui/sidebar";
import { listarConcursos } from "@/lib/data";
import { getUser } from "@/lib/session";
import { NavConcurso } from "./nav-concurso";
import { NavLink } from "./nav-link";
import { NavUser } from "./nav-user";

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/concursos" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <BookOpenCheckIcon className="size-4" />
              </div>
              <span className="font-semibold">Questões</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <NavLink href="/dashboard" exato tooltip="Dashboard">
                  <LayoutDashboardIcon />
                  <span>Dashboard</span>
                </NavLink>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Concursos</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <NavLink href="/concursos" exato tooltip="Todos os concursos">
                  <LibraryIcon />
                  <span>Todos os concursos</span>
                </NavLink>
              </SidebarMenuItem>
              <Suspense fallback={<ConcursosSkeleton />}>
                <ListaConcursos />
              </Suspense>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <Suspense fallback={<SidebarMenuSkeleton showIcon />}>
          <Usuario />
        </Suspense>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

async function ListaConcursos() {
  const concursos = await listarConcursos();
  return concursos.map((c) => <NavConcurso key={c.id} concurso={c} />);
}

function ConcursosSkeleton() {
  return Array.from({ length: 3 }, (_, i) => (
    <SidebarMenuItem key={i}>
      <SidebarMenuSkeleton />
    </SidebarMenuItem>
  ));
}

async function Usuario() {
  const user = await getUser();
  return <NavUser nome={user.name} email={user.email} />;
}
