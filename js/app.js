window.addEventListener('load', function() {
    try { if (typeof purgeBrowserCache === 'function') purgeBrowserCache(); } catch(e){}
    try { if (typeof startLiveClock === 'function') startLiveClock(); } catch(e){}
    try { if (typeof initCharts === 'function') initCharts(); } catch(e){}
    try { if (typeof loadInitialData === 'function') loadInitialData(false); } catch(e){}
    try { if (typeof startSmartPolling === 'function') startSmartPolling(); } catch(e){}

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            try {
                if (typeof dismissPopup === 'function') dismissPopup();
                if (typeof closeTimeSchemeModal === 'function') closeTimeSchemeModal();
                if (typeof closeManualAttendanceModal === 'function') closeManualAttendanceModal();
                if (typeof closeEmployeeModal === 'function') closeEmployeeModal();
                if (typeof closeShiftModal === 'function') closeShiftModal();
                if (typeof closeLoginModal === 'function') closeLoginModal();
                if (typeof closeDeleteModal === 'function') closeDeleteModal();
            } catch(err){}
        }
    });
});

document.addEventListener("visibilitychange", () => {
    try {
        if (typeof pollingIntervalMs === 'undefined') return;
        if (document.hidden) {
            pollingIntervalMs = 30000;
        } else {
            pollingIntervalMs = 10000;
            if (typeof loadInitialData === 'function') loadInitialData(true);
        }
        if (typeof startSmartPolling === 'function') startSmartPolling();
    } catch(err){}
});
