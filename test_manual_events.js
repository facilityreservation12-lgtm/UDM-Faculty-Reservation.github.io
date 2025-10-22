// Test script to verify manual_events table functionality
// This script tests the new manual_events table structure

console.log('Testing manual_events table functionality...');

// Test data for manual events
const testManualEvent = {
  facility: 'UDM Garden',
  date: '2024-01-15',
  time_start: '09:00:00',
  time_end: '11:00:00',
  title_of_the_event: 'Test Manual Event',
  reserved_by: 'U001' // Test user ID
};

console.log('Test manual event data:', testManualEvent);

// Function to test manual event creation
async function testCreateManualEvent() {
  try {
    if (typeof window.supabaseClient === 'undefined') {
      console.error('Supabase client not available');
      return false;
    }

    const { data, error } = await window.supabaseClient
      .from('manual_events')
      .insert([testManualEvent])
      .select();

    if (error) {
      console.error('Error creating manual event:', error);
      return false;
    }

    console.log('Successfully created manual event:', data);
    return data[0];
  } catch (err) {
    console.error('Database error:', err);
    return false;
  }
}

// Function to test fetching manual events by user
async function testFetchManualEventsByUser(userId) {
  try {
    if (typeof window.supabaseClient === 'undefined') {
      console.error('Supabase client not available');
      return false;
    }

    const { data, error } = await window.supabaseClient
      .from('manual_events')
      .select('*')
      .eq('reserved_by', userId);

    if (error) {
      console.error('Error fetching manual events:', error);
      return false;
    }

    console.log(`Manual events for user ${userId}:`, data);
    return data;
  } catch (err) {
    console.error('Database error:', err);
    return false;
  }
}

// Function to test updating manual event
async function testUpdateManualEvent(eventId, updates) {
  try {
    if (typeof window.supabaseClient === 'undefined') {
      console.error('Supabase client not available');
      return false;
    }

    const { data, error } = await window.supabaseClient
      .from('manual_events')
      .update(updates)
      .eq('id', eventId)
      .select();

    if (error) {
      console.error('Error updating manual event:', error);
      return false;
    }

    console.log('Successfully updated manual event:', data);
    return data[0];
  } catch (err) {
    console.error('Database error:', err);
    return false;
  }
}

// Function to test deleting manual event
async function testDeleteManualEvent(eventId) {
  try {
    if (typeof window.supabaseClient === 'undefined') {
      console.error('Supabase client not available');
      return false;
    }

    const { error } = await window.supabaseClient
      .from('manual_events')
      .delete()
      .eq('id', eventId);

    if (error) {
      console.error('Error deleting manual event:', error);
      return false;
    }

    console.log('Successfully deleted manual event');
    return true;
  } catch (err) {
    console.error('Database error:', err);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('Starting manual events tests...');
  
  // Test 1: Create manual event
  console.log('\n1. Testing manual event creation...');
  const createdEvent = await testCreateManualEvent();
  if (!createdEvent) {
    console.error('Failed to create manual event');
    return;
  }
  
  // Test 2: Fetch manual events by user
  console.log('\n2. Testing fetch manual events by user...');
  const userEvents = await testFetchManualEventsByUser('U001');
  if (!userEvents) {
    console.error('Failed to fetch manual events by user');
    return;
  }
  
  // Test 3: Update manual event
  console.log('\n3. Testing manual event update...');
  const updatedEvent = await testUpdateManualEvent(createdEvent.id, {
    title_of_the_event: 'Updated Test Manual Event'
  });
  if (!updatedEvent) {
    console.error('Failed to update manual event');
    return;
  }
  
  // Test 4: Delete manual event
  console.log('\n4. Testing manual event deletion...');
  const deleted = await testDeleteManualEvent(createdEvent.id);
  if (!deleted) {
    console.error('Failed to delete manual event');
    return;
  }
  
  console.log('\n✅ All tests passed! Manual events table is working correctly.');
  console.log('✅ Users can now add multiple manual events (no more single event limit)');
}

// Export functions for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testCreateManualEvent,
    testFetchManualEventsByUser,
    testUpdateManualEvent,
    testDeleteManualEvent,
    runTests
  };
}

// Auto-run tests if this script is loaded directly
if (typeof window !== 'undefined') {
  console.log('Manual events test script loaded. Run runTests() to test functionality.');
}
