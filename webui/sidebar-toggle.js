// Sidebar toggle functionality
if (typeof document !== 'undefined') {
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');

    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('show'); // Changed from 'collapsed' to 'show'

            // Update aria label and icon
            const isVisible = sidebar.classList.contains('show');
            sidebarToggle.setAttribute('aria-label', isVisible ? 'Close sidebar' : 'Open sidebar');
            sidebarToggle.textContent = isVisible ? '×' : '☰';
        });
    }
}

// Export for module usage
export function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.classList.toggle('show');
    }
}
