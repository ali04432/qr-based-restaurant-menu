import { MenuCategory, MenuItem } from '@qr-menu/shared';
import { mockCategories, mockMenuItems } from '../data/mockMenuData';

interface BackendMenuItem {
  id: string;
  restaurantId?: string;
  name: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  modelUrl?: string | null;
  category: string;
  isAvailable?: boolean;
}


interface BackendMenuResponse {
  restaurant: {
    id: string;
    name: string;
    logo?: string | null;
    themeColor?: string;
  };
  table?: {
    id: string;
    tableNumber: string;
  } | null;
  menu: Record<string, BackendMenuItem[]>;
}

const API_BASE =
  typeof window === 'undefined'
    ? (process.env.API_BASE_URL ?? 'http://localhost:4000')
    : (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000');

function mapBackendItemToMenuItem(
  item: BackendMenuItem,
  restaurantId: string
): MenuItem {
  const defaultImages: Record<string, string> = {
    Burgers: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop&q=85',
    Pizza: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&auto=format&fit=crop&q=85',
    Pasta: 'https://images.unsplash.com/photo-1473093226795-af9932fe5156?w=800&auto=format&fit=crop&q=85',
    Rice: 'https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?w=800&auto=format&fit=crop&q=85',
    Drinks: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&auto=format&fit=crop&q=85',
    Desserts: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&auto=format&fit=crop&q=85',
    Appetizers: 'https://images.unsplash.com/photo-1599487484170-7c1e6e580812?w=800&auto=format&fit=crop&q=85',
    Soups: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&auto=format&fit=crop&q=85',
    Salads: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&auto=format&fit=crop&q=85',
    'Main Courses': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=85',
    'Chef\'s Specials': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&auto=format&fit=crop&q=85',
  };

  const image =
    item.imageUrl ||
    defaultImages[item.category] ||
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&auto=format&fit=crop&q=85';

  return {
    id: item.id,
    restaurantId,
    categoryId: `cat-${item.category.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
    name: item.name,
    description: item.description || `Fresh and delicious ${item.name} made with premium ingredients.`,
    price: Number(item.price),
    image,
    rating: 4.8,
    reviewCount: 120,
    prepTimeMin: 15,
    prepTimeMax: 25,
    badge: item.category.toLowerCase().includes('special') ? 'Chef\'s Pick' : 'Popular',
    tags: ['Halal'],
    isAvailable: item.isAvailable !== false,
  };
}

export const menuService = {
  /**
   * Fetch full menu for a restaurant from backend API.
   * Returns grouped or flat menu items with fallback to mock data.
   */
  async getMenu(restaurantId?: string, tableId?: string): Promise<{
    restaurantName: string;
    categories: MenuCategory[];
    items: MenuItem[];
  }> {
    const restId = restaurantId || 'a0000000-0000-0000-0000-000000000001';

    try {
      const url = new URL(`${API_BASE}/api/menu`);
      url.searchParams.set('restaurant', restId);
      if (tableId) url.searchParams.set('table', tableId);

      const res = await fetch(url.toString(), {
        cache: 'no-store',
      });

      if (res.ok) {
        const data: BackendMenuResponse = await res.json();
        const allItems: MenuItem[] = [];
        const categories: MenuCategory[] = [
          { id: 'cat-all', restaurantId: restId, name: 'All', order: 0, isActive: true },
        ];

        let orderIndex = 1;
        for (const [catName, catItems] of Object.entries(data.menu || {})) {
          const catId = `cat-${catName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
          categories.push({
            id: catId,
            restaurantId: restId,
            name: catName,
            order: orderIndex++,
            isActive: true,
          });

          for (const item of catItems) {
            allItems.push(mapBackendItemToMenuItem(item, restId));
          }
        }

        if (allItems.length > 0) {
          return {
            restaurantName: data.restaurant?.name || 'Silver Sapoon',
            categories,
            items: allItems,
          };
        }
      }
    } catch (err) {
      console.warn('[menuService] API unavailable, using fallback mock items:', err);
    }

    // Fallback
    return {
      restaurantName: 'Silver Sapoon',
      categories: mockCategories,
      items: mockMenuItems,
    };
  },

  async getCategories(restaurantId?: string): Promise<MenuCategory[]> {
    const data = await this.getMenu(restaurantId);
    return data.categories;
  },

  async getMenuItems(
    restaurantId?: string,
    categoryNameOrId?: string,
    query?: string
  ): Promise<MenuItem[]> {
    const data = await this.getMenu(restaurantId);
    let items = data.items;

    if (categoryNameOrId && categoryNameOrId !== 'All' && categoryNameOrId !== 'cat-all') {
      const target = categoryNameOrId.toLowerCase();
      items = items.filter(
        (item) =>
          item.categoryId.toLowerCase() === target ||
          item.categoryId.toLowerCase().includes(target.replace(/^cat-/, '')) ||
          item.tags?.some((t) => t.toLowerCase() === target)
      );
    }

    if (query && query.trim()) {
      const q = query.toLowerCase().trim();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.categoryId.toLowerCase().includes(q)
      );
    }

    return items;
  },


  async getMenuItem(itemId: string): Promise<MenuItem | null> {
    try {
      const res = await fetch(`${API_BASE}/api/menu/item/${encodeURIComponent(itemId)}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const item: BackendMenuItem = await res.json();
        return mapBackendItemToMenuItem(item, item.restaurantId || '1');
      }
    } catch (err) {
      console.warn('[menuService] Could not fetch single item from API:', err);
    }

    // Fallback to local mock data
    const local = mockMenuItems.find((i) => i.id === itemId);
    return local || null;
  },
};
