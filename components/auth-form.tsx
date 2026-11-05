"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { signIn, signUp } from "@/lib/auth-client";

export function AuthForm({ modo }: { modo: "login" | "cadastro" }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();
  const cadastro = modo === "cadastro";

  function enviar(formData: FormData) {
    setErro(null);
    const email = String(formData.get("email"));
    const password = String(formData.get("password"));

    startTransition(async () => {
      const { error } = cadastro
        ? await signUp.email({ name: String(formData.get("name")), email, password })
        : await signIn.email({ email, password });

      if (error) {
        setErro(traduzir(error.code, error.message));
        return;
      }
      router.replace("/concursos");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{cadastro ? "Criar conta" : "Entrar"}</CardTitle>
        <CardDescription>
          {cadastro
            ? "Cadastre-se para organizar suas questões."
            : "Acesse seu banco de questões."}
        </CardDescription>
      </CardHeader>
      <form action={enviar}>
        <CardContent>
          <FieldGroup>
            {erro && (
              <Alert variant="destructive">
                <AlertDescription>{erro}</AlertDescription>
              </Alert>
            )}
            {cadastro && (
              <Field>
                <FieldLabel htmlFor="name">Nome</FieldLabel>
                <Input id="name" name="name" autoComplete="name" required />
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Senha</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete={cadastro ? "new-password" : "current-password"}
                minLength={8}
                required
              />
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter className="mt-6 flex-col gap-3">
          <Button type="submit" className="w-full" disabled={pendente}>
            {pendente ? "Aguarde…" : cadastro ? "Criar conta" : "Entrar"}
          </Button>
          <p className="text-sm text-muted-foreground">
            {cadastro ? "Já tem conta? " : "Ainda não tem conta? "}
            <Link
              href={cadastro ? "/login" : "/cadastro"}
              className="font-medium text-foreground underline underline-offset-4"
            >
              {cadastro ? "Entrar" : "Cadastre-se"}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

function traduzir(code: string | undefined, message: string | undefined) {
  switch (code) {
    case "INVALID_EMAIL_OR_PASSWORD":
      return "Email ou senha incorretos.";
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "Já existe uma conta com este email.";
    case "PASSWORD_TOO_SHORT":
      return "A senha deve ter pelo menos 8 caracteres.";
    default:
      return message ?? "Não foi possível concluir. Tente novamente.";
  }
}
