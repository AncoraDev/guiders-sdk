/**
 * Hooks barrel.
 *
 * Patch #27 (Chunk 2): completed the barrel so all presentation hooks are
 * importable from `'../hooks'`. Previously only `useScrollToBottom` was
 * exported, which produced confusing "no exported member" errors when
 * consumers tried to import other hooks from the same path.
 */
export { useScrollToBottom } from './useScrollToBottom';
export { usePagination } from './usePagination';
export type { UsePaginationResult } from './usePagination';
export { usePresence } from './usePresence';
export { useTypingIndicator } from './useTypingIndicator';
export { useCommercialPresenceMap, useCommercialPresenceWebSocket, useCommercialPresenceSeed } from './useCommercialPresenceMap';
export type { UseCommercialPresenceMapOptions, UseCommercialPresenceSeedOptions } from './useCommercialPresenceMap';
