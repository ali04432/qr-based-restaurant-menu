export interface AIRecommendationResponse {
  recommendations: Array<{
    menuItemId: string;
    reasoning: string;
    confidence: number;
    badge: string; // e.g., 'Best Match', 'Perfect Combo'
  }>;
}

export interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface AIChatQuery {
  message: string;
  context: {
    restaurantId: string;
    cartItemIds: string[];
    currentTime: string;
  };
}

export interface AIUpsellSuggestion {
  triggerItemId: string;
  suggestedItemId: string;
  reason: string;
}
