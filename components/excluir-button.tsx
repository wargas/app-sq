"use client";

import { Trash2Icon } from "lucide-react";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";

export function ExcluirButton({
  action,
  confirmacao,
  rotulo,
}: {
  action: () => Promise<void>;
  confirmacao: string;
  rotulo?: string;
}) {
  const [pendente, startTransition] = useTransition();
  return (
    <Button
      variant={rotulo ? "destructive" : "ghost"}
      size={rotulo ? "sm" : "icon-sm"}
      aria-label={rotulo ?? "Excluir"}
      disabled={pendente}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (confirm(confirmacao)) startTransition(() => action());
      }}
    >
      <Trash2Icon data-icon={rotulo ? "inline-start" : undefined} />
      {rotulo}
    </Button>
  );
}
