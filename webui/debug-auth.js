// Debug helper for auth flow - add comprehensive logging
// Import this in home.html to help diagnose issues

// Enhanced initApp with detailed logging
window.debugInitApp = function () {
    console.log('=== [DEBUG] Manual initApp call ===');
    console.log('[DEBUG] localStorage keys:', Object.keys(localStorage));
    console.log('[DEBUG] authToken:', localStorage.getItem('authToken')?.substring(0, 50) + '...');
    console.log('[DEBUG] authUser:', localStorage.getItem('authUser'));

    const userStr = localStorage.getItem('authUser');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            console.log('[DEBUG] Parsed user:', user);
            console.log('[DEBUG] User email:', user.email);
        } catch (e) {
            console.error('[DEBUG] Failed to parse user:', e);
        }
    }

    console.log('[DEBUG] DOM elements:');
    console.log('  - #current-user-email:', document.getElementById('current-user-email'));
    console.log('  - #logout-btn:', document.getElementById('logout-btn'));
    console.log('  - #main-panel:', document.getElementById('main-panel'));
};

// Call this from browser console: debugInitApp()
console.log('[DEBUG] Debug helper loaded. Call window.debugInitApp() to run diagnostics.');
