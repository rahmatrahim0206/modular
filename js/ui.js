function startLiveClock() {
    const clockEl = document.getElementById('liveClock');
    const dateEl = document.getElementById('liveDate');

    function update() {
        const now = new Date();
        if (clockEl) clockEl.innerText = now.toLocaleTimeString('id-ID') + ' WITA';
        if (dateEl) dateEl.innerText = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
    update();
    setInterval(update, 1000);
}

function switchTab(tabId) {
    const adminOnlyTabs = ['employees', 'shifts', 'settings'];
    if (adminOnlyTabs.includes(tabId) && !isAdminLoggedIn) {
        openLoginModal();
        showToast("Silakan login sebagai admin terlebih dahulu", "error");
        return;
    }

    activeTab = tabId;
    document.querySelectorAll('.tab-view').forEach(el => el.classList.add('hidden'));

    const activeSection = document.getElementById(`view-${tabId}`);
    if (activeSection) activeSection.classList.remove('hidden');

    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
        btn.classList.remove('bg-brand-600', 'text-white', 'shadow-xs');
        btn.classList.add('text-slate-600', 'hover:text-slate-900', 'hover:bg-slate-100');
    });

    const activeBtn = document.getElementById(`tabBtn-${tabId}`);
    if (activeBtn) {
        activeBtn.classList.remove('text-slate-600', 'hover:text-slate-900', 'hover:bg-slate-100');
        activeBtn.classList.add('bg-brand-600', 'text-white', 'shadow-xs');
    }

    refreshAllViews(false);
}

function refreshAllViews(isBackgroundPoll = false) {
    updateDashboardStats();
    renderLiveFeed();
    if (activeTab === 'log') renderActivityLogTable();
    if (activeTab === 'employees') renderEmployeeList();
    if (activeTab === 'shifts') renderShifts();
    if (activeTab === 'settings') renderTimeSchemesTable();
    fillTimeRulesForm();
}

function updateDashboardStats() {
    const total = employeesData.length;
    const totalEl = document.getElementById('statTotalEmp');
    if (totalEl) totalEl.innerText = total;

    const todayISO = getTodayISO();
    const todayLogs = attendanceLogs.filter(l => l.date === todayISO || String(l.date).includes(todayISO));

    const uniquePresent = new Set(todayLogs.map(l => l.empId)).size;
    const lateCount = todayLogs.filter(l => l.status === 'TERLAMBAT').length;
    const absentCount = Math.max(0, total - uniquePresent);

    const presentTodayEl = document.getElementById('statPresentToday');
    if (presentTodayEl) presentTodayEl.innerText = uniquePresent;

    const pct = total > 0 ? Math.round((uniquePresent / total) * 100) : 0;
    const presentSubEl = document.getElementById('statPresentSub');
    if (presentSubEl) presentSubEl.innerText = `${pct}% dari total personel`;

    const lateTodayEl = document.getElementById('statLateToday');
    if (lateTodayEl) lateTodayEl.innerText = lateCount;

    const absentTodayEl = document.getElementById('statAbsentToday');
    if (absentTodayEl) absentTodayEl.innerText = absentCount;

    const firstScheme = timeSchemesData[0] || { name: 'Reguler', startTime: '07:30', endTime: '16:00' };
    const badgeEl = document.getElementById('displayScheduleNameBadge');
    if (badgeEl) badgeEl.innerText = firstScheme.name || 'Utama';

    const stdInEl = document.getElementById('displayStdIn');
    if (stdInEl) stdInEl.innerText = `${firstScheme.startTime || '07:30'} WITA`;

    const stdOutEl = document.getElementById('displayStdOut');
    if (stdOutEl) stdOutEl.innerText = `${firstScheme.endTime || '16:00'} WITA`;

    updateDonutChart();
}

function renderLiveFeed() {
    const feedContainer = document.getElementById('liveFeedList');
    if (!feedContainer) return;

    if (attendanceLogs.length === 0) {
        feedContainer.innerHTML = `
            <div class="text-center py-12 text-slate-400 font-medium text-xs">
                <i class="fa-solid fa-inbox text-3xl mb-2 text-slate-300"></i>
                <p>Belum ada pindaian absensi hari ini</p>
            </div>`;
        return;
    }

    feedContainer.innerHTML = attendanceLogs.slice(0, 10).map(log => {
        const emp = findEmployee(log.empId) || {};
        const isLate = log.status === 'TERLAMBAT';
        const isEarlyOut = log.status === 'PULANG CEPAT';
        const isOut = log.type === 'PULANG';

        let statusBadge = `<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-700">MASUK</span>`;
        if (isLate) statusBadge = `<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-700">TERLAMBAT</span>`;
        else if (isEarlyOut) statusBadge = `<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-700">PULANG CEPAT</span>`;
        else if (isOut) statusBadge = `<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-brand-100 text-brand-700">PULANG</span>`;

        return `
            <div class="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-100 transition-colors">
                <div class="flex items-center gap-3 min-w-0 pr-2">
                    <img src="${emp.photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200'}" class="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-200">
                    <div class="min-w-0">
                        <h4 class="font-extrabold text-xs text-slate-900 truncate" title="${emp.name || 'Personel'}">${emp.name || log.empId}</h4>
                        <p class="text-[11px] text-slate-500 truncate">${emp.category || '-'} • ${emp.role || '-'}</p>
                    </div>
                </div>
                <div class="text-right shrink-0">
                    <div class="font-mono font-bold text-xs text-slate-800">${formatTimeDisplay(log.time)}</div>
                    <div class="mt-0.5">${statusBadge}</div>
                </div>
            </div>`;
    }).join('');
}

function renderActivityLogTable() {
    const tbody = document.getElementById('logTableBody');
    if (!tbody) return;

    if (attendanceLogs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-slate-400">Belum ada data log aktivitas</td></tr>`;
        return;
    }

    tbody.innerHTML = attendanceLogs.map(log => {
        const emp = findEmployee(log.empId) || {};
        const isLate = log.status === 'TERLAMBAT';
        const isEarlyOut = log.status === 'PULANG CEPAT';
        const isOut = log.type === 'PULANG';
        const uniqueKey = getLogUniqueKey(log);

        let badgeClass = "bg-emerald-100 text-emerald-700";
        let statusLabel = log.status || "HADIR";

        if (isLate) badgeClass = "bg-amber-100 text-amber-700";
        else if (isEarlyOut) badgeClass = "bg-indigo-100 text-indigo-700";
        else if (isOut) { badgeClass = "bg-brand-100 text-brand-700"; statusLabel = "PULANG"; }

        const adminActionButtons = isAdminLoggedIn ? `
            <td class="p-3 text-right whitespace-nowrap admin-only">
                <button onclick="openManualAttendanceModalByUniqueKey('${uniqueKey}')" title="Edit Jam Absensi" class="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-brand-600">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button onclick="confirmDeleteLogByUniqueKey('${uniqueKey}')" title="Hapus Log Absensi" class="p-1.5 hover:bg-rose-50 rounded-lg text-slate-600 hover:text-rose-600">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </td>
        ` : `<td class="admin-only hidden"></td>`;

        return `
            <tr class="hover:bg-slate-50/80 transition-colors">
                <td class="p-3 font-mono text-slate-800 whitespace-nowrap">${log.date} ${formatTimeDisplay(log.time)}</td>
                <td class="p-3 font-bold text-slate-900 min-w-0 truncate" title="${emp.name || '-'}">${emp.name || log.empId}</td>
                <td class="p-3 font-mono text-slate-500 whitespace-nowrap">${emp.nip || '-'}</td>
                <td class="p-3 text-slate-600 whitespace-nowrap">${emp.category || '-'} - ${emp.role || '-'}</td>
                <td class="p-3 font-bold whitespace-nowrap">${log.type || 'MASUK'}</td>
                <td class="p-3 whitespace-nowrap">
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeClass}">${statusLabel}</span>
                </td>
                ${adminActionButtons}
            </tr>`;
    }).join('');
}

function filterLogTable() {
    const val = document.getElementById('logSearchInput').value.toLowerCase();
    const rows = document.querySelectorAll('#logTableBody tr');
    rows.forEach(r => {
        const text = r.innerText.toLowerCase();
        r.style.display = text.includes(val) ? '' : 'none';
    });
}

function renderEmployeeList() {
    const tbody = document.getElementById('employeeTableBody');
    if (!tbody) return;

    let filtered = employeesData;
    if (currentEmpCatFilter !== 'ALL') {
        filtered = employeesData.filter(e => e.category === currentEmpCatFilter);
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-slate-400">Belum ada data personel pada kategori ini</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(e => {
        const shift = shiftsData.find(s => s.id === e.shiftId) || { name: 'Standar Reguler', startTime: '07:30', endTime: '16:00' };
        return `
            <tr class="hover:bg-slate-50/80 transition-colors">
                <td class="p-3 flex items-center gap-3">
                    <img src="${e.photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200'}" class="w-8 h-8 rounded-full object-cover">
                    <span class="font-bold text-slate-900 truncate" title="${e.name}">${e.name}</span>
                </td>
                <td class="p-3 font-mono text-slate-600">${e.nip}</td>
                <td class="p-3 font-mono font-bold text-slate-800">${e.machineName || e.id}</td>
                <td class="p-3 font-bold text-brand-600">${e.category}</td>
                <td class="p-3 text-slate-600">${e.role}</td>
                <td class="p-3">
                    <span class="px-2 py-0.5 rounded bg-brand-50 text-brand-800 border border-brand-200 font-medium text-[10px] inline-flex items-center gap-1">
                        <i class="fa-solid fa-clock text-brand-600"></i> ${shift.name} (${shift.startTime} - ${shift.endTime})
                    </span>
                </td>
                <td class="p-3 text-right whitespace-nowrap">
                    <button onclick="openEmployeeModal('${e.id}')" class="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-brand-600"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button onclick="confirmDeleteEmployee('${e.id}')" class="p-1.5 hover:bg-rose-50 rounded-lg text-slate-600 hover:text-rose-600"><i class="fa-solid fa-trash-can"></i></button>
                </td>
            </tr>`;
    }).join('');
}

function setEmpCategoryFilter(cat) {
    currentEmpCatFilter = cat;
    document.querySelectorAll('.emp-cat-filter').forEach(btn => {
        if (btn.dataset.cat === cat) {
            btn.className = "emp-cat-filter px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 text-white";
        } else {
            btn.className = "emp-cat-filter px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200";
        }
    });
    renderEmployeeList();
}

function renderShifts() {
    const container = document.getElementById('shiftsGrid');
    if (!container) return;

    if (shiftsData.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <i class="fa-solid fa-calendar-xmark text-3xl text-slate-300 mb-2"></i>
                <p class="font-bold text-slate-700 text-xs">Belum ada shift kerja khusus</p>
                <p class="text-[11px] text-slate-400 mt-0.5">Seluruh personel secara otomatis menggunakan Skema Waktu Utama.</p>
            </div>`;
        return;
    }

    container.innerHTML = shiftsData.map(s => {
        const sch = timeSchemesData.find(ts => ts.name === s.schemeName) || {};
        const tolMin = sch.toleranceMin || 15;
        const tolEarlyOut = sch.toleranceEarlyOutMin || 10;
        const schemeName = s.schemeName || 'Jam Kerja Reguler Utama';
        const activeDays = Array.isArray(s.days) ? s.days : (s.days ? String(s.days).split(',') : ['Sen', 'Sel', 'Rab', 'Kam', 'Jum']);

        const dayBadges = ALL_DAYS.map(day => {
            const isActive = activeDays.includes(day);
            return `<span class="px-1.5 py-0.5 rounded text-[10px] font-extrabold ${isActive ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-400 opacity-50'}">${day}</span>`;
        }).join('');

        return `
        <div class="glass-card rounded-2xl p-4 border border-slate-200 flex flex-col justify-between">
            <div>
                <div class="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div>
                        <h4 class="font-extrabold text-slate-900 text-sm">${s.name}</h4>
                        <span class="px-2 py-0.5 rounded bg-brand-100 text-brand-800 font-bold text-[10px] inline-flex items-center gap-1 mt-1">
                            <i class="fa-solid fa-tag text-brand-600"></i> ${schemeName}
                        </span>
                    </div>
                    <span class="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-bold shrink-0">${s.id}</span>
                </div>

                <div class="mt-2.5 pb-2 border-b border-slate-100">
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Hari Kerja Aktif:</span>
                    <div class="flex items-center gap-1 flex-wrap">${dayBadges}</div>
                </div>

                <div class="mt-3 space-y-1.5 text-xs">
                    <div class="flex justify-between"><span class="text-slate-500">Jam Masuk:</span> <span class="font-mono font-bold text-slate-800">${s.startTime} WITA</span></div>
                    <div class="flex justify-between"><span class="text-slate-500">Toleransi Terlambat:</span> <span class="font-mono font-bold text-amber-600">+${tolMin} Mnt</span></div>
                    <div class="flex justify-between"><span class="text-slate-500">Jam Pulang:</span> <span class="font-mono font-bold text-slate-800">${s.endTime} WITA</span></div>
                    <div class="flex justify-between"><span class="text-slate-500">Toleransi Pulang Cepat:</span> <span class="font-mono font-bold text-indigo-600">-${tolEarlyOut} Mnt</span></div>
                    <p class="text-[11px] text-slate-400 mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100">${s.desc || '-'}</p>
                </div>
            </div>
            <div class="mt-4 pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button onclick="openShiftModal('${s.id}')" class="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors flex items-center gap-1">
                    <i class="fa-solid fa-pen-to-square text-brand-600"></i> Edit
                </button>
                <button onclick="confirmDeleteShift('${s.id}')" class="px-2.5 py-1 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition-colors flex items-center gap-1">
                    <i class="fa-solid fa-trash-can text-rose-600"></i> Hapus
                </button>
            </div>
        </div>`;
    }).join('');
}

function renderTimeSchemesTable() {
    const tbody = document.getElementById('timeSchemesTableBody');
    if (!tbody) return;

    const dataToRender = (typeof timeSchemesData !== 'undefined' && timeSchemesData) ? timeSchemesData : (typeof timeSchemes !== 'undefined' ? timeSchemes : []);

    if (!dataToRender || dataToRender.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-slate-400">Belum ada skema waktu kerja yang dikonfigurasi</td></tr>`;
        return;
    }

    tbody.innerHTML = dataToRender.map(scheme => {
        const startTime = scheme.startTime || scheme.start || '07:30';
        const endTime = scheme.endTime || scheme.end || '16:00';
        const scanInWindow = `${scheme.scanInStart || '05:00'} - ${scheme.scanInEnd || '11:00'}`;
        const scanOutWindow = `${scheme.scanOutStart || '11:01'} - ${scheme.scanOutEnd || '20:00'}`;

        return `
            <tr class="hover:bg-slate-50/80 transition-colors">
                <td class="p-3 font-bold text-slate-900">${scheme.name || '-'}</td>
                <td class="p-3 font-mono font-extrabold text-slate-800">
                    ${startTime} - ${endTime} WITA
                </td>
                <td class="p-3 font-mono text-slate-600">
                    <span class="text-amber-600 font-bold">+${scheme.toleranceMin || 15} Mnt</span> / 
                    <span class="text-indigo-600 font-bold">-${scheme.toleranceEarlyOutMin || 10} Mnt</span>
                </td>
                <td class="p-3 text-slate-600">
                    <div class="text-[10px]"><span class="font-bold">Masuk:</span> ${scanInWindow}</div>
                    <div class="text-[10px]"><span class="font-bold">Pulang:</span> ${scanOutWindow}</div>
                </td>
                <td class="p-3 text-slate-500">${scheme.desc || '-'}</td>
                <td class="p-3 text-right whitespace-nowrap">
                    <button onclick="openTimeSchemeModal('${scheme.id}')" class="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-brand-600"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button onclick="confirmDeleteTimeScheme('${scheme.id}')" class="p-1.5 hover:bg-rose-50 rounded-lg text-slate-600 hover:text-rose-600"><i class="fa-solid fa-trash-can"></i></button>
                </td>
            </tr>`;
    }).join('');
}

function fillTimeRulesForm() {
    const autoPopupCb = document.getElementById('inputAutoPopup');
    const playSoundCb = document.getElementById('inputPlaySound');

    if (autoPopupCb) autoPopupCb.checked = !!timeRules.autoPopup;
    if (playSoundCb) playSoundCb.checked = !!timeRules.playSound;
}

function updateAdminUIState() {
    const adminElements = document.querySelectorAll('.admin-only');
    const headerBtnContainer = document.getElementById('authHeaderContainer');
    const badgeContainer = document.getElementById('adminBadgeContainer');

    if (isAdminLoggedIn) {
        adminElements.forEach(el => el.classList.remove('hidden'));
        if (badgeContainer) badgeContainer.classList.remove('hidden');
        
        if (headerBtnContainer) {
            headerBtnContainer.innerHTML = `
                <button onclick="handleLogout()" title="Keluar dari Admin" class="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-all active:scale-95 shadow-xs">
                    <i class="fa-solid fa-right-from-bracket text-xs sm:text-sm"></i>
                </button>
            `;
        }
    } else {
        adminElements.forEach(el => el.classList.add('hidden'));
        if (badgeContainer) badgeContainer.classList.add('hidden');
        
        if (headerBtnContainer) {
            headerBtnContainer.innerHTML = `
                <button id="loginHeaderBtn" onclick="openLoginModal()" title="Login Admin" class="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-all active:scale-95 shadow-xs">
                    <i class="fa-solid fa-lock text-xs sm:text-sm"></i>
                </button>
            `;
        }
    }
    refreshAllViews(false);
}

function initCharts() {
    const ctx = document.getElementById('categoryDonutChart');
    if (!ctx) return;

    categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Guru', 'Pegawai', 'Keamanan', 'Kebersihan'],
            datasets: [{
                data: [0, 0, 0, 0],
                backgroundColor: ['#0ea5e9', '#6366f1', '#f59e0b', '#10b981'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            cutout: '70%'
        }
    });
}

function updateDonutChart() {
    if (!categoryChart) return;
    const guru = employeesData.filter(e => String(e.category).toUpperCase() === 'GURU').length;
    const pegawai = employeesData.filter(e => String(e.category).toUpperCase() === 'PEGAWAI').length;
    const keamanan = employeesData.filter(e => String(e.category).toUpperCase() === 'KEAMANAN').length;
    const kebersihan = employeesData.filter(e => String(e.category).toUpperCase() === 'KEBERSIHAN').length;

    categoryChart.data.datasets[0].data = [guru, pegawai, keamanan, kebersihan];
    categoryChart.update();
}

function triggerLivePopup(logEntry) {
    if (!timeRules.autoPopup) return;
    if (popupAutoTimer) { clearTimeout(popupAutoTimer); popupAutoTimer = null; }

    const emp = findEmployee(logEntry.empId) || {};
    const overlay = document.getElementById('livePopupOverlay');
    const card = document.getElementById('livePopupCard');
    const progressBar = document.getElementById('popupProgressBar');

    const avatarEl = document.getElementById('popupAvatar');
    if (avatarEl) avatarEl.src = emp.photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200';
    
    const nameEl = document.getElementById('popupName');
    if (nameEl) { nameEl.innerText = emp.name || logEntry.empId; nameEl.title = emp.name || logEntry.empId; }

    const nipEl = document.getElementById('popupNip');
    if (nipEl) nipEl.innerText = `NIP: ${emp.nip || logEntry.empId}`;

    const catEl = document.getElementById('popupCategory');
    if (catEl) catEl.innerText = `${emp.category || '-'} • ${emp.role || '-'}`;

    const timeEl = document.getElementById('popupTime');
    if (timeEl) timeEl.innerText = formatTimeDisplay(logEntry.time);

    const statusText = document.getElementById('popupStatusText');
    if (statusText) {
        if (logEntry.status === 'TERLAMBAT') {
            statusText.className = "px-3.5 py-1.5 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 border border-amber-200 flex items-center justify-center gap-1.5 shadow-xs";
            statusText.innerHTML = `<i class="fa-solid fa-clock-rotate-left text-amber-600"></i> MASUK • TERLAMBAT`;
            if (progressBar) progressBar.className = "h-full bg-amber-500 w-full transition-all ease-linear";
        } else if (logEntry.status === 'PULANG CEPAT') {
            statusText.className = "px-3.5 py-1.5 rounded-full text-xs font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center justify-center gap-1.5 shadow-xs";
            statusText.innerHTML = `<i class="fa-solid fa-clock-rotate-left text-indigo-600"></i> PULANG CEPAT`;
            if (progressBar) progressBar.className = "h-full bg-indigo-500 w-full transition-all ease-linear";
        } else if (logEntry.type === 'PULANG') {
            statusText.className = "px-3.5 py-1.5 rounded-full text-xs font-extrabold bg-brand-100 text-brand-800 border border-brand-200 flex items-center justify-center gap-1.5 shadow-xs";
            statusText.innerHTML = `<i class="fa-solid fa-right-from-bracket text-brand-600"></i> PULANG`;
            if (progressBar) progressBar.className = "h-full bg-brand-500 w-full transition-all ease-linear";
        } else {
            statusText.className = "px-3.5 py-1.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center gap-1.5 shadow-xs";
            statusText.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-600"></i> MASUK • HADIR`;
            if (progressBar) progressBar.className = "h-full bg-emerald-500 w-full transition-all ease-linear";
        }
    }

    if (progressBar) { progressBar.style.transition = 'none'; progressBar.style.width = '100%'; }
    if (timeRules.playSound) playChimeSound();

    if (overlay) overlay.classList.remove('hidden');
    setTimeout(() => {
        if (card) { card.classList.remove('scale-90', 'opacity-0'); card.classList.add('scale-100', 'opacity-100'); }
        if (progressBar) { progressBar.style.transition = 'width 3500ms linear'; progressBar.style.width = '0%'; }
    }, 20);

    popupAutoTimer = setTimeout(() => { dismissPopup(); }, 3500);
}

function dismissPopup() {
    if (popupAutoTimer) { clearTimeout(popupAutoTimer); popupAutoTimer = null; }
    const overlay = document.getElementById('livePopupOverlay');
    const card = document.getElementById('livePopupCard');
    if (!overlay || overlay.classList.contains('hidden')) return;

    if (card) { card.classList.remove('scale-100', 'opacity-100'); card.classList.add('scale-90', 'opacity-0'); }
    setTimeout(() => { overlay.classList.add('hidden'); }, 200);
}