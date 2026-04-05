import type { RolUsuario } from "@prisma/client";

import { getSucursales } from "@/actions/sucursales";
import { getUsuarios } from "@/actions/usuarios";
import { CreateSucursalForm } from "@/components/configuracion/create-sucursal-form";
import { CreateUserForm } from "@/components/configuracion/create-user-form";
import { SetPinForm } from "@/components/configuracion/set-pin-form";
import { UserAccessForm } from "@/components/configuracion/user-access-form";
import { ROL_COLORS, ROL_LABELS, require_roles } from "@/lib/auth/rbac";

const S = { border: "1px solid rgba(255,255,255,0.06)", background: "#111114" };
const C = { border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.025)" };

export default async function ConfiguracionUsuariosPage() {
  await require_roles(["admin"]);
  const [usuarios, sucursales] = await Promise.all([getUsuarios(), getSucursales()]);

  const por_rol = {
    admin:    usuarios.filter((u) => u.rol === "admin"),
    gerente:  usuarios.filter((u) => u.rol === "gerente"),
    cajero:   usuarios.filter((u) => u.rol === "cajero"),
    vendedor: usuarios.filter((u) => u.rol === "vendedor"),
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <section className="rounded-2xl p-6" style={S}>
        <p className="text-[10px] font-bold uppercase tracking-[0.26em]" style={{ color: "#3f3f46" }}>Configuración</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight" style={{ color: "#fafaf9" }}>Usuarios y sucursales</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6" style={{ color: "#52525b" }}>
          Administra accesos, asigna sucursal operativa, cambia roles y define PINs para el POS.
        </p>
      </section>

      {/* Sucursales + Formularios */}
      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        {/* Sucursales activas */}
        <article className="rounded-2xl p-6" style={S}>
          <div className="flex items-center justify-between gap-4 pb-4 mb-5"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.26em]" style={{ color: "#3f3f46" }}>Mapa operativo</p>
              <h2 className="mt-1.5 text-lg font-bold" style={{ color: "#fafaf9" }}>Sucursales activas</h2>
            </div>
            <span className="rounded-full px-3 py-1 text-xs font-bold"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#71717a" }}>
              {sucursales.length} activas
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {sucursales.map((sucursal) => (
              <article key={sucursal.id} className="rounded-xl p-4" style={C}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold" style={{ color: "#fafaf9" }}>{sucursal.nombre}</p>
                    <p className="mt-0.5 text-xs uppercase tracking-[0.16em]" style={{ color: "#52525b" }}>{sucursal.codigo}</p>
                  </div>
                  <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold"
                    style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.16)", color: "#34d399" }}>
                    Activa
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  {[
                    { label: "Usuarios",    value: sucursal._count.usuarios },
                    { label: "Items stock", value: sucursal._count.inventario },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-lg p-3"
                      style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <p className="text-[10px] uppercase tracking-[0.16em]" style={{ color: "#52525b" }}>{stat.label}</p>
                      <p className="mt-1 text-lg font-bold" style={{ color: "#fafaf9" }}>{stat.value}</p>
                    </div>
                  ))}
                </div>
                {(sucursal.direccion || sucursal.telefono) && (
                  <div className="mt-3 space-y-0.5 text-xs" style={{ color: "#3f3f46" }}>
                    {sucursal.direccion && <p>{sucursal.direccion}</p>}
                    {sucursal.telefono && <p>{sucursal.telefono}</p>}
                  </div>
                )}
              </article>
            ))}
          </div>
        </article>

        {/* Forms */}
        <div className="grid gap-5">
          <CreateSucursalForm />
          <CreateUserForm sucursales={sucursales} />
        </div>
      </section>

      {/* Grupos por rol */}
      {(["admin", "gerente", "cajero", "vendedor"] as RolUsuario[]).map((rol) => {
        const grupo = por_rol[rol];
        if (grupo.length === 0) return null;
        return (
          <section key={rol} className="rounded-2xl p-6" style={S}>
            <div className="flex items-center gap-3 pb-4 mb-5"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <span className={`rounded-full border px-3 py-1 text-xs font-bold ${ROL_COLORS[rol]}`}>
                {ROL_LABELS[rol]}
              </span>
              <span className="text-sm" style={{ color: "#52525b" }}>
                {grupo.length} usuario{grupo.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="space-y-4">
              {grupo.map((usuario) => (
                <article key={usuario.id} className="rounded-xl p-5" style={C}>
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                          style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b" }}>
                          {usuario.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold" style={{ color: "#fafaf9" }}>{usuario.nombre}</p>
                          <p className="text-xs" style={{ color: "#52525b" }}>{usuario.email}</p>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                        <span className={`rounded-full border px-3 py-1 font-semibold ${ROL_COLORS[usuario.rol]}`}>
                          {ROL_LABELS[usuario.rol]}
                        </span>
                        <span className="rounded-full px-3 py-1 font-semibold"
                          style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "#71717a" }}>
                          {usuario.sucursal ? usuario.sucursal.nombre : "Sin sucursal"}
                        </span>
                        <span className="rounded-full px-3 py-1 font-bold"
                          style={usuario.activo
                            ? { background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.16)", color: "#34d399" }
                            : { background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.16)", color: "#f87171" }}>
                          {usuario.activo ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                    </div>
                    <SetPinForm usuario_id={usuario.id} has_pin={usuario.has_pin} />
                  </div>
                  <div className="mt-5 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "#3f3f46" }}>
                      Acceso operativo
                    </p>
                    <UserAccessForm usuario={usuario} sucursales={sucursales} />
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
