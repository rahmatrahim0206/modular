window.onload = function() {
    purgeBrowserCache();
    startLiveClock();
    initCharts();
    loadInitialData();
    startSmartPolling();

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            dismissPopup();
            closeTimeSchemeModal();
            closeManualAttendanceModal();
            closeEmployeeModal();
            closeShiftModal();
            closeLoginModal();
        }
    });
};

document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
        pollingIntervalMs = 30000;
    } else {
        pollingIntervalMs = 10000;
        loadInitialData(true);
    }
    startSmartPolling();
});