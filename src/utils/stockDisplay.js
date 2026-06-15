export const getExpiryBatches = (stock) => {
  if (!stock) return [];

  const batches = (stock.expiryBatches || []).filter(
    b => b.expiry && ((Number(b.available) || 0) > 0 || (Number(b.breakage) || 0) > 0)
  );

  if (batches.length > 0) {
    return [...batches].sort((a, b) => new Date(a.expiry) - new Date(b.expiry));
  }

  if (stock.expiry && ((Number(stock.available) || 0) > 0 || (Number(stock.breakage) || 0) > 0)) {
    return [{
      expiry: stock.expiry,
      available: stock.available || 0,
      breakage: stock.breakage || 0
    }];
  }

  return [];
};

export const formatExpiryDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-GB");
};

export const isExpiryPast = (date) => {
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(date);
  expiry.setHours(0, 0, 0, 0);
  return expiry < today;
};
