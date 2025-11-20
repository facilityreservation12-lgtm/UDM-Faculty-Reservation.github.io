import express from "express";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();

// Manual CORS configuration
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

app.use(express.json());

// Supabase setup
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Add new user (plain text, no encryption or hashing)
app.post("/add-user", async (req, res) => {
  try {
    const { id, first_name, last_name, role_name, role, email, password } = req.body;

    const rolePlain = role || role_name || 'faculty';

    const { data, error } = await supabase
      .from("users")
      .insert({
        id,
        first_name,
        last_name,
        role_name,
        role: rolePlain,
        email,
        password  // plain password
      });

    if (error) return res.status(400).json({ error: error.message });
    res.json({ message: "User added successfully" });

  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Fetch all users (plain text, no decryption)
app.get("/users", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, first_name, last_name, role_name, role, email")
      .order("id", { ascending: true });

    if (error) return res.status(400).json({ error: error.message });

    res.json(data);

  } catch (err) {
    console.error("Error in /users:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));
