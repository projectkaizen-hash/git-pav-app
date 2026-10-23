"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  remember: z.boolean().optional(),
});

import { useRouter } from "next/navigation";
import React, { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "", remember: true },
  });

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email, password: data.password }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Login failed");
      }
      toast.success("Logged in successfully");
      // Redirect to user profile or home after login
      router.push("/profile");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid credentials";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <FieldGroup className="gap-4">
        <Controller
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <Field className="gap-1.5" data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="login-email">Email Address</FieldLabel>
              <Input {...field} id="login-email" type="email" placeholder="you@example.com" autoComplete="email" aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="password"
          render={({ field, fieldState }) => (
            <Field className="gap-1.5" data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="login-password">Password</FieldLabel>
              <Input {...field} id="login-password" type="password" placeholder="••••••••" autoComplete="current-password" aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="remember"
          render={({ field, fieldState }) => (
            <Field orientation="horizontal" data-invalid={fieldState.invalid}>
              <Checkbox id="login-remember" name={field.name} checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} aria-invalid={fieldState.invalid} />
              <FieldContent>
                <FieldLabel htmlFor="login-remember" className="font-normal">Remember me for 30 days</FieldLabel>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </FieldContent>
            </Field>
          )}
        />
      </FieldGroup>
      <Button className="w-full" type="submit" disabled={submitting}>
        {submitting ? "Signing in..." : "Login"}
      </Button>
    </form>
  );
}

