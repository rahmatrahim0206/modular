function openManualAttendanceModalByUniqueKey(uKey = null) {
    const sel = document.getElementById('manualEmpId');
    sel.innerHTML = [...employeesData].sort((a,b)=>a.name.localeCompare(b.name)).map(e => `<option value="${e.id}">${e.name}</option>`).join('');
    
    const target = attendanceLogs.find(l => getLogUniqueKey(l) === uKey);
    if (target) {
        document.getElementById('manualModalTitle').innerHTML = `<i class="fa-solid fa-user-pen text-brand-600"></i> Edit Log`;
        document.getElementById('manualLogOriginalKey').value = getLogUniqueKey(target);
        sel.value = target.empId; document.getElementById('manualDate').value = target.date;
        document.getElementById('manualTime').value = formatTimeDisplay(target.time).substring(0,5);
        document.getElementById('manualType').value = target.type || 'MASUK';
        document.getElementById('manualStatus').value = target.status || 'HADIR';
        document.getElementById('manualNote').value = target.note || '';
    } else {
        document.getElementById('manualModalTitle').innerHTML = `<i class="fa-solid fa-user-pen text-brand-600"></i> Input Manual`;
        document.getElementById('manualLogOriginalKey').value = '';
        if (employeesData.length>0) sel.value = employeesData[0].id;
        document.getElementById('manualDate').value = getTodayISO(); document.getElementById('manualTime').value = '07:30';
        document.getElementById('manualType').value = 'MASUK'; document.getElementById('manualStatus').value = 'LUPA ABSENSI';
    }
    document.getElementById('manualAttendanceModal').classList.remove('hidden');
}
function openManualAttendanceModal() { openManualAttendanceModalByUniqueKey(null); }
function closeManualAttendanceModal() { document.getElementById('manualAttendanceModal').classList.add('hidden'); }

async function handleManualAttendanceSubmit(e) {
    e.preventDefault();
    const data = {
        action: "saveManualAttendance",
        originalKey: document.getElementById('manualLogOriginalKey').value,
        empId: document.getElementById('manualEmpId').value,
        date: document.getElementById('manualDate').value,
        time: document.getElementById('manualTime').value,
        type: document.getElementById('manualType').value,
        status: document.getElementById('manualStatus').value,
        note: document.getElementById('manualNote').value || '-'
    };
    closeManualAttendanceModal();
    showToast("Menyimpan..."); await sendApiPost(data); showToast("Berhasil!");
}

function confirmDeleteLogByUniqueKey(uKey) {
    document.getElementById('confirmDeleteText').innerText = "Hapus log absensi ini?";
    document.getElementById('execDeleteBtn').onclick = async () => {
        closeDeleteModal(); showToast("Menghapus...");
        const target = attendanceLogs.find(l => getLogUniqueKey(l) === uKey);
        if (target) await sendApiPost({ action: "deleteAttendanceLog", logId: { date: target.date, time: target.time, empId: target.empId } });
        showToast("Dihapus!");
    };
    document.getElementById('confirmDeleteModal').classList.remove('hidden');
}

function openEmployeeModal(empId = null) {
    const sel = document.getElementById('empModalShift');
    sel.innerHTML = shiftsData.map(s => `<option value="${s.id}">${s.name}</option>`).join('') || `<option value="">Default (07:30 - 16:00)</option>`;
    if (empId) {
        const emp = employeesData.find(e => e.id === empId);
        if (!emp) return;
        document.getElementById('empModalId').value = emp.id; document.getElementById('empModalName').value = emp.name;
        document.getElementById('empModalMachineName').value = emp.machineName || emp.name;
        document.getElementById('empModalNip').value = emp.nip; document.getElementById('empModalCat').value = emp.category || 'GURU';
        document.getElementById('empModalShift').value = emp.shiftId || ''; document.getElementById('empModalRole').value = emp.role;
        document.getElementById('empModalPhoto').value = emp.photo || '';
    } else {
        ['empModalId', 'empModalName', 'empModalMachineName', 'empModalNip', 'empModalRole', 'empModalPhoto', 'empModalShift'].forEach(id => document.getElementById(id).value = '');
        document.getElementById('empModalCat').value = 'GURU';
    }
    document.getElementById('employeeModal').classList.remove('hidden');
}
function closeEmployeeModal() { document.getElementById('employeeModal').classList.add('hidden'); }

async function handleEmployeeSubmit(e) {
    e.preventDefault();
    const emp = {
        id: document.getElementById('empModalId').value || ('100' + (employeesData.length + 1)),
        name: document.getElementById('empModalName').value, machineName: document.getElementById('empModalMachineName').value || document.getElementById('empModalName').value,
        nip: document.getElementById('empModalNip').value, category: document.getElementById('empModalCat').value,
        shiftId: document.getElementById('empModalShift').value, role: document.getElementById('empModalRole').value,
        photo: document.getElementById('empModalPhoto').value || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200'
    };
    const idx = employeesData.findIndex(item => String(item.id) === String(emp.id));
    if (idx > -1) employeesData[idx] = emp; else employeesData.push(emp);
    closeEmployeeModal(); refreshAllViews(); showToast("Menyimpan..."); await sendApiPost({ action: "saveEmployee", employee: emp }); showToast("Tersimpan!");
}
function confirmDeleteEmployee(id) {
    document.getElementById('confirmDeleteText').innerText = "Hapus personel ini?";
    document.getElementById('execDeleteBtn').onclick = async () => { closeDeleteModal(); employeesData = employeesData.filter(e => e.id !== id); refreshAllViews(); await sendApiPost({ action: "deleteEmployee", empId: id }); showToast("Dihapus!"); };
    document.getElementById('confirmDeleteModal').classList.remove('hidden');
}

function openShiftModal(shiftId = null) {
    const sel = document.getElementById('shiftModalScheme');
    sel.innerHTML = timeSchemesData.map(s => `<option value="${s.name}">${s.name}</option>`).join('') || `<option value="Reguler Utama">Reguler Utama</option>`;
    
    if (shiftId) {
        const s = shiftsData.find(sh => sh.id === shiftId);
        document.getElementById('shiftModalId').value = s.id; document.getElementById('shiftModalName').value = s.name;
        sel.value = s.schemeName || (timeSchemesData[0] ? timeSchemesData[0].name : '');
        document.getElementById('shiftModalStart').value = s.startTime; document.getElementById('shiftModalEnd').value = s.endTime;
        document.getElementById('shiftModalDesc').value = s.desc || '';
        const active = Array.isArray(s.days) ? s.days : String(s.days||'').split(',');
        document.querySelectorAll('.shift-day-cb').forEach(cb => cb.checked = active.includes(cb.value));
    } else {
        ['shiftModalId', 'shiftModalName', 'shiftModalDesc'].forEach(id => document.getElementById(id).value = '');
        document.querySelectorAll('.shift-day-cb').forEach(cb => cb.checked = ['Sen','Sel','Rab','Kam','Jum'].includes(cb.value));
    }
    document.getElementById('shiftModal').classList.remove('hidden');
}
function closeShiftModal() { document.getElementById('shiftModal').classList.add('hidden'); }
function onShiftSchemeChange(val) {
    const sch = timeSchemesData.find(s => s.name === val);
    if (sch) { document.getElementById('shiftModalStart').value = sch.startTime || sch.start || '07:30'; document.getElementById('shiftModalEnd').value = sch.endTime || sch.end || '16:00'; }
}
async function handleShiftSubmit(e) {
    e.preventDefault();
    const days = Array.from(document.querySelectorAll('.shift-day-cb:checked')).map(cb => cb.value);
    if(days.length===0) return showToast("Pilih minimal 1 hari!", "error");
    const shiftObj = {
        id: document.getElementById('shiftModalId').value || ('SH-0' + (shiftsData.length + 1)),
        name: document.getElementById('shiftModalName').value, schemeName: document.getElementById('shiftModalScheme').value,
        startTime: document.getElementById('shiftModalStart').value, endTime: document.getElementById('shiftModalEnd').value,
        desc: document.getElementById('shiftModalDesc').value || '-', days: days
    };
    const idx = shiftsData.findIndex(item => String(item.id) === String(shiftObj.id));
    if (idx > -1) shiftsData[idx] = shiftObj; else shiftsData.push(shiftObj);
    closeShiftModal(); refreshAllViews(); showToast("Menyimpan..."); await sendApiPost({ action: "saveShift", shift: shiftObj }); showToast("Tersimpan!");
}
function confirmDeleteShift(id) {
    document.getElementById('confirmDeleteText').innerText = "Hapus shift ini?";
    document.getElementById('execDeleteBtn').onclick = async () => { closeDeleteModal(); shiftsData = shiftsData.filter(s => s.id !== id); refreshAllViews(); await sendApiPost({ action: "deleteShift", shiftId: id }); showToast("Dihapus!"); };
    document.getElementById('confirmDeleteModal').classList.remove('hidden');
}

function openTimeSchemeModal(schemeId = null) {
    if (schemeId) {
        const sch = timeSchemesData.find(s => s.id === schemeId);
        if (!sch) return;
        document.getElementById('timeSchemeModalTitle').innerHTML = `<i class="fa-solid fa-clock text-brand-600"></i> Edit Skema`;
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
        document.getElementById('timeSchemeModalTitle').innerHTML = `<i class="fa-solid fa-clock text-brand-600"></i> Tambah Skema`;
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
    document.getElementById('timeSchemeModal').classList.remove('hidden');
}
function closeTimeSchemeModal() { document.getElementById('timeSchemeModal').classList.add('hidden'); }
async function handleTimeSchemeSubmit(e) {
    e.preventDefault();
    const obj = {
        id: document.getElementById('schemeModalId').value || ('TS-0' + (timeSchemesData.length + 1)),
        name: document.getElementById('schemeModalName').value, startTime: document.getElementById('schemeModalStart').value, endTime: document.getElementById('schemeModalEnd').value,
        toleranceMin: parseInt(document.getElementById('schemeModalTolMin').value) || 0, toleranceEarlyOutMin: parseInt(document.getElementById('schemeModalTolEarly').value) || 0,
        scanInStart: document.getElementById('schemeModalScanInStart').value, scanInEnd: document.getElementById('schemeModalScanInEnd').value,
        scanOutStart: document.getElementById('schemeModalScanOutStart').value, scanOutEnd: document.getElementById('schemeModalScanOutEnd').value, desc: document.getElementById('schemeModalDesc').value || '-'
    };
    const idx = timeSchemesData.findIndex(item => String(item.id) === String(obj.id));
    if (idx > -1) timeSchemesData[idx] = obj; else timeSchemesData.push(obj);
    closeTimeSchemeModal(); refreshAllViews(); showToast("Menyimpan..."); await sendApiPost({ action: "saveTimeScheme", timeScheme: obj }); showToast("Tersimpan!");
}
function confirmDeleteTimeScheme(id) {
    document.getElementById('confirmDeleteText').innerText = "Hapus skema ini?";
    document.getElementById('execDeleteBtn').onclick = async () => { closeDeleteModal(); timeSchemesData = timeSchemesData.filter(s => s.id !== id); refreshAllViews(); await sendApiPost({ action: "deleteTimeScheme", schemeId: id }); showToast("Dihapus!"); };
    document.getElementById('confirmDeleteModal').classList.remove('hidden');
}
function closeDeleteModal() { document.getElementById('confirmDeleteModal').classList.add('hidden'); }

async function handleSaveTimeRules(e) {
    e.preventDefault();
    timeRules.autoPopup = document.getElementById('inputAutoPopup').checked;
    timeRules.playSound = document.getElementById('inputPlaySound').checked;
    showToast("Menyimpan opsi..."); await sendApiPost({ action: "saveTimeRules", timeRules: timeRules }); showToast("Opsi tersimpan!");
}

function openLoginModal() { 
    document.getElementById('loginErrorMsg').classList.add('hidden'); 
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('loginModal').classList.remove('hidden'); 
}

function closeLoginModal() { 
    document.getElementById('loginModal').classList.add('hidden'); 
}

function togglePasswordVisibility() {
    const pwdInput = document.getElementById('loginPassword');
    const eyeIcon = document.getElementById('loginPasswordEye');
    if (pwdInput.type === 'password') {
        pwdInput.type = 'text';
        eyeIcon.classList.remove('fa-eye');
        eyeIcon.classList.add('fa-eye-slash');
    } else {
        pwdInput.type = 'password';
        eyeIcon.classList.remove('fa-eye-slash');
        eyeIcon.classList.add('fa-eye');
    }
}

async function handleLoginSubmit(e) {
    e.preventDefault();
    const user = document.getElementById('loginUsername').value;
    const pass = document.getElementById('loginPassword').value;
    const btn = e.target.querySelector('button[type="submit"]');

    btn.innerText = "Memverifikasi...";
    btn.disabled = true;

    try {
        const res = await sendApiPost({ action: "validateAdmin", username: user, password: pass });
        
        if (res && res.isValid) {
            isAdminLoggedIn = true;
            closeLoginModal();
            updateAdminUIState();
            showToast("Berhasil masuk sebagai Admin!");
        } else {
            document.getElementById('loginErrorMsg').classList.remove('hidden');
        }
    } catch (error) {
        showToast("Koneksi ke server gagal. Coba lagi.", "error");
    } finally {
        btn.innerText = "Masuk";
        btn.disabled = false;
    }
}

function handleLogout() {
    isAdminLoggedIn = false;
    updateAdminUIState();
    switchTab('live');
    showToast("Berhasil keluar dari mode Admin");
}

function updateAdminUIState() {
    const adminNavs = document.querySelectorAll('.admin-only');
    const authHeader = document.getElementById('authHeaderContainer');
    const adminBadge = document.getElementById('adminBadgeContainer');

    if (isAdminLoggedIn) {
        adminNavs.forEach(el => el.classList.remove('hidden'));
        if (authHeader) authHeader.classList.add('hidden');
        if (adminBadge) adminBadge.classList.remove('hidden');
    } else {
        adminNavs.forEach(el => el.classList.add('hidden'));
        if (authHeader) authHeader.classList.remove('hidden');
        if (adminBadge) adminBadge.classList.add('hidden');
    }
}

function openMachineMatchingModal() {
    showToast("Pencocokan PIN dilakukan secara otomatis lewat Bridge.", "success");
}

function openImportMachineModal() {
    showToast("Tarik data sedang sinkronisasi otomatis dari Bridge.", "success");
}
