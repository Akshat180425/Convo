import { useEffect, useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { AtSign, FileText, Image, Loader2, Mic, Pencil, Send, Sparkles, Square, X } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import toast from "react-hot-toast";
import { formatFileSize } from "../lib/utils";

const MAX_DOCUMENT_SIZE = 6 * 1024 * 1024;
const DOCUMENT_ACCEPT =
  ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.zip,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/csv,application/zip";

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [audioPreview, setAudioPreview] = useState(null);
  const [documentPreview, setDocumentPreview] = useState(null);
  const [selectedMentions, setSelectedMentions] = useState([]);
  const [mentionQuery, setMentionQuery] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const fileInputRef = useRef(null);
  const documentInputRef = useRef(null);
  const messageInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioStreamRef = useRef(null);
  const { authUser } = useAuthStore();
  const {
    clearEditingMessage,
    clearReplyingTo,
    clearReplySuggestions,
    editMessage,
    editingMessage,
    getReplySuggestions,
    isAiAssistantResponding,
    isSuggestionsLoading,
    replyingTo,
    sendMessage,
    selectedUser,
    suggestions,
  } = useChatStore();

  const isGroup = selectedUser?.isGroup;
  const isAiAssistant = Boolean(selectedUser?.isAiAssistant);
  const groupMentionMembers = isGroup
    ? (selectedUser?.members || []).filter((member) => member?._id !== authUser?._id)
    : [];
  const mentionSuggestions =
    mentionQuery === null
      ? []
      : groupMentionMembers
          .filter((member) =>
            member.fullName?.toLowerCase().includes(mentionQuery.toLowerCase())
          )
          .slice(0, 6);
  const isBlocked = !isGroup && (selectedUser?.blockedByMe || selectedUser?.hasBlockedMe);
  const blockedMessage = selectedUser?.blockedByMe
    ? "You blocked this user. Unblock them to send messages."
    : "This user is unavailable for messaging.";

  const clearAttachmentInputs = () => {
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (documentInputRef.current) documentInputRef.current.value = "";
  };

  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.text || "");
      setImagePreview(null);
      setAudioPreview(null);
      setDocumentPreview(null);
      setSelectedMentions([]);
      setMentionQuery(null);
      clearAttachmentInputs();
    }
  }, [editingMessage]);

  useEffect(() => {
    setSelectedMentions([]);
    setMentionQuery(null);
  }, [selectedUser?._id]);

  useEffect(() => {
    return () => {
      audioStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    const handleDroppedFile = (event) => {
      processAttachmentFile(event.detail?.file, { source: "drop" });
    };

    window.addEventListener("convo:chat-file-drop", handleDroppedFile);
    return () => window.removeEventListener("convo:chat-file-drop", handleDroppedFile);
  });

  const updateMentionQuery = (value, cursorPosition = value.length) => {
    if (!isGroup || editingMessage || isAiAssistant) {
      setMentionQuery(null);
      return;
    }

    const textBeforeCursor = value.slice(0, cursorPosition);
    const match = textBeforeCursor.match(/(?:^|\s)@([^\s@]*)$/);
    setMentionQuery(match ? match[1] : null);
  };

  const handleTextChange = (e) => {
    const nextText = e.target.value;
    setText(nextText);
    updateMentionQuery(nextText, e.target.selectionStart ?? nextText.length);

    if (selectedMentions.length) {
      setSelectedMentions((mentions) =>
        mentions.filter((mention) => nextText.includes(`@${mention.name}`))
      );
    }
  };

  const selectMention = (member) => {
    const input = messageInputRef.current;
    const cursorPosition = input?.selectionStart ?? text.length;
    const beforeCursor = text.slice(0, cursorPosition);
    const afterCursor = text.slice(cursorPosition);
    const match = beforeCursor.match(/(?:^|\s)@([^\s@]*)$/);
    const tokenStart = match ? beforeCursor.length - match[0].trimStart().length : beforeCursor.length;
    const hasLeadingSpace = tokenStart > 0 && !/\s$/.test(text.slice(0, tokenStart));
    const mentionText = `${hasLeadingSpace ? " " : ""}@${member.fullName} `;
    const nextText = `${text.slice(0, tokenStart)}${mentionText}${afterCursor}`;

    setText(nextText);
    setMentionQuery(null);
    setSelectedMentions((mentions) => {
      if (mentions.some((mention) => mention.userId === member._id)) return mentions;
      return [...mentions, { userId: member._id, name: member.fullName }];
    });

    window.setTimeout(() => {
      const nextCursor = tokenStart + mentionText.length;
      input?.focus();
      input?.setSelectionRange(nextCursor, nextCursor);
    }, 0);
  };

  const processAttachmentFile = (file, { source = "picker" } = {}) => {
    if (isSendingMessage) return;
    if (!file) return;

    if (isBlocked) {
      toast.error("You cannot attach files in this chat");
      return;
    }

    if (editingMessage) {
      toast.error("Finish editing before attaching a file");
      return;
    }

    if (isRecording) {
      toast.error("Stop recording before attaching a file");
      return;
    }

    if (isAiAssistant) {
      toast.error("Attachments are not available in Convo AI chat");
      return;
    }

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        setDocumentPreview(null);
        setAudioPreview(null);
        if (documentInputRef.current) documentInputRef.current.value = "";
      };
      reader.readAsDataURL(file);
      return;
    }

    if (file.size > MAX_DOCUMENT_SIZE) {
      toast.error("File must be 6 MB or smaller");
      clearAttachmentInputs();
      return;
    }

    if (file.type.startsWith("audio/") || file.type.startsWith("video/")) {
      toast.error("Drop an image or document file");
      clearAttachmentInputs();
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setDocumentPreview({
        data: reader.result,
        name: file.name,
        size: file.size,
        type: file.type || "application/octet-stream",
      });
      setImagePreview(null);
      setAudioPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsDataURL(file);

    if (source === "drop") {
      toast.success("File ready to send");
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    processAttachmentFile(file);
  };

  const handleDocumentChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type.startsWith("image/") || file.type.startsWith("audio/") || file.type.startsWith("video/")) {
      toast.error("Please select a document file");
      e.target.value = "";
      return;
    }

    processAttachmentFile(file);
  };

  const removeImage = () => {
    if (isSendingMessage) return;
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAudio = () => {
    if (isSendingMessage) return;
    setAudioPreview(null);
  };

  const removeDocument = () => {
    if (isSendingMessage) return;
    setDocumentPreview(null);
    if (documentInputRef.current) documentInputRef.current.value = "";
  };

  const startRecording = async () => {
    if (editingMessage || isSendingMessage) return;

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast.error("Audio recording is not supported in this browser");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      audioStreamRef.current = stream;
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        const reader = new FileReader();
        reader.onloadend = () => setAudioPreview(reader.result);
        reader.readAsDataURL(audioBlob);

        stream.getTracks().forEach((track) => track.stop());
        audioStreamRef.current = null;
      };

      setAudioPreview(null);
      setDocumentPreview(null);
      setImagePreview(null);
      if (documentInputRef.current) documentInputRef.current.value = "";
      if (fileInputRef.current) fileInputRef.current.value = "";
      recorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Failed to start recording:", error);
      toast.error("Microphone access is needed to record audio");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleSuggestionClick = (suggestion) => {
    setText(suggestion);
    clearReplySuggestions();
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (isSendingMessage) return;
    if (isBlocked) return;

    if (editingMessage) {
      if (!text.trim()) return;
      setIsSendingMessage(true);
      try {
        await editMessage(editingMessage._id, text.trim());
        setText("");
        clearReplySuggestions();
      } finally {
        setIsSendingMessage(false);
      }
      return;
    }

    if (!text.trim() && !imagePreview && !audioPreview && !documentPreview) return;
    if (isAiAssistant && !text.trim()) return;

    try {
      setIsSendingMessage(true);
      const sentMessage = await sendMessage({
        text: text.trim(),
        image: isAiAssistant ? null : imagePreview,
        audio: isAiAssistant ? null : audioPreview,
        file: isAiAssistant ? null : documentPreview,
        replyTo: isAiAssistant ? null : replyingTo?._id,
        mentions: isGroup
          ? selectedMentions.filter((mention) => text.includes(`@${mention.name}`))
          : [],
      });

      if (!sentMessage) return;

      setText("");
      setImagePreview(null);
      setAudioPreview(null);
      setDocumentPreview(null);
      setSelectedMentions([]);
      setMentionQuery(null);
      clearReplySuggestions();
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (documentInputRef.current) documentInputRef.current.value = "";
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleMessageKeyDown = (e) => {
    if (e.key === "Escape" && mentionQuery !== null) {
      e.preventDefault();
      setMentionQuery(null);
      return;
    }

    if (e.key === "Enter" && e.ctrlKey) {
      e.preventDefault();
      e.currentTarget.form?.requestSubmit();
    }
  };

  const getPreviewText = (message) => {
    if (!message) return "";
    if (message.isDeleted) return "Deleted message";
    return message.text || (message.image ? "Photo" : message.audio ? "Audio" : message.file?.url ? "File" : "Message");
  };

  const getPreviewSender = (message) => {
    if (!message) return "";
    const senderId =
      typeof message.senderId === "object" ? message.senderId._id : message.senderId;
    if (senderId === authUser?._id) return "You";
    if (typeof message.senderId === "object") return message.senderId.fullName;
    return selectedUser?.isGroup ? "Member" : selectedUser?.fullName;
  };

  const cancelEditing = () => {
    clearEditingMessage();
    setText("");
  };

  if (isBlocked) {
    return (
      <div className="border-t border-base-300 p-4">
        <div className="rounded-md bg-base-200 px-4 py-3 text-sm text-base-content/70">
          {blockedMessage}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 w-full">
      {(replyingTo || editingMessage) && (
        <div className="mb-3 flex items-start gap-3 rounded-md border border-base-300 bg-base-200 px-3 py-2">
          <div className="mt-0.5 text-base-content/70">
            {editingMessage ? <Pencil size={16} /> : <Send size={16} />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium">
              {editingMessage
                ? "Editing message"
                : `Replying to ${getPreviewSender(replyingTo)}`}
            </p>
            <p className="truncate text-sm text-base-content/70">
              {getPreviewText(editingMessage || replyingTo)}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-xs btn-circle"
            onClick={editingMessage ? cancelEditing : clearReplyingTo}
            aria-label="Cancel"
            title="Cancel"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {!isAiAssistant && imagePreview && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
            />
            <button
              onClick={removeImage}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300
              flex items-center justify-center"
              type="button"
              aria-label="Remove image"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}

      {!isAiAssistant && audioPreview && (
        <div className="mb-3 flex w-full max-w-sm min-w-0 items-center gap-2 rounded-lg border border-base-300 bg-base-200 p-2">
          <audio controls src={audioPreview} className="h-9 min-w-0 flex-1" />
          <button
            type="button"
            onClick={removeAudio}
            className="btn btn-ghost btn-xs btn-circle"
            aria-label="Remove audio"
            title="Remove audio"
          >
            <X className="size-3" />
          </button>
        </div>
      )}

      {!isAiAssistant && documentPreview && (
        <div className="mb-3 flex w-full max-w-sm min-w-0 items-center gap-3 rounded-lg border border-base-300 bg-base-200 p-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileText className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{documentPreview.name}</p>
            <p className="text-xs text-base-content/60">{formatFileSize(documentPreview.size)}</p>
          </div>
          <button
            type="button"
            onClick={removeDocument}
            className="btn btn-ghost btn-xs btn-circle"
            disabled={isSendingMessage}
            aria-label="Remove document"
            title="Remove document"
          >
            {isSendingMessage ? (
              <Loader2 className="size-4 animate-spin text-primary" />
            ) : (
              <X className="size-3" />
            )}
          </button>
        </div>
      )}

      {!isAiAssistant && suggestions.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className="max-w-full rounded-full border border-base-300 bg-base-200 px-3 py-1.5 text-left text-xs leading-relaxed text-base-content transition hover:bg-base-300 sm:text-sm"
            >
              <span className="block truncate pb-px">{suggestion}</span>
            </button>
          ))}
        </div>
      )}

      {isGroup && mentionQuery !== null && (
        <div className="mb-2 max-h-48 w-full max-w-sm overflow-y-auto rounded-lg border border-base-300 bg-base-100 p-1 shadow-lg">
          {mentionSuggestions.length > 0 ? (
            mentionSuggestions.map((member) => (
              <button
                key={member._id}
                type="button"
                onClick={() => selectMention(member)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-base-200"
              >
                {member.profilePic ? (
                  <img
                    src={member.profilePic}
                    alt={member.fullName}
                    className="size-7 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {member.fullName?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                )}
                <span className="min-w-0 flex-1 truncate text-sm">{member.fullName}</span>
                <AtSign className="size-3.5 shrink-0 text-base-content/50" />
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-base-content/60">
              No matching members.
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex w-full min-w-0 items-center gap-2 overflow-hidden">
        <div className="flex min-w-0 flex-1 gap-2">
          <input
            ref={messageInputRef}
            type="text"
            className="input input-bordered min-w-0 flex-1 rounded-lg input-sm sm:input-md"
            placeholder={isAiAssistant ? "Ask Convo AI..." : "Type a message..."}
            value={text}
            onChange={handleTextChange}
            onClick={(e) => updateMentionQuery(e.currentTarget.value, e.currentTarget.selectionStart ?? e.currentTarget.value.length)}
            onKeyUp={(e) => {
              if (e.key !== "Escape") {
                updateMentionQuery(e.currentTarget.value, e.currentTarget.selectionStart ?? e.currentTarget.value.length);
              }
            }}
            onKeyDown={handleMessageKeyDown}
            disabled={isAiAssistantResponding || isSendingMessage}
          />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageChange}
          />
          <input
            type="file"
            accept={DOCUMENT_ACCEPT}
            className="hidden"
            ref={documentInputRef}
            onChange={handleDocumentChange}
          />

          {!isAiAssistant && (
            <>
              <button
                type="button"
                className={`hidden shrink-0 sm:flex btn btn-circle
                         ${imagePreview ? "text-emerald-500" : "text-zinc-400"}`}
                onClick={() => fileInputRef.current?.click()}
                disabled={Boolean(editingMessage) || isSendingMessage}
                aria-label="Attach image"
                title="Attach image"
              >
                <Image size={20} />
              </button>

              <button
                type="button"
                className={`btn btn-circle shrink-0 ${documentPreview ? "text-primary" : "text-zinc-400"}`}
                onClick={() => documentInputRef.current?.click()}
                disabled={Boolean(editingMessage) || isRecording || isSendingMessage}
                aria-label="Attach document"
                title="Attach document"
              >
                <FileText size={19} />
              </button>

              <button
                type="button"
                className={`btn btn-circle shrink-0 ${isRecording ? "text-error" : "text-zinc-400"}`}
                onClick={isRecording ? stopRecording : startRecording}
                disabled={Boolean(editingMessage) || isSendingMessage}
                aria-label={isRecording ? "Stop recording" : "Record audio"}
                title={isRecording ? "Stop recording" : "Record audio"}
              >
                {isRecording ? <Square size={18} fill="currentColor" /> : <Mic size={20} />}
              </button>
            </>
          )}
        </div>

        {!isAiAssistant && (
          <button
            type="button"
            className="btn btn-sm btn-circle shrink-0"
            onClick={getReplySuggestions}
            disabled={isGroup || isSuggestionsLoading || isSendingMessage}
            aria-label="Suggest replies"
            title={isGroup ? "Suggestions are available in direct chats" : "Suggest replies"}
          >
            {isSuggestionsLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Sparkles size={18} />
            )}
          </button>
        )}

        <button
          type="submit"
          className="btn btn-sm btn-circle shrink-0"
          disabled={
            isAiAssistant
              ? isAiAssistantResponding || isSendingMessage || !text.trim()
              : editingMessage
                ? isSendingMessage || !text.trim()
                : isSendingMessage || isRecording || (!text.trim() && !imagePreview && !audioPreview && !documentPreview)
          }
          aria-label={editingMessage ? "Save edit" : "Send message"}
          title={editingMessage ? "Save edit" : "Send message"}
        >
          {isSendingMessage ? (
            <Loader2 size={18} className="animate-spin" />
          ) : editingMessage ? (
            <Pencil size={18} />
          ) : (
            <Send size={22} />
          )}
        </button>
      </form>
    </div>
  );
};
export default MessageInput;
