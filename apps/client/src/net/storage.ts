// Browser storage for the anonymous account token and the reconnection ticket.
// Wrapped in try/catch: storage can be unavailable (private mode, blocked site data).

const TOKEN_KEY = 'elemental.token';
const RECONNECT_KEY = 'elemental.reconnect';

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // storage unavailable: the player just redeems/joins again next time
  }
}

export const loadToken = () => read(TOKEN_KEY);
export const saveToken = (token: string | null) => write(TOKEN_KEY, token);
export const loadReconnection = () => read(RECONNECT_KEY);
export const saveReconnection = (ticket: string | null) => write(RECONNECT_KEY, ticket);
