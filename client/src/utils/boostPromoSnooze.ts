export const BOOST_PROMO_SNOOZE_KEY = "boostPromoSnoozeUntil";
export const BOOST_PROMO_SNOOZE_MS = 24 * 60 * 60 * 1000;

/** Returns the stored timestamp until which the Boost prompt is hidden. */
export function getBoostPromoSnoozeUntil(storage: Storage = localStorage) {
  const storedValue = Number(storage.getItem(BOOST_PROMO_SNOOZE_KEY));
  return Number.isFinite(storedValue) && storedValue > 0 ? storedValue : 0;
}

/** Indicates whether the Boost prompt remains snoozed at a given time. */
export function isBoostPromoSnoozed(
  now = Date.now(),
  storage: Storage = localStorage,
) {
  return getBoostPromoSnoozeUntil(storage) > now;
}

/** Persists a new Boost-prompt snooze window and returns its expiry. */
export function snoozeBoostPromo(
  now = Date.now(),
  storage: Storage = localStorage,
) {
  const snoozeUntil = now + BOOST_PROMO_SNOOZE_MS;
  storage.setItem(BOOST_PROMO_SNOOZE_KEY, String(snoozeUntil));
  return snoozeUntil;
}

/** Removes the account-independent Boost-prompt snooze value. */
export function clearBoostPromoSnooze(storage: Storage = localStorage) {
  storage.removeItem(BOOST_PROMO_SNOOZE_KEY);
}
