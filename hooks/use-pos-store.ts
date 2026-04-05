import { create } from "zustand";

import type { MetodoPago } from "@prisma/client";

export type { MetodoPago };

export type PosCartItem = {
  producto_id: number;
  nombre: string;
  precio_unitario: number;
  cantidad: number;
  stock_disponible: number;
};

export type PosProduct = {
  id: number;
  sku: string;
  nombre: string;
  precio: number;
  categoria: string;
  stock_disponible: number;
};

export type PosOperator = {
  id: string;
  nombre: string;
  rol: string;
};

type PosStore = {
  items: PosCartItem[];
  total: number;
  metodo_pago: MetodoPago;
  active_operator: PosOperator | null;
  set_metodo_pago: (metodo: MetodoPago) => void;
  set_active_operator: (op: PosOperator | null) => void;
  add_item: (product: PosProduct) => void;
  increase_item: (producto_id: number) => void;
  decrease_item: (producto_id: number) => void;
  remove_item: (producto_id: number) => void;
  clear_cart: () => void;
};

export const use_pos_store = create<PosStore>((set) => ({
  items: [],
  total: 0,
  metodo_pago: "efectivo",
  active_operator: null,
  set_metodo_pago: (metodo) => set({ metodo_pago: metodo }),
  set_active_operator: (op) => set({ active_operator: op }),
  add_item: (product) =>
    set((state) => {
      const existing_item = state.items.find(
        (current_item) => current_item.producto_id === product.id,
      );

      if (product.stock_disponible <= 0) {
        return state;
      }

      if (!existing_item) {
        const next_items = [
          ...state.items,
          {
            producto_id: product.id,
            nombre: product.nombre,
            precio_unitario: product.precio,
            cantidad: 1,
            stock_disponible: product.stock_disponible,
          },
        ];

        return {
          items: next_items,
          total: next_items.reduce(
            (sum, item) => sum + item.precio_unitario * item.cantidad,
            0,
          ),
        };
      }

      if (existing_item.cantidad >= existing_item.stock_disponible) {
        return state;
      }

      const next_items = state.items.map((current_item) =>
        current_item.producto_id === product.id
          ? {
              ...current_item,
              cantidad: current_item.cantidad + 1,
            }
          : current_item,
      );

      return {
        items: next_items,
        total: next_items.reduce(
          (sum, item) => sum + item.precio_unitario * item.cantidad,
          0,
        ),
      };
    }),
  increase_item: (producto_id) =>
    set((state) => {
      const existing_item = state.items.find(
        (item) => item.producto_id === producto_id,
      );

      if (!existing_item) {
        return state;
      }

      if (existing_item.cantidad >= existing_item.stock_disponible) {
        return state;
      }

      const next_items = state.items.map((item) =>
        item.producto_id === producto_id
          ? {
              ...item,
              cantidad: item.cantidad + 1,
            }
          : item,
      );

      return {
        items: next_items,
        total: next_items.reduce(
          (sum, item) => sum + item.precio_unitario * item.cantidad,
          0,
        ),
      };
    }),
  decrease_item: (producto_id) =>
    set((state) => {
      const next_items = state.items
        .map((item) =>
          item.producto_id === producto_id
            ? {
                ...item,
                cantidad: item.cantidad - 1,
              }
            : item,
        )
        .filter((item) => item.cantidad > 0);

      return {
        items: next_items,
        total: next_items.reduce(
          (sum, item) => sum + item.precio_unitario * item.cantidad,
          0,
        ),
      };
    }),
  remove_item: (producto_id) =>
    set((state) => {
      const next_items = state.items.filter(
        (item) => item.producto_id !== producto_id,
      );

      return {
        items: next_items,
        total: next_items.reduce(
          (sum, item) => sum + item.precio_unitario * item.cantidad,
          0,
        ),
      };
    }),
  clear_cart: () => set({ items: [], total: 0, metodo_pago: "efectivo" }),
}));
