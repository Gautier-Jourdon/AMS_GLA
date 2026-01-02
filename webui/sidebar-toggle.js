if (typeof document !== 'undefined') {
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');

    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            console.log('[SIDEBAR] Toggle clicked');
            sidebar.classList.toggle('show');
            const isVisible = sidebar.classList.contains('show');
            console.log('[SIDEBAR] New state:', isVisible ? 'VISIBLE' : 'HIDDEN');

            sidebarToggle.setAttribute('aria-label', isVisible ? 'Close sidebar' : 'Open sidebar');
            sidebarToggle.textContent = isVisible ? '×' : '☰';
        });
    }
}

export function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.classList.toggle('show');
    }
}
