import { MenuCategory, MenuItem } from '@qr-menu/shared';
import { mockCategories, mockMenuItems } from '../data/mockMenuData';

interface BackendMenuItem {
  id: string;
  restaurantId?: string;
  name: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  image?: string | null;
  modelUrl?: string | null;
  hasAr?: boolean;
  category: string | { id?: string; name: string };
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

// Safe base URL resolution for server vs client.
// In the browser, always default to relative paths ('') so requests match the current
// origin (localhost, 127.0.0.1, LAN IP, or tunnel domain) without CORS issues.
export function getApiBase(): string {
  if (typeof window !== 'undefined') {
    const publicUrl = process.env.NEXT_PUBLIC_API_URL;
    if (publicUrl && !publicUrl.includes('localhost') && !publicUrl.includes('127.0.0.1') && publicUrl.startsWith('http')) {
      return publicUrl.replace(/\/$/, '');
    }
    return '';
  }
  return process.env.API_INTERNAL_URL || process.env.API_BASE_URL || 'http://localhost:4000';
}

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

  const categoryName =
    typeof item.category === 'string'
      ? item.category
      : (typeof item.category === 'object' && item.category !== null && 'name' in item.category)
      ? (item.category as { name: string }).name
      : 'General';

  const image =
    item.imageUrl ||
    item.image ||
    defaultImages[categoryName] ||
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&auto=format&fit=crop&q=85';

  return {
    id: item.id,
    restaurantId,
    categoryId: `cat-${categoryName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
    name: item.name,
    description: item.description || `Fresh and delicious ${item.name} made with premium ingredients.`,
    price: Number(item.price),
    image,
    rating: 4.8,
    reviewCount: 120,
    prepTimeMin: 15,
    prepTimeMax: 25,
    badge: categoryName.toLowerCase().includes('special') ? 'Chef\'s Pick' : 'Popular',
    tags: ['Halal'],
    isAvailable: item.isAvailable !== false,
    hasAr: item.hasAr ?? !!item.modelUrl,
    modelUrl: item.modelUrl ?? null,
    arAsset: (item as any).arAsset ?? null,
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
    const restId = restaurantId || 'ffed1622-07e2-4b76-a0e7-5de417637740';

    try {
      const base = getApiBase();
      const baseOrigin = typeof window !== 'undefined' ? window.location.origin : (base || 'http://localhost:4000');
      const url = new URL(`${base}/api/menu`, baseOrigin);
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
    if (!itemId) return null;
    try {
      const base = getApiBase();
      const url = `${base}/api/menu/items/${encodeURIComponent(itemId)}`;
      const res = await fetch(url, {
        cache: 'no-store',
      });
      if (res.ok) {
        const json = await res.json();
        // Support either standard API envelope { success: true, data: { ... } } or raw item object
        const rawItem: BackendMenuItem =
          json && typeof json === 'object' && 'data' in json && json.data ? json.data : json;
        if (!rawItem || typeof rawItem !== 'object') {
          return null;
        }
        return mapBackendItemToMenuItem(rawItem, rawItem.restaurantId || '1');
      }
      if (res.status === 404) {
        return null;
      }
    } catch (err) {
      console.warn('[menuService] Could not fetch single item from API:', err);
    }

    // Fallback to local mock data
    const local = mockMenuItems.find((i) => i.id === itemId);
    return local || null;
  },
};
