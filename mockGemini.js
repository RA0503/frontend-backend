import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

console.log("GEMINI_API_KEY:", process.env.GEMINI_API_KEY);
export async function callGeminiAPI(preferences) {

  
  try {
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const body = {
      contents: [
        {
          parts: [
            {
              text: `Generate course recommendations based on: ${JSON.stringify(preferences)}`
            }
          ]
        }
      ]
    };

    const resp = await axios.post(url, body, {
      params: { key: process.env.GEMINI_API_KEY },
      headers: { "Content-Type": "application/json" }
    });

    const text =
      resp.data.candidates?.[0]?.content?.parts?.[0]?.text || "No response text";

    return { success: true, data: text };
  } catch (err) {
    console.error("REST API Error:", err.response?.data || err.message);
    return { success: false, message: "Gemini REST API failed", error: err.message };
  }
}
