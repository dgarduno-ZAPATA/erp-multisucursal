import Link from "next/link";

import { CreateProveedorForm } from "@/components/proveedores/create-proveedor-form";
import { require_roles } from "@/lib/auth/rbac";

export default async function NuevoProveedorPage() {
  await require_roles(["admin", "gerente"]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/inventario/proveedores"
          className="text-sm text-slate-400 hover:text-white"
        >
          ← Proveedores
        </Link>
      </div>

      <div className="mx-auto max-w-2xl">
        <CreateProveedorForm />
      </div>
    </div>
  );
}
