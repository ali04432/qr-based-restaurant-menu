import { mockCategories, mockMenuItems } from '../data/mockMenuData';
import { MenuCategory, MenuItem } from '@qr-menu/shared';

// In a real application, this would fetch from the API using apiClient.
// For Phase 2, we simulate API calls to the typed abstractions using mock data.

export const menuService = {
  async getCategories(restaurantId: string): Promise<MenuCategory[]> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));
    return mockCategories.filter((cat) => cat.restaurantId === restaurantId).sort((a, b) => a.order - b.order);
  },

  async getMenuItems(restaurantId: string, categoryId?: string, query?: string): Promise<MenuItem[]> {
    await new Promise((resolve) => setTimeout(resolve, 400));
    let items = mockMenuItems.filter((item) => item.restaurantId === restaurantId && item.isAvailable);

    if (categoryId && categoryId !== 'cat-all') {
      items = items.filter((item) => item.categoryId === categoryId);
    }

    if (query) {
      const q = query.toLowerCase();
      items = items.filter((item) => item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q));
    }

    return items;
  },

  async getMenuItem(itemId: string): Promise<MenuItem | null> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return mockMenuItems.find((item) => item.id === itemId) || null;
  },
};
