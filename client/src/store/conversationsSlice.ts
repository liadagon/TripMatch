import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import {
  clearConversation as clearConversationRequest,
  getConversations,
  getMessages,
  sendMessage as sendMessageRequest,
  type ConversationDetails,
  type ConversationSummary,
  type MessageRecord,
} from "../services/conversationService";
import { getConversationById } from "../data/conversations";

type RequestStatus = "idle" | "loading" | "succeeded" | "failed";

type ConversationIdArgument = {
  conversationId: string;
};

type SendMessageArgument = ConversationIdArgument & {
  text: string;
};

type SentMessageResult = ConversationIdArgument & {
  message: MessageRecord;
};

export type ConversationRequestError = {
  message: string;
  status?: number;
};

type ConversationsState = {
  summaries: ConversationSummary[];
  activeConversation: ConversationDetails | null;
  activeConversationId: string | null;
  listStatus: RequestStatus;
  activeStatus: RequestStatus;
  sendStatus: RequestStatus;
  clearStatus: RequestStatus;
  listError: string | null;
  activeError: string | null;
  sendError: string | null;
  clearError: string | null;
  listRequestId: string | null;
  activeRequestId: string | null;
  sendRequestId: string | null;
  clearRequestId: string | null;
};

/** Creates a fresh account-scoped conversation state for login and logout resets. */
const createInitialState = (): ConversationsState => ({
  summaries: [],
  activeConversation: null,
  activeConversationId: null,
  listStatus: "idle",
  activeStatus: "idle",
  sendStatus: "idle",
  clearStatus: "idle",
  listError: null,
  activeError: null,
  sendError: null,
  clearError: null,
  listRequestId: null,
  activeRequestId: null,
  sendRequestId: null,
  clearRequestId: null,
});

const initialState = createInitialState();

/** Preserves a safe message and optional HTTP status from a failed request. */
function getRequestError(error: unknown): ConversationRequestError {
  return {
    message:
      error instanceof Error ? error.message : "Conversation request failed",
    ...(axios.isAxiosError(error) && typeof error.response?.status === "number"
      ? { status: error.response.status }
      : {}),
  };
}

/** Indicates whether a rejected thunk value has the expected safe error shape. */
export function isConversationRequestError(
  error: unknown,
): error is ConversationRequestError {
  if (typeof error !== "object" || error === null || !("message" in error)) {
    return false;
  }

  return (
    typeof error.message === "string" &&
    (!("status" in error) || typeof error.status === "number")
  );
}

/** Prevents real-API thunks from handling local demo conversations. */
function isRealConversation({ conversationId }: ConversationIdArgument) {
  return !getConversationById(conversationId);
}

export const fetchRealConversations = createAsyncThunk<
  ConversationSummary[],
  void,
  { rejectValue: ConversationRequestError }
>("conversations/fetchAll", async (_, { rejectWithValue }) => {
  try {
    return await getConversations();
  } catch (error) {
    return rejectWithValue(getRequestError(error));
  }
});

export const fetchRealConversation = createAsyncThunk<
  ConversationDetails,
  ConversationIdArgument,
  { rejectValue: ConversationRequestError }
>(
  "conversations/fetchOne",
  async ({ conversationId }, { rejectWithValue }) => {
    try {
      return await getMessages(conversationId);
    } catch (error) {
      return rejectWithValue(getRequestError(error));
    }
  },
  { condition: isRealConversation },
);

export const sendRealMessage = createAsyncThunk<
  SentMessageResult,
  SendMessageArgument,
  { rejectValue: ConversationRequestError }
>(
  "conversations/sendMessage",
  async ({ conversationId, text }, { rejectWithValue }) => {
    try {
      const message = await sendMessageRequest(conversationId, text);
      return { conversationId, message };
    } catch (error) {
      return rejectWithValue(getRequestError(error));
    }
  },
  { condition: isRealConversation },
);

export const clearRealConversation = createAsyncThunk<
  ConversationIdArgument,
  ConversationIdArgument,
  { rejectValue: ConversationRequestError }
>(
  "conversations/clear",
  async ({ conversationId }, { rejectWithValue }) => {
    try {
      await clearConversationRequest(conversationId);
      return { conversationId };
    } catch (error) {
      return rejectWithValue(getRequestError(error));
    }
  },
  { condition: isRealConversation },
);

const conversationsSlice = createSlice({
  name: "conversations",
  initialState,
  reducers: {
    resetConversations: () => createInitialState(),
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRealConversations.pending, (state, action) => {
        state.listStatus = "loading";
        state.listError = null;
        state.summaries = [];
        state.listRequestId = action.meta.requestId;
      })
      .addCase(fetchRealConversations.fulfilled, (state, action) => {
        if (state.listRequestId !== action.meta.requestId) return;
        state.listStatus = "succeeded";
        state.summaries = action.payload;
        state.listRequestId = null;
      })
      .addCase(fetchRealConversations.rejected, (state, action) => {
        if (state.listRequestId !== action.meta.requestId) return;
        state.listStatus = "failed";
        state.listError =
          action.payload?.message || action.error.message || "Request failed";
        state.listRequestId = null;
      })
      .addCase(fetchRealConversation.pending, (state, action) => {
        state.activeStatus = "loading";
        state.activeError = null;
        state.activeConversation = null;
        state.activeConversationId = action.meta.arg.conversationId;
        state.activeRequestId = action.meta.requestId;
      })
      .addCase(fetchRealConversation.fulfilled, (state, action) => {
        if (
          state.activeRequestId !== action.meta.requestId ||
          state.activeConversationId !== action.meta.arg.conversationId
        ) {
          return;
        }

        state.activeStatus = "succeeded";
        state.activeConversation = action.payload;
        state.activeRequestId = null;
      })
      .addCase(fetchRealConversation.rejected, (state, action) => {
        if (
          state.activeRequestId !== action.meta.requestId ||
          state.activeConversationId !== action.meta.arg.conversationId
        ) {
          return;
        }

        state.activeStatus = "failed";
        state.activeError =
          action.payload?.message || action.error.message || "Request failed";
        state.activeRequestId = null;
      })
      .addCase(sendRealMessage.pending, (state, action) => {
        state.sendStatus = "loading";
        state.sendError = null;
        state.sendRequestId = action.meta.requestId;
      })
      .addCase(sendRealMessage.fulfilled, (state, action) => {
        if (state.sendRequestId !== action.meta.requestId) return;
        state.sendStatus = "succeeded";
        state.sendRequestId = null;

        if (state.activeConversation?._id === action.payload.conversationId) {
          state.activeConversation.messages.push(action.payload.message);
        }

        const summaryIndex = state.summaries.findIndex(
          (conversation) => conversation._id === action.payload.conversationId,
        );

        if (summaryIndex >= 0) {
          const [updatedSummary] = state.summaries.splice(summaryIndex, 1);
          updatedSummary.lastMessage = action.payload.message;
          updatedSummary.updatedAt = action.payload.message.updatedAt;
          state.summaries.unshift(updatedSummary);
        }
      })
      .addCase(sendRealMessage.rejected, (state, action) => {
        if (state.sendRequestId !== action.meta.requestId) return;
        state.sendStatus = "failed";
        state.sendError =
          action.payload?.message || action.error.message || "Request failed";
        state.sendRequestId = null;
      })
      .addCase(clearRealConversation.pending, (state, action) => {
        state.clearStatus = "loading";
        state.clearError = null;
        state.clearRequestId = action.meta.requestId;
      })
      .addCase(clearRealConversation.fulfilled, (state, action) => {
        if (state.clearRequestId !== action.meta.requestId) return;
        state.clearStatus = "succeeded";
        state.clearRequestId = null;
        state.summaries = state.summaries.filter(
          (conversation) => conversation._id !== action.payload.conversationId,
        );

        if (state.activeConversation?._id === action.payload.conversationId) {
          state.activeConversation = null;
          state.activeConversationId = null;
        }
      })
      .addCase(clearRealConversation.rejected, (state, action) => {
        if (state.clearRequestId !== action.meta.requestId) return;
        state.clearStatus = "failed";
        state.clearError =
          action.payload?.message || action.error.message || "Request failed";
        state.clearRequestId = null;
      });
  },
});

export const { resetConversations } = conversationsSlice.actions;
export default conversationsSlice.reducer;
