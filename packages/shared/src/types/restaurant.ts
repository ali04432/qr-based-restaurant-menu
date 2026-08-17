// ============================================================
// Restaurant / Tenant Types
// ============================================================

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Data required to create a new restaurant tenant */
export interface CreateRestaurantInput {
  name: string;
  slug: string;
}

/** Data allowed to update an existing restaurant */
export interface UpdateRestaurantInput {
  name?: string;
  slug?: string;
}
