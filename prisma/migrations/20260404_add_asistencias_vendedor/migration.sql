CREATE TYPE "EstadoAsistencia" AS ENUM ('activa', 'cerrada');

CREATE TABLE "asistencias_vendedor" (
  "id" SERIAL NOT NULL,
  "usuario_id" UUID NOT NULL,
  "sucursal_id" INTEGER NOT NULL,
  "fecha_operativa" DATE NOT NULL,
  "hora_entrada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "hora_salida" TIMESTAMP(3),
  "estado" "EstadoAsistencia" NOT NULL DEFAULT 'activa',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "asistencias_vendedor_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "asistencias_vendedor_usuario_id_fecha_operativa_key"
  ON "asistencias_vendedor"("usuario_id", "fecha_operativa");

CREATE INDEX "asistencias_vendedor_sucursal_id_idx"
  ON "asistencias_vendedor"("sucursal_id");

CREATE INDEX "asistencias_vendedor_fecha_operativa_idx"
  ON "asistencias_vendedor"("fecha_operativa");

CREATE INDEX "asistencias_vendedor_estado_idx"
  ON "asistencias_vendedor"("estado");

ALTER TABLE "asistencias_vendedor"
  ADD CONSTRAINT "asistencias_vendedor_usuario_id_fkey"
  FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "asistencias_vendedor"
  ADD CONSTRAINT "asistencias_vendedor_sucursal_id_fkey"
  FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
