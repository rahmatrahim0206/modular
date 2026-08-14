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

function switchTab(tabId) {
    if (['employees', 'shifts', 'settings'].includes(tabId) && !isAdminLoggedIn) {
        openLoginModal(); showToast("Silakan login sebagai admin", "error"); return;
    }
    activeTab = tabId;
    document.querySelectorAll('.tab-view').forEach(el => el.classList.add('hidden'));
    const activeSec = document.getElementById(`view-${tabId}`);
    if (activeSec) activeSec.classList.remove('hidden');

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

function refreshAllViews(isBgPoll = false) {
    try { updateDashboardStats(); } catch(e){}
    try { renderLiveFeed(); } catch(e){}
    
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
    if (subEl) subEl.innerText = `${total > 0 ? Math.round((uniquePresent / total) * 100) : 0}% dari total personel`;
    const lateEl = document.getElementById('statLateToday');
    if (lateEl) lateEl.innerText = lateCount;
    const absEl = document.getElementById('statAbsentToday');
    if (absEl) absEl.innerText = absentCount;

    const firstScheme = timeSchemesData[0] || { startTime: '07:30', endTime: '16:00' };
    const inEl = document.getElementById('displayStdIn');
    if (inEl) inEl.innerText = `${firstScheme.startTime || firstScheme.start || '07:30'} WITA`;
    const outEl = document.getElementById('displayStdOut');
    if (outEl) outEl.innerText = `${firstScheme.endTime || firstScheme.end || '16:00'} WITA`;

    updateDonutChart();
}

function renderLiveFeed() {
    const container = document.getElementById('liveFeedList');
    if (!container) return;
    if (attendanceLogs.length === 0) {
        container.innerHTML = `<div class="text-center py-12 text-slate-400 font-medium text-xs"><p>Belum ada pindaian absensi hari ini</p></div>`; return;
    }
    container.innerHTML = attendanceLogs.slice(0, 10).map(log => {
        const emp = findEmployee(log.empId) || {};
        let badge = `<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-700">MASUK</span>`;
        if (log.status === 'TERLAMBAT') badge = `<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-700">TERLAMBAT</span>`;
        else if (log.status === 'PULANG CEPAT') badge = `<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-700">PULANG CEPAT</span>`;
        else if (log.type === 'PULANG') badge = `<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-brand-100 text-brand-700">PULANG</span>`;

        return `
            <div class="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-100 transition-colors">
                <div class="flex items-center gap-3 min-w-0 pr-2">
                    <img src="${emp.photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200'}" class="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-200 shadow-sm">
                    <div class="min-w-0"><h4 class="font-extrabold text-xs text-slate-900 truncate">${emp.name || log.empId}</h4><p class="text-[11px] text-slate-500 truncate">${emp.category || '-'} • ${emp.role || '-'}</p></div>
                </div>
                <div class="text-right shrink-0"><div class="font-mono font-bold text-xs text-slate-800">${formatTimeDisplay(log.time)}</div><div class="mt-0.5">${badge}</div></div>
            </div>`;
    }).join('');
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
                <td class="p-3 font-mono text-[11px] font-medium">${log.date} ${formatTimeDisplay(log.time)}</td>
                <td class="p-3 font-bold text-slate-900">${emp.name || log.empId}</td>
                <td class="p-3 font-mono text-slate-500">${emp.nip || '-'}</td>
                <td class="p-3"><span class="text-[11px] font-semibold">${emp.category || '-'}</span><br><span class="text-[10px] text-slate-400">${emp.role || '-'}</span></td>
                <td class="p-3 font-bold">${log.type || 'MASUK'}</td>
                <td class="p-3"><span class="px-2.5 py-1 rounded-md text-[10px] font-extrabold shadow-sm ${badge}">${lbl}</span></td>${btns}
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
        const shift = shiftsData.find(s => String(s.id) === String(e.shiftId)) || { name: 'Reguler Utama', startTime: '07:30', endTime: '16:00' };
        return `
            <tr class="hover:bg-slate-50/80 transition-colors">
                <td class="p-3 flex items-center gap-3"><img src="${e.photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200'}" class="w-9 h-9 rounded-full shadow-sm"><span class="font-bold text-slate-900 truncate">${e.name}</span></td>
                <td class="p-3 font-mono text-slate-600">${e.nip || '-'}</td><td class="p-3 font-mono font-bold">${e.machineName || e.id}</td>
                <td class="p-3 font-extrabold text-brand-600 text-[11px]">${e.category}</td><td class="p-3 text-slate-600">${e.role || '-'}</td>
                <td class="p-3"><span class="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-md font-bold text-[10px]">${shift.name}</span></td>
                <td class="p-3 text-right whitespace-nowrap"><button onclick="openEmployeeModal('${e.id}')" class="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"><i class="fa-solid fa-pen-to-square"></i></button><button onclick="confirmDeleteEmployee('${e.id}')" class="p-1.5 hover:bg-rose-50 rounded-lg text-rose-600 transition-colors"><i class="fa-solid fa-trash-can"></i></button></td>
            </tr>`;
    }).join('');
}

function setEmpCategoryFilter(cat) {
    currentEmpCatFilter = cat;
    document.querySelectorAll('.emp-cat-filter').forEach(btn => {
        btn.className = (btn.dataset.cat === cat) ? "emp-cat-filter px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 text-white shadow-md transition-all" : "emp-cat-filter px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all";
    });
    renderEmployeeList();
}

function renderShifts() {
    const cont = document.getElementById('shiftsGrid');
    if (!cont) return;
    if (shiftsData.length === 0) { cont.innerHTML = `<div class="col-span-full text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-300"><p class="font-bold text-slate-500 text-sm">Belum ada shift kerja yang dibuat</p></div>`; return; }
    cont.innerHTML = shiftsData.map(s => {
        const daysArr = Array.isArray(s.days) ? s.days : String(s.days || '').split(',');
        const badges = ALL_DAYS.map(d => `<span class="w-7 h-7 flex items-center justify-center rounded-lg text-[10px] font-extrabold ${daysArr.includes(d) ? 'bg-brand-600 text-white shadow-sm' : 'bg-slate-100 text-slate-400 opacity-60'}">${d}</span>`).join('');
        return `
        <div class="glass-card rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <h4 class="font-extrabold text-slate-900 text-sm">${s.name}</h4>
            <p class="text-[11px] text-slate-500 mt-0.5 truncate">${s.schemeName || 'Skema Waktu Reguler'}</p>
            <div class="mt-3.5 pb-3 border-b border-slate-100 flex items-center justify-between gap-1">${badges}</div>
            <div class="mt-3.5 space-y-2 text-xs">
                <div class="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg border border-slate-100"><span class="text-slate-600 font-medium">Scan Masuk</span> <span class="font-mono font-extrabold text-emerald-600">${s.startTime} WITA</span></div>
                <div class="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg border border-slate-100"><span class="text-slate-600 font-medium">Scan Pulang</span> <span class="font-mono font-extrabold text-brand-600">${s.endTime} WITA</span></div>
            </div>
            <div class="mt-4 pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button onclick="openShiftModal('${s.id}')" class="px-3.5 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
                <button onclick="confirmDeleteShift('${s.id}')" class="px-3.5 py-1.5 text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl transition-colors"><i class="fa-solid fa-trash-can"></i> Hapus</button>
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
                <td class="p-3 font-extrabold text-slate-900">${s.name}</td>
                <td class="p-3 font-mono font-bold text-slate-700 bg-slate-50">${s.startTime || s.start || '07:30'} - ${s.endTime || s.end || '16:00'}</td>
                <td class="p-3 font-mono text-xs"><span class="px-2 py-0.5 bg-amber-50 text-amber-600 rounded-md font-bold">+${s.toleranceMin || 15}m</span> <span class="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md font-bold">-${s.toleranceEarlyOutMin || 10}m</span></td>
                <td class="p-3 text-slate-600 text-[10px]"><span class="font-bold text-emerald-600">IN:</span> ${s.scanInStart || '05:00'} s/d ${s.scanInEnd || '11:00'}<br><span class="font-bold text-brand-600">OUT:</span> ${s.scanOutStart || '11:01'} s/d ${s.scanOutEnd || '20:00'}</td>
                <td class="p-3 text-slate-500 max-w-[150px] truncate">${s.desc || '-'}</td>
                <td class="p-3 text-right whitespace-nowrap">
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

function initCharts() {
    const ctx = document.getElementById('categoryDonutChart');
    if (!ctx || categoryChart) return;
    categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: { 
            labels: ['Guru', 'Pegawai', 'Keamanan', 'Kebersihan'], 
            datasets: [{ 
                data: [0, 0, 0, 0], 
                backgroundColor: ['#0ea5e9', '#6366f1', '#f59e0b', '#10b981'], 
                borderWidth: 0,
                hoverOffset: 4
            }] 
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            plugins: { 
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return ` ${context.label}: ${context.raw} Personel`;
                        }
                    }
                }
            }, 
            cutout: '72%' 
        }
    });
}

function updateDonutChart() {
    if (!categoryChart) return;
    const count = { 'GURU': 0, 'PEGAWAI': 0, 'KEAMANAN': 0, 'KEBERSIHAN': 0 };
    employeesData.forEach(e => { 
        const c = (e.category || '').toUpperCase(); 
        if (count[c] !== undefined) count[c]++; 
    });
    
    // Perbarui data grafik donut
    categoryChart.data.datasets[0].data = [count['GURU'], count['PEGAWAI'], count['KEAMANAN'], count['KEBERSIHAN']];
    categoryChart.update();

    // Perbarui label legenda HTML agar sinkron
    const legendGuru = document.getElementById('chartLegendGURU');
    if (legendGuru) legendGuru.innerText = count['GURU'];

    const legendPegawai = document.getElementById('chartLegendPEGAWAI');
    if (legendPegawai) legendPegawai.innerText = count['PEGAWAI'];

    const legendKeamanan = document.getElementById('chartLegendKEAMANAN');
    if (legendKeamanan) legendKeamanan.innerText = count['KEAMANAN'];

    const legendKebersihan = document.getElementById('chartLegendKEBERSIHAN');
    if (legendKebersihan) legendKebersihan.innerText = count['KEBERSIHAN'];
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
        statusText.className = "px-4 py-1.5 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 shadow-sm"; 
        statusText.innerHTML = "TERLAMBAT"; 
        bar.className = "h-full bg-amber-500 w-full transition-all ease-linear"; 
    }
    else if (log.status === 'PULANG CEPAT') { 
        statusText.className = "px-4 py-1.5 rounded-full text-xs font-extrabold bg-indigo-100 text-indigo-800 shadow-sm"; 
        statusText.innerHTML = "PULANG CEPAT"; 
        bar.className = "h-full bg-indigo-500 w-full transition-all ease-linear"; 
    }
    else if (log.type === 'PULANG') { 
        statusText.className = "px-4 py-1.5 rounded-full text-xs font-extrabold bg-brand-100 text-brand-800 shadow-sm"; 
        statusText.innerHTML = "PULANG"; 
        bar.className = "h-full bg-brand-500 w-full transition-all ease-linear"; 
    }
    else { 
        statusText.className = "px-4 py-1.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 shadow-sm"; 
        statusText.innerHTML = "HADIR"; 
        bar.className = "h-full bg-emerald-500 w-full transition-all ease-linear"; 
    }

    bar.style.transition = 'none'; bar.style.width = '100%';
    if (timeRules.playSound) playChimeSound();
    
    const overlay = document.getElementById('livePopupOverlay');
    const card = document.getElementById('livePopupCard');
    overlay.classList.remove('hidden');
    
    // Animasikan pop up muncul
    setTimeout(() => { 
        card.classList.remove('scale-90', 'opacity-0'); 
        bar.style.transition = 'width 3500ms linear'; 
        bar.style.width = '0%'; 
    }, 20);
    
    // Setel timer otomatis untuk menutup pop up
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
