import express from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer } from "vite";
import "dotenv/config";

const app = express();
app.use(express.text());
const port = process.env.PORT || 3000;
const apiKey = process.env.OPENAI_API_KEY;

const vite = await createViteServer({
  server: { middlewareMode: true },
  appType: "custom",
});
app.use(vite.middlewares);

const sessionConfig = JSON.stringify({
  session: {
    type: "realtime",
    model: "gpt-realtime-mini",
    audio: {
      output: {
        voice: "marin",
      },
    },
  },
});

app.post("/session", async (req, res) => {
  const fd = new FormData();
  fd.set("sdp", req.body);
  fd.set("session", sessionConfig);

  const response = await fetch("https://api.openai.com/v1/realtime/calls", {
    method: "POST",
    headers: {
      "OpenAI-Beta": "realtime=v1",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: fd,
  });

  const sdp = await response.text();
  res.send(sdp);
});

app.get("/token", async (_req, res) => {
  try {
    const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: sessionConfig,
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Token generation error:", error);
    res.status(500).json({ error: "Failed to generate token" });
  }
});

app.use("*", async (req, res, next) => {
  const url = req.originalUrl;
  const indexPath = path.resolve("./client/index.html");

  try {
    const template = fs.readFileSync(indexPath, "utf-8");
    const html = await vite.transformIndexHtml(url, template);
    res.status(200).set({ "Content-Type": "text/html" }).end(html);
  } catch (error) {
    vite.ssrFixStacktrace(error);
    next(error);
  }
});

app.listen(port, () => {
  console.log(`Express server running on *:${port}`);
});
