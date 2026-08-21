import { AIChatMessage, AIRecommendationResponse, AIUpsellSuggestion, MenuItem } from '@qr-menu/shared';
import { mockMenuItems } from '../data/mockMenuData';

export const aiService = {
  async getRecommendations(restaurantId: string, tableNumber: string): Promise<MenuItem[]> {
    // Simulate AI recommendation engine taking context into account
    await new Promise((resolve) => setTimeout(resolve, 800));
    
    // For demo, return items with Best Match or Popular badges
    return mockMenuItems.filter(item => 
      item.restaurantId === restaurantId && 
      (item.badge === 'Best Match' || item.badge === "Chef's Pick" || item.badge === 'Popular')
    ).slice(0, 4);
  },

  async getUpsellSuggestions(cartItemIds: string[]): Promise<AIUpsellSuggestion[]> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    // Simulate smart upselling (e.g. if they have a burger, suggest a drink)
    const suggestions: AIUpsellSuggestion[] = [];
    if (cartItemIds.includes('item-4') && !cartItemIds.includes('item-5')) {
      suggestions.push({
        triggerItemId: 'item-4',
        suggestedItemId: 'item-5',
        reason: 'Pairs perfectly with your Double Smash Burger',
      });
    }
    return suggestions;
  },

  async sendMessage(messages: AIChatMessage[]): Promise<AIChatMessage> {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const lastMessage = messages[messages.length - 1].content.toLowerCase();
    
    let responseText = "I'm your AI dining assistant! I can recommend dishes based on your taste, suggest pairings, or answer questions about the menu.";
    
    if (lastMessage.includes('recommend') || lastMessage.includes('what should i eat')) {
      responseText = "Based on what's popular tonight, I highly recommend the Wagyu Beef Steak or the Double Smash Burger. Would you like me to add one to your cart?";
    } else if (lastMessage.includes('vegetarian')) {
      responseText = "We have some excellent vegetarian options! The Truffle Mushroom Pizza is a crowd favorite, and the Dark Chocolate Lava Cake is perfect for dessert.";
    }

    return {
      id: Math.random().toString(36).substring(7),
      role: 'assistant',
      content: responseText,
      timestamp: new Date().toISOString(),
    };
  }
};
