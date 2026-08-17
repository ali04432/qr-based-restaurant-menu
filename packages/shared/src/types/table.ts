// ============================================================
// Table Types
// ============================================================

/** A physical table within a restaurant, identified by a unique QR token */
export interface Table {
  id: string;
  restaurantId: string;
  tableNumber: string;
  /** Unique token embedded in the QR code URL */
  qrToken: string;
  /** Whether the table is currently active / accepting orders */
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Input for creating a new table */
export interface CreateTableInput {
  restaurantId: string;
  tableNumber: string;
}

/** Input for updating a table */
export interface UpdateTableInput {
  tableNumber?: string;
  isActive?: boolean;
}
