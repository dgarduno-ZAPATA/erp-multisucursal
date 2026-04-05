import { randomUUID } from "node:crypto";

import { Client } from "pg";

type AccessProfile = {
  nombre: string;
  email: string;
  rol: "admin" | "gerente" | "cajero" | "vendedor";
  sucursal_nombre: string | null;
};

function get_connection_string() {
  const connection_string = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!connection_string) {
    throw new Error("No hay conexion configurada a la base de datos.");
  }
  return connection_string;
}

function build_user_metadata(profile: AccessProfile) {
  return {
    nombre: profile.nombre,
    rol: profile.rol,
    sucursal_nombre: profile.sucursal_nombre,
    email_verified: true,
  };
}

function build_app_metadata() {
  return {
    provider: "email",
    providers: ["email"],
  };
}

export async function sync_auth_user_metadata(params: {
  user_id: string;
  nombre: string;
  rol: "admin" | "gerente" | "cajero" | "vendedor";
  sucursal_nombre: string | null;
}) {
  const client = new Client({ connectionString: get_connection_string() });
  await client.connect();

  try {
    await client.query(
      `update auth.users
       set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || $2::jsonb,
           raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || $3::jsonb,
           updated_at = now()
       where id = $1`,
      [
        params.user_id,
        JSON.stringify(build_app_metadata()),
        JSON.stringify(
          build_user_metadata({
            nombre: params.nombre,
            email: "",
            rol: params.rol,
            sucursal_nombre: params.sucursal_nombre,
          }),
        ),
      ],
    );
  } finally {
    await client.end();
  }
}

export async function create_auth_user_with_profile(params: {
  nombre: string;
  email: string;
  password: string;
  rol: "admin" | "gerente" | "cajero" | "vendedor";
  sucursal_id: number | null;
  sucursal_nombre: string | null;
}) {
  const client = new Client({ connectionString: get_connection_string() });
  await client.connect();

  try {
    await client.query("begin");

    const existing = await client.query("select id from auth.users where email = $1", [params.email]);
    if (existing.rowCount) {
      await client.query("rollback");
      return { success: false as const, error: "Ya existe un usuario con ese correo." };
    }

    const user_id = randomUUID();
    const identity_id = randomUUID();
    const hash_res = await client.query("select crypt($1, gen_salt('bf')) as hash", [params.password]);
    const encrypted_password = hash_res.rows[0]?.hash;

    await client.query(
      `insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user, is_anonymous
      ) values (
        '00000000-0000-0000-0000-000000000000', $1, 'authenticated', 'authenticated', $2, $3, now(),
        $4::jsonb, $5::jsonb, now(), now(), false, false
      )`,
      [
        user_id,
        params.email,
        encrypted_password,
        JSON.stringify(build_app_metadata()),
        JSON.stringify(
          build_user_metadata({
            nombre: params.nombre,
            email: params.email,
            rol: params.rol,
            sucursal_nombre: params.sucursal_nombre,
          }),
        ),
      ],
    );

    await client.query(
      `insert into auth.identities (
        id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
      ) values (
        $1, $2, $3::jsonb, 'email', $4, now(), now(), now()
      )`,
      [
        identity_id,
        user_id,
        JSON.stringify({
          sub: user_id,
          email: params.email,
          email_verified: true,
          phone_verified: false,
        }),
        params.email,
      ],
    );

    await client.query(
      `insert into public.usuarios (id, sucursal_id, nombre, email, rol, activo, created_at, updated_at)
       values ($1, $2, $3, $4, $5::public."RolUsuario", true, now(), now())`,
      [user_id, params.sucursal_id, params.nombre, params.email, params.rol],
    );

    await client.query("commit");
    return { success: true as const, user_id };
  } catch (error) {
    try {
      await client.query("rollback");
    } catch {}

    if (error instanceof Error && error.message.includes("duplicate")) {
      return { success: false as const, error: "Ya existe un usuario con ese correo." };
    }

    return { success: false as const, error: "No se pudo crear el usuario." };
  } finally {
    await client.end();
  }
}
