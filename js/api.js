async function loadInitialData(isBackgroundPoll = false) {
    if (!GOOGLE_APPS_SCRIPT_URL || GOOGLE_APPS_SCRIPT_URL.includes("GANTI_URL")) return;
    try {
        const cacheBusterUrl = GOOGLE_APPS_SCRIPT_URL + (GOOGLE_APPS_SCRIPT_URL.includes('?') ? '&' : '?') + '_t=' + Date.now();
        const response = await fetch(cacheBusterUrl, { method: 'GET', cache: 'no-store' });
        if (response.ok) {
            const data = await response.json();
            onInitialDataLoaded(data, isBackgroundPoll);
        }
    } catch (err) { }
}

async function sendApiPost(payload) {
    try {
        const res = await fetch(GOOGLE_APPS_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            const data = await res.json();
            if (data.employees || data.attendanceLogs) onInitialDataLoaded(data);
            else loadInitialData();
            return data;
        }
    } catch (err) {
        showToast("Gagal menyimpan data ke server", "error");
    }
}

function onInitialDataLoaded(data, isBackgroundPoll = false) {
    if (!data) return;
    if (data.employees) employeesData = data.employees;
    if (data.shifts) shiftsData = data.shifts;
    if (data.timeRules) timeRules = data.timeRules;
    if (data.timeSchemes) timeSchemesData = data.timeSchemes;
    if (data.bridgeStatus) {
        bridgeStatus = data.bridgeStatus;
        updateBridgeStatusUI();
    }

    if (data.attendanceLogs) {
        const newLogs = data.attendanceLogs;
        if (newLogs.length > 0) {
            const currentTopKey = getLogUniqueKey(newLogs[0]);
            if (isBackgroundPoll && lastKnownTopLogKey && currentTopKey !== lastKnownTopLogKey) triggerLivePopup(newLogs[0]);
            lastKnownTopLogKey = currentTopKey;
        }
        attendanceLogs = newLogs;
    }
    refreshAllViews(isBackgroundPoll);
}

function updateBridgeStatusUI() {
    const badge = document.getElementById('bridgeStatusBadge');
    if (!badge) return;
    if (bridgeStatus.isConnected) {
        badge.className = "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 shrink-0";
        badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span> ONLINE`;
    } else {
        badge.className = "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 shrink-0";
        badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span> OFFLINE`;
    }
}

function startSmartPolling() {
    if (pollingTimer) clearInterval(pollingTimer);
    pollingTimer = setInterval(() => { loadInitialData(true); }, pollingIntervalMs);
}
