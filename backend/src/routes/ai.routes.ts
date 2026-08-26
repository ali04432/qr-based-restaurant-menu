import { Router, Request, Response } from "express";
import { prisma } from "../server";

const router = Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

// --- Helper: call Gemini API ---
async function callGemini(systemPrompt: string, userMessage: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured in .env");
  }

  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: `${systemPrompt}\n\nUser: ${userMessage}` }],
      },
    ],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 512,
    },
  };

  const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errText}`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };

  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "Sorry, I couldn't generate a response.";
}

// --- Helper: build menu context string ---
async function getMenuContext(restaurantId: string): Promise<string> {
  const items = await prisma.menuItem.findMany({
    where: { restaurantId, isAvailable: true },
    select: {
      id: true,
      name: true,
      description: true,
      category: true,
      price: true,
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  const grouped = items.reduce((acc: Record<string, typeof items>, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  let context = "MENU:\n";
  for (const [cat, catItems] of Object.entries(grouped)) {
    context += `\n[${cat}]\n`;
    for (const item of catItems) {
      context += `- ${item.name} (ID: ${item.id}) | Rs.${item.price} | ${item.description ?? "No description"}\n`;
    }
  }
  return context;
}

/**
 * POST /api/ai/search
 * Natural language search over menu items.
 * Body: { restaurantId: string, query: string }
 * Returns: { matchedIds: string[], explanation: string }
 */
router.post("/search", async (req: Request, res: Response): Promise<void> => {
  const { restaurantId, query } = req.body;

  if (!restaurantId || !query) {
    res.status(400).json({ error: "Missing restaurantId or query" });
    return;
  }

  try {
    const menuContext = await getMenuContext(restaurantId);

    const systemPrompt = `You are a helpful restaurant menu assistant. Given the restaurant's menu below, find items that match the customer's search query.

${menuContext}

Instructions:
- Return a JSON object with: { "matchedIds": ["id1","id2",...], "explanation": "brief reason" }
- Match semantically (e.g. "spicy food" → items with spicy descriptions, "vegetarian" → non-meat items)
- Return up to 6 best matches
- If no matches, return { "matchedIds": [], "explanation": "No matching items found" }
- Return ONLY valid JSON, no markdown, no extra text`;

    const raw = await callGemini(systemPrompt, query);

    // Parse JSON from Gemini response
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      res.json({ matchedIds: [], explanation: "Could not parse AI response" });
      return;
    }
    const parsed = JSON.parse(jsonMatch[0]) as { matchedIds: string[]; explanation: string };
    res.json(parsed);
  } catch (err) {
    console.error("POST /api/ai/search error:", err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * POST /api/ai/suggest
 * Suggest 1-2 complementary items when a customer adds an item to cart.
 * Body: { restaurantId: string, cartItemId: string }
 * Returns: { suggestions: [{ id, name, price, reason }] }
 */
router.post("/suggest", async (req: Request, res: Response): Promise<void> => {
  const { restaurantId, cartItemId } = req.body;

  if (!restaurantId || !cartItemId) {
    res.status(400).json({ error: "Missing restaurantId or cartItemId" });
    return;
  }

  try {
    const cartItem = await prisma.menuItem.findFirst({
      where: { id: cartItemId, restaurantId },
      select: { name: true, category: true, description: true },
    });

    if (!cartItem) {
      res.json({ suggestions: [] });
      return;
    }

    const menuContext = await getMenuContext(restaurantId);

    const systemPrompt = `You are a helpful restaurant upsell assistant. The customer just added "${cartItem.name}" (${cartItem.category}) to their cart.

${menuContext}

Instructions:
- Suggest 1-2 complementary items from the menu that pair well with "${cartItem.name}"
- Do NOT suggest the same item or items in the same category unless it makes sense (e.g., drinks always pair well)
- Prefer suggesting drinks or desserts if not already in cart category
- Return JSON: { "suggestions": [{ "id": "...", "name": "...", "price": 0, "reason": "brief pairing reason" }] }
- Return ONLY valid JSON, no markdown`;

    const raw = await callGemini(systemPrompt, `What pairs well with ${cartItem.name}?`);

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      res.json({ suggestions: [] });
      return;
    }
    const parsed = JSON.parse(jsonMatch[0]) as {
      suggestions: { id: string; name: string; price: number; reason: string }[];
    };
    res.json(parsed);
  } catch (err) {
    console.error("POST /api/ai/suggest error:", err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * POST /api/ai/chat
 * Menu chatbot — answers questions about menu items using menu as context.
 * Body: { restaurantId: string, message: string, history?: { role: "user"|"ai", text: string }[] }
 * Returns: { reply: string }
 */
router.post("/chat", async (req: Request, res: Response): Promise<void> => {
  const { restaurantId, message, history = [] } = req.body;

  if (!restaurantId || !message) {
    res.status(400).json({ error: "Missing restaurantId or message" });
    return;
  }

  try {
    const menuContext = await getMenuContext(restaurantId);

    const historyText =
      history.length > 0
        ? "\n\nPrevious conversation:\n" +
          history
            .slice(-6) // only last 6 exchanges to save tokens
            .map((h: { role: string; text: string }) => `${h.role === "user" ? "Customer" : "Assistant"}: ${h.text}`)
            .join("\n")
        : "";

    const systemPrompt = `You are a friendly restaurant assistant chatbot. Answer questions about the menu ONLY using the information provided below. Be concise and helpful.

${menuContext}${historyText}

Rules:
- Only answer questions about menu items (ingredients, price, spice level, description, availability)
- If asked about something not on the menu, politely say you don't have that information
- Keep replies short (2-3 sentences max)
- Be warm and friendly
- Do NOT make up ingredients or details not mentioned in the menu`;

    const reply = await callGemini(systemPrompt, message);
    res.json({ reply });
  } catch (err) {
    console.error("POST /api/ai/chat error:", err);
    res.status(500).json({ error: String(err) });
  }
});

export default router;
