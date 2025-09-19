// Super Admin User Management System
// Clean version without syntax errors

// Global variables
let currentLoggedInUserId = null;
let allUsers = [];
let filteredUsers = [];
let currentPage = 1;
let entriesPerPage = 10;

// Get current user from localStorage
function getCurrentUser() {
    const userId = localStorage.getItem('user_id');
    console.log('Current user ID from localStorage:', userId);
    return userId || 'S001'; // Default fallback
}

// Get Supabase client
function getSupabase() {
    if (window.supabaseClient) {
        return window.supabaseClient;
    }
    console.error('❌ Supabase client not available');
    return null;
}

// Load current user account info (DISABLED - account section removed from HTML)
async function loadCurrentUserInfo() {
    console.log('ℹ️ loadCurrentUserInfo: Account section removed - function disabled');
}

// Load users from Supabase database
async function loadUsers() {
    const tbody = document.getElementById('userTableBody');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Loading users...</td></tr>';
    
    // Get current logged in user
    currentLoggedInUserId = getCurrentUser();
    
    // Wait a bit for supabaseClient.js to initialize
    let attempts = 0;
    let sb = getSupabase();
    
    while (!sb && attempts < 10) {
        console.log(`⏳ Waiting for Supabase client... (attempt ${attempts + 1}/10)`);
        await new Promise(resolve => setTimeout(resolve, 200));
        sb = getSupabase();
        attempts++;
    }
    
    if (!sb) {
        console.error('❌ Failed to get Supabase client after multiple attempts');
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px;">
            <div style="color: #dc3545; font-weight: 600;">Database Connection Failed</div>
            <div style="margin-top: 5px; font-size: 14px;">Could not initialize Supabase client</div>
            <div style="margin-top: 5px; font-size: 12px; color: #6c757d;">
                Check console for details and ensure supabaseClient.js is loaded
            </div>
            <button onclick="location.reload()" style="margin-top: 10px; padding: 5px 10px; background: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer;">Retry</button>
        </td></tr>`;
        return;
    }

    console.log('📡 Fetching users from Supabase database...');
    console.log('👤 Current logged in user ID:', currentLoggedInUserId);
    
    try {
        const { data: users, error } = await sb
            .from('users')
            .select('id, first_name, last_name, email, role_name')
            .order('id', { ascending: true });

        if (error) {
            console.error('❌ Error fetching users:', error);
            tbody.innerHTML = `<tr><td colspan="5" style="padding: 20px; text-align: center;">
                <div style="color: #dc3545; font-weight: 600;">Database Error</div>
                <div style="margin-top: 5px; font-size: 14px;">${error.message}</div>
                <div style="margin-top: 5px; font-size: 12px; color: #6c757d;">
                    Check your API key and database permissions
                </div>
                <button onclick="location.reload()" style="margin-top: 10px; padding: 5px 10px; background: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer;">Retry Connection</button>
            </td></tr>`;
            return;
        }

        console.log('✅ Successfully loaded users from database:', users);

        if (!users || users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No users found in database</td></tr>';
            return;
        }

        // Clear loading message
        tbody.innerHTML = '';

        // Store users globally for filtering and pagination
        window.allUsers = users;
        filteredUsers = users;
        
        // Reset to first page
        currentPage = 1;
        
        // Display paginated users
        displayPaginatedUsers();

        // Simulate online/offline status
        trackUserActivity();
        updateOnlineStatus();

    } catch (error) {
        console.error('❌ Error in loadUsers:', error);
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px;">
            <div style="color: #dc3545; font-weight: 600;">Loading Error</div>
            <div style="margin-top: 5px;">${error.message}</div>
            <button onclick="location.reload()" style="margin-top: 10px; padding: 5px 10px; background: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer;">Retry</button>
        </td></tr>`;
    }
}

// Initialize when page loads
console.log('SA_manage.js loaded, initializing...');
document.addEventListener('DOMContentLoaded', function() {
    loadUsers();
});

// Add basic stub functions for the rest of the functionality
function displayPaginatedUsers() {
    console.log('📄 displayPaginatedUsers called');
}

function trackUserActivity() {
    console.log('👥 trackUserActivity called');
}

function updateOnlineStatus() {
    console.log('🟢 updateOnlineStatus called');
}

function filterByID() {
    console.log('🔍 filterByID called');
}

function filterByName() {
    console.log('🔍 filterByName called');
}

function filterByRole() {
    console.log('🔍 filterByRole called');
}

function filterByStatus() {
    console.log('🔍 filterByStatus called');
}

function clearFilters() {
    console.log('🧹 clearFilters called');
}

function openAddModal() {
    console.log('➕ openAddModal called');
}

function closeModal() {
    console.log('❌ closeModal called');
}

function logout() {
    console.log('🚪 logout called');
    window.location.href = '../../User panel/LandingPage.html';
}

function changeEntriesPerPage() {
    console.log('📊 changeEntriesPerPage called');
}

function previousPage() {
    console.log('⬅️ previousPage called');
}

function nextPage() {
    console.log('➡️ nextPage called');
}

function closeConfirm() {
    console.log('❌ closeConfirm called');
}

function togglePassword(fieldId) {
    console.log('👁️ togglePassword called for:', fieldId);
}

console.log('✅ SA_manage.js loaded successfully - all functions defined');