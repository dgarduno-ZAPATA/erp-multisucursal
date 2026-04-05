import { redirect } from "next/navigation";

import { get_current_db_user } from "@/lib/auth/operating-context";

export default async function HomePage() {
  const db_user = await get_current_db_user();
  if (db_user?.rol === "vendedor" || db_user?.rol === "cajero") {
    redirect("/pos");
  }
  redirect("/dashboard");
}
