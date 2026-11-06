
require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");

async function testGemini() {
    try {
        if (!process.env.GOOGLE_API_KEY) {
            throw new Error("GOOGLE_API_KEY is missing from .env");
        }

        const ai = new GoogleGenAI({
            apiKey: process.env.GOOGLE_API_KEY.trim()
        });

        console.log("Testing Gemini API...");

        const response = await ai.models.generateContent({
            model: "gemini-3.1-flash-lite",
            contents: "Reply with exactly: GEMINI WORKING"
        });

        console.log("Gemini response:", response.text);
        console.log("Gemini API test successful.");

    } catch (error) {
        console.error("Gemini test failed!");
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        console.error("HTTP status:", error.status);
    }
}

testGemini();
