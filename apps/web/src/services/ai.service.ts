import {
  AIChatMessage,
  AIRecommendationResponse,
  AIUpsellSuggestion,
  MenuItem,
} from '@qr-menu/shared';

import { mockMenuItems } from '../data/mockMenuData';

type ChatContext = {
  restaurantId?: string;
  tableNumber?: string;
  cartItemIds?: string[];
  currentTime?: string;
};

function normalize(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .trim();
}

function isAvailable(item: MenuItem): boolean {
  return item.isAvailable === true;
}

function getRestaurantItems(
  restaurantId?: string
): MenuItem[] {
  if (!restaurantId) {
    return [...mockMenuItems];
  }

  const filtered = mockMenuItems.filter(
    (item) =>
      String(item.restaurantId) ===
      String(restaurantId)
  );

  return filtered.length > 0
    ? filtered
    : [...mockMenuItems];
}

function itemSearchText(
  item: MenuItem
): string {
  return [
    item.name,
    item.description,
    item.categoryId,
    item.badge,
    ...(item.tags ?? []),
  ]
    .map(normalize)
    .join(' ');
}

function sortByRating(
  items: MenuItem[]
): MenuItem[] {
  return [...items].sort(
    (a, b) =>
      Number(b.rating ?? 0) -
      Number(a.rating ?? 0)
  );
}

function formatMenuItems(
  items: MenuItem[],
  limit = 4
): string {
  return items
    .slice(0, limit)
    .map(
      (item) =>
        `${item.name} — Rs. ${Number(
          item.price
        ).toLocaleString('en-PK')}`
    )
    .join(', ');
}

function findItemsByTerms(
  items: MenuItem[],
  terms: string[]
): MenuItem[] {
  const normalizedTerms = terms
    .map(normalize)
    .filter(
      (term) => term.length >= 3
    );

  if (
    normalizedTerms.length === 0
  ) {
    return [];
  }

  return items.filter((item) => {
    const searchable =
      itemSearchText(item);

    return normalizedTerms.some(
      (term) =>
        searchable.includes(term)
    );
  });
}

function extractBudget(
  message: string
): number | null {
  const match = message.match(
    /(?:under|below|less than|up to|max(?:imum)?)[^\d]{0,8}(\d[\d,]*)/i
  );

  if (!match?.[1]) {
    return null;
  }

  const amount = Number(
    match[1].replace(/,/g, '')
  );

  return Number.isFinite(amount)
    ? amount
    : null;
}

function getBadgeMatches(
  item: MenuItem,
  keywords: string[]
): boolean {
  const badge = normalize(item.badge);

  const tags =
    item.tags?.map(normalize) ?? [];

  return keywords.some(
    (keyword) =>
      badge.includes(keyword) ||
      tags.some((tag) =>
        tag.includes(keyword)
      )
  );
}

function getRecommendedItems(
  message: string,
  items: MenuItem[],
  cartItemIds: string[] = []
): MenuItem[] {
  const availableItems =
    items.filter(isAvailable);

  const cartIds = new Set(
    cartItemIds.map(String)
  );

  let candidates =
    availableItems.filter(
      (item) =>
        !cartIds.has(
          String(item.id)
        )
    );

  const budget =
    extractBudget(message);

  if (budget !== null) {
    candidates =
      candidates.filter(
        (item) =>
          Number(item.price) <=
          budget
      );
  }

  const text =
    normalize(message);

  const spicyRequest =
    text.includes('spicy') ||
    text.includes('hot') ||
    text.includes('chilli') ||
    text.includes('chili');

  if (spicyRequest) {
    const spicy =
      candidates.filter(
        (item) =>
          getBadgeMatches(item, [
            'spicy',
          ])
      );

    if (spicy.length > 0) {
      candidates = spicy;
    }
  }

  const chefRequest =
    text.includes(
      'chef special'
    ) ||
    text.includes(
      "chef's special"
    ) ||
    text.includes('chef pick');

  if (chefRequest) {
    const chefItems =
      candidates.filter(
        (item) =>
          getBadgeMatches(item, [
            'chef',
          ])
      );

    if (chefItems.length > 0) {
      candidates = chefItems;
    }
  }

  if (
    text.includes('popular') ||
    text.includes('trending') ||
    text.includes('best seller')
  ) {
    candidates =
      sortByRating(candidates);
  } else {
    candidates =
      sortByRating(candidates);
  }

  return candidates.slice(0, 6);
}

function buildAssistantReply(
  message: string,
  items: MenuItem[],
  cartItemIds: string[] = []
): string {
  const text =
    normalize(message);

  if (
    text === 'hi' ||
    text === 'hello' ||
    text === 'hey' ||
    text.includes('assalam')
  ) {
    return 'Hello! I am your Silver Sapoon dining assistant. Tell me your craving, budget, or food preference.';
  }

  if (
    text.includes(
      'what can you do'
    ) ||
    text.includes('help me')
  ) {
    return 'I can recommend dishes, find spicy options, suggest food within your budget, show popular choices, and help with meal pairings.';
  }

  if (
    text.includes('spicy') ||
    text.includes('hot') ||
    text.includes('chilli') ||
    text.includes('chili')
  ) {
    const spicyItems =
      items.filter(
        (item) =>
          isAvailable(item) &&
          getBadgeMatches(item, [
            'spicy',
          ])
      );

    if (spicyItems.length > 0) {
      return `For something spicy, try: ${formatMenuItems(
        sortByRating(spicyItems),
        4
      )}.`;
    }

    return 'I could not find an available item currently marked as spicy.';
  }

  if (
    text.includes('popular') ||
    text.includes('trending') ||
    text.includes('best seller') ||
    text.includes('best food')
  ) {
    const popular =
      sortByRating(
        items.filter(isAvailable)
      );

    if (popular.length > 0) {
      return `Some popular choices are: ${formatMenuItems(
        popular,
        4
      )}.`;
    }

    return 'There are no available menu items to recommend right now.';
  }

  if (
    text.includes('under ') ||
    text.includes('below ') ||
    text.includes('budget') ||
    text.includes('affordable') ||
    text.includes('cheap')
  ) {
    const budget =
      extractBudget(message) ??
      1000;

    const affordable =
      sortByRating(
        items.filter(
          (item) =>
            isAvailable(item) &&
            Number(item.price) <=
            budget
        )
      );

    if (affordable.length > 0) {
      return `Within Rs. ${budget.toLocaleString(
        'en-PK'
      )}, I recommend: ${formatMenuItems(
        affordable,
        4
      )}.`;
    }

    return `I couldn't find an available item within Rs. ${budget.toLocaleString(
      'en-PK'
    )}.`;
  }

  if (
    text.includes('recommend') ||
    text.includes(
      'what should i eat'
    ) ||
    text.includes(
      'suggest something'
    ) ||
    text.includes(
      'choose for me'
    )
  ) {
    const recommendations =
      getRecommendedItems(
        message,
        items,
        cartItemIds
      );

    if (
      recommendations.length > 0
    ) {
      return `I would recommend: ${formatMenuItems(
        recommendations,
        4
      )}. These are currently available.`;
    }

    return 'I could not find a suitable available recommendation right now.';
  }

  if (
    text.includes('vegetarian') ||
    text.includes('vegan')
  ) {
    const dietaryItems =
      items.filter((item) => {
        if (!isAvailable(item)) {
          return false;
        }

        const tags =
          item.tags?.map(
            normalize
          ) ?? [];

        return tags.some(
          (tag) =>
            tag ===
            'vegetarian' ||
            tag === 'vegan'
        );
      });

    if (dietaryItems.length > 0) {
      return `For vegetarian-friendly choices, try: ${formatMenuItems(
        sortByRating(
          dietaryItems
        ),
        4
      )}.`;
    }

    return 'I could not find a clearly vegetarian or vegan tagged item in the current menu.';
  }

  if (
    text.includes('pair') ||
    text.includes(
      'goes well'
    ) ||
    text.includes(
      'with my order'
    ) ||
    text.includes(
      'pairing'
    )
  ) {
    const cartItems =
      items.filter((item) =>
        cartItemIds.includes(
          String(item.id)
        )
      );

    if (cartItems.length > 0) {
      const cartHasDrink =
        cartItems.some((item) =>
          normalize(
            item.categoryId
          ).includes('drink')
        );

      if (!cartHasDrink) {
        const drinks =
          items.filter(
            (item) =>
              isAvailable(item) &&
              normalize(
                item.categoryId
              ).includes('drink')
          );

        if (drinks.length > 0) {
          return `A refreshing drink would pair nicely with your order. Try: ${formatMenuItems(
            sortByRating(drinks),
            3
          )}.`;
        }
      }

      const desserts =
        items.filter(
          (item) =>
            isAvailable(item) &&
            normalize(
              item.categoryId
            ).includes('dessert')
        );

      if (desserts.length > 0) {
        return `For dessert, I suggest: ${formatMenuItems(
          sortByRating(desserts),
          3
        )}.`;
      }

      return `Your current order has ${cartItems
        .map(
          (item) => item.name
        )
        .join(', ')}. I can suggest a complementary item from the available menu.`;
    }

    return 'Tell me what you already ordered, and I can suggest a drink, dessert, or complementary dish.';
  }

  const matchingItems =
    findItemsByTerms(
      items.filter(isAvailable),
      text.split(/\s+/)
    );

  if (
    matchingItems.length > 0
  ) {
    return `I found these menu matches: ${formatMenuItems(
      sortByRating(
        matchingItems
      ),
      4
    )}.`;
  }

  return 'I can help you with recommendations, spicy food, popular dishes, budget options, vegetarian choices, and meal pairings. Try asking something specific about the menu.';
}

export const aiService = {
  async getRecommendations(
    restaurantId: string,
    tableNumber: string
  ): Promise<MenuItem[]> {
    await new Promise((resolve) =>
      setTimeout(resolve, 300)
    );

    void tableNumber;

    const items =
      getRestaurantItems(
        restaurantId
      ).filter(isAvailable);

    const preferred =
      items.filter((item) =>
        getBadgeMatches(item, [
          'best match',
          'popular',
          'chef',
          'best seller',
        ])
      );

    return (
      preferred.length > 0
        ? preferred
        : sortByRating(items)
    ).slice(0, 4);
  },

  async getUpsellSuggestions(
    cartItemIds: string[]
  ): Promise<AIUpsellSuggestion[]> {
    await new Promise((resolve) =>
      setTimeout(resolve, 200)
    );

    const items =
      getRestaurantItems().filter(
        isAvailable
      );

    const cartIds = new Set(
      cartItemIds.map(String)
    );

    const cartItems =
      items.filter((item) =>
        cartIds.has(
          String(item.id)
        )
      );

    const suggestions: AIUpsellSuggestion[] =
      [];

    for (const cartItem of cartItems) {
      const currentCategory =
        normalize(
          cartItem.categoryId
        );

      let suggested:
        | MenuItem
        | undefined;

      if (
        currentCategory.includes(
          'burger'
        ) ||
        currentCategory.includes(
          'pizza'
        ) ||
        currentCategory.includes(
          'bbq'
        ) ||
        currentCategory.includes(
          'main'
        )
      ) {
        suggested =
          items.find(
            (item) =>
              !cartIds.has(
                String(item.id)
              ) &&
              normalize(
                item.categoryId
              ).includes('drink')
          );
      }

      if (!suggested) {
        suggested =
          items.find(
            (item) =>
              !cartIds.has(
                String(item.id)
              ) &&
              normalize(
                item.categoryId
              ).includes('dessert')
          );
      }

      if (suggested) {
        suggestions.push({
          triggerItemId:
            String(
              cartItem.id
            ),
          suggestedItemId:
            String(
              suggested.id
            ),
          reason:
            `${suggested.name} pairs well with ${cartItem.name}.`,
        });
      }

      if (
        suggestions.length >= 3
      ) {
        break;
      }
    }

    return suggestions;
  },

  async chatWithAI(payload: {
    message: string;
    restaurantId?: string;
    tableNumber?: string;
  }): Promise<{ reply: string }> {
    const API_BASE =
      typeof window === 'undefined'
        ? (process.env.API_BASE_URL ?? 'http://localhost:4000')
        : (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000');

    if (payload.restaurantId) {
      try {
        const res = await fetch(`${API_BASE}/api/ai/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            restaurantId: payload.restaurantId,
            message: payload.message,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.reply) {
            return { reply: data.reply };
          }
        }
      } catch (err) {
        console.warn('[aiService] Backend AI endpoint failed, using local assistant:', err);
      }
    }

    const localReply = buildAssistantReply(
      payload.message,
      getRestaurantItems(payload.restaurantId),
      []
    );
    return { reply: localReply };
  },

  async sendMessage(
    messages: AIChatMessage[],
    context?: ChatContext
  ): Promise<AIChatMessage> {
    const lastMessage =
      messages[
      messages.length - 1
      ];

    const userMessage =
      lastMessage?.content ?? '';

    const result = await this.chatWithAI({
      message: userMessage,
      restaurantId: context?.restaurantId,
      tableNumber: context?.tableNumber,
    });

    return {
      id:
        globalThis.crypto
          ?.randomUUID?.() ??
        Math.random()
          .toString(36)
          .slice(2),
      role: 'assistant',
      content: result.reply,
      timestamp:
        new Date().toISOString(),
    };
  },
};