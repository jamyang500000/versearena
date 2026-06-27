export const COIN_PACKAGES = [
  {
    id: "coins_50",
    coins: 50,
    priceUsd: 0.99,
    label: "Starter",
    emoji: "⚡",
    highlight: false,
    description: "Perfect to try gifting",
  },
  {
    id: "coins_200",
    coins: 200,
    priceUsd: 2.99,
    label: "Fan Pack",
    emoji: "🎤",
    highlight: false,
    description: "Save 25% vs starter",
    badge: "25% OFF",
  },
  {
    id: "coins_500",
    coins: 500,
    priceUsd: 5.99,
    label: "Supporter",
    emoji: "👑",
    highlight: true,
    description: "Most popular choice",
    badge: "POPULAR",
  },
  {
    id: "coins_1200",
    coins: 1200,
    priceUsd: 9.99,
    label: "Ride or Die",
    emoji: "🏆",
    highlight: false,
    description: "Best value — save 58%",
    badge: "BEST VALUE",
  },
] as const;

export type CoinPackageId = (typeof COIN_PACKAGES)[number]["id"];
