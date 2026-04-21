const express = require("express");
const cors = require("cors");
const multer = require("multer");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const UPLOAD_DIR = path.join(__dirname, "uploads");
const JSON_DB = path.join(__dirname, "db.json");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

let fallbackData = { users: [], videos: [] };
if (fs.existsSync(JSON_DB)) {
  try {
    fallbackData = JSON.parse(fs.readFileSync(JSON_DB, "utf8"));
  } catch (error) {
    console.error("Failed to read fallback DB:", error.message);
  }
}

const saveFallback = () => {
  fs.writeFileSync(JSON_DB, JSON.stringify(fallbackData, null, 2));
};

let dbConnected = false;
mongoose
  .connect("mongodb://127.0.0.1:27017/videoapp")
  .then(() => {
    dbConnected = true;
    console.log("MongoDB connected");
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
  });

// ===== MODELY =====
const User = mongoose.model("User", {
  username: String,
  password: String
});

const Video = mongoose.model("Video", {
  title: String,
  file: String,
  user: String,
  date: Date
});

// ===== FILE UPLOAD =====
const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });

// ===== REGISTER =====
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ msg: "Username and password are required" });
  }

  const hash = await bcrypt.hash(password, 10);

  if (dbConnected) {
    await User.create({ username, password: hash });
    return res.json({ msg: "User created" });
  }

  if (fallbackData.users.some((user) => user.username === username)) {
    return res.status(400).json({ msg: "User already exists" });
  }

  fallbackData.users.push({ username, password: hash });
  saveFallback();

  res.json({ msg: "User created (fallback)" });
});

// ===== LOGIN =====
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ msg: "Username and password are required" });
  }

  let user;
  if (dbConnected) {
    user = await User.findOne({ username });
  } else {
    user = fallbackData.users.find((u) => u.username === username);
  }

  if (!user) return res.status(400).json({ msg: "User not found" });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(400).json({ msg: "Wrong password" });

  const token = jwt.sign({ user: user.username }, "secret");
  res.json({ token });
});

// ===== UPLOAD VIDEO =====
app.post("/upload", upload.single("video"), async (req, res) => {
  const { title, user } = req.body;
  if (!req.file || !title || !user) {
    return res.status(400).json({ msg: "Missing file, title, or user" });
  }

  const videoData = {
    title,
    file: req.file.filename,
    user,
    date: new Date()
  };

  if (dbConnected) {
    await Video.create(videoData);
  } else {
    fallbackData.videos.push(videoData);
    saveFallback();
  }

  res.json({ msg: "Uploaded" });
});

// ===== GET VIDEOS =====
app.get("/videos", async (req, res) => {
  if (dbConnected) {
    const videos = await Video.find();
    return res.json(videos);
  }

  res.json(fallbackData.videos);
});

app.use("/videos-files", express.static(UPLOAD_DIR));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));