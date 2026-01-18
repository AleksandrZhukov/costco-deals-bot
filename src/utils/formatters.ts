export function formatPrice(price: string | null | undefined): string {
  if (!price) return "N/A";
  const numPrice = parseFloat(price);
  if (isNaN(numPrice)) return price;
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

  let message = `🏷️ ${product.brand}\n`;

  if (product.name) {
    message += `${product.name}\n`;
  }

  message += `\n💰 ${discountPrice}`;

  if (sourcePrice !== "N/A") {
    message += `\n💵 Original: ${sourcePrice}`;
  }

  if (currentPrice !== "N/A" && sourcePrice !== "N/A") {
    const sourceNum = parseFloat(deal.sourcePrice || "0");
    const currentNum = parseFloat(deal.currentPrice || "0");
    if (!isNaN(sourceNum) && !isNaN(currentNum) && sourceNum > currentNum) {
      const saving = (sourceNum - currentNum).toFixed(2);
      message += `\n📉 Save $${saving}`;
    }
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
      message += `\n⏰ ${daysLeft} day${daysLeft > 1 ? "s" : ""} left (${formattedDate})`;
    } else if (daysLeft === 0) {
      message += `\n⏰ Ends today (${formattedDate})`;
    }
  }

  return message;
}
