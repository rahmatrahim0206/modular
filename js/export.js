function exportToExcel() {
    if (typeof XLSX === 'undefined') {
        showToast("Pustaka Excel belum siap. Silakan coba lagi.", "error");
        return;
    }

    if (!employeesData || employeesData.length === 0) {
        showToast("Tidak ada data personel untuk diekspor!", "error");
        return;
    }

    const now = new Date();
    let targetYear = now.getFullYear();
    let targetMonth = now.getMonth();

    if (attendanceLogs && attendanceLogs.length > 0) {
        const sampleLog = attendanceLogs.find(l => l.date && String(l.date).includes('-'));
        if (sampleLog) {
            const parts = String(sampleLog.date).split('-');
            if (parts.length >= 2) {
                const y = parseInt(parts[0], 10);
                const m = parseInt(parts[1], 10) - 1;
                if (!isNaN(y) && !isNaN(m) && m >= 0 && m <= 11) {
                    targetYear = y;
                    targetMonth = m;
                }
            }
        }
    }

    const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    const dateObjRef = new Date(targetYear, targetMonth, 1);
    const monthName = dateObjRef.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

    const categories = ["GURU", "PEGAWAI", "KEAMANAN", "KEBERSIHAN"];
    const workbook = XLSX.utils.book_new();

    const fullDayNameMap = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const shortDayNameMap = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

    categories.forEach(cat => {
        const catEmps = employeesData.filter(e => String(e.category).toUpperCase() === cat.toUpperCase())
                                      .sort((a, b) => a.name.localeCompare(b.name));
        
        if (catEmps.length === 0) return;

        const rowHeader1 = ["", "", ""];
        for (let day = 1; day <= daysInMonth; day++) {
            rowHeader1.push(day === 1 ? "HARI / TANGGAL" : "");
        }
        rowHeader1.push("REKAPITULASI KEHADIRAN", "", "", "", "");

        const rowHeader2 = ["", "", ""];
        for (let day = 1; day <= daysInMonth; day++) {
            const dateObj = new Date(targetYear, targetMonth, day);
            rowHeader2.push(fullDayNameMap[dateObj.getDay()]);
        }
        rowHeader2.push("", "", "", "", "");

        const dateCols = [];
        for (let day = 1; day <= daysInMonth; day++) {
            const dayStr = String(day).padStart(2, '0');
            const monthStr = String(targetMonth + 1).padStart(2, '0');
            dateCols.push(`${dayStr}/${monthStr}/${targetYear}`);
        }

        const rowHeader3 = ["NO", "NAMA GURU / PEGAWAI", "WAKTU", ...dateCols, "Total Hadir", "Terlambat", "Plg Cepat", "Izin/Sakit", "Alpa"];
        const rows = [rowHeader1, rowHeader2, rowHeader3];

        catEmps.forEach((emp, idx) => {
            const shift = shiftsData.find(s => String(s.id) === String(emp.shiftId)) || { days: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum'] };
            const rawDays = Array.isArray(shift.days) ? shift.days : String(shift.days || 'Sen,Sel,Rab,Kam,Jum').split(',');
            const activeDays = rawDays.map(d => String(d).trim());

            let countHadir = 0;
            let countLate = 0;
            let countEarly = 0;
            let countPermission = 0;
            let countAbsent = 0;

            const datangCells = [];
            const pulangCells = [];

            for (let day = 1; day <= daysInMonth; day++) {
                const dateObj = new Date(targetYear, targetMonth, day);
                const dayStr = String(day).padStart(2, '0');
                const monthStr = String(targetMonth + 1).padStart(2, '0');
                const dateISO = `${targetYear}-${monthStr}-${dayStr}`;

                const dayShortName = shortDayNameMap[dateObj.getDay()];
                const isWorkingDay = activeDays.includes(dayShortName);

                const empLogs = attendanceLogs.filter(l => {
                    const matchDate = (l.date === dateISO || String(l.date).includes(dateISO));
                    if (!matchDate) return false;
                    const matchedEmp = findEmployee(l.empId);
                    return matchedEmp ? String(matchedEmp.id) === String(emp.id) : String(l.empId) === String(emp.id);
                });

                const masukLog = empLogs.find(l => l.type === 'MASUK');
                const pulangLog = empLogs.find(l => l.type === 'PULANG');

                if (masukLog && (masukLog.status === 'IZIN' || masukLog.status === 'SAKIT')) {
                    datangCells.push(masukLog.status);
                    pulangCells.push("-");
                    countPermission++;
                } else if (empLogs.length > 0) {
                    const inLog = masukLog || (empLogs[0].type === 'MASUK' ? empLogs[0] : null);
                    const outLog = pulangLog || (empLogs[0].type === 'PULANG' ? empLogs[0] : null);

                    const inTimeStr = inLog ? formatTimeDisplay(inLog.time) : '-';
                    const outTimeStr = outLog ? formatTimeDisplay(outLog.time) : '-';

                    const isLate = inLog && (inLog.status === 'TERLAMBAT');
                    const isEarly = outLog && (outLog.status === 'PULANG CEPAT');

                    if (isLate) countLate++;
                    if (isEarly) countEarly++;

                    const lateFlag = isLate ? " (T)" : "";
                    const earlyFlag = isEarly ? " (PC)" : "";

                    countHadir++;
                    datangCells.push(inTimeStr !== '-' ? (inTimeStr + lateFlag) : '-');
                    pulangCells.push(outTimeStr !== '-' ? (outTimeStr + earlyFlag) : '-');
                } else {
                    if (isWorkingDay) {
                        datangCells.push('A');
                        pulangCells.push('A');
                        countAbsent++;
                    } else {
                        datangCells.push('Libur');
                        pulangCells.push('Libur');
                    }
                }
            }

            rows.push([
                idx + 1,
                emp.name,
                "Datang",
                ...datangCells,
                countHadir,
                countLate,
                countEarly,
                countPermission,
                countAbsent
            ]);

            const nipStr = emp.nip ? `NIP. ${emp.nip}` : `ID: ${emp.id}`;
            rows.push([
                "",
                nipStr,
                "Pulang",
                ...pulangCells,
                "",
                "",
                "",
                "",
                ""
            ]);
        });

        const worksheet = XLSX.utils.aoa_to_sheet(rows);

        worksheet['!merges'] = [
            { s: { r: 0, c: 3 }, e: { r: 0, c: 3 + daysInMonth - 1 } },
            { s: { r: 0, c: 3 + daysInMonth }, e: { r: 0, c: 3 + daysInMonth + 4 } }
        ];

        XLSX.utils.book_append_sheet(workbook, worksheet, cat);
    });

    if (attendanceLogs.length > 0) {
        const logData = attendanceLogs.map((log, idx) => {
            const emp = findEmployee(log.empId) || {};
            return {
                "No": idx + 1,
                "Tanggal": log.date || '-',
                "Waktu Tap": formatTimeDisplay(log.time),
                "Nama Pegawai": emp.name || log.empId,
                "NIP / PIN": emp.nip || log.empId,
                "Kategori": emp.category || '-',
                "Jabatan": emp.role || '-',
                "Tipe Tap": log.type || 'MASUK',
                "Status": log.status || 'HADIR',
                "Catatan": log.note || '-'
            };
        });
        const logWs = XLSX.utils.json_to_sheet(logData);
        XLSX.utils.book_append_sheet(workbook, logWs, "LOG RIWAYAT DETIL");
    }

    XLSX.writeFile(workbook, `Laporan_Absensi_Matrix_${monthName.replace(/\s+/g, '_')}.xlsx`);
    showToast("Laporan Excel Matrix berhasil diunduh!");
}