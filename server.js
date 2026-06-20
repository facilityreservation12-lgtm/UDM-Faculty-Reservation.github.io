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

// POST /forgot-password
// Receives: { user_id: "A001" }
// Returns: { success: true, message: "Password reset email sent" }
app.post("/forgot-password", async (req, res) => {
  const { user_id } = req.body;
  
  // Validate input
  if (!user_id) {
    return res.status(400).json({ error: "User ID is required" });
  }
  
  // Create admin client with service role key
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  try {
    // 1. Find user in custom users table
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, email, supabase_auth_id")
      .eq("id", user_id)
      .single();

    if (userError || !user) {
      console.error("User lookup error:", userError);
      return res.status(404).json({ error: "User not found" });
    }

    // Validate that user has an email
    if (!user.email) {
      return res.status(400).json({ error: "No email associated with this user account" });
    }

    let authId = user.supabase_auth_id;

    // 2. If not linked to auth.users, create auth user
    if (!authId) {
      console.log(`Creating auth user for ${user_id} with email ${user.email}`);
      
      // Create user in auth.users
      const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        email_confirm: true, // Skip email confirmation for smoother UX
        user_metadata: { original_user_id: user.id }
      });

      if (createError) {
        console.error("Auth user creation error:", createError);
        return res.status(500).json({ error: "Failed to create auth account. Please try again." });
      }

      authId = authUser.id;
      console.log(`Auth user created with ID: ${authId}`);

      // 3. Update users table with auth ID
      const { error: updateError } = await supabase
        .from("users")
        .update({ supabase_auth_id: authId })
        .eq("id", user_id);

      if (updateError) {
        console.error("Error updating users table:", updateError);
        // Non-fatal, continue with password reset
      }
    }

    // 4. Send password reset email
    const redirectUrl = `${process.env.APP_URL}/User%20panel/reset-password.html`;
    console.log(`Sending password reset email to ${user.email} with redirect to ${redirectUrl}`);
    
    const { error: resetError } = await supabaseAdmin.auth.admin.resetPasswordForEmail(user.email, {
      redirectTo: redirectUrl
    });

    if (resetError) {
      console.error("Password reset email error:", resetError);
      return res.status(500).json({ error: "Failed to send reset email. Please try again later." });
    }

    console.log(`Password reset email sent to ${user.email}`);
    res.json({ success: true, message: "Password reset email sent. Check your email." });

  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "An unexpected error occurred. Please try again." });
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));
