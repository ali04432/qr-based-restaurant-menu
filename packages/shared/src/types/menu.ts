export type BadgeType = 'Best Match' | 'Popular' | "Chef's Pick" | 'Best Seller' | 'Spicy' | 'New' | 'Perfect Combo' | 'Refreshing';
export type DietaryTag = 'Vegetarian' | 'Vegan' | 'Gluten-Free' | 'Dairy-Free' | 'Nut-Free' | 'Halal' | 'Keto';

export interface NutritionInfo {
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  image: string;
  rating: number;
  reviewCount: number;
  prepTimeMin: number;
  prepTimeMax: number;
  badge?: BadgeType;
  tags: DietaryTag[];
  nutrition?: NutritionInfo;
  isAvailable: boolean;
}

export interface MenuCategory {
  id: string;
  restaurantId: string;
  name: string;
  description?: string;
  order: number;
  isActive: boolean;
}
