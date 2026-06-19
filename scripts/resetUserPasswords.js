import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const DEFAULT_PASSWORD = process.argv[2] || 'Default@30';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tryytusvitsztadzqihq.supabase.co';
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyeXl0dXN2aXRzenRhZHpxaWhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3ODQyMTQsImV4cCI6MjA5NzM2MDIxNH0.R9GkjYXhvoN3Jw8nOkiparyHQRCE6uqZMAPpX3edAxA';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_KEY.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function resetPasswords() {
  console.log(`Updating all user passwords to plain text value "${DEFAULT_PASSWORD}"...`);

  const { data: users, error: fetchError } = await supabase
    .from('users')
    .select('id');

  if (fetchError) {
    console.error('Failed to fetch users:', fetchError);
    process.exit(1);
  }

  let updatedCount = 0;
  for (const user of users) {
    const { error: updateError } = await supabase
      .from('users')
      .update({ password: DEFAULT_PASSWORD })
      .eq('id', user.id);

    if (updateError) {
      console.error(`Failed to update password for user ${user.id}:`, updateError);
    } else {
      updatedCount += 1;
    }
  }

  console.log(`Updated ${updatedCount} user record(s).`);
}

resetPasswords().catch((err) => {
  console.error('Unexpected error while resetting passwords:', err);
  process.exit(1);
});
