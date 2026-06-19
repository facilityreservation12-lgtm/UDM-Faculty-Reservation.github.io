/**
 * Shared Supabase Client Utility for SuperAdmin Panel
 * This file should be loaded after the Supabase CDN script
 */

(function() {
  'use strict';

  console.log('SA_supabaseClient: Checking Supabase availability...');
  console.log('SA_supabaseClient: window.supabase type:', typeof window.supabase);
  console.log('SA_supabaseClient: window.supabase.createClient type:', typeof window.supabase?.createClient);

  // If we already have a valid supabaseClient with .from method, use it
  if (window.supabaseClient && typeof window.supabaseClient.from === 'function') {
    console.log('SA_supabaseClient: Using existing window.supabaseClient');
    window.supabase = window.supabaseClient;
    return;
  }

  // If we already have a valid supabase with .from method, use it and sync
  if (window.supabase && typeof window.supabase.from === 'function') {
    console.log('SA_supabaseClient: Using existing window.supabase');
    window.supabaseClient = window.supabase;
    return;
  }

  // Check if we can create a new client
  if (typeof window.supabase !== 'undefined' && typeof window.supabase.createClient === 'function') {
    console.log('SA_supabaseClient: Creating new Supabase client...');
    
    const SUPABASE_URL = 'https://tryytusvitsztadzqihq.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyeXl0dXN2aXRzenRhZHpxaWhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3ODQyMTQsImV4cCI6MjA5NzM2MDIxNH0.R9GkjYXhvoN3Jw8nOkiparyHQRCE6uqZMAPpX3edAxA';

    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    
    if (supabaseClient && typeof supabaseClient.from === 'function') {
      window.supabase = supabaseClient;
      window.supabaseClient = supabaseClient;
      console.log('SA_supabaseClient: Supabase client created successfully');
    } else {
      console.error('SA_supabaseClient: Failed to create valid Supabase client');
    }
  } else {
    console.error('SA_supabaseClient: window.supabase or createClient not available');
    console.error('SA_supabaseClient: window.supabase:', window.supabase);
    console.error('SA_supabaseClient: createClient:', window.supabase?.createClient);
  }

})();
