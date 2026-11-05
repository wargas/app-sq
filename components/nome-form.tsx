"use client";

import { PlusIcon } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { FormState } from "@/lib/actions";

export function NomeForm({
  action,
  placeholder,
  rotulo,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  placeholder: string;
  rotulo: string;
}) {
  const [state, formAction, pendente] = useActionState(action, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  const erro = state.fieldErrors?.nome ?? state.error;

  return (
    <form ref={formRef} action={formAction} className="mb-6">
      <Field data-invalid={Boolean(erro)}>
        <div className="flex gap-2">
          <Input
            name="nome"
            placeholder={placeholder}
            aria-label={placeholder}
            aria-invalid={Boolean(erro)}
            required
            maxLength={255}
            autoComplete="off"
          />
          <Button type="submit" disabled={pendente}>
            <PlusIcon data-icon="inline-start" />
            {rotulo}
          </Button>
        </div>
        {erro && <FieldError>{erro}</FieldError>}
      </Field>
    </form>
  );
}
