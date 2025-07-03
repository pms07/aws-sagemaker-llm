const API_BASE = import.meta.env.VITE_CHAT_API;

const chatService = {
  async getChatHistory(sessionId = "single-session") {
    const res = await fetch(`${API_BASE}/chat?session_id=${sessionId}`);
    if (!res.ok) throw new Error("Chat history fetch failed");
    const data = await res.json();

    // Map your backend’s { type: 'human'|'ai', content } → { role, content }
    return (data.messages || []).map(msg => ({
      role: msg.type === "human" ? "user" : "assistant",
      content: msg.content,
    }));
  },

  async sendMessage(sessionId, message) {
    const res = await fetch(`${API_BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, message }),
    });
    if (!res.ok) throw new Error("Message send failed");

    const data = await res.json();
    // unwrap reply string (or fall back)
    return data.reply
      ?? data.results?.[0]?.outputText
      ?? "No reply";
  },

  async deleteChat(sessionId) {
    const res = await fetch(`${API_BASE}/chat?session_id=${sessionId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Chat delete failed");
    return await res.json();
  },
};

export default chatService;