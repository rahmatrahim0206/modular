async function loadInitialData(isBackgroundPoll = false) {
    if (!GOOGLE_APPS_SCRIPT_URL || GOOGLE_APPS_SCRIPT_URL.includes("GANTI_URL")) return;
    try {
        const cacheBusterUrl = GOOGLE_APPS_SCRIPT_URL + (GOOGLE_APPS_SCRIPT_URL.includes('?') ? '&' : '?') + '_t=' + Date.now();
        const response = await fetch(cacheBusterUrl, { method: 'GET', cache: 'no-store' });
        if (response.ok) {
            const text = await response.text();
            if (text.trim().startsWith('<') || text.includes('<!DOCTYPE')) {
                console.warn("GAS Endpoint mengembalikan HTML/Error page. Pastikan Web App disetel ke 'Anyone'.");
                return;
            }
            const data = JSON.parse(text);
            onInitialDataLoaded(data, isBackgroundPoll);
        }
    } catch (err) {
        console.error("Gagal memuat data awal:", err);
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
            const text = await res.text();
            if (text.trim().startsWith('<') || text.includes('<!DOCTYPE')) {
                showToast("Server mengembalikan respon HTML. Periksa hak akses Web App.", "error");
                return null;
            }
            const data = JSON.parse(text);
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
    const adminPingBox = document.getElementById('adminBridgePingBox');
    const adminPingTime = document.getElementById('adminBridgeTime');

    if (badge) {
        badge.className = "h-10 px-3.5 rounded-xl bg-slate-800/80 backdrop-blur-md border border-slate-700/60 shadow-inner flex items-center gap-2.5 shrink-0";
        if (bridgeStatus.isConnected) {
            badge.innerHTML = `
                <div class="w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 pulse-live"></span>
                </div>
                <div class="text-left leading-tight">
                    <div class="font-bold text-white text-xs sm:text-sm tracking-wide whitespace-nowrap">ONLINE</div>
                    <div class="text-[9px] text-emerald-400 font-semibold hidden sm:block whitespace-nowrap">Terhubung</div>
                </div>
            `;
        } else {
            badge.innerHTML = `
                <div class="w-6 h-6 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0">
                    <span class="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                </div>
                <div class="text-left leading-tight">
                    <div class="font-bold text-white text-xs sm:text-sm tracking-wide whitespace-nowrap">OFFLINE</div>
                    <div class="text-[9px] text-rose-400 font-semibold hidden sm:block whitespace-nowrap">Terputus</div>
                </div>
            `;
        }
    }

    if (adminPingBox && adminPingTime) {
        if (bridgeStatus.isConnected) {
            adminPingTime.innerText = `Ping: ${bridgeStatus.lastPing || 'Aktif'}`;
            adminPingBox.className = "flex items-center justify-between gap-2 px-3.5 py-2.5 bg-emerald-50 border border-emerald-200/90 text-emerald-800 rounded-xl text-xs font-bold transition-all shadow-2xs";
        } else {
            adminPingTime.innerText = `Bridge Terputus`;
            adminPingBox.className = "flex items-center justify-between gap-2 px-3.5 py-2.5 bg-rose-50 border border-rose-200/90 text-rose-800 rounded-xl text-xs font-bold transition-all shadow-2xs";
        }
    }
}

function startSmartPolling() {
    if (pollingTimer) clearInterval(pollingTimer);
    pollingTimer = setInterval(() => { loadInitialData(true); }, pollingIntervalMs);
}
