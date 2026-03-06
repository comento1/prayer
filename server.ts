import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import path from "path";
import fs from "fs";
import db from "./src/db.ts";
import { GoogleGenAI } from "@google/genai";

const GOOGLE_SHEETS_WEBHOOK_URL = process.env.GOOGLE_SHEETS_WEBHOOK_URL || "";

function logToSheet(payload: Record<string, unknown>) {
  if (!GOOGLE_SHEETS_WEBHOOK_URL) return;
  const body = { ...payload, timestamp: new Date().toISOString() };
  fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch((err) => console.warn("Sheet webhook failed:", err.message));
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    console.log("Health check requested");
    res.json({ status: "ok" });
  });

  // Auth
  app.post("/api/auth/login", (req, res) => {
    console.log("Login request received:", req.body);
    try {
      const { nickname, pin } = req.body;
      if (!nickname || !pin) return res.status(400).json({ error: "Missing fields" });
      
      let user = db.prepare("SELECT * FROM users WHERE nickname = ? AND pin = ?").get(nickname, pin) as any;
      if (!user) {
        console.log("User not found, checking if nickname exists...");
        const existing = db.prepare("SELECT * FROM users WHERE nickname = ?").get(nickname);
        if (existing) {
          console.log("Nickname taken or incorrect PIN");
          return res.status(401).json({ error: "Nickname taken or incorrect PIN" });
        }
        
        console.log("Registering new user:", nickname);
        const info = db.prepare("INSERT INTO users (nickname, pin) VALUES (?, ?)").run(nickname, pin);
        user = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
      }
      
      console.log("Login successful:", user.nickname);
      res.json(user);
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Groups
  app.get("/api/groups", (req, res) => {
    const groups = db.prepare("SELECT * FROM groups").all();
    res.json(groups);
  });

  app.get("/api/users", (req, res) => {
    const users = db.prepare("SELECT id, nickname, created_at FROM users").all();
    res.json(users);
  });

  app.get("/api/users/:userId/groups", (req, res) => {
    const { userId } = req.params;
    const groups = db.prepare(`
      SELECT g.* FROM groups g
      JOIN user_groups ug ON g.id = ug.group_id
      WHERE ug.user_id = ?
    `).all(userId);
    res.json(groups);
  });

  app.post("/api/users/:userId/groups", (req, res) => {
    const { userId } = req.params;
    const { groupIds } = req.body;
    
    const insert = db.prepare("INSERT INTO user_groups (user_id, group_id) VALUES (?, ?)");
    const deleteGroups = db.prepare("DELETE FROM user_groups WHERE user_id = ?");
    
    db.transaction(() => {
      deleteGroups.run(userId);
      for (const groupId of groupIds) {
        insert.run(userId, groupId);
      }
    })();
    
    res.json({ success: true });
  });

  // Prayers
  app.get("/api/prayers", (req, res) => {
    const { groupId, userId, isAnswered, period, currentUserId } = req.query;
    
    let query = `
      SELECT p.*, u.nickname as user_nickname, g.name as group_name,
      (SELECT COUNT(*) FROM prayer_interactions WHERE prayer_request_id = p.id AND type = 'PRAYING') as pray_count,
      (SELECT COUNT(*) FROM prayer_interactions WHERE prayer_request_id = p.id AND type = 'COMMENT') as comment_count
      FROM prayer_requests p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN groups g ON p.group_id = g.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (groupId) {
      query += ` AND (p.group_id = ? OR (p.group_id IS NULL AND p.user_id IN (SELECT user_id FROM user_groups WHERE group_id = ?)))`;
      params.push(groupId, groupId);
    }
    if (userId) {
      query += " AND p.user_id = ?";
      params.push(userId);
    }
    if (isAnswered !== undefined) {
      query += " AND p.is_answered = ?";
      params.push(isAnswered === 'true' ? 1 : 0);
    }
    if (period === 'week') {
      query += " AND p.created_at >= datetime('now', '-7 days')";
    } else if (period === 'month') {
      query += " AND p.created_at >= datetime('now', '-30 days')";
    }

    query += " ORDER BY p.created_at DESC";
    
    const prayers = db.prepare(query).all(...params) as any[];
    const list = currentUserId
      ? prayers.map((p) => ({
          ...p,
          user_has_prayed: !!db.prepare(
            "SELECT 1 FROM prayer_interactions WHERE prayer_request_id = ? AND user_id = ? AND type = 'PRAYING'"
          ).get(p.id, currentUserId),
        }))
      : prayers.map((p) => ({ ...p, user_has_prayed: false }));
    res.json(list);
  });

  app.get("/api/prayers/:id", (req, res) => {
    const { id } = req.params;
    const currentUserId = req.query.currentUserId as string | undefined;
    const prayer = db.prepare(`
      SELECT p.*, u.nickname as user_nickname, g.name as group_name,
      (SELECT COUNT(*) FROM prayer_interactions WHERE prayer_request_id = p.id AND type = 'PRAYING') as pray_count
      FROM prayer_requests p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN groups g ON p.group_id = g.id
      WHERE p.id = ?
    `).get(id) as any;
    
    if (!prayer) return res.status(404).json({ error: "Not found" });
    
    const comments = db.prepare(`
      SELECT c.*, u.nickname as user_nickname
      FROM prayer_interactions c
      JOIN users u ON c.user_id = u.id
      WHERE c.prayer_request_id = ? AND c.type = 'COMMENT'
      ORDER BY c.created_at ASC
    `).all(id);
    
    const user_has_prayed = currentUserId
      ? !!db.prepare(
          "SELECT 1 FROM prayer_interactions WHERE prayer_request_id = ? AND user_id = ? AND type = 'PRAYING'"
        ).get(id, currentUserId)
      : false;
    
    res.json({ ...prayer, comments, user_has_prayed });
  });

  app.post("/api/prayers", (req, res) => {
    const { userId, groupId, content, originalContent } = req.body;
    const createdAt = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Seoul" }).replace(" ", "T");
    const info = db.prepare(`
      INSERT INTO prayer_requests (user_id, group_id, content, original_content, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, groupId, content, originalContent || content, createdAt, createdAt);
    const nickname = (db.prepare("SELECT nickname FROM users WHERE id = ?").get(userId) as { nickname: string } | undefined)?.nickname;
    logToSheet({ action: "prayer_created", userId, nickname, prayerId: info.lastInsertRowid, content, groupId });
    res.json({ id: info.lastInsertRowid });
  });

  app.put("/api/prayers/:id", (req, res) => {
    const { id } = req.params;
    const { content, isAnswered, answeredNote } = req.body;
    const updatedAt = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Seoul" }).replace(" ", "T");
    
    if (content !== undefined) {
      db.prepare("UPDATE prayer_requests SET content = ?, updated_at = ? WHERE id = ?").run(content, updatedAt, id);
    }
    if (isAnswered !== undefined) {
      const pr = db.prepare("SELECT user_id FROM prayer_requests WHERE id = ?").get(id) as { user_id: number } | undefined;
      if (isAnswered && (answeredNote != null && String(answeredNote).trim() !== "")) {
        const row = db.prepare("SELECT content FROM prayer_requests WHERE id = ?").get(id) as { content: string } | undefined;
        if (row) {
          const newContent = row.content + "\n\n[응답] " + String(answeredNote).trim();
          db.prepare("UPDATE prayer_requests SET is_answered = 1, answered_note = ?, content = ?, updated_at = ? WHERE id = ?").run(answeredNote.trim(), newContent, updatedAt, id);
        } else {
          db.prepare("UPDATE prayer_requests SET is_answered = 1, answered_note = ?, updated_at = ? WHERE id = ?").run(answeredNote.trim(), updatedAt, id);
        }
        if (pr) {
          const nickname = (db.prepare("SELECT nickname FROM users WHERE id = ?").get(pr.user_id) as { nickname: string } | undefined)?.nickname;
          logToSheet({ action: "answered", userId: pr.user_id, nickname, prayerId: id, answeredNote: String(answeredNote).trim() });
        }
      } else if (isAnswered) {
        db.prepare("UPDATE prayer_requests SET is_answered = 1, updated_at = ? WHERE id = ?").run(updatedAt, id);
        if (pr) {
          const nickname = (db.prepare("SELECT nickname FROM users WHERE id = ?").get(pr.user_id) as { nickname: string } | undefined)?.nickname;
          logToSheet({ action: "answered", userId: pr.user_id, nickname, prayerId: id });
        }
      } else {
        db.prepare("UPDATE prayer_requests SET is_answered = 0, answered_note = NULL, updated_at = ? WHERE id = ?").run(updatedAt, id);
      }
    }
    
    res.json({ success: true });
  });

  app.delete("/api/prayers/:id", (req, res) => {
    try {
      const { id } = req.params;
      const prayerId = Number(id);
      console.log("Attempting to delete prayer with ID:", prayerId);
      
      if (isNaN(prayerId)) {
        return res.status(400).json({ error: "Invalid ID" });
      }

      const before = db.prepare("SELECT user_id FROM prayer_requests WHERE id = ?").get(prayerId) as { user_id: number } | undefined;
      const result = db.prepare("DELETE FROM prayer_requests WHERE id = ?").run(prayerId);
      console.log("Delete result changes:", result.changes);
      
      if (result.changes === 0) {
        return res.status(404).json({ error: "Prayer not found" });
      }
      if (before) {
        const nickname = (db.prepare("SELECT nickname FROM users WHERE id = ?").get(before.user_id) as { nickname: string } | undefined)?.nickname;
        logToSheet({ action: "prayer_deleted", userId: before.user_id, nickname, prayerId: id });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Interactions
  app.post("/api/prayers/:id/pray", (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;
    
    const existing = db.prepare("SELECT * FROM prayer_interactions WHERE prayer_request_id = ? AND user_id = ? AND type = 'PRAYING'").get(id, userId) as any;
    let praying: boolean;
    if (existing) {
      db.prepare("DELETE FROM prayer_interactions WHERE id = ?").run(existing.id);
      praying = false;
    } else {
      db.prepare("INSERT INTO prayer_interactions (prayer_request_id, user_id, type) VALUES (?, ?, 'PRAYING')").run(id, userId);
      praying = true;
    }
    const nickname = (db.prepare("SELECT nickname FROM users WHERE id = ?").get(userId) as { nickname: string } | undefined)?.nickname;
    logToSheet({ action: "pray", userId, nickname, prayerId: id, praying });
    res.json({ praying });
  });

  app.post("/api/prayers/:id/comments", (req, res) => {
    const { id } = req.params;
    const { userId, content } = req.body;
    
    const info = db.prepare("INSERT INTO prayer_interactions (prayer_request_id, user_id, type, content) VALUES (?, ?, 'COMMENT', ?)").run(id, userId, content);
    const nickname = (db.prepare("SELECT nickname FROM users WHERE id = ?").get(userId) as { nickname: string } | undefined)?.nickname;
    logToSheet({ action: "comment", userId, nickname, prayerId: id, content });
    res.json({ id: info.lastInsertRowid });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.resolve(process.cwd(), "dist");
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.resolve(distPath, "index.html"));
      });
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
