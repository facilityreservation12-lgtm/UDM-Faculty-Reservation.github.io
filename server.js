import express from "express";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { encryptWithIV, decryptWithIV } from "./encryption.js";
import bcrypt from "bcrypt";

dotenv.config();

const app = express();

// Manual CORS configuration - this ALWAYS works
app.use((req, res, next) => {
  // Allow requests from any origin (you can restrict this later)
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request received from:', req.headers.origin);
    return res.sendStatus(200);
  }

  console.log(`${req.method} ${req.url} - Origin: ${req.headers.origin}`);
  next();
});

app.use(express.json());

// Supabase setup
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Encrypt before insert
app.post("/add-user", async (req, res) => {
  try {
    const { id, first_name, last_name, role_name, role, email, password } = req.body;

    console.log('Received data:', { id, first_name, last_name, role_name, role, email, password: password ? '[PROVIDED]' : '[NOT PROVIDED]' });

    // Encrypt sensitive fields (leave `role` as plaintext due to DB check constraint)
    const encryptedFirstName = encryptWithIV(first_name);
    const encryptedLastName = encryptWithIV(last_name);
    const encryptedRoleName = encryptWithIV(role_name);
    
    // Ensure role is not null/undefined; keep as plaintext to satisfy users_role_check
    const rolePlain = role || role_name || 'faculty';

    // Hash password with salt if provided
    let hashedPassword = null;
    if (password && password.length > 0) {
      hashedPassword = await bcrypt.hash(password, 12); // 12 salt rounds
      console.log('Password hashed successfully');
    }

    const { data, error } = await supabase
      .from("users")
      .insert({
        id,
        first_name: encryptedFirstName,
        last_name: encryptedLastName,
        role_name: encryptedRoleName,
        role: rolePlain,
        email,
        password: hashedPassword
      });

    if (error) return res.status(400).json({ error: error.message });
    res.json({ message: "User added with encrypted data and hashed password" });

  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Decrypt after fetch
app.get("/users", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, first_name, last_name, role_name, role, email")
      .order("id", { ascending: true });

      if (error) {
        console.error("Supabase fetch error:", error);
        return res.status(400).json({ error });
      }
      

    // Decrypt each user's fields with improved error handling
    const decryptedUsers = data.map(user => {
      try {
        // Helper function to safely decrypt data
        const safeDecrypt = (encryptedValue) => {
          if (!encryptedValue) return encryptedValue;
          
          // Check if it's already plain text (contains spaces, letters, common characters)
          if (/^[A-Za-z\s\-'.,]+$/.test(encryptedValue)) {
            return encryptedValue; // Already decrypted
          }
          
          // Check if it looks like base64 encrypted data
          if (/^[A-Za-z0-9+/=]+$/.test(encryptedValue) && encryptedValue.length > 20) {
            try {
              // Try to decrypt
              const decrypted = decryptWithIV(encryptedValue);
              console.log('Successfully decrypted:', encryptedValue.substring(0, 10) + '... -> ' + decrypted);
              return decrypted;
            } catch (error) {
              console.log('Decryption failed for:', encryptedValue.substring(0, 20) + '...');
              // For now, return a placeholder for failed decryptions
              return '[Encrypted Data]';
            }
          }
          
          return encryptedValue; // Return as-is for other cases
        };

        return {
          ...user,
          first_name: safeDecrypt(user.first_name),
          last_name: safeDecrypt(user.last_name),
          role_name: safeDecrypt(user.role_name),
          role: user.role // role is stored as plaintext
        };
      } catch (decryptError) {
        console.error('Error processing user:', user.id, decryptError.message);
        // Return user with original data if processing fails
        return user;
      }
    });

    res.json(decryptedUsers);

  } catch (err) {
    console.error("Error in /users:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));