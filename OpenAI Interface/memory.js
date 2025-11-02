import fs from "fs";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MEMORY_FILE = "conversations.json";

// --- Load and save messages ---
export function loadConversations() {
  try {
    const data = fs.readFileSync(MEMORY_FILE, "utf8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function saveConversation(message) {
  const messages = loadConversations();
  messages.push(message);
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(messages, null, 2));
}

// --- Get relevant context using embeddings ---
export async function getRelevantContext(prompt) {
  const messages = loadConversations();
  if (messages.length === 0) return "";

  try {
    // Get embedding for current user input
    const embeddingRes = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: prompt,
    });

    const userVector = embeddingRes.data[0].embedding;

    // Compute cosine similarity with past messages
    function cosineSim(a, b) {
      const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
      const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
      const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
      return dot / (normA * normB);
    }

    const similarities = [];
    for (const msg of messages) {
      if (!msg.embedding) continue;
      const score = cosineSim(userVector, msg.embedding);
      similarities.push({ text: msg.text, role: msg.role, score });
    }

    // Pick top 3 most relevant past messages
    const topRelevant = similarities
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    return topRelevant.map((m) => `${m.role}: ${m.text}`).join("\n");
  } catch (err) {
    console.error("Error fetching embeddings:", err);
    return "";
  }
}

// --- Store messages with embeddings ---
export async function storeWithEmbedding(role, text) {
  const embeddingRes = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });

  const message = {
    role,
    text,
    embedding: embeddingRes.data[0].embedding,
    timestamp: new Date().toISOString(),
  };

  saveConversation(message);
}
