export function formatPrice(price: string | null | undefined): string {
  if (!price) return "N/A";
  const numPrice = parseFloat(price);
  if (isNaN(numPrice) || numPrice === 0) return "N/A";
  return `$${numPrice.toFixed(2)}`;
}

export function calculateDiscount(
  sourcePrice: string | null | undefined,
  currentPrice: string | null | undefined
): string {
  if (!sourcePrice || !currentPrice) return "N/A";

  const source = parseFloat(sourcePrice);
  const current = parseFloat(currentPrice);

  if (isNaN(source) || isNaN(current) || source === 0) {
    return "N/A";
  }

  const discount = ((source - current) / source) * 100;
  return `${discount.toFixed(0)}%`;
}

export function formatDealMessage(
  deal: {
    discountPrice: string | null;
    sourcePrice: string | null;
    currentPrice: string | null;
    endTime: Date | null;
  },
  product: {
    brand: string;
    name: string | null;
    goodsImg: string | null;
  }
): string {
  const discountPrice = formatPrice(deal.discountPrice);
  const sourcePrice = formatPrice(deal.sourcePrice);
  const currentPrice = formatPrice(deal.currentPrice);
  const discountPercent = calculateDiscount(deal.sourcePrice, deal.currentPrice);

  const title = product.name ? `${product.brand} ${product.name}` : product.brand;
  let message = `🏷️ ${title}\n\n`;

  message += `💰 -${discountPrice}`;

  if (discountPercent !== "N/A") {
    message += `  (-${discountPercent})`;
  }

  if (sourcePrice !== "N/A" && sourcePrice !== "$0.00") {
    message += `\n💵 Original: ${sourcePrice}`;
  }

  if (currentPrice !== "N/A" && currentPrice !== "$0.00") {
    message += `\n📉 Current: ${currentPrice}`;
  }

  if (deal.endTime) {
    const endDate = new Date(deal.endTime);
    const now = new Date();
    const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const day = String(endDate.getDate()).padStart(2, "0");
    const month = String(endDate.getMonth() + 1).padStart(2, "0");
    const year = endDate.getFullYear();
    const formattedDate = `${day}-${month}-${year}`;

    if (daysLeft > 0) {
      message += `\n⏰ ${daysLeft} days left (${formattedDate})`;
    } else if (daysLeft === 0) {
      message += `\n⏰ Ends today (${formattedDate})`;
    }
  }

  return message;
}
