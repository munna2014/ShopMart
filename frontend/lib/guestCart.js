const GUEST_CART_KEY = "guest_cart";

const normalizePrice = (price) => {
  if (typeof price === "number") return price;
  if (typeof price === "string") {
    const parsed = Number(price.replace(/[^0-9.]/g, ""));
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

const normalizeItem = (item) => ({
  id: Number(item.id),
  name: item.name || "",
  price: normalizePrice(item.price),
  image: item.image || "/images/default-product.svg",
  quantity: Number(item.quantity || 0),
});

export const getGuestCart = () => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeItem).filter((item) => item.id && item.quantity);
  } catch (error) {
    console.error("Failed to read guest cart:", error);
    return [];
  }
};

export const setGuestCart = (items) => {
  if (typeof window === "undefined") return;
  try {
    const sanitized = Array.isArray(items) ? items.map(normalizeItem) : [];
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(sanitized));
  } catch (error) {
    console.error("Failed to write guest cart:", error);
  }
};

export const addGuestItem = (product, quantity = 1) => {
  const items = getGuestCart();
  const productId = Number(product.id);
  const existing = items.find((item) => item.id === productId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    items.push(
      normalizeItem({
        id: productId,
        name: product.name,
        price: normalizePrice(product.price),
        image: product.image || product.image_url,
        quantity,
      })
    );
  }
  setGuestCart(items);
  return items;
};

export const updateGuestItem = (productId, quantity) => {
  const items = getGuestCart();
  const normalizedId = Number(productId);
  const updated = items
    .map((item) =>
      item.id === normalizedId ? { ...item, quantity, id: normalizedId } : item
    )
    .filter((item) => item.quantity > 0);
  setGuestCart(updated);
  return updated;
};

export const clearGuestCart = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(GUEST_CART_KEY);
};

export const getGuestCartCount = () =>
  getGuestCart().reduce((sum, item) => sum + (item.quantity || 0), 0);

export const mergeGuestCartToServer = async (api) => {
  const items = getGuestCart();
  if (!items.length) return;
  for (const item of items) {
    await api.post("/cart/items", {
      product_id: item.id,
      quantity: item.quantity,
    });
  }
  clearGuestCart();
};
