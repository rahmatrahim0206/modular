function exportToExcel() {
    if (typeof XLSX === 'undefined') { showToast("Pustaka Excel belum siap.", "error"); return; }
    if (!employeesData || employeesData.length === 0) { showToast("Tidak ada data personel!", "error"); return; }

    const now = new Date();
    let targetYear = now.getFullYear();
    let targetMonth = now.getMonth();

    if (attendanceLogs && attendanceLogs.length > 0) {
        const sampleLog = attendanceLogs.find(l => l.date && String(l.date).includes('-'));
        if (sampleLog) {
            const parts = String(sampleLog.date).split('-');
            if (parts.length >= 2) {
                targetYear = parseInt(parts[0], 10);
                targetMonth = parseInt(parts[1], 10) - 1;
            }
        }
    }

    const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    const monthName = new Date(targetYear, targetMonth, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    const categories = ["GURU", "PEGAWAI", "KEAMANAN", "KEBERSIHAN"];
    const workbook = XLSX.utils.book_new();

    const fullDayNameMap = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const shortDayNameMap = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

    categories.forEach(cat => {
        const catEmps = employeesData.filter(e => String(e.category).toUpperCase() === cat).sort((a, b) => a.name.localeCompare(b.name));
        if (catEmps.length === 0) return;

        const rowHeader1 = ["", "", ""];
        for (let day = 1; day <= daysInMonth; day++) rowHeader1.push(day === 1 ? "HARI / TANGGAL" : "");
        rowHeader1.push("REKAPITULASI KEHADIRAN", "", "", "", "");

        const rowHeader2 = ["", "", ""];
        for (let day = 1; day <= daysInMonth; day++) rowHeader2.push(fullDayNameMap[new Date(targetYear, targetMonth, day).getDay()]);
        rowHeader2.push("", "", "", "", "");

        const dateCols = [];
        for (let day = 1; day <= daysInMonth; day++) dateCols.push(`${String(day).padStart(2, '0')}/${String(targetMonth + 1).padStart(2, '0')}/${targetYear}`);

        const rowHeader3 = ["NO", "NAMA GURU / PEGAWAI", "WAKTU", ...dateCols, "Total Hadir", "Terlambat", "Plg Cepat", "Izin/Sakit", "Alpa"];
        const rows = [rowHeader1, rowHeader2, rowHeader3];

        catEmps.forEach((emp, idx) => {
            const shift = shiftsData.find(s => String(s.id) === String(emp.shiftId)) || { days: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum'] };
            const activeDays = (Array.isArray(shift.days) ? shift.days : String(shift.days||'Sen,Sel,Rab,Kam,Jum').split(',')).map(d=>d.trim());

            let countHadir = 0, countLate = 0, countEarly = 0, countPermission = 0, countAbsent = 0;
            const datangCells = [], pulangCells = [];

            for (let day = 1; day <= daysInMonth; day++) {
                const dateObj = new Date(targetYear, targetMonth, day);
                const dateISO = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dayShortName = shortDayNameMap[dateObj.getDay()];
                const isWorkingDay = activeDays.includes(dayShortName);

                const empLogs = attendanceLogs.filter(l => (l.date === dateISO || String(l.date).includes(dateISO)) && (String(l.empId) === String(emp.id) || (emp.machineName && String(l.empId)===emp.machineName)));

                const masukLog = empLogs.find(l => l.type === 'MASUK') || (empLogs[0]?.type === 'MASUK' ? empLogs[0] : null);
                const pulangLog = empLogs.find(l => l.type === 'PULANG') || (empLogs[0]?.type === 'PULANG' ? empLogs[0] : null);

                if (masukLog && (masukLog.status === 'IZIN' || masukLog.status === 'SAKIT')) {
                    datangCells.push(masukLog.status); pulangCells.push("-"); countPermission++;
                } else if (empLogs.length > 0) {
                    if (masukLog && masukLog.status === 'TERLAMBAT') countLate++;
                    if (pulangLog && pulangLog.status === 'PULANG CEPAT') countEarly++;
                    countHadir++;
                    datangCells.push(masukLog ? formatTimeDisplay(masukLog.time) : '-');
                    pulangCells.push(pulangLog ? formatTimeDisplay(pulangLog.time) : '-');
                } else {
                    if (isWorkingDay) { datangCells.push('A'); pulangCells.push('A'); countAbsent++; }
                    else { datangCells.push('Libur'); pulangCells.push('Libur'); }
                }
            }
            rows.push([idx + 1, emp.name, "Datang", ...datangCells, countHadir, countLate, countEarly, countPermission, countAbsent]);
            rows.push(["", emp.nip ? `NIP. ${emp.nip}` : `ID. ${emp.id}`, "Pulang", ...pulangCells, "", "", "", "", ""]);
        });

        const worksheet = XLSX.utils.aoa_to_sheet(rows);
        worksheet['!merges'] = [
            { s: { r: 0, c: 3 }, e: { r: 0, c: 3 + daysInMonth - 1 } },
            { s: { r: 0, c: 3 + daysInMonth }, e: { r: 0, c: 3 + daysInMonth + 4 } }
        ];
        XLSX.utils.book_append_sheet(workbook, worksheet, cat);
    });

    const logData = attendanceLogs.map((log, idx) => {
        const emp = findEmployee(log.empId) || {};
        return { "No": idx + 1, "Tanggal": log.date, "Waktu Tap": log.time, "Nama Personel": emp.name || log.empId, "NIP": emp.nip || '-', "Kategori": emp.category || '-', "Tipe": log.type || 'MASUK', "Status": log.status || 'HADIR', "Catatan": log.note || '-' };
    });
    if (logData.length > 0) XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(logData), "LOG RIWAYAT DETIL");

    XLSX.writeFile(workbook, `Laporan_Absensi_Matrix_${monthName.replace(/\s+/g, '_')}.xlsx`);
    showToast("Laporan Excel berhasil diunduh!");
}
