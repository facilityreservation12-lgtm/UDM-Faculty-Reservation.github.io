import dotenv from 'dotenv';
dotenv.config();  // this loads .env variables

console.log('Supabase URL:', process.env.REACT_APP_SUPABASE_URL);
console.log('Supabase Key:', process.env.REACT_APP_ANON_KEY);

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_ANON_KEY
);