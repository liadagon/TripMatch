export const BOOST_PROMO_SNOOZE_KEY = "boostPromoSnoozeUntil";
export const BOOST_PROMO_SNOOZE_MS = 24 * 60 * 60 * 1000;

export function getBoostPromoSnoozeUntil(storage: Storage = localStorage) {
  const storedValue = Number(storage.getItem(BOOST_PROMO_SNOOZE_KEY));
  return Number.isFinite(storedValue) && storedValue > 0 ? storedValue : 0;
}

export function isBoostPromoSnoozed(
  now = Date.now(),
  storage: Storage = localStorage,
) {
  return getBoostPromoSnoozeUntil(storage) > now;
}

export function snoozeBoostPromo(
  now = Date.now(),
  storage: Storage = localStorage,
) {
  const snoozeUntil = now + BOOST_PROMO_SNOOZE_MS;
  storage.setItem(BOOST_PROMO_SNOOZE_KEY, String(snoozeUntil));
  return snoozeUntil;
}

export function clearBoostPromoSnooze(storage: Storage = localStorage) {
  storage.removeItem(BOOST_PROMO_SNOOZE_KEY);
}
