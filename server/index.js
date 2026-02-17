import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const siteRoot = path.resolve(__dirname, "..");
const dataDir = path.join(__dirname, "data");
const bookingsFile = path.join(dataDir, "bookings.json");

app.use(express.json());
app.use(express.static(siteRoot));
app.use(express.urlencoded({ extended: true }));

const ensureDataFile = async () => {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(bookingsFile);
  } catch {
    await fs.writeFile(bookingsFile, JSON.stringify({ slots: [] }, null, 2));
  }
};

const readBookings = async () => {
  await ensureDataFile();
  const raw = await fs.readFile(bookingsFile, "utf8");
  return JSON.parse(raw);
};

const writeBookings = async (data) => {
  await fs.writeFile(bookingsFile, JSON.stringify(data, null, 2));
};

app.get("/api/slots", async (req, res) => {
  try {
    const data = await readBookings();
    return res.json({ booked: data.slots || [] });
  } catch (error) {
    return res.status(500).json({ error: "Failed to load slots." });
  }
});

app.post("/api/book", async (req, res) => {
  try {
    const { slot, name, email, subject, details } = req.body || {};

    if (!slot) {
      return res.status(400).json({ error: "Missing time slot." });
    }

    const data = await readBookings();
    const booked = new Set(data.slots || []);

    if (booked.has(slot)) {
      return res.status(409).json({ error: "Slot already booked." });
    }

    booked.add(slot);
    data.slots = Array.from(booked);
    data.requests = data.requests || [];
    data.requests.push({
      slot,
      name: name || "",
      email: email || "",
      subject: subject || "",
      details: details || "",
      createdAt: new Date().toISOString()
    });

    await writeBookings(data);
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: "Failed to save booking." });
  }
});

app.get("/book", (req, res) => {
  res.sendFile(path.join(siteRoot, "book.html"));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
