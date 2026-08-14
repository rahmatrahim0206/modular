async function loadInitialData(isBackgroundPoll = false) {
    if (!GOOGLE_APPS_SCRIPT_URL || GOOGLE_APPS_SCRIPT_URL.includes("GANTI_URL")) return;

    try {
        const cacheBusterUrl = GOOGLE_APPS_SCRIPT_URL + (GOOGLE_APPS_SCRIPT_URL.includes('?') ? '&' : '?') + '_t=' + Date.now();
        const response = await fetch(cacheBusterUrl, {
            method: 'GET',
            cache: 'no-store'
        });
        if (response.ok) {
            const data = await response.json();
            onInitialDataLoaded(data, isBackgroundPoll);
        }
    } catch (err) {
        console.warn("REST API polling notice:", err);
    }
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
            if (data.employees || data.attendanceLogs) {
                onInitialDataLoaded(data);
            } else {
                loadInitialData();
            }
            return data;
        }
    } catch (err) {
        console.error("API POST error:", err);
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
            if (isBackgroundPoll && lastKnownTopLogKey && currentTopKey !== lastKnownTopLogKey) {
                triggerLivePopup(newLogs[0]);
            }
            lastKnownTopLogKey = currentTopKey;
        }
        attendanceLogs = newLogs;
    }

    refreshAllViews(isBackgroundPoll);
}

function updateBridgeStatusUI() {
    const badge = document.getElementById('bridgeStatusBadge');
    const dot = document.getElementById('bridgeDot');
    const txt = document.getElementById('bridgeText');
    const modalBadge = document.getElementById('bridgeBadge');

    if (bridgeStatus.isConnected) {
        if (badge) {
            badge.className = "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700";
            badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span> ONLINE`;
        }
        if (dot) dot.className = "w-2.5 h-2.5 rounded-full bg-emerald-500 pulse-live";
        if (txt) txt.innerHTML = `Terhubung ke Mesin (${bridgeStatus.ip || 'Local'}) • Ping: ${bridgeStatus.lastPing || 'Aktif'}`;
        if (modalBadge) {
            modalBadge.className = "px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200";
            modalBadge.innerText = "ONLINE";
        }
    } else {
        if (badge) {
            badge.className = "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700";
            badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span> OFFLINE`;
        }
        if (dot) dot.className = "w-2.5 h-2.5 rounded-full bg-rose-500";
        if (txt) txt.innerText = "Bridge belum terhubung / terputus";
        if (modalBadge) {
            modalBadge.className = "px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200";
            modalBadge.innerText = "OFFLINE";
        }
    }
}

function startSmartPolling() {
    if (pollingTimer) clearInterval(pollingTimer);
    pollingTimer = setInterval(() => {
        loadInitialData(true);
    }, pollingIntervalMs);
}