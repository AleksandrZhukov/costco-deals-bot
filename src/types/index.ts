export * from "./yepApi.js";
export * from "./logging.js";

// Deal Types for user preferences
export const DEAL_TYPES = [
  { id: 4, name: "Food", emoji: "🍔" },
  { id: 5, name: "Clothing", emoji: "👕" },
  { id: 6, name: "Non-Food", emoji: "📦" },
] as const;

export type DealTypeId = typeof DEAL_TYPES[number]['id'];
