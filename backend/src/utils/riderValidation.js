export const hasValue = (value) => value !== undefined && value !== null && String(value).trim() !== '';

export const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());

export const isFloatInRange = (value, min, max) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max;
};

export const validationError = (res, message, errors = []) =>
  res.status(400).json({
    success: false,
    message,
    ...(errors.length ? { errors } : {}),
  });

