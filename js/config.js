const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyqtbihJZ90pj2KPWOn6-brUPma3KXau0ywjI6r6R1UhGUA2HWRrONjhNJxpAsGLGv1/exec";

let isAdminLoggedIn = false;
let activeTab = 'live';
let categoryChart = null;
let popupAutoTimer = null;
let pollingTimer = null;
let lastKnownTopLogKey = "";

let employeesData = [];
let shiftsData = [];
let timeSchemesData = [];
let bridgeStatus = { isConnected: false, lastPing: null, ip: "" };
let timeRules = { autoPopup: true, playSound: true };
let attendanceLogs = [];
let currentEmpCatFilter = 'ALL';
let pollingIntervalMs = 10000;

const ALL_DAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

function purgeBrowserCache() {
    try {
        if ('caches' in window) {
            caches.keys().then(names => {
                for (let name of names) caches.delete(name);
            });
        }
        sessionStorage.clear();
    } catch (err) { }
}

function getTodayISO() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Format string jam secara robust dengan Regex HH:mm agar bebas dari bug date 1899.
 */
function formatTimeDisplay(timeStr) {
    if (!timeStr) return "00:00 WITA";
    const str = String(timeStr).replace(/\s*WITA\s*/gi, '').trim();
    const match = str.match(/(\d{1,2}):(\d{2})/);
    if (match) {
        const hh = match[1].padStart(2, '0');
        const mm = match[2].padStart(2, '0');
        return `${hh}:${mm} WITA`;
    }
    return `${str} WITA`;
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    const isSuccess = type === 'success';
    toast.className = `pointer-events-auto px-4 py-3 rounded-xl shadow-lg border text-xs font-bold flex items-center gap-2 transform transition-all duration-300 translate-y-2 opacity-0 ${isSuccess ? 'bg-emerald-800 text-white border-emerald-700' : 'bg-rose-800 text-white border-rose-700'}`;
    toast.innerHTML = `<i class="fa-solid ${isSuccess ? 'fa-circle-check' : 'fa-circle-xmark'} text-sm"></i> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.classList.remove('translate-y-2', 'opacity-0'), 10);
    setTimeout(() => { toast.classList.add('opacity-0', 'translate-y-2'); setTimeout(() => toast.remove(), 300); }, 3000);
}

function playChimeSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === 'suspended') ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(); osc.stop(ctx.currentTime + 0.3);
    } catch (e) { }
}

function getLogUniqueKey(log) {
    if (!log) return "";
    return `${log.date || ''}|${log.time || ''}|${log.empId || ''}`;
}

function findEmployee(identifier) {
    if (!identifier) return null;
    const searchStr = String(identifier).trim().toLowerCase();
    return employeesData.find(e => {
        if (!e) return false;
        const matchId = String(e.id || '').toLowerCase() === searchStr;
        const matchNip = e.nip ? String(e.nip).replace(/\s+/g, '').toLowerCase() === searchStr.replace(/\s+/g, '') : false;
        const matchName = e.machineName ? String(e.machineName).toLowerCase() === searchStr : false;
        return matchId || matchNip || matchName;
    }) || null;
}
