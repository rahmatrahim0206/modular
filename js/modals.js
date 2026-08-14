function openManualAttendanceModalByUniqueKey(uniqueKey = null) {
    const modal = document.getElementById('manualAttendanceModal');
    const empSelect = document.getElementById('manualEmpId');

    if (employeesData.length > 0) {
        const sortedEmps = [...employeesData].sort((a, b) => a.name.localeCompare(b.name));
        empSelect.innerHTML = sortedEmps.map(e => `<option value="${e.id}">${e.name} (${e.nip || 'ID: ' + e.id})</option>`).join('');
    } else {
        empSelect.innerHTML = `<option value="">Belum Ada Data Personel</option>`;
    }

    const targetLog = attendanceLogs.find(l => getLogUniqueKey(l) === uniqueKey);

    if (targetLog) {
        document.getElementById('manualModalTitle').innerHTML = `<i class="fa-solid fa-user-pen text-brand-600"></i> Edit Log Absensi`;
        document.getElementById('manualLogOriginalKey').value = getLogUniqueKey(targetLog);
        document.getElementById('manualEmpId').value = targetLog.empId || '';
        document.getElementById('manualDate').value = targetLog.date || getTodayISO();
        
        let formattedTime = "07:30";
        if (targetLog.time) {
            const rawT = String(targetLog.time).replace(/\s*WITA\s*/gi, '').trim();
            const parts = rawT.split(':');
            if (parts.length >= 2) formattedTime = `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
        }
        document.getElementById('manualTime').value = formattedTime;
        document.getElementById('manualType').value = targetLog.type || 'MASUK';
        document.getElementById('manualStatus').value = targetLog.status || 'HADIR';
        document.getElementById('manualNote').value = targetLog.note || '';
    } else {
        document.getElementById('manualModalTitle').innerHTML = `<i class="fa-solid fa-user-pen text-brand-600"></i> Input / Lupa Absensi Manual`;
        document.getElementById('manualLogOriginalKey').value = '';
        if (employeesData.length > 0) document.getElementById('manualEmpId').value = employeesData[0].id;
        document.getElementById('manualDate').value = getTodayISO();
        document.getElementById('manualTime').value = '07:30';
        document.getElementById('manualType').value = 'MASUK';
        document.getElementById('manualStatus').value = 'LUPA ABSENSI';
        document.getElementById('manualNote').value = '';
    }

    modal.classList.remove('hidden');
}

function openManualAttendanceModal() {
    openManualAttendanceModalByUniqueKey(null);
}

function closeManualAttendanceModal() {
    document.getElementById('manualAttendanceModal').classList.add('hidden');
}

async function handleManualAttendanceSubmit(e) {
    e.preventDefault();
    const originalKey = document.getElementById('manualLogOriginalKey').value;
    const empId = document.getElementById('manualEmpId').value;
    if (!empId) { showToast("Pilih personel terlebih dahulu!", "error"); return; }

    const timeInput = document.getElementById('manualTime').value;

    const manualData = {
        action: "saveManualAttendance",
        originalKey: originalKey,
        empId: empId,
        date: document.getElementById('manualDate').value,
        time: timeInput,
        type: document.getElementById('manualType').value,
        status: document.getElementById('manualStatus').value,
        note: document.getElementById('manualNote').value || '-'
    };

    closeManualAttendanceModal();
    showToast("Menyimpan absensi...");
    await sendApiPost(manualData);
    showToast("Absensi manual tersimpan!");
}

function confirmDeleteLogByUniqueKey(uniqueKey) {
    const targetLog = attendanceLogs.find(l => getLogUniqueKey(l) === uniqueKey);
    if (!targetLog) return;

    const emp = findEmployee(targetLog.empId) || {};
    document.getElementById('confirmDeleteText').innerText = `Hapus log absensi ${emp.name || targetLog.empId} tanggal ${targetLog.date} jam ${targetLog.time}?`;
    
    const btn = document.getElementById('execDeleteBtn');
    btn.onclick = async function() {
        closeDeleteModal();
        showToast("Menghapus log...");
        await sendApiPost({
            action: "deleteAttendanceLog",
            logId: { date: targetLog.date, time: targetLog.time, empId: targetLog.empId }
        });
        showToast("Log absensi berhasil dihapus!");
    };
    document.getElementById('confirmDeleteModal').classList.remove('hidden');
}

function openEmployeeModal(empId = null) {
    const modal = document.getElementById('employeeModal');
    const shiftSelect = document.getElementById('empModalShift');

    if (shiftsData.length > 0) {
        shiftSelect.innerHTML = shiftsData.map(s => `<option value="${s.id}">${s.name} (${s.startTime} - ${s.endTime})</option>`).join('');
    } else {
        shiftSelect.innerHTML = `<option value="">Shift Default (07:30 - 16:00)</option>`;
    }

    if (empId) {
        const emp = employeesData.find(e => e.id === empId);
        if (!emp) return;
        document.getElementById('empModalTitle').innerHTML = `<i class="fa-solid fa-user-pen text-brand-600"></i> Edit Data Personel`;
        document.getElementById('empModalId').value = emp.id;
        document.getElementById('empModalName').value = emp.name;
        document.getElementById('empModalMachineName').value = emp.machineName || emp.name;
        document.getElementById('empModalNip').value = emp.nip;
        document.getElementById('empModalCat').value = emp.category || 'GURU';
        document.getElementById('empModalShift').value = emp.shiftId || '';
        document.getElementById('empModalRole').value = emp.role;
        document.getElementById('empModalPhoto').value = emp.photo || '';
    } else {
        document.getElementById('empModalTitle').innerHTML = `<i class="fa-solid fa-user-plus text-brand-600"></i> Tambah Data Personel`;
        document.getElementById('empModalId').value = '';
        document.getElementById('empModalName').value = '';
        document.getElementById('empModalMachineName').value = '';
        document.getElementById('empModalNip').value = '';
        document.getElementById('empModalCat').value = 'GURU';
        document.getElementById('empModalShift').value = '';
        document.getElementById('empModalRole').value = '';
        document.getElementById('empModalPhoto').value = '';
    }

    modal.classList.remove('hidden');
}

function closeEmployeeModal() {
    document.getElementById('employeeModal').classList.add('hidden');
}

async function handleEmployeeSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('empModalId').value;
    const empObj = {
        id: id || ('100' + (employeesData.length + 1)),
        name: document.getElementById('empModalName').value,
        machineName: document.getElementById('empModalMachineName').value || document.getElementById('empModalName').value,
        nip: document.getElementById('empModalNip').value,
        category: document.getElementById('empModalCat').value,
        shiftId: document.getElementById('empModalShift').value,
        role: document.getElementById('empModalRole').value,
        photo: document.getElementById('empModalPhoto').value || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200'
    };

    const existingIdx = employeesData.findIndex(item => String(item.id) === String(empObj.id));
    if (existingIdx > -1) {
        employeesData[existingIdx] = empObj;
    } else {
        employeesData.push(empObj);
    }

    closeEmployeeModal();
    refreshAllViews(false);
    showToast("Menyimpan data personel...");
    await sendApiPost({ action: "saveEmployee", employee: empObj });
    showToast("Data personel tersimpan!");
}

function confirmDeleteEmployee(empId) {
    const emp = employeesData.find(e => e.id === empId);
    if (!emp) return;

    document.getElementById('confirmDeleteText').innerText = `Hapus "${emp.name}" dari daftar personel?`;
    const btn = document.getElementById('execDeleteBtn');
    btn.onclick = async function() {
        closeDeleteModal();
        employeesData = employeesData.filter(e => e.id !== empId);
        refreshAllViews(false);
        showToast("Menghapus personel...");
        await sendApiPost({ action: "deleteEmployee", empId: empId });
        showToast("Personel dihapus!");
    };
    document.getElementById('confirmDeleteModal').classList.remove('hidden');
}

function closeDeleteModal() {
    document.getElementById('confirmDeleteModal').classList.add('hidden');
}

function openShiftModal(shiftId = null) {
    const modal = document.getElementById('shiftModal');
    const schemeSelect = document.getElementById('shiftModalScheme');

    let schemeOptions = '';
    if (timeSchemesData && timeSchemesData.length > 0) {
        timeSchemesData.forEach(sch => {
            schemeOptions += `<option value="${sch.name}">${sch.name} (${sch.startTime} - ${sch.endTime})</option>`;
        });
    } else {
        schemeOptions = `<option value="Jam Kerja Reguler Utama">Jam Kerja Reguler Utama (07:30 - 16:00)</option>`;
    }
    if (schemeSelect) schemeSelect.innerHTML = schemeOptions;

    const dayCheckboxes = document.querySelectorAll('.shift-day-cb');

    if (shiftId) {
        const s = shiftsData.find(sh => sh.id === shiftId);
        if (!s) return;
        document.getElementById('shiftModalTitle').innerHTML = `<i class="fa-solid fa-pen-to-square text-brand-600"></i> Edit Shift Kerja`;
        document.getElementById('shiftModalId').value = s.id;
        document.getElementById('shiftModalName').value = s.name;
        if (schemeSelect) schemeSelect.value = s.schemeName || (timeSchemesData[0] ? timeSchemesData[0].name : '');
        document.getElementById('shiftModalStart').value = s.startTime;
        document.getElementById('shiftModalEnd').value = s.endTime;
        document.getElementById('shiftModalDesc').value = s.desc || '';

        const activeDays = Array.isArray(s.days) ? s.days : (s.days ? String(s.days).split(',') : ['Sen', 'Sel', 'Rab', 'Kam', 'Jum']);
        dayCheckboxes.forEach(cb => { cb.checked = activeDays.includes(cb.value); });
    } else {
        document.getElementById('shiftModalTitle').innerHTML = `<i class="fa-solid fa-calendar-plus text-brand-600"></i> Tambah Shift Kerja`;
        document.getElementById('shiftModalId').value = '';
        document.getElementById('shiftModalName').value = '';
        const firstSch = timeSchemesData[0] || { name: 'Jam Kerja Reguler Utama', startTime: '07:30', endTime: '16:00' };
        if (schemeSelect) schemeSelect.value = firstSch.name;
        document.getElementById('shiftModalStart').value = firstSch.startTime;
        document.getElementById('shiftModalEnd').value = firstSch.endTime;
        document.getElementById('shiftModalDesc').value = '';

        dayCheckboxes.forEach(cb => { cb.checked = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum'].includes(cb.value); });
    }

    modal.classList.remove('hidden');
}

function onShiftSchemeChange(selectedSchemeName) {
    const sch = timeSchemesData.find(s => s.name === selectedSchemeName);
    if (sch) {
        document.getElementById('shiftModalStart').value = sch.startTime;
        document.getElementById('shiftModalEnd').value = sch.endTime;
    }
}

function closeShiftModal() {
    document.getElementById('shiftModal').classList.add('hidden');
}

async function handleShiftSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('shiftModalId').value;
    const selectedDays = Array.from(document.querySelectorAll('.shift-day-cb:checked')).map(cb => cb.value);

    if (selectedDays.length === 0) {
        showToast("Pilih minimal 1 hari kerja!", "error");
        return;
    }

    const shiftObj = {
        id: id || ('SH-0' + (shiftsData.length + 1)),
        name: document.getElementById('shiftModalName').value,
        schemeName: document.getElementById('shiftModalScheme').value || 'Jam Kerja Reguler Utama',
        startTime: document.getElementById('shiftModalStart').value,
        endTime: document.getElementById('shiftModalEnd').value,
        desc: document.getElementById('shiftModalDesc').value || '-',
        days: selectedDays
    };

    const existingIdx = shiftsData.findIndex(item => String(item.id) === String(shiftObj.id));
    if (existingIdx > -1) {
        shiftsData[existingIdx] = shiftObj;
    } else {
        shiftsData.push(shiftObj);
    }

    closeShiftModal();
    refreshAllViews(false);
    showToast("Menyimpan shift...");
    await sendApiPost({ action: "saveShift", shift: shiftObj });
    showToast("Shift kerja tersimpan!");
}

function confirmDeleteShift(shiftId) {
    const s = shiftsData.find(sh => sh.id === shiftId);
    if (!s) return;

    document.getElementById('confirmDeleteText').innerText = `Hapus "${s.name}"?`;
    const btn = document.getElementById('execDeleteBtn');
    btn.onclick = async function() {
        closeDeleteModal();
        shiftsData = shiftsData.filter(sh => sh.id !== shiftId);
        refreshAllViews(false);
        showToast("Menghapus shift...");
        await sendApiPost({ action: "deleteShift", shiftId: shiftId });
        showToast("Shift berhasil dihapus!");
    };
    document.getElementById('confirmDeleteModal').classList.remove('hidden');
}

function openTimeSchemeModal(schemeId = null) {
    const modal = document.getElementById('timeSchemeModal');
    if (!modal) return;

    const dataSource = (typeof timeSchemesData !== 'undefined' && timeSchemesData) ? timeSchemesData : (typeof timeSchemes !== 'undefined' ? timeSchemes : []);

    if (schemeId) {
        const sch = dataSource.find(s => s.id === schemeId);
        if (!sch) return;
        document.getElementById('timeSchemeModalTitle').innerHTML = `<i class="fa-solid fa-clock text-brand-600"></i> Edit Skema Waktu Kerja`;
        document.getElementById('schemeModalId').value = sch.id;
        document.getElementById('schemeModalName').value = sch.name || '';
        document.getElementById('schemeModalStart').value = sch.startTime || sch.start || '07:30';
        document.getElementById('schemeModalEnd').value = sch.endTime || sch.end || '16:00';
        document.getElementById('schemeModalTolMin').value = sch.toleranceMin || 15;
        document.getElementById('schemeModalTolEarly').value = sch.toleranceEarlyOutMin || 10;
        document.getElementById('schemeModalScanInStart').value = sch.scanInStart || '05:00';
        document.getElementById('schemeModalScanInEnd').value = sch.scanInEnd || '11:00';
        document.getElementById('schemeModalScanOutStart').value = sch.scanOutStart || '11:01';
        document.getElementById('schemeModalScanOutEnd').value = sch.scanOutEnd || '20:00';
        document.getElementById('schemeModalDesc').value = sch.desc || '';
    } else {
        document.getElementById('timeSchemeModalTitle').innerHTML = `<i class="fa-solid fa-clock text-brand-600"></i> Tambah Skema Waktu Kerja`;
        document.getElementById('schemeModalId').value = '';
        document.getElementById('schemeModalName').value = '';
        document.getElementById('schemeModalStart').value = '07:30';
        document.getElementById('schemeModalEnd').value = '16:00';
        document.getElementById('schemeModalTolMin').value = 15;
        document.getElementById('schemeModalTolEarly').value = 10;
        document.getElementById('schemeModalScanInStart').value = '05:00';
        document.getElementById('schemeModalScanInEnd').value = '11:00';
        document.getElementById('schemeModalScanOutStart').value = '11:01';
        document.getElementById('schemeModalScanOutEnd').value = '20:00';
        document.getElementById('schemeModalDesc').value = '';
    }

    modal.classList.remove('hidden');
}

function closeTimeSchemeModal() {
    const modal = document.getElementById('timeSchemeModal');
    if (modal) modal.classList.add('hidden');
}

async function handleTimeSchemeSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('schemeModalId').value;
    const dataSource = (typeof timeSchemesData !== 'undefined' && timeSchemesData) ? timeSchemesData : (typeof timeSchemes !== 'undefined' ? timeSchemes : []);

    const schemeObj = {
        id: id || ('TS-0' + (dataSource.length + 1)),
        name: document.getElementById('schemeModalName').value,
        startTime: document.getElementById('schemeModalStart').value,
        endTime: document.getElementById('schemeModalEnd').value,
        toleranceMin: parseInt(document.getElementById('schemeModalTolMin').value, 10) || 0,
        toleranceEarlyOutMin: parseInt(document.getElementById('schemeModalTolEarly').value, 10) || 0,
        scanInStart: document.getElementById('schemeModalScanInStart').value,
        scanInEnd: document.getElementById('schemeModalScanInEnd').value,
        scanOutStart: document.getElementById('schemeModalScanOutStart').value,
        scanOutEnd: document.getElementById('schemeModalScanOutEnd').value,
        desc: document.getElementById('schemeModalDesc').value || '-'
    };

    const existingIdx = dataSource.findIndex(item => String(item.id) === String(schemeObj.id));
    if (existingIdx > -1) {
        dataSource[existingIdx] = schemeObj;
    } else {
        dataSource.push(schemeObj);
    }

    closeTimeSchemeModal();
    refreshAllViews(false);
    showToast("Menyimpan skema waktu...");
    await sendApiPost({ action: "saveTimeScheme", timeScheme: schemeObj });
    showToast("Skema waktu kerja tersimpan!");
}

function confirmDeleteTimeScheme(schemeId) {
    const dataSource = (typeof timeSchemesData !== 'undefined' && timeSchemesData) ? timeSchemesData : (typeof timeSchemes !== 'undefined' ? timeSchemes : []);
    const sch = dataSource.find(s => s.id === schemeId);
    if (!sch) return;

    document.getElementById('confirmDeleteText').innerText = `Hapus skema waktu "${sch.name}"?`;
    const btn = document.getElementById('execDeleteBtn');
    btn.onclick = async function() {
        closeDeleteModal();
        if (typeof timeSchemesData !== 'undefined') {
            timeSchemesData = timeSchemesData.filter(s => s.id !== schemeId);
        }
        refreshAllViews(false);
        showToast("Menghapus skema waktu...");
        await sendApiPost({ action: "deleteTimeScheme", schemeId: schemeId });
        showToast("Skema waktu berhasil dihapus!");
    };
    document.getElementById('confirmDeleteModal').classList.remove('hidden');
}

async function handleSaveTimeRules(e) {
    e.preventDefault();
    const autoPopup = document.getElementById('inputAutoPopup').checked;
    const playSound = document.getElementById('inputPlaySound').checked;

    timeRules.autoPopup = autoPopup;
    timeRules.playSound = playSound;

    showToast("Menyimpan pengaturan notifikasi...");
    await sendApiPost({
        action: "saveTimeRules",
        timeRules: { autoPopup, playSound }
    });
    showToast("Opsi notifikasi berhasil diperbarui!");
}

function openLoginModal() {
    const modal = document.getElementById('loginModal');
    const errEl = document.getElementById('loginErrorMsg');
    if (errEl) errEl.classList.add('hidden');
    if (modal) modal.classList.remove('hidden');
}

function closeLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) modal.classList.add('hidden');
}

function togglePasswordVisibility() {
    const input = document.getElementById('loginPassword');
    const icon = document.getElementById('loginPasswordEye');
    if (!input || !icon) return;

    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

function handleLoginSubmit(e) {
    e.preventDefault();
    const user = document.getElementById('loginUsername').value.trim();
    const pass = document.getElementById('loginPassword').value.trim();

    if (user === 'admin' && pass === 'admin123') {
        isAdminLoggedIn = true;
        updateAdminUIState();
        closeLoginModal();
        showToast("Login Admin Berhasil!");
        
        document.getElementById('loginUsername').value = '';
        document.getElementById('loginPassword').value = '';
    } else {
        const errEl = document.getElementById('loginErrorMsg');
        if (errEl) errEl.classList.remove('hidden');
    }
}

function handleLogout() {
    isAdminLoggedIn = false;
    updateAdminUIState();
    if (['employees', 'shifts', 'settings'].includes(activeTab)) {
        switchTab('live');
    }
    showToast("Anda telah keluar dari Portal Admin", "error");
}

function openMachineMatchingModal() {
    const listEl = document.getElementById('machineMatchingList');
    const totalEl = document.getElementById('matchModalTotalCount');

    if (totalEl) totalEl.innerText = employeesData.length;

    if (listEl) {
        const sortedEmps = [...employeesData].sort((a, b) => a.name.localeCompare(b.name));
        listEl.innerHTML = sortedEmps.map(e => `
            <div class="flex items-center justify-between p-2.5 hover:bg-slate-50 rounded-xl text-xs border border-slate-100 mb-1.5">
                <div class="min-w-0 pr-2">
                    <span class="font-extrabold text-slate-900 block truncate">${e.name}</span>
                    <span class="text-[10px] text-slate-500 font-mono">NIP: ${e.nip}</span>
                </div>
                <div class="text-right shrink-0 flex items-center gap-1.5">
                    <span class="px-2 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg font-mono font-bold text-[10px]">
                        <i class="fa-solid fa-microchip text-amber-600"></i> Mesin: ${e.machineName || e.id}
                    </span>
                    <span class="px-2 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg font-mono font-bold text-[10px]">
                        PIN: ${e.id}
                    </span>
                </div>
            </div>
        `).join('');
    }

    document.getElementById('machineMatchingModal').classList.remove('hidden');
}

function closeMachineMatchingModal() {
    document.getElementById('machineMatchingModal').classList.add('hidden');
}

function openImportMachineModal() {
    const modal = document.getElementById('importMachineModal');
    if (modal) {
        modal.classList.remove('hidden');
        loadInitialData();
    }
}

function closeImportMachineModal() {
    const modal = document.getElementById('importMachineModal');
    if (modal) modal.classList.add('hidden');
}