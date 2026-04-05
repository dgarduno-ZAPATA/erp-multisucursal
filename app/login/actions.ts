"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function login_action(form_data: FormData) {
  const email = String(form_data.get("email") ?? "").trim();
  const password = String(form_data.get("password") ?? "").trim();

  if (!email || !password) {
    redirect("/login?error=Email%20y%20contrasena%20son%20obligatorios.");
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect("/login?error=Credenciales%20invalidas.");
  }

  redirect("/dashboard");
}

export async function logout_action() {
  const supabase = createSupabaseServerClient();

  await supabase.auth.signOut();

  redirect("/login");
}
