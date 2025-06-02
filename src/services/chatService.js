// src/services/chatService.js
import apiClient from "./apiClient";

/**
 * askLLM(questionText, userId)
 *   → POST to /ask  with JSON body { question: questionText, user_id: userId }
 *   → returns the parsed JSON response from Lambda (i.e. response.data)
 */
export const askLLM = async (questionText, userId) => {
  console.log("Sending to API:", { question: questionText, user_id: userId });
  // API‐Client is already configured with baseURL and Authorization header
  const response = await apiClient.post("/ask", {
    question: questionText,
    user_id: userId, // this must match what your Lambda expects
  });
  return response.data;
};
