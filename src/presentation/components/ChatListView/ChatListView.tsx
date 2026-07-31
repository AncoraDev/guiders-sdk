import { chatIdSignal, isShowingChatListSignal, isCreatingChatSignal } from '../../signals';
import { chatSwitchRequestSignal, newChatRequestSignal } from '../../signals/actionState';
import { messagesSignal } from '../../signals/messagesState';
import {
    chatDetailSignal,
    presenceStatusSignal,
    assignedPresenceStatusSignal,
    lastKnownChatStatusSignal,
} from '../../signals/chatState';
import { LoadingIndicator } from '../ChatMessages/LoadingIndicator';
import { ChatListItem } from './ChatListItem';
import { useChatList } from '../../hooks/useChatList';
import { useCommercialPresenceSeed } from '../../hooks/useCommercialPresenceMap';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ChatListView() {
    const { chats, isLoading, error } = useChatList();
    const activeChatId = chatIdSignal.value;
    // Patch #27: prevent double-create while a previous request is in flight.
    const isCreating = isCreatingChatSignal.value;

    // Seed the commercial presence map via REST for any chat in the list whose
    // commercial isn't yet known. The WebSocket subscription that keeps the
    // map fresh in real-time is mounted at the ChatWidget root so it survives
    // navigations between list/chat views.
    useCommercialPresenceSeed({ chatIds: chats.map((c) => c.id) });

    const handleChatSwitch = (chatId: string) => {
        chatSwitchRequestSignal.value = chatId;
        isShowingChatListSignal.value = false;
    };

    const handleNewChat = () => {
        if (isCreating) return;
        // Reset messages and header synchronously BEFORE switching view so
        // the chat area never flashes stale content from the previous chat.
        messagesSignal.value = messagesSignal.value.filter(
            (m) => m.sender === 'system' || m.sender === 'consent',
        );
        if (chatDetailSignal.value) {
            chatDetailSignal.value = { ...chatDetailSignal.value, assignedCommercial: undefined };
        }
        presenceStatusSignal.value = 'offline';
        assignedPresenceStatusSignal.value = null;
        lastKnownChatStatusSignal.value = null;
        newChatRequestSignal.value = newChatRequestSignal.peek() + 1;
        isShowingChatListSignal.value = false;
    };

    return (
        <div class="guiders-chat-list-view">
            <div class="guiders-chat-list-container">
                {/* New conversation button — always on top */}
                <button
                    class="guiders-chat-list-new-chat"
                    type="button"
                    onClick={handleNewChat}
                    disabled={isCreating}
                    aria-busy={isCreating ? 'true' : 'false'}
                >
                    <div class="guiders-chat-list-new-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                    </div>
                    <span class="guiders-chat-list-new-text">
                        {isCreating ? 'Creando…' : 'Nueva conversación'}
                    </span>
                </button>

                {isLoading && (
                    <div class="guiders-chat-list-loading">
                        <LoadingIndicator />
                    </div>
                )}

                {!isLoading && error && (
                    <p class="guiders-chat-list-error">{error}</p>
                )}

                {!isLoading && !error && chats.length === 0 && (
                    <p class="guiders-chat-list-empty">No hay conversaciones anteriores</p>
                )}

                {!isLoading && chats.map((chat) => (
                    <ChatListItem
                        key={chat.id}
                        chat={chat}
                        isSelected={chat.id === activeChatId}
                        onClick={() => handleChatSwitch(chat.id)}
                    />
                ))}
            </div>
        </div>
    );
}
