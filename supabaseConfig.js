// Supabase Configuration
// Replace these with your actual Supabase project credentials

const SUPABASE_URL = 'https://tryytusvitsztadzqihq.supabase.co';

// Using your actual API key from supabaseClient.js
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyeXl0dXN2aXRzenRhZHpxaWhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3ODQyMTQsImV4cCI6MjA5NzM2MDIxNH0.R9GkjYXhvoN3Jw8nOkiparyHQRCE6uqZMAPpX3edAxA';

// Initialize Supabase client
let supabaseClient = null;

// Function to initialize Supabase
function initializeSupabase() {
  console.log('🔧 Initializing Supabase from supabaseConfig.js...');
  
  if (typeof window === 'undefined') {
    console.error('❌ Window object not available');
    return null;
  }
  
  if (!window.supabase) {
    console.error('❌ Supabase library not loaded');
    return null;
  }
  
  if (!window.supabase.createClient) {
    console.error('❌ Supabase createClient function not available');
    return null;
  }
  
  if (!SUPABASE_ANON_KEY) {
    console.error('❌ SUPABASE_ANON_KEY is missing');
    return null;
  }
  
  try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window.supabaseClient = supabaseClient;
    window.supabase = supabaseClient; // Also set for compatibility
    console.log('✅ Supabase client initialized successfully from supabaseConfig.js');
    console.log('📡 Ready to fetch users from database');
    return supabaseClient;
  } catch (error) {
    console.error('❌ Failed to create Supabase client:', error);
    return null;
  }
}

// Wait for Supabase library to load, then initialize
function waitForSupabaseAndInit() {
  if (typeof window !== 'undefined' && window.supabase && window.supabase.createClient) {
    initializeSupabase();
  } else {
    // Wait a bit more for the library to load
    setTimeout(waitForSupabaseAndInit, 100);
  }
}

// Test function to verify user fetching works
async function testUserFetching() {
  if (!supabaseClient) {
    console.error('❌ Supabase client not initialized');
    return;
  }
  
  try {
    console.log('🔍 Testing user fetch from database...');
    const { data: users, error } = await supabaseClient
      .from('users')
      .select('id, first_name, last_name, email, role_name')
      .limit(3);
    
    if (error) {
      console.error('❌ Error fetching users:', error);
      if (error.message.includes('Invalid API key')) {
        console.error('🔑 API key is invalid or expired. Please get a fresh one from Supabase dashboard.');
      }
    } else {
      console.log('✅ Successfully fetched users:', users);
      console.log(`📊 Found ${users.length} users in database`);
    }
  } catch (error) {
    console.error('❌ Test fetch failed:', error);
  }
}

// Auto-test after initialization
function initializeAndTest() {
  initializeSupabase();
  if (supabaseClient) {
    setTimeout(testUserFetching, 1000); // Wait 1 second then test
  }
}

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', waitForSupabaseAndInit);
} else {
  waitForSupabaseAndInit();
}
