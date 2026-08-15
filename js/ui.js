function startLiveClock() {
    const clockEl = document.getElementById('liveClock');
    const dateEl = document.getElementById('liveDate');
    function update() {
        const now = new Date();
        if (clockEl) clockEl.innerText = now.toLocaleTimeString('id-ID') + ' WITA';
        if (dateEl) dateEl.innerText = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
    update(); setInterval(update, 1000);
}

let isSidebarCollapsed = false;

function toggleSidebar() {
    isSidebarCollapsed = !isSidebarCollapsed;
    const body = document.body;
    const expandBtn = document.getElementById('sidebarExpandBtn');
    
    if (isSidebarCollapsed) {
        body.classList.add('sidebar-collapsed');
        if (expandBtn) expandBtn.classList.remove('hidden');
    } else {
        body.classList.remove('sidebar-collapsed');
        if (expandBtn) expandBtn.classList.add('hidden');
    }
    
    // Otomatis resize grafik saat sidebar disembunyikan / ditampilkan
    if (typeof categoryChart !== 'undefined' && categoryChart) {
        setTimeout(() => {
            categoryChart.resize();
        }, 320);
    }
}

function toggleSettingsDropdown(forceOpen = false) {
    const subMenu = document.getElementById('settingsSubMenu');
    const chevron = document.getElementById('settingsChevron');
    if (!subMenu) return;

    const isMobile = window.innerWidth < 1024;

    if (forceOpen || subMenu.classList.contains('hidden')) {
        subMenu.classList.remove('hidden');
        subMenu.classList.add('flex');
        if (isMobile) {
            subMenu.classList.add('flex-row', 'items-center');
            subMenu.classList.remove('flex-col');
        } else {
            subMenu.classList.add('flex-col');
            subMenu.classList.remove('flex-row', 'items-center');
        }
        if (chevron) chevron.classList.add('rotate-180');
    } else {
        subMenu.classList.add('hidden');
        subMenu.classList.remove('flex', 'flex-row', 'flex-col');
        if (chevron) chevron.classList.remove('rotate-180');
    }
}

function switchTab(tabId) {
    if (['employees', 'shifts', 'settings'].includes(tabId) && !isAdminLoggedIn) {
        openLoginModal(); showToast("Silakan login sebagai admin", "error"); return;
    }
    activeTab = tabId;
    document.querySelectorAll('.tab-view').forEach(el => el.classList.add('hidden'));
    const activeSec = document.getElementById(`view-${tabId}`);
    if (activeSec) activeSec.classList.remove('hidden');

    document.querySelectorAll('.nav-tab-btn, .sub-tab-btn').forEach(btn => btn.classList.remove('active'));
    
    if (['shifts', 'settings'].includes(tabId)) {
        toggleSettingsDropdown(true);
        const mainBtn = document.getElementById('tabBtn-settings-main');
        if (mainBtn) mainBtn.classList.add('active');
    }

    const activeBtn = document.getElementById(`tabBtn-${tabId}`);
    if (activeBtn) activeBtn.classList.add('active');

    refreshAllViews(false);
}

function refreshAllViews(isBgPoll = false) {
    try { updateDashboardStats(); } catch(e){}
    try { renderLiveFeed(); } catch(e){}
    try { renderAbsentList(); } catch(e){}
    try { updateCategoryBars(); } catch(e){}
    
    if (activeTab === 'log') { try { renderActivityLogTable(); } catch(e){} }
    if (activeTab === 'employees') { try { renderEmployeeList(); } catch(e){} }
    if (activeTab === 'shifts') { try { renderShifts(); } catch(e){} }
    if (activeTab === 'settings') { 
        try { renderTimeSchemesTable(); } catch(e){} 
        try { fillTimeRulesForm(); } catch(e){} 
    }
}

function updateDashboardStats() {
    const total = employeesData.length;
    const totalEl = document.getElementById('statTotalEmp');
    if (totalEl) totalEl.innerText = total;

    const todayISO = getTodayISO();
    const todayLogs = attendanceLogs.filter(l => String(l.date).includes(todayISO));

    const uniquePresent = new Set(todayLogs.map(l => l.empId)).size;
    const lateCount = todayLogs.filter(l => l.status === 'TERLAMBAT').length;
    const absentCount = Math.max(0, total - uniquePresent);

    const presEl = document.getElementById('statPresentToday');
    if (presEl) presEl.innerText = uniquePresent;
    const subEl = document.getElementById('statPresentSub');
    if (subEl) subEl.innerText = `${total > 0 ? ((uniquePresent / total) * 100).toFixed(1) : 0}% total`;
    const lateEl = document.getElementById('statLateToday');
    if (lateEl) lateEl.innerText = lateCount;
    const absEl = document.getElementById('statAbsentToday');
    if (absEl) absEl.innerText = absentCount;

    const firstScheme = timeSchemesData[0] || { startTime: '07:30', endTime: '16:00' };
    const inEl = document.getElementById('displayStdIn');
    if (inEl) inEl.innerText = `${formatTimeDisplay(firstScheme.startTime || firstScheme.start || '07:30').replace(' WITA','')}`;
    const outEl = document.getElementById('displayStdOut');
    if (outEl) outEl.innerText = `${formatTimeDisplay(firstScheme.endTime || firstScheme.end || '16:00').replace(' WITA','')}`;
}

function updateCategoryBars() {
    const todayISO = getTodayISO();
    const todayLogs = attendanceLogs.filter(l => String(l.date).includes(todayISO));
    const presentEmpIds = new Set(todayLogs.map(l => String(l.empId)));

    const count = { 'GURU': 0, 'PEGAWAI': 0, 'KEAMANAN': 0, 'KEBERSIHAN': 0 };

    employeesData.forEach(e => {
        const isPresent = presentEmpIds.has(String(e.id)) || (e.machineName && presentEmpIds.has(String(e.machineName)));
        if (isPresent) {
            const cat = (e.category || '').toUpperCase();
            if (count[cat] !== undefined) count[cat]++;
        }
    });

    ['GURU', 'PEGAWAI', 'KEAMANAN', 'KEBERSIHAN'].forEach(cat => {
        const cnt = count[cat] || 0;
        const countEl = document.getElementById(`barCount${cat}`);
        if (countEl) countEl.innerText = cnt;
    });

    renderBarChart(count);
}

function renderBarChart(countObj) {
    const canvas = document.getElementById('categoryBarChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const chartData = [
        countObj['GURU'] || 0,
        countObj['PEGAWAI'] || 0,
        countObj['KEAMANAN'] || 0,
        countObj['KEBERSIHAN'] || 0
    ];

    if (categoryChart) {
        categoryChart.data.datasets[0].data = chartData;
        categoryChart.update();
        return;
    }

    const isSmallScreen = window.innerWidth < 640;

    categoryChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Guru', 'Pegawai', 'Keamanan', 'Kebersihan'],
            datasets: [{
                label: 'Jumlah Hadir',
                data: chartData,
                backgroundColor: [
                    '#0ea5e9', // Sky blue for Guru
                    '#6366f1', // Indigo for Pegawai
                    '#f59e0b', // Amber for Keamanan
                    '#10b981'  // Emerald for Kebersihan
                ],
                borderRadius: 8,
                borderSkipped: false,
                maxBarThickness: isSmallScreen ? 36 : 48,
                categoryPercentage: 0.65,
                barPercentage: 0.75
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    padding: 8,
                    titleFont: { family: 'Inter', size: 11, weight: 'bold' },
                    bodyFont: { family: 'Inter', size: 11 },
                    callbacks: {
                        label: function(context) {
                            return ` ${context.raw} Personel Hadir`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { precision: 0, font: { family: 'Inter', size: 10, weight: '600' } },
                    grid: { color: '#f1f5f9', drawBorder: false }
                },
                x: {
                    grid: { display: false },
                    ticks: {
                        display: true, // Display labels under all 4 bars
                        font: { family: 'Inter', size: 11, weight: '700' },
                        color: '#475569'
                    }
                }
            }
        }
    });
}

function renderLiveFeed() {
    const container = document.getElementById('liveFeedList');
    if (!container) return;
    if (attendanceLogs.length === 0) {
        container.innerHTML = `<div class="text-center py-8 text-slate-400 font-medium text-xs"><p>Belum ada pindaian absensi hari ini</p></div>`; return;
    }
    container.innerHTML = attendanceLogs.slice(0, 10).map(log => {
        const emp = findEmployee(log.empId) || {};
        let badge = `<span class="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[9px] sm:text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">MASUK</span>`;
        if (log.status === 'TERLAMBAT') badge = `<span class="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[9px] sm:text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">TERLAMBAT</span>`;
        else if (log.status === 'PULANG CEPAT') badge = `<span class="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[9px] sm:text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">PULANG CEPAT</span>`;
        else if (log.type === 'PULANG') badge = `<span class="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[9px] sm:text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">PULANG</span>`;

        return `
            <div class="live-feed-row flex items-center justify-between p-2 sm:p-2.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/60 transition-colors">
                <div class="flex items-center gap-2.5 sm:gap-3 min-w-0 pr-2">
                    <img src="${emp.photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200'}" class="w-7 h-7 sm:w-9 sm:h-9 rounded-full object-cover shrink-0 border border-slate-200 shadow-xs">
                    <div class="min-w-0">
                        <h4 class="font-extrabold text-xs text-slate-900 truncate">${emp.name || log.empId}</h4>
                        <p class="text-[9px] sm:text-[10px] text-slate-500 truncate">${emp.category || '-'} • ${emp.role || '-'}</p>
                    </div>
                </div>
                <div class="text-right shrink-0">
                    <div class="font-mono font-bold text-[10px] sm:text-xs text-slate-800">${formatTimeDisplay(log.time)}</div>
                    <div class="mt-0.5">${badge}</div>
                </div>
            </div>`;
    }).join('');
}

function renderAbsentList() {
    const container = document.getElementById('absentList');
    const countBadge = document.getElementById('absentListCount');
    if (!container) return;

    const todayISO = getTodayISO();
    const todayLogs = attendanceLogs.filter(l => String(l.date).includes(todayISO));
    const presentEmpIds = new Set(todayLogs.map(l => String(l.empId)));

    const absentEmps = employeesData.filter(e => !presentEmpIds.has(String(e.id)) && (!e.machineName || !presentEmpIds.has(String(e.machineName))));

    if (countBadge) countBadge.innerText = absentEmps.length;

    if (absentEmps.length === 0) {
        container.innerHTML = `<div class="text-center py-6 text-emerald-600 font-bold text-xs"><i class="fa-solid fa-circle-check text-base mb-1 block"></i>Semua personel hadir!</div>`;
        return;
    }

    container.innerHTML = absentEmps.map(emp => `
        <div class="flex items-center justify-between p-1.5 sm:p-2 hover:bg-slate-50 rounded-xl transition-colors">
            <div class="flex items-center gap-2 sm:gap-2.5 min-w-0">
                <img src="${emp.photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200'}" class="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover shrink-0 border border-slate-200">
                <div class="min-w-0">
                    <h5 class="font-extrabold text-[11px] sm:text-xs text-slate-900 truncate">${emp.name}</h5>
                    <p class="text-[9px] sm:text-[10px] text-slate-400 truncate">${emp.category || '-'} • ${emp.nip || '-'}</p>
                </div>
            </div>
            <span class="px-1.5 py-0.5 sm:px-2 rounded-md text-[8px] sm:text-[9px] font-bold bg-rose-50 text-rose-600 border border-rose-100 shrink-0">BELUM SCAN</span>
        </div>
    `).join('');
}

function renderActivityLogTable() {
    const tbody = document.getElementById('logTableBody');
    if (!tbody) return;
    if (attendanceLogs.length === 0) { tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-slate-400">Belum ada data</td></tr>`; return; }
    tbody.innerHTML = attendanceLogs.map(log => {
        const emp = findEmployee(log.empId) || {};
        const uKey = getLogUniqueKey(log);
        let badge = "bg-emerald-100 text-emerald-700"; let lbl = log.status || "HADIR";
        if (log.status === 'TERLAMBAT') badge = "bg-amber-100 text-amber-700";
        else if (log.status === 'PULANG CEPAT') badge = "bg-indigo-100 text-indigo-700";
        else if (log.type === 'PULANG') { badge = "bg-brand-100 text-brand-700"; lbl = "PULANG"; }
        const btns = isAdminLoggedIn ? `<td class="p-3 text-right admin-only"><button onclick="openManualAttendanceModalByUniqueKey('${uKey}')" class="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"><i class="fa-solid fa-pen-to-square"></i></button><button onclick="confirmDeleteLogByUniqueKey('${uKey}')" class="p-1.5 hover:bg-rose-50 rounded-lg text-rose-600 transition-colors"><i class="fa-solid fa-trash-can"></i></button></td>` : `<td class="admin-only hidden"></td>`;
        return `
            <tr class="hover:bg-slate-50/80 transition-colors">
                <td class="p-2.5 sm:p-3 font-mono text-[10px] sm:text-[11px] font-medium">${log.date} ${formatTimeDisplay(log.time)}</td>
                <td class="p-2.5 sm:p-3 font-bold text-slate-900">${emp.name || log.empId}</td>
                <td class="p-2.5 sm:p-3 font-mono text-slate-500">${emp.nip || '-'}</td>
                <td class="p-2.5 sm:p-3"><span class="text-[10px] sm:text-[11px] font-semibold">${emp.category || '-'}</span><br><span class="text-[9px] sm:text-[10px] text-slate-400">${emp.role || '-'}</span></td>
                <td class="p-2.5 sm:p-3 font-bold">${log.type || 'MASUK'}</td>
                <td class="p-2.5 sm:p-3"><span class="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[9px] sm:text-[10px] font-extrabold shadow-xs ${badge}">${lbl}</span></td>${btns}
            </tr>`;
    }).join('');
}

function filterLogTable() {
    const val = document.getElementById('logSearchInput').value.toLowerCase();
    document.querySelectorAll('#logTableBody tr').forEach(r => {
        r.style.display = r.innerText.toLowerCase().includes(val) ? '' : 'none';
    });
}

function renderEmployeeList() {
    const tbody = document.getElementById('employeeTableBody');
    if (!tbody) return;
    let filtered = employeesData;
    if (currentEmpCatFilter !== 'ALL') filtered = employeesData.filter(e => String(e.category).toUpperCase() === currentEmpCatFilter.toUpperCase());
    if (filtered.length === 0) { tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-slate-400">Belum ada personel</td></tr>`; return; }
    
    tbody.innerHTML = filtered.map(e => {
        const shift = shiftsData.find(s => String(s.id) === String(e.shiftId)) || { name: 'Reguler Utama' };
        return `
            <tr class="hover:bg-slate-50/80 transition-colors">
                <td class="p-2.5 sm:p-3 flex items-center gap-2.5 sm:gap-3"><img src="${e.photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200'}" class="w-7 h-7 sm:w-8 sm:h-8 rounded-full shadow-xs"><span class="font-bold text-slate-900 truncate">${e.name}</span></td>
                <td class="p-2.5 sm:p-3 font-mono text-slate-600">${e.nip || '-'}</td><td class="p-2.5 sm:p-3 font-mono font-bold">${e.machineName || e.id}</td>
                <td class="p-2.5 sm:p-3 font-extrabold text-brand-600 text-[10px] sm:text-[11px]">${e.category}</td><td class="p-2.5 sm:p-3 text-slate-600">${e.role || '-'}</td>
                <td class="p-2.5 sm:p-3"><span class="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-md font-bold text-[9px] sm:text-[10px]">${shift.name}</span></td>
                <td class="p-2.5 sm:p-3 text-right whitespace-nowrap"><button onclick="openEmployeeModal('${e.id}')" class="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"><i class="fa-solid fa-pen-to-square"></i></button><button onclick="confirmDeleteEmployee('${e.id}')" class="p-1.5 hover:bg-rose-50 rounded-lg text-rose-600 transition-colors"><i class="fa-solid fa-trash-can"></i></button></td>
            </tr>`;
    }).join('');
}

function setEmpCategoryFilter(cat) {
    currentEmpCatFilter = cat;
    document.querySelectorAll('.emp-cat-filter').forEach(btn => {
        btn.className = (btn.dataset.cat === cat) ? "emp-cat-filter px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-bold bg-slate-900 text-white shadow-xs transition-all" : "emp-cat-filter px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all";
    });
    renderEmployeeList();
}

function renderShifts() {
    const cont = document.getElementById('shiftsGrid');
    if (!cont) return;
    if (shiftsData.length === 0) { cont.innerHTML = `<div class="col-span-full text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-300"><p class="font-bold text-slate-500 text-sm">Belum ada shift kerja yang dibuat</p></div>`; return; }
    cont.innerHTML = shiftsData.map(s => {
        const daysArr = Array.isArray(s.days) ? s.days : String(s.days || '').split(',');
        const badges = ALL_DAYS.map(d => `<span class="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg text-[9px] sm:text-[10px] font-extrabold ${daysArr.includes(d) ? 'bg-brand-600 text-white shadow-xs' : 'bg-slate-100 text-slate-400 opacity-60'}">${d}</span>`).join('');
        return `
        <div class="glass-card rounded-2xl p-3.5 sm:p-4 shadow-xs hover:shadow-md transition-shadow">
            <h4 class="font-extrabold text-slate-900 text-xs sm:text-sm">${s.name}</h4>
            <p class="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 truncate">${s.schemeName || 'Skema Waktu Reguler'}</p>
            <div class="mt-3 pb-3 border-b border-slate-100 flex items-center justify-between gap-1">${badges}</div>
            <div class="mt-3 space-y-2 text-xs">
                <div class="flex items-center justify-between bg-slate-50 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg border border-slate-100"><span class="text-slate-600 font-medium">Scan Masuk</span> <span class="font-mono font-extrabold text-emerald-600">${formatTimeDisplay(s.startTime)}</span></div>
                <div class="flex items-center justify-between bg-slate-50 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg border border-slate-100"><span class="text-slate-600 font-medium">Scan Pulang</span> <span class="font-mono font-extrabold text-brand-600">${formatTimeDisplay(s.endTime)}</span></div>
            </div>
            <div class="mt-3.5 pt-2.5 border-t border-slate-100 flex justify-end gap-2">
                <button onclick="openShiftModal('${s.id}')" class="px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
                <button onclick="confirmDeleteShift('${s.id}')" class="px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl transition-colors"><i class="fa-solid fa-trash-can"></i> Hapus</button>
            </div>
        </div>`;
    }).join('');
}

function renderTimeSchemesTable() {
    const tbody = document.getElementById('timeSchemesTableBody');
    if (!tbody) return;
    if (timeSchemesData.length === 0) { tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-slate-400">Belum ada skema waktu</td></tr>`; return; }
    tbody.innerHTML = timeSchemesData.map(s => {
        return `
            <tr class="hover:bg-slate-50/80 transition-colors">
                <td class="p-2.5 sm:p-3 font-extrabold text-slate-900">${s.name}</td>
                <td class="p-2.5 sm:p-3 font-mono font-bold text-slate-700 bg-slate-50">${formatTimeDisplay(s.startTime || s.start || '07:30')} - ${formatTimeDisplay(s.endTime || s.end || '16:00')}</td>
                <td class="p-2.5 sm:p-3 font-mono text-[11px]"><span class="px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded-md font-bold">+${s.toleranceMin || 15}m</span> <span class="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-md font-bold">-${s.toleranceEarlyOutMin || 10}m</span></td>
                <td class="p-2.5 sm:p-3 text-slate-600 text-[10px]"><span class="font-bold text-emerald-600">IN:</span> ${formatTimeDisplay(s.scanInStart || '05:00')} s/d ${formatTimeDisplay(s.scanInEnd || '11:00')}<br><span class="font-bold text-brand-600">OUT:</span> ${formatTimeDisplay(s.scanOutStart || '11:01')} s/d ${formatTimeDisplay(s.scanOutEnd || '20:00')}</td>
                <td class="p-2.5 sm:p-3 text-slate-500 max-w-[150px] truncate">${s.desc || '-'}</td>
                <td class="p-2.5 sm:p-3 text-right whitespace-nowrap">
                    <button onclick="openTimeSchemeModal('${s.id}')" class="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button onclick="confirmDeleteTimeScheme('${s.id}')" class="p-1.5 hover:bg-rose-50 rounded-lg text-rose-600 transition-colors"><i class="fa-solid fa-trash-can"></i></button>
                </td>
            </tr>`;
    }).join('');
}

function fillTimeRulesForm() {
    if (document.getElementById('inputAutoPopup')) document.getElementById('inputAutoPopup').checked = !!timeRules.autoPopup;
    if (document.getElementById('inputPlaySound')) document.getElementById('inputPlaySound').checked = !!timeRules.playSound;
}

function triggerLivePopup(log) {
    if (!timeRules.autoPopup) return;
    if (popupAutoTimer) { clearTimeout(popupAutoTimer); popupAutoTimer = null; }
    
    const emp = findEmployee(log.empId) || {};
    document.getElementById('popupAvatar').src = emp.photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200';
    document.getElementById('popupName').innerText = emp.name || log.empId;
    document.getElementById('popupNip').innerText = `NIP. ${emp.nip || '-'}`;
    document.getElementById('popupTime').innerText = formatTimeDisplay(log.time);
    
    const statusText = document.getElementById('popupStatusText');
    const bar = document.getElementById('popupProgressBar');
    
    if (log.status === 'TERLAMBAT') { 
        statusText.className = "px-4 py-1.5 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 shadow-xs"; 
        statusText.innerHTML = "TERLAMBAT"; 
        bar.className = "h-full bg-amber-500 w-full transition-all ease-linear"; 
    }
    else if (log.status === 'PULANG CEPAT') { 
        statusText.className = "px-4 py-1.5 rounded-full text-xs font-extrabold bg-indigo-100 text-indigo-800 shadow-xs"; 
        statusText.innerHTML = "PULANG CEPAT"; 
        bar.className = "h-full bg-indigo-500 w-full transition-all ease-linear"; 
    }
    else if (log.type === 'PULANG') { 
        statusText.className = "px-4 py-1.5 rounded-full text-xs font-extrabold bg-brand-100 text-brand-800 shadow-xs"; 
        statusText.innerHTML = "PULANG"; 
        bar.className = "h-full bg-brand-500 w-full transition-all ease-linear"; 
    }
    else { 
        statusText.className = "px-4 py-1.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 shadow-xs"; 
        statusText.innerHTML = "HADIR"; 
        bar.className = "h-full bg-emerald-500 w-full transition-all ease-linear"; 
    }

    bar.style.transition = 'none'; bar.style.width = '100%';
    if (timeRules.playSound) playChimeSound();
    
    const overlay = document.getElementById('livePopupOverlay');
    const card = document.getElementById('livePopupCard');
    overlay.classList.remove('hidden');
    
    setTimeout(() => { 
        card.classList.remove('scale-90', 'opacity-0'); 
        bar.style.transition = 'width 3500ms linear'; 
        bar.style.width = '0%'; 
    }, 20);
    
    popupAutoTimer = setTimeout(dismissPopup, 3500);
}

function dismissPopup() {
    if (popupAutoTimer) { clearTimeout(popupAutoTimer); popupAutoTimer = null; }
    const overlay = document.getElementById('livePopupOverlay');
    const card = document.getElementById('livePopupCard');
    if (!overlay || overlay.classList.contains('hidden')) return;
    
    card.classList.add('scale-90', 'opacity-0');
    setTimeout(() => overlay.classList.add('hidden'), 200);
}
