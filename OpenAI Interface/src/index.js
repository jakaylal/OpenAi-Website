import express from "express";
import bodyParser from "body-parser";
import path from "path";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const __dirname = path.resolve();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // store your key in .env
});


app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));


let chatHistory = []


app.get("/", (req, res) => {
  res.render("index", {
    openaiResponse: null,
    error: null,
    chatHistory,
  });
});


app.post("/", async (req, res) => {
  const userPrompt = req.body.prompt?.trim();

  if (!userPrompt) {
    return res.render("index", {
      openaiResponse: null,
      error: "Please enter a message.",
      chatHistory,
    });
  }

  try {
    
    chatHistory.push({ role: "user", text: userPrompt });

    
    const messages = chatHistory.map((msg) => ({
      role: msg.role,
      content: msg.text,
    }));

    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // or "gpt-4.1-mini"
      messages,
    });

    const aiResponse = completion.choices[0].message.content.trim();

    
    chatHistory.push({ role: "assistant", text: aiResponse });

    res.render("index", {
      openaiResponse: aiResponse,
      error: null,
      chatHistory,
    });
  } catch (err) {
    console.error("Error fetching OpenAI response:", err);

    res.render("index", {
      openaiResponse: null,
      error: "Error fetching OpenAI response: " + err.message,
      chatHistory,
    });
  }
});


app.post("/clear", (req, res) => {
  chatHistory = [];
  res.redirect("/");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Our app is running on port 3000`));
