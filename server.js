import express from "express";

const app = express();
app.use(express.json({ limit: "32kb" }));

const API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const PORT = process.env.PORT || 3000;

app.get("/health", (_req, res) => res.json({ ok: true, assistant: "FRIDAY" }));

app.post("/chat", async (req, res) => {
  try {
    if (!API_KEY) return res.status(503).json({ error: "AI backend is not configured yet." });
    const messages = Array.isArray(req.body.messages) ? req.body.messages : [];
    const safeMessages = messages.slice(-16).map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content || "").slice(0, 4000)
    })).filter((m) => m.content.trim());

    if (!safeMessages.length) return res.status(400).json({ error: "Please send a message." });

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        instructions: "You are FRIDAY, a helpful, calm, intelligent personal AI assistant. Speak naturally and clearly. Be concise unless detail is requested. Be honest about what you can and cannot do. Do not claim to control the phone, access private data, or perform actions unless an enabled tool actually did so. For a teen user, keep advice age-appropriate and safe.",
        input: safeMessages.map((m) => ({
          role: m.role,
          content: [{ type: "input_text", text: m.content }]
        }))
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("AI provider error:", data?.error?.message || response.status);
      return res.status(502).json({ error: "FRIDAY could not reach the AI service. Please try again." });
    }
    const answer = (data.output || [])
      .flatMap((item) => item.content || [])
      .filter((part) => part.type === "output_text")
      .map((part) => part.text)
      .join("\n").trim();

    res.json({ reply: answer || "I didn't receive a response. Please try again." });
  } catch (err) {
    console.error("Request failed:", err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

app.listen(PORT, () => console.log(`FRIDAY server listening on port ${PORT}`));
