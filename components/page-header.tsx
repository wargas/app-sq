import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export type Trilha = { label: string; href?: string }[];

export function PageHeader({
  trilha,
  titulo,
  descricao,
  acao,
}: {
  trilha?: Trilha;
  titulo: string;
  descricao?: ReactNode;
  acao?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3">
      {trilha && trilha.length > 0 && (
        <Breadcrumb>
          <BreadcrumbList>
            {trilha.map((t, i) => (
              <Fragment key={i}>
                {i > 0 && <BreadcrumbSeparator />}
                <BreadcrumbItem>
                  {t.href ? (
                    <BreadcrumbLink render={<Link href={t.href} />}>{t.label}</BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{t.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              </Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight break-words">{titulo}</h1>
          {descricao && <p className="mt-1 text-sm text-muted-foreground">{descricao}</p>}
        </div>
        {acao}
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      <div className="mb-3 h-4 w-48 animate-pulse rounded bg-muted" />
      <div className="mb-3 h-8 w-64 animate-pulse rounded bg-muted" />
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}
