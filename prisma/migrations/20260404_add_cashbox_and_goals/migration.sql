CREATE TYPE "EstadoCaja" AS ENUM ('abierta', 'cerrada');

CREATE TABLE "cierres_caja" (
  "id" SERIAL NOT NULL,
  "usuario_id" UUID NOT NULL,
  "sucursal_id" INTEGER NOT NULL,
  "fecha_operativa" DATE NOT NULL,
  "hora_apertura" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "hora_cierre" TIMESTAMP(3),
  "monto_inicial" DECIMAL(12,2) NOT NULL,
  "ventas_efectivo" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "ventas_tarjeta" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "ventas_transferencia" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "monto_esperado" DECIMAL(12,2),
  "monto_final_declarado" DECIMAL(12,2),
  "diferencia" DECIMAL(12,2),
  "estado" "EstadoCaja" NOT NULL DEFAULT 'abierta',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "cierres_caja_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cierres_caja_usuario_id_fecha_operativa_key"
  ON "cierres_caja"("usuario_id", "fecha_operativa");

CREATE INDEX "cierres_caja_sucursal_id_idx"
  ON "cierres_caja"("sucursal_id");

CREATE INDEX "cierres_caja_fecha_operativa_idx"
  ON "cierres_caja"("fecha_operativa");

CREATE INDEX "cierres_caja_estado_idx"
  ON "cierres_caja"("estado");

ALTER TABLE "cierres_caja"
  ADD CONSTRAINT "cierres_caja_usuario_id_fkey"
  FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "cierres_caja"
  ADD CONSTRAINT "cierres_caja_sucursal_id_fkey"
  FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "metas_venta" (
  "id" SERIAL NOT NULL,
  "nombre" VARCHAR(160),
  "usuario_id" UUID,
  "sucursal_id" INTEGER,
  "fecha_inicio" DATE NOT NULL,
  "fecha_fin" DATE NOT NULL,
  "monto_objetivo" DECIMAL(12,2) NOT NULL,
  "activa" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "metas_venta_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "metas_venta_usuario_id_idx"
  ON "metas_venta"("usuario_id");

CREATE INDEX "metas_venta_sucursal_id_idx"
  ON "metas_venta"("sucursal_id");

CREATE INDEX "metas_venta_fecha_inicio_fecha_fin_idx"
  ON "metas_venta"("fecha_inicio", "fecha_fin");

CREATE INDEX "metas_venta_activa_idx"
  ON "metas_venta"("activa");

ALTER TABLE "metas_venta"
  ADD CONSTRAINT "metas_venta_usuario_id_fkey"
  FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "metas_venta"
  ADD CONSTRAINT "metas_venta_sucursal_id_fkey"
  FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
