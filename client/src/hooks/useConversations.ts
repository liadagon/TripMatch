import { useDispatch, useSelector } from "react-redux";
import {
  clearRealConversation,
  fetchRealConversation,
  fetchRealConversations,
  sendRealMessage,
} from "../store/conversationsSlice";
import type { AppDispatch, RootState } from "../store/store";

const realConversationActions = {
  fetchList: fetchRealConversations,
  open: fetchRealConversation,
  send: sendRealMessage,
  clear: clearRealConversation,
};

export default function useConversations() {
  const dispatch = useDispatch<AppDispatch>();
  const conversationState = useSelector(
    (state: RootState) => state.conversations,
  );

  return {
    ...conversationState,
    dispatch,
    actions: realConversationActions,
  };
}
