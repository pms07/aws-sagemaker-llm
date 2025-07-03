// src/pages/Chat.jsx

import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Paper,
  Divider,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import DeleteIcon from "@mui/icons-material/Delete";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import chatService from "../services/chatService";

const CHAT_SESSION_ID = "single-session";

const DEMO_MESSAGES = [
  { role: "user",      content: "Q: Hi" },
  { role: "assistant", content: "A: Hi, how can I help you?" },
  { role: "user",      content: "Q: Hi, What is outstanding concept in accounting book keeping?" },
  { role: "assistant", content: "A: The outstanding concept in accounting book keeping is the balance between the debt and the equity of a company. It is the difference between the total assets and liabilities of a company." },
  { role: "assistant", content: "A: Hi, how can I help you?" },

  { role: "user",      content: "Q: How many parties are total outstanding right now?" },
  { role: "assistant", content:
    `A: There are total 6 parties outstanding right now. Those are:\n
- Party ABC  
- Party XYZ  
- Party MNO  
- Party MMM  
- Party NNN  
- Party ACC`
  },

  { role: "user",      content: "Q: What is total outstanding of Party ABC?" },
  { role: "assistant", content: "A: The total outstanding for Party ABC is INR 15,000." },

  { role: "user",      content: "Q: Which invoice of Party ABC is due latest as per available data?" },
  { role: "assistant", content: "A: Party ABC’s latest due invoice is on **12/July/2025** for **INR 3,000**." },

  { role: "user",      content: "Q: Give me list of total parties with total outstanding amount." },
  { role: "assistant", content:
    `A: Here is the list of parties with their total outstanding amount:\n
- Party ABC – INR 15,000  
- Party XYZ – INR 12,500  
- Party MNO – INR 9,000  
- Party MMM – INR 7,200  
- Party NNN – INR 5,500  
- Party ACC – INR 3,000`
  }
];

export default function Chat() {
  const chatBoxRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);

  // 1) Load history on mount
  useEffect(() => {
    chatService
        // .getChatHistory(CHAT_SESSION_ID)
        // .then(history => setMessages(history))
        // .catch(err => console.error("Failed to load chat history:", err));
    setMessages(DEMO_MESSAGES);
  }, []);

  // 2) Auto-scroll on new messages
  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTo({
        top: chatBoxRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [messages]);

  // 3) Send new message and then re-load the full history
  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;

    setLoading(true);
    setInput("");
    // Show the user’s message immediately
    setMessages(prev => [...prev, { role: "user", content: text }]);

    try {
      // Post the new message
      await chatService.sendMessage(CHAT_SESSION_ID, text);
      // Re-fetch entire chat so assistant’s response is pulled in
      const fresh = await chatService.getChatHistory(CHAT_SESSION_ID);
      setMessages(fresh);
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setLoading(false);
    }
  };

  // 4) Clear session
  const handleDelete = async () => {
    try {
      await chatService.deleteChat(CHAT_SESSION_ID);
      setMessages([]);
    } catch (err) {
      console.error("Failed to delete chat:", err);
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: "auto", mt: 4 }}>
      <Typography variant="h5" gutterBottom>💬 Ask your data</Typography>

      <Paper
        ref={chatBoxRef}
        elevation={3}
        sx={{ p: 2, maxHeight: 800, overflowY: "auto" }}
      >
        {messages.length === 0 ? (
          <Typography variant="body2" sx={{ textAlign: "center", color: "#888" }}>
            No messages yet.
          </Typography>
        ) : (
          messages.map((msg, idx) => (
            <Box
              key={idx}
              sx={{ my: 1, textAlign: msg.role === "user" ? "right" : "left" }}
            >
              <Box
                component={Paper}
                elevation={0}
                sx={{
                  display: "inline-block",
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: msg.role === "user" ? "#e3f2fd" : "#f1f8e9",
                  overflowX: "auto",
                  maxWidth: "100%"
                }}
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    table: ({ ...props }) => <Table size="small" {...props} />,
                    thead: ({ ...props }) => <TableHead {...props} />,
                    tbody: ({ ...props }) => <TableBody {...props} />,
                    tr: ({ ...props }) => <TableRow {...props} />,
                    th: ({ ...props }) => (
                      <TableCell component="th" sx={{ fontWeight: "bold" }} {...props} />
                    ),
                    td: ({ ...props }) => <TableCell {...props} />
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              </Box>
            </Box>
          ))
        )}
      </Paper>

      <Divider sx={{ my: 2 }} />

      <Box display="flex" gap={1}>
        <TextField
          fullWidth
          placeholder="Type your question..."
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={loading}
          onKeyDown={e => e.key === "Enter" && handleSend()}
        />
        <IconButton color="primary" onClick={handleSend} disabled={loading}>
          <SendIcon />
        </IconButton>
        {/* <IconButton color="error" onClick={handleDelete} disabled={loading}>
          <DeleteIcon />
        </IconButton> */}
      </Box>
    </Box>
  );
}
