const roundToCents = (value) => Math.round(value * 100) / 100;

export const parsePriceValue = (value) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  const cleaned = String(value).replace(/[^0-9.-]/g, "");
  const parsed = Number(cleaned);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const isDiscountActive = (product, now = new Date()) => {
  if (!product) return false;
  if (product.discount_active === true) return true;

  const percent = Number(product.discount_percent ?? 0);
  if (!percent) return false;

  const startsAt = product.discount_starts_at
    ? new Date(product.discount_starts_at)
    : null;
  const endsAt = product.discount_ends_at
    ? new Date(product.discount_ends_at)
    : null;

  if (startsAt && now < startsAt) return false;
  if (endsAt && now > endsAt) return false;
  return true;
};

export const getPricing = (product) => {
  const basePrice = parsePriceValue(
    product?.price_value ?? product?.price ?? product?.unit_price
  );
  const discountPercent = Number(product?.discount_percent ?? 0);
  const active = isDiscountActive(product) && discountPercent > 0;
  const discountedPrice = product?.discounted_price !== undefined && product?.discounted_price !== null
    ? parsePriceValue(product.discounted_price)
    : roundToCents(basePrice * (1 - discountPercent / 100));

  const effectivePrice =
    active && discountedPrice < basePrice ? discountedPrice : basePrice;

  return {
    basePrice,
    discountedPrice: effectivePrice,
    discountPercent: active ? discountPercent : 0,
    discountActive: active,
  };
};
