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
};

const initialState: ConversationsState = {
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
};

function getRequestError(error: unknown): ConversationRequestError {
  return {
    message:
      error instanceof Error ? error.message : "Conversation request failed",
    ...(axios.isAxiosError(error) && typeof error.response?.status === "number"
      ? { status: error.response.status }
      : {}),
  };
}

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
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchRealConversations.pending, (state) => {
        state.listStatus = "loading";
        state.listError = null;
        state.summaries = [];
      })
      .addCase(fetchRealConversations.fulfilled, (state, action) => {
        state.listStatus = "succeeded";
        state.summaries = action.payload;
      })
      .addCase(fetchRealConversations.rejected, (state, action) => {
        state.listStatus = "failed";
        state.listError =
          action.payload?.message || action.error.message || "Request failed";
      })
      .addCase(fetchRealConversation.pending, (state, action) => {
        state.activeStatus = "loading";
        state.activeError = null;
        state.activeConversation = null;
        state.activeConversationId = action.meta.arg.conversationId;
      })
      .addCase(fetchRealConversation.fulfilled, (state, action) => {
        if (state.activeConversationId !== action.meta.arg.conversationId) {
          return;
        }

        state.activeStatus = "succeeded";
        state.activeConversation = action.payload;
      })
      .addCase(fetchRealConversation.rejected, (state, action) => {
        if (state.activeConversationId !== action.meta.arg.conversationId) {
          return;
        }

        state.activeStatus = "failed";
        state.activeError =
          action.payload?.message || action.error.message || "Request failed";
      })
      .addCase(sendRealMessage.pending, (state) => {
        state.sendStatus = "loading";
        state.sendError = null;
      })
      .addCase(sendRealMessage.fulfilled, (state, action) => {
        state.sendStatus = "succeeded";

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
        state.sendStatus = "failed";
        state.sendError =
          action.payload?.message || action.error.message || "Request failed";
      })
      .addCase(clearRealConversation.pending, (state) => {
        state.clearStatus = "loading";
        state.clearError = null;
      })
      .addCase(clearRealConversation.fulfilled, (state, action) => {
        state.clearStatus = "succeeded";
        state.summaries = state.summaries.filter(
          (conversation) => conversation._id !== action.payload.conversationId,
        );

        if (state.activeConversation?._id === action.payload.conversationId) {
          state.activeConversation = null;
          state.activeConversationId = null;
        }
      })
      .addCase(clearRealConversation.rejected, (state, action) => {
        state.clearStatus = "failed";
        state.clearError =
          action.payload?.message || action.error.message || "Request failed";
      });
  },
});

export default conversationsSlice.reducer;
