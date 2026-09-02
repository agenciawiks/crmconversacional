const SYSTEM_RESET_PREFIX = '[SYSTEM_RESET]';

const getMessageTimestamp = (message) => {
  const value = message?.timestamp || message?.created_at;
  const timestamp = value instanceof Date ? value.getTime() : new Date(value || 0).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};
const getMessageIdentity = (message, index) => {
  if (message?.id) return `id:${message.id}`;
  if (message?.whatsapp_msg_id) return `whatsapp:${message.whatsapp_msg_id}`;
  return `fallback:${message?.contact_id || ''}:${getMessageTimestamp(message)}:${message?.direction || message?.sender || ''}:${message?.content || message?.text || ''}:${index}`;
};

export const isVisibleChatMessage = (message) => {
  const content = message?.content ?? message?.text ?? '';
  return !String(content).startsWith(SYSTEM_RESET_PREFIX);
};

export const mergeMessageHistory = (historicalMessages = [], currentMessages = []) => {
  const merged = new Map();

  [...historicalMessages, ...currentMessages]
    .filter(isVisibleChatMessage)
    .forEach((message, index) => {
      merged.set(getMessageIdentity(message, index), message);
    });

  return [...merged.values()].sort((a, b) => getMessageTimestamp(a) - getMessageTimestamp(b));
};

export const latestCreatedAt = (messages = [], fallback = null) => {
  const timestamps = messages
    .map((message) => message?.created_at)
    .filter(Boolean)
    .map((value) => new Date(value))
    .filter((value) => Number.isFinite(value.getTime()))
    .sort((a, b) => b.getTime() - a.getTime());

  return timestamps[0]?.toISOString() || fallback;
};
