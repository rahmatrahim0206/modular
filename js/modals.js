function openManualAttendanceModalByUniqueKey(uKey = null) {
    const sel = document.getElementById('manualEmpId');
    if (!sel) return;

    sel.innerHTML = [...employeesData]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(e => `<option value="${e.id}">${e.name}</option>`)
        .join('');

    const target = attendanceLogs.find(l => getLogUniqueKey(l) === uKey);
    if (target) {
        document.getElementById('manualModalTitle').innerHTML = `<i class="fa-solid fa-user-pen text-brand-600"></i> Edit Log`;
        document.getElementById('manualLogOriginalKey').value = getLogUniqueKey(target);
        sel.value = target.empId;
        document.getElementById('manualDate').value = target.date;
        document.getElementById('manualTime').value = formatTimeDisplay(target.time).substring(0, 5);
        document.getElementById('manualType').value = target.type || 'MASUK';
        document.getElementById('manualStatus').value = target.status || 'HADIR';
        document.getElementById('manualNote').value = target.note || '';
    } else {
        document.getElementById('manualModalTitle').innerHTML = `<i class="fa-solid fa-user-pen text-brand-600"></i> Input Manual`;
        document.getElementById('manualLogOriginalKey').value = '';
        if (employeesData.length > 0) sel.value = employeesData[0].id;
        document.getElementById('manualDate').value = getTodayISO();
        document.getElementById('manualTime').value = '07:30';
        document.getElementById('manualType').value = 'MASUK';
        document.getElementById('manualStatus').value = 'LUPA ABSENSI';
        document.getElementById('manualNote').value = '';
    }

    const modal = document.getElementById('manualAttendanceModal');
    if (modal) modal.classList.remove('hidden');
}

function openManualAttendanceModal() {
    openManualAttendanceModalByUniqueKey(null);
}

function closeManualAttendanceModal() {
    const modal = document.getElementById('manualAttendanceModal');
    if (modal) modal.classList.add('hidden');
}

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
    showToast("Menyimpan...");
    await sendApiPost(data);
    showToast("Berhasil!");
}

function confirmDeleteLogByUniqueKey(uKey) {
    const confirmText = document.getElementById('confirmDeleteText');
    const execBtn = document.getElementById('execDeleteBtn');
    const modal = document.getElementById('confirmDeleteModal');

    if (confirmText) confirmText.innerText = "Hapus log absensi ini?";
    if (execBtn) {
        execBtn.onclick = async () => {
            closeDeleteModal();
            showToast("Menghapus...");
            const target = attendanceLogs.find(l => getLogUniqueKey(l) === uKey);
            if (target) {
                await sendApiPost({
                    action: "deleteAttendanceLog",
                    logId: { date: target.date, time: target.time, empId: target.empId }
                });
            }
            showToast("Dihapus!");
        };
    }
    if (modal) modal.classList.remove('hidden');
}

function openEmployeeModal(empId = null) {
    const sel = document.getElementById('empModalShift');
    if (sel) {
        sel.innerHTML = shiftsData.map(s => `<option value="${s.id}">${s.name}</option>`).join('') || `<option value="">Default (07:30 - 16:00)</option>`;
    }

    if (empId !== null && empId !== undefined && empId !== '') {
        const emp = employeesData.find(e => String(e.id) === String(empId));
        if (!emp) return;

        document.getElementById('empModalId').value = emp.id;
        document.getElementById('empModalName').value = emp.name || '';
        document.getElementById('empModalMachineName').value = emp.machineName || emp.name || '';
        document.getElementById('empModalNip').value = emp.nip || '';
        document.getElementById('empModalCat').value = emp.category || 'GURU';
        if (sel) sel.value = emp.shiftId || '';
        document.getElementById('empModalRole').value = emp.role || '';
        document.getElementById('empModalPhoto').value = emp.photo || '';
    } else {
        ['empModalId', 'empModalName', 'empModalMachineName', 'empModalNip', 'empModalRole', 'empModalPhoto'].forEach(id => {
            const input = document.getElementById(id);
            if (input) input.value = '';
        });
        if (sel) sel.value = shiftsData.length > 0 ? shiftsData[0].id : '';
        document.getElementById('empModalCat').value = 'GURU';
    }

    const modal = document.getElementById('employeeModal');
    if (modal) modal.classList.remove('hidden');
}

function closeEmployeeModal() {
    const modal = document.getElementById('employeeModal');
    if (modal) modal.classList.add('hidden');
}

async function handleEmployeeSubmit(e) {
    e.preventDefault();
    const emp = {
        id: document.getElementById('empModalId').value || ('100' + (employeesData.length + 1)),
        name: document.getElementById('empModalName').value,
        machineName: document.getElementById('empModalMachineName').value || document.getElementById('empModalName').value,
        nip: document.getElementById('empModalNip').value,
        category: document.getElementById('empModalCat').value,
        shiftId: document.getElementById('empModalShift').value,
        role: document.getElementById('empModalRole').value,
        photo: document.getElementById('empModalPhoto').value || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200'
    };

    const idx = employeesData.findIndex(item => String(item.id) === String(emp.id));
    if (idx > -1) {
        employeesData[idx] = emp;
    } else {
        employeesData.push(emp);
    }

    closeEmployeeModal();
    refreshAllViews();
    showToast("Menyimpan...");
    await sendApiPost({ action: "saveEmployee", employee: emp });
    showToast("Tersimpan!");
}

function confirmDeleteEmployee(id) {
    const confirmText = document.getElementById('confirmDeleteText');
    const execBtn = document.getElementById('execDeleteBtn');
    const modal = document.getElementById('confirmDeleteModal');

    if (confirmText) confirmText.innerText = "Hapus personel ini?";
    if (execBtn) {
        execBtn.onclick = async () => {
            closeDeleteModal();
            employeesData = employeesData.filter(e => String(e.id) !== String(id));
            refreshAllViews();
            await sendApiPost({ action: "deleteEmployee", empId: id });
            showToast("Dihapus!");
        };
    }
    if (modal) modal.classList.remove('hidden');
}

function openShiftModal(shiftId = null) {
    const sel = document.getElementById('shiftModalScheme');
    if (sel) {
        sel.innerHTML = timeSchemesData.map(s => `<option value="${s.name}">${s.name}</option>`).join('') || `<option value="Reguler Utama">Reguler Utama</option>`;
    }

    if (shiftId !== null && shiftId !== undefined && shiftId !== '') {
        const s = shiftsData.find(sh => String(sh.id) === String(shiftId));
        if (s) {
            document.getElementById('shiftModalId').value = s.id;
            document.getElementById('shiftModalName').value = s.name || '';
            if (sel) sel.value = s.schemeName || (timeSchemesData[0] ? timeSchemesData[0].name : '');
            document.getElementById('shiftModalStart').value = s.startTime || '07:30';
            document.getElementById('shiftModalEnd').value = s.endTime || '16:00';
            document.getElementById('shiftModalDesc').value = s.desc || '';
            const active = Array.isArray(s.days) ? s.days : String(s.days || '').split(',');
            document.querySelectorAll('.shift-day-cb').forEach(cb => {
                cb.checked = active.includes(cb.value);
            });
        }
    } else {
        ['shiftModalId', 'shiftModalName', 'shiftModalDesc'].forEach(id => {
            const input = document.getElementById(id);
            if (input) input.value = '';
        });
        document.getElementById('shiftModalStart').value = '07:30';
        document.getElementById('shiftModalEnd').value = '16:00';
        document.querySelectorAll('.shift-day-cb').forEach(cb => {
            cb.checked = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum'].includes(cb.value);
        });
    }

    const modal = document.getElementById('shiftModal');
    if (modal) modal.classList.remove('hidden');
}

function closeShiftModal() {
    const modal = document.getElementById('shiftModal');
    if (modal) modal.classList.add('hidden');
}

function onShiftSchemeChange(val) {
    const sch = timeSchemesData.find(s => String(s.name) === String(val));
    if (sch) {
        document.getElementById('shiftModalStart').value = sch.startTime || sch.start || '07:30';
        document.getElementById('shiftModalEnd').value = sch.endTime || sch.end || '16:00';
    }
}

async function handleShiftSubmit(e) {
    e.preventDefault();
    const days = Array.from(document.querySelectorAll('.shift-day-cb:checked')).map(cb => cb.value);
    if (days.length === 0) return showToast("Pilih minimal 1 hari!", "error");

    const shiftObj = {
        id: document.getElementById('shiftModalId').value || ('SH-0' + (shiftsData.length + 1)),
        name: document.getElementById('shiftModalName').value,
        schemeName: document.getElementById('shiftModalScheme').value,
        startTime: document.getElementById('shiftModalStart').value,
        endTime: document.getElementById('shiftModalEnd').value,
        desc: document.getElementById('shiftModalDesc').value || '-',
        days: days
    };

    const idx = shiftsData.findIndex(item => String(item.id) === String(shiftObj.id));
    if (idx > -1) {
        shiftsData[idx] = shiftObj;
    } else {
        shiftsData.push(shiftObj);
    }

    closeShiftModal();
    refreshAllViews();
    showToast("Menyimpan...");
    await sendApiPost({ action: "saveShift", shift: shiftObj });
    showToast("Tersimpan!");
}

function confirmDeleteShift(id) {
    const confirmText = document.getElementById('confirmDeleteText');
    const execBtn = document.getElementById('execDeleteBtn');
    const modal = document.getElementById('confirmDeleteModal');

    if (confirmText) confirmText.innerText = "Hapus shift ini?";
    if (execBtn) {
        execBtn.onclick = async () => {
            closeDeleteModal();
            shiftsData = shiftsData.filter(s => String(s.id) !== String(id));
            refreshAllViews();
            await sendApiPost({ action: "deleteShift", shiftId: id });
            showToast("Dihapus!");
        };
    }
    if (modal) modal.classList.remove('hidden');
}

function openTimeSchemeModal(schemeId = null) {
    if (schemeId !== null && schemeId !== undefined && schemeId !== '') {
        const sch = timeSchemesData.find(s => String(s.id) === String(schemeId));
        if (!sch) return;

        document.getElementById('timeSchemeModalTitle').innerHTML = `<i class="fa-solid fa-clock text-brand-600"></i> Edit Skema`;
        document.getElementById('schemeModalId').value = sch.id;
        document.getElementById('schemeModalName').value = sch.name || '';
        document.getElementById('schemeModalStart').value = sch.startTime || sch.start || '07:30';
        document.getElementById('schemeModalEnd').value = sch.endTime || sch.end || '16:00';
        document.getElementById('schemeModalTolMin').value = (sch.toleranceMin !== undefined && sch.toleranceMin !== null) ? sch.toleranceMin : 15;
        document.getElementById('schemeModalTolEarly').value = (sch.toleranceEarlyOutMin !== undefined && sch.toleranceEarlyOutMin !== null) ? sch.toleranceEarlyOutMin : 10;
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

    const modal = document.getElementById('timeSchemeModal');
    if (modal) modal.classList.remove('hidden');
}

function closeTimeSchemeModal() {
    const modal = document.getElementById('timeSchemeModal');
    if (modal) modal.classList.add('hidden');
}

async function handleTimeSchemeSubmit(e) {
    e.preventDefault();
    const obj = {
        id: document.getElementById('schemeModalId').value || ('TS-0' + (timeSchemesData.length + 1)),
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

    const idx = timeSchemesData.findIndex(item => String(item.id) === String(obj.id));
    if (idx > -1) {
        timeSchemesData[idx] = obj;
    } else {
        timeSchemesData.push(obj);
    }

    closeTimeSchemeModal();
    refreshAllViews();
    showToast("Menyimpan...");
    await sendApiPost({ action: "saveTimeScheme", timeScheme: obj });
    showToast("Tersimpan!");
}

function confirmDeleteTimeScheme(id) {
    const confirmText = document.getElementById('confirmDeleteText');
    const execBtn = document.getElementById('execDeleteBtn');
    const modal = document.getElementById('confirmDeleteModal');

    if (confirmText) confirmText.innerText = "Hapus skema ini?";
    if (execBtn) {
        execBtn.onclick = async () => {
            closeDeleteModal();
            timeSchemesData = timeSchemesData.filter(s => String(s.id) !== String(id));
            refreshAllViews();
            await sendApiPost({ action: "deleteTimeScheme", schemeId: id });
            showToast("Dihapus!");
        };
    }
    if (modal) modal.classList.remove('hidden');
}

function closeDeleteModal() {
    const modal = document.getElementById('confirmDeleteModal');
    if (modal) modal.classList.add('hidden');
}

async function handleSaveTimeRules(e) {
    e.preventDefault();
    const autoPopupCb = document.getElementById('inputAutoPopup');
    const playSoundCb = document.getElementById('inputPlaySound');

    if (autoPopupCb) timeRules.autoPopup = autoPopupCb.checked;
    if (playSoundCb) timeRules.playSound = playSoundCb.checked;

    showToast("Menyimpan opsi...");
    await sendApiPost({ action: "saveTimeRules", timeRules: timeRules });
    showToast("Opsi tersimpan!");
}

function openLoginModal() {
    const err = document.getElementById('loginErrorMsg');
    const user = document.getElementById('loginUsername');
    const pass = document.getElementById('loginPassword');
    const modal = document.getElementById('loginModal');

    if (err) err.classList.add('hidden');
    if (user) user.value = '';
    if (pass) pass.value = '';
    if (modal) modal.classList.remove('hidden');
}

function closeLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) modal.classList.add('hidden');
}

function togglePasswordVisibility() {
    const pwdInput = document.getElementById('loginPassword');
    const eyeIcon = document.getElementById('loginPasswordEye');
    if (!pwdInput || !eyeIcon) return;

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

    if (btn) {
        btn.innerText = "Memverifikasi...";
        btn.disabled = true;
    }

    try {
        const res = await sendApiPost({ action: "validateAdmin", username: user, password: pass });
        if (res && res.isValid) {
            isAdminLoggedIn = true;
            closeLoginModal();
            updateAdminUIState();
            showToast("Berhasil masuk sebagai Admin!");
        } else {
            const err = document.getElementById('loginErrorMsg');
            if (err) err.classList.remove('hidden');
        }
    } catch (error) {
        showToast("Koneksi ke server gagal. Coba lagi.", "error");
    } finally {
        if (btn) {
            btn.innerText = "Masuk";
            btn.disabled = false;
        }
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
    const loginBtn = document.getElementById('loginHeaderBtn');
    const adminBadge = document.getElementById('adminBadgeContainer');

    if (isAdminLoggedIn) {
        adminNavs.forEach(el => el.classList.remove('hidden'));
        if (authHeader) authHeader.classList.remove('hidden');
        if (adminBadge) adminBadge.classList.remove('hidden');
        if (loginBtn) {
            loginBtn.onclick = handleLogout;
            loginBtn.title = "Keluar / Logout Admin";
            loginBtn.className = "w-10 h-10 flex items-center justify-center bg-amber-500/15 hover:bg-rose-500/25 text-amber-400 hover:text-rose-400 rounded-xl transition-all border border-amber-500/40 hover:border-rose-500/40 active:scale-95 shadow-xs";
            loginBtn.innerHTML = '<i class="fa-solid fa-right-from-bracket text-xs"></i>';
        }
    } else {
        adminNavs.forEach(el => el.classList.add('hidden'));
        if (authHeader) authHeader.classList.remove('hidden');
        if (adminBadge) adminBadge.classList.add('hidden');
        if (loginBtn) {
            loginBtn.onclick = openLoginModal;
            loginBtn.title = "Login Admin";
            loginBtn.className = "w-10 h-10 flex items-center justify-center bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white rounded-xl transition-all border border-slate-700/60 active:scale-95 shadow-xs";
            loginBtn.innerHTML = '<i class="fa-solid fa-lock text-xs"></i>';
        }
    }
}

function openImportMachineModal() {
    showToast("Tarik data sedang sinkronisasi otomatis dari Bridge.", "success");
}
