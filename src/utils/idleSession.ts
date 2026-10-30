export const IDLE_TIMEOUT_MS = 2 * 60 * 1000;
export const LAST_ACTIVITY_KEY = 'enako_cash_last_activity';

export function beginCashSession() {
  localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
}

// Persist the deadline across reloads and share activity/logout between tabs.
export function watchCashInactivity(onExpire: () => void): () => void {
  let lastActivity = Number(localStorage.getItem(LAST_ACTIVITY_KEY)) || Date.now();
  let lastSaved = 0;
  let timer: ReturnType<typeof setTimeout>;
  let stopped = false;
  const events = ['pointerdown', 'pointermove', 'keydown', 'touchstart', 'wheel'];

  const stop = () => {
    stopped = true;
    clearTimeout(timer);
    events.forEach(event => window.removeEventListener(event, activity, true));
    window.removeEventListener('focus', check);
    window.removeEventListener('storage', sync);
    document.removeEventListener('visibilitychange', check);
  };
  const expire = () => {
    stop();
    onExpire();
  };
  const check = () => {
    if (stopped) return;
    clearTimeout(timer);
    const saved = Number(localStorage.getItem(LAST_ACTIVITY_KEY));
    if (saved > lastActivity) lastActivity = saved;
    const remaining = IDLE_TIMEOUT_MS - (Date.now() - lastActivity);
    if (remaining <= 0) expire();
    else timer = setTimeout(check, remaining);
  };
  const activity = () => {
    if (stopped) return;
    // A suspended tab must expire before a returning user's first input.
    check();
    if (stopped || document.hidden) return;
    lastActivity = Date.now();
    if (lastActivity - lastSaved >= 1000) {
      localStorage.setItem(LAST_ACTIVITY_KEY, String(lastActivity));
      lastSaved = lastActivity;
    }
    check();
  };
  const sync = (event: StorageEvent) => {
    if (event.storageArea !== localStorage) return;
    if (event.key === LAST_ACTIVITY_KEY && event.newValue === null) expire();
    else if (event.key === LAST_ACTIVITY_KEY) check();
  };

  if (!localStorage.getItem(LAST_ACTIVITY_KEY)) beginCashSession();
  events.forEach(event => window.addEventListener(event, activity, { capture: true, passive: true }));
  window.addEventListener('focus', check);
  window.addEventListener('storage', sync);
  document.addEventListener('visibilitychange', check);
  check();
  return stop;
}
