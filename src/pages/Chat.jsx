// src/pages/Chat.jsx

import React, { useState } from "react";
import { Button, TextField, Typography, Box } from "@mui/material";
import { askLLM } from "../services/chatService";
import { useAuth } from "../components/AuthContext";

export default function Chat() {
  const [userInput, setUserInput] = useState("");
  const [chatHistory, setChatHistory] = useState([]);

  // ← Now pulling both email and sub from useAuth()
  const { userEmail, userSub } = useAuth();

  const handleAsk = async () => {
    if (!userInput.trim()) return;

    // 1) Try to use userSub first. If it is null, fall back to email. If email also missing, use "anonymous".
    const user_id = userSub || userEmail || "anonymous";

    // 2) Build payload exactly how the Lambda expects it
    const payload = { user_id, question: userInput };
    console.log("📤 Sending payload to /ask:", payload);

    try {
      // askLLM(question, userId) → we return response.data from chatService
      const response = await askLLM(userInput, user_id);
      console.log("📥 Lambda response:", response);

      // 3) Normalize the “answer” string from the Lambda response
      let answerText = "";
      if (typeof response?.answer === "string") {
        // Sometimes Lambda returns a JSON‐encoded string (e.g. "{\"generated_text\": \"…\"}")
        try {
          const parsed = JSON.parse(response.answer);
          answerText = parsed.generated_text || response.answer;
        } catch {
          answerText = response.answer;
        }
      } else if (response?.answer?.generated_text) {
        answerText = response.answer.generated_text;
      } else {
        answerText = "No answer returned.";
      }

      // 4) Append this Q/A to chatHistory and clear the input
      setChatHistory((prev) => [
        ...prev,
        { question: userInput, answer: answerText },
      ]);
      setUserInput("");
    } catch (err) {
      console.error("Ask error:", err);
      setChatHistory((prev) => [
        ...prev,
        { question: userInput, answer: "Error contacting assistant." },
      ]);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Ask Your KPI Assistant
      </Typography>

      <TextField
        fullWidth
        label="Enter your question"
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        variant="outlined"
        sx={{ mb: 2 }}
      />

      <Button variant="contained" color="primary" onClick={handleAsk}>
        Ask
      </Button>

      <Box sx={{ mt: 4 }}>
        {chatHistory.map((item, index) => (
          <Box key={index} sx={{ mb: 3 }}>
            <Typography variant="subtitle1">
              <strong>Q:</strong> {item.question}
            </Typography>
            <Typography variant="body1" sx={{ ml: 2 }}>
              <strong>A:</strong> {item.answer}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
