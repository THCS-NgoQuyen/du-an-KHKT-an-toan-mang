// ========================================================
// JS/CTF-SIMULATIONS.JS — ĐẤU TRƯỜNG CTF 5 MẢNG
// Web Exploitation - Cryptography - Binary Pwn - Reverse Engineering - Digital Forensics
// ========================================================

const CTF_SYSTEM = (function() {
    const FLAGS = {
        web: "FLAG{web_sqli_bypass_successful_9a5}",
        crypto: "FLAG{MatMa_Heth_Thcs_2026}",
        pwn: "FLAG{pwn_buffer_overflow_stack_smashed}",
        re: "FLAG{rev_crackme_logic_reversed_2026}",
        forensics: "FLAG{forensics_stego_hidden_in_plain_sight}"
    };

    const STORAGE_KEY = "ctf_flags_captured_thcs";

    function getCapturedFlags() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        } catch(e) {
            return [];
        }
    }

    function saveCapturedFlags(list) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }

    function isFlagCaptured(key) {
        return getCapturedFlags().includes(key);
    }

    function submitFlag(flagInput, sourceKey) {
        const flag = (flagInput || '').trim();
        if (!flag) {
            if (typeof showToast === 'function') showToast('yellow', 'Chưa nhập cờ!', 'Vui lòng dán cờ dạng FLAG{...} để nộp.');
            return false;
        }

        let foundKey = null;
        for (let [k, v] of Object.entries(FLAGS)) {
            if (v.toLowerCase() === flag.toLowerCase()) {
                foundKey = k;
                break;
            }
        }

        if (!foundKey) {
            if (typeof showToast === 'function') showToast('red', 'Sai cờ rồi! ❌', 'Cờ này không chính xác. Hãy kiểm tra lại nhé!');
            return false;
        }

        const captured = getCapturedFlags();
        if (captured.includes(foundKey)) {
            if (typeof showToast === 'function') showToast('blue', 'Đã chiếm trước đó! ℹ️', `Bạn đã nộp cờ của mảng ${foundKey.toUpperCase()} rồi (+100 PTS).`);
            return true;
        }

        captured.push(foundKey);
        saveCapturedFlags(captured);
        updateHUD();

        if (typeof showToast === 'function') {
            showToast('green', '🎉 CHIẾM CỜ THÀNH CÔNG! (+100 PTS)', `Chúc mừng em đã giải xong thử thách mảng ${foundKey.toUpperCase()}!`);
        }

        playVictorySound();
        return true;
    }

    function playVictorySound() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
            notes.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0.15, ctx.currentTime + idx * 0.1);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.3);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(ctx.currentTime + idx * 0.1);
                osc.stop(ctx.currentTime + idx * 0.1 + 0.35);
            });
        } catch(e) {}
    }

    function updateHUD() {
        const captured = getCapturedFlags();
        const total = Object.keys(FLAGS).length;
        const count = captured.length;
        const score = count * 100;

        const countEl = document.getElementById('ctf-stat-count');
        if (countEl) countEl.textContent = `${count}/${total}`;

        const scoreEl = document.getElementById('ctf-stat-score');
        if (scoreEl) scoreEl.textContent = `${score} PTS`;

        const rankEl = document.getElementById('ctf-stat-rank');
        if (rankEl) {
            if (count === 0) rankEl.textContent = 'Tập Sự 🥉';
            else if (count <= 2) rankEl.textContent = 'Học Viên 🛡️';
            else if (count <= 4) rankEl.textContent = 'Hiệp Sĩ Số 🥈';
            else rankEl.textContent = 'Đại Cao Thủ CTF 🥇';
        }

        // Update 5 badges
        Object.keys(FLAGS).forEach(k => {
            const badge = document.getElementById(`ctf-badge-${k}`);
            if (badge) {
                if (captured.includes(k)) {
                    badge.classList.add('captured');
                    badge.innerHTML = `✅ ${k.toUpperCase()} (+100)`;
                } else {
                    badge.classList.remove('captured');
                    badge.innerHTML = `🚩 ${k.toUpperCase()}`;
                }
            }
        });
    }

    function resetProgress() {
        if (confirm("Em có chắc chắn muốn đặt lại điểm số và cờ CTF không?")) {
            localStorage.removeItem(STORAGE_KEY);
            updateHUD();
            if (typeof showToast === 'function') showToast('info', 'Đã đặt lại', 'Tiến độ cờ CTF đã được xóa về 0.');
        }
    }

    return {
        FLAGS,
        submitFlag,
        isFlagCaptured,
        updateHUD,
        resetProgress
    };
})();

// ========================================================
// 1. WEB EXPLOITATION SIMULATOR (SQLi & Cookie)
// ========================================================
function updateSqliLiveQuery() {
    const userInp = document.getElementById('sqli-user').value;
    const passInp = document.getElementById('sqli-pass').value;
    const queryEl = document.getElementById('sqli-sql-preview');
    if (!queryEl) return;

    const safeUser = userInp || "username";
    const safePass = passInp || "password";

    const isSqli = userInp.includes("'") || userInp.toLowerCase().includes("or") || userInp.includes("--");
    const userDisplay = isSqli ? `<span class="sqli-query-hl">${escapeHtml(safeUser)}</span>` : escapeHtml(safeUser);

    queryEl.innerHTML = `SELECT * FROM accounts WHERE username = '${userDisplay}' AND password = '${escapeHtml(safePass)}';`;
}

function insertSqliPayload(payload) {
    const input = document.getElementById('sqli-user');
    if (input) {
        input.value = payload;
        updateSqliLiveQuery();
    }
}

function runSqliLogin(event) {
    if (event) event.preventDefault();
    const user = (document.getElementById('sqli-user').value || '').trim();
    const pass = (document.getElementById('sqli-pass').value || '').trim();
    const alertBox = document.getElementById('sqli-feedback');
    const adminPortal = document.getElementById('sqli-admin-portal');

    // Normal credentials check
    if (user === 'admin' && pass === 'supersecret123') {
        alertBox.innerHTML = `<span style="color:#6ee7b7;">✅ Đăng nhập admin thành công bằng mật khẩu chuẩn!</span>`;
        adminPortal.style.display = 'block';
        return;
    }

    // SQL Injection check: logic contains ' OR '1'='1 or ' OR 1=1 or similar
    const cleanUser = user.toLowerCase().replace(/\s+/g, '');
    const isBypass = cleanUser.includes("'or'1'='1") || cleanUser.includes("'or1=1") || cleanUser.includes("'or''='") || (cleanUser.includes("'or") && cleanUser.includes("="));

    if (isBypass) {
        alertBox.innerHTML = `
            <div style="background:rgba(16,185,129,.15);border:1px solid #10b981;border-radius:10px;padding:12px 16px;color:#6ee7b7;">
                <strong>🎉 SQL INJECTION BYPASS THÀNH CÔNG!</strong><br>
                Mệnh đề <code>'1'='1'</code> luôn đúng (TRUE), hệ thống đã bỏ qua kiểm tra mật khẩu và cấp quyền Admin!
            </div>
        `;
        adminPortal.style.display = 'block';
        adminPortal.scrollIntoView({ behavior: 'smooth' });
    } else {
        alertBox.innerHTML = `
            <div style="background:rgba(239,68,68,.15);border:1px solid #ef4444;border-radius:10px;padding:10px 14px;color:#fca5a5;">
                ❌ Đăng nhập thất bại! Sai tên tài khoản hoặc mật khẩu.<br>
                <small>💡 Gợi ý: Thử dùng ký tự nháy đơn <code>'</code> và mệnh đề logic <code>OR '1'='1</code> để phá vỡ câu lệnh SQL!</small>
            </div>
        `;
        adminPortal.style.display = 'none';
    }
}

function updateCookieRole() {
    const roleSelect = document.getElementById('cookie-role-select').value;
    const cookieDisplay = document.getElementById('cookie-live-str');
    const portalRoleBadge = document.getElementById('cookie-portal-role');
    const cookieSecretFlag = document.getElementById('cookie-secret-view');

    if (cookieDisplay) cookieDisplay.textContent = `session_id=9a5_token_8849; role=${roleSelect}; user=hocsinh`;
    if (portalRoleBadge) portalRoleBadge.textContent = roleSelect.toUpperCase();

    if (roleSelect === 'admin') {
        if (cookieSecretFlag) cookieSecretFlag.style.display = 'block';
        if (typeof showToast === 'function') showToast('green', 'Cookie Tampering Thành Công!', 'Đã đổi Role sang ADMIN!');
    } else {
        if (cookieSecretFlag) cookieSecretFlag.style.display = 'none';
    }
}

// ========================================================
// 2. CRYPTOGRAPHY SIMULATOR (Caesar, Base64 & Hash)
// ========================================================
function runCaesarShift() {
    const shift = parseInt(document.getElementById('caesar-shift-slider').value) || 0;
    const input = document.getElementById('caesar-input').value;
    const badge = document.getElementById('caesar-shift-badge');
    const output = document.getElementById('caesar-output');
    if (badge) badge.textContent = `Shift: ${shift}`;

    let res = "";
    for (let i = 0; i < input.length; i++) {
        const c = input[i];
        if (c >= 'A' && c <= 'Z') {
            res += String.fromCharCode(((c.charCodeAt(0) - 65 + shift) % 26) + 65);
        } else if (c >= 'a' && c <= 'z') {
            res += String.fromCharCode(((c.charCodeAt(0) - 97 + shift) % 26) + 97);
        } else {
            res += c;
        }
    }
    if (output) output.textContent = res;

    // Check if solved
    if (res.includes("FLAG{MatMa_Heth_Thcs_2026}")) {
        const solveEl = document.getElementById('caesar-solved-msg');
        if (solveEl) solveEl.style.display = 'block';
    }
}

function decodeSecretBase64() {
    const raw = "T1JZVntNYXRNYV9IZXRoX1RoY3NfMjAyNn0=";
    try {
        const decoded = atob(raw);
        const outEl = document.getElementById('b64-decode-out');
        if (outEl) {
            outEl.innerHTML = `<strong>Kết quả giải mã Base64:</strong> <code style="color:#a78bfa;font-size:1.05rem;">${decoded}</code><br><span style="font-size:0.82rem;color:#67e8f9;">👉 Bây giờ hãy dán chuỗi này vào ô Caesar Shift để giải mã tiếp! (Gợi ý: ROT13 / Shift 13)</span>`;
        }
        const caesarInp = document.getElementById('caesar-input');
        if (caesarInp) {
            caesarInp.value = decoded;
            runCaesarShift();
        }
        if (typeof showToast === 'function') showToast('green', 'Base64 Decoded!', 'Đã giải mã thành công chuỗi Base64!');
    } catch(e) {}
}

function runLiveHasher() {
    const val = document.getElementById('hash-input').value;
    const md5Out = document.getElementById('hash-md5-out');
    const shaOut = document.getElementById('hash-sha-out');

    if (!val) {
        if (md5Out) md5Out.textContent = '—';
        if (shaOut) shaOut.textContent = '—';
        return;
    }

    // Simulated quick hashes for demonstration
    let h1 = 0, h2 = 5381;
    for (let i = 0; i < val.length; i++) {
        h1 = ((h1 << 5) - h1) + val.charCodeAt(i);
        h1 |= 0;
        h2 = ((h2 << 5) + h2) + val.charCodeAt(i);
        h2 |= 0;
    }
    const hex1 = Math.abs(h1).toString(16).padStart(8, '0') + Math.abs(h2).toString(16).padStart(8, '0');
    const hex2 = hex1 + hex1.split('').reverse().join('');

    if (md5Out) md5Out.textContent = (hex1 + hex1).slice(0, 32);
    if (shaOut) shaOut.textContent = (hex2 + hex2).slice(0, 64);
}

// ========================================================
// 3. BINARY EXPLOITATION / PWN (STACK OVERFLOW VISUALIZER)
// ========================================================
function renderPwnMemory() {
    const input = document.getElementById('pwn-payload-input').value;
    const grid = document.getElementById('pwn-memory-grid');
    const statusBanner = document.getElementById('pwn-status-banner');
    const flagBox = document.getElementById('pwn-flag-result');
    if (!grid) return;

    grid.innerHTML = '';
    const TOTAL_CELLS = 20; // 16 bytes buffer + 4 bytes is_admin

    let isAdminCorrupted = false;

    for (let i = 0; i < TOTAL_CELLS; i++) {
        const isTargetVar = (i >= 16);
        const char = input[i] || '';
        const hex = char ? char.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0') : '00';
        const isOverflowed = i >= 16 && char !== '';

        if (isOverflowed) {
            isAdminCorrupted = true;
        }

        const cell = document.createElement('div');
        cell.className = `pwn-cell ${isTargetVar ? 'is-target' : ''} ${isOverflowed ? 'target-corrupted overflowed' : (char ? 'overflowed' : '')}`;
        
        let label = `buf[${i}]`;
        if (i === 16) label = 'admin[0]';
        if (i === 17) label = 'admin[1]';
        if (i === 18) label = 'admin[2]';
        if (i === 19) label = 'admin[3]';

        cell.innerHTML = `
            <div class="pwn-cell-addr">0x${(0x7ff00 + i).toString(16)}</div>
            <div class="pwn-cell-val">${hex}</div>
            <div class="pwn-cell-char">${char ? escapeHtml(char) : '.'}</div>
            <div style="font-size:0.6rem;color:${isTargetVar ? '#f59e0b' : '#64748b'};margin-top:2px;">${label}</div>
        `;
        grid.appendChild(cell);
    }

    if (isAdminCorrupted) {
        statusBanner.className = 'warn-box red';
        statusBanner.innerHTML = `
            <div class="warn-icon">🚨</div>
            <div class="warn-content">
                <h4 style="color:#fca5a5;">💥 BUFFER OVERFLOW DETECTED — CỜ ĐÃ MỞ KHÓA!</h4>
                <p>Bộ đệm 16-byte đã bị tràn! Ký tự thứ 17 trở đi đã ghi đè trực tiếp lên ô nhớ của biến <code>is_admin</code>, biến giá trị từ <code>0</code> thành khác <code>0</code>!</p>
            </div>
        `;
        if (flagBox) flagBox.style.display = 'block';
    } else {
        statusBanner.className = 'warn-box blue';
        statusBanner.innerHTML = `
            <div class="warn-icon">ℹ️</div>
            <div class="warn-content">
                <h4>Trạng thái bộ nhớ: An toàn</h4>
                <p>Đã nhập: <strong>${input.length}/16</strong> ký tự vào <code>buffer</code>. Biến <code>is_admin</code> vẫn là <strong>0</strong> (Quyền hạn: Khách thường). Hãy gõ thêm để tràn ô nhớ!</p>
            </div>
        `;
        if (flagBox) flagBox.style.display = 'none';
    }
}

function fillPwnExploit() {
    const input = document.getElementById('pwn-payload-input');
    if (input) {
        input.value = "AAAAAAAAAAAAAAAAADMIN";
        renderPwnMemory();
        if (typeof showToast === 'function') showToast('red', 'Đã nạp Payload!', 'Gửi 21 ký tự để tràn biến is_admin!');
    }
}

// ========================================================
// 4. REVERSE ENGINEERING (CRACKME)
// ========================================================
function testCrackmeKey() {
    const key = (document.getElementById('re-key-input').value || '').trim();
    const resultBox = document.getElementById('re-trace-result');
    const flagBox = document.getElementById('re-flag-result');

    if (!key) {
        if (typeof showToast === 'function') showToast('yellow', 'Chưa nhập mã!', 'Hãy nhập mã bản quyền để phần mềm phân tích.');
        return;
    }

    // Step by step logic check
    let logs = [];
    logs.push(`[+] Bắt đầu hàm verify_license("${escapeHtml(key)}")...`);

    if (!key.startsWith("CYBER-")) {
        logs.push(`<span style="color:#ef4444;">[-] DÒNG 2 THẤT BẠI: Mã không bắt đầu bằng tiền tố 'CYBER-'.</span>`);
        showCrackmeTrace(logs, false);
        if (flagBox) flagBox.style.display = 'none';
        return;
    }
    logs.push(`<span style="color:#10b981;">[✓] DÒNG 2 ĐẠT: Tiền tố đúng 'CYBER-'.</span>`);

    const parts = key.split("-");
    if (parts.length !== 3) {
        logs.push(`<span style="color:#ef4444;">[-] DÒNG 4 THẤT BẠI: Mã phải có đúng 3 phần phân tách bởi dấu '-' (CYBER-XXXX-YYYY).</span>`);
        showCrackmeTrace(logs, false);
        if (flagBox) flagBox.style.display = 'none';
        return;
    }

    const part2 = parts[1];
    const part3 = parts[2];

    if (part2 !== "2026") {
        logs.push(`<span style="color:#ef4444;">[-] DÒNG 7 THẤT BẠI: Phần thứ 2 (${escapeHtml(part2)}) không khớp năm hiện tại (2026).</span>`);
        showCrackmeTrace(logs, false);
        if (flagBox) flagBox.style.display = 'none';
        return;
    }
    logs.push(`<span style="color:#10b981;">[✓] DÒNG 7 ĐẠT: Phần thứ 2 chuẩn xác là '2026'.</span>`);

    if (part3.toUpperCase() !== "THCS") {
        logs.push(`<span style="color:#ef4444;">[-] DÒNG 10 THẤT BẠI: Phần thứ 3 (${escapeHtml(part3)}) không khớp chữ viết tắt cấp học (THCS).</span>`);
        showCrackmeTrace(logs, false);
        if (flagBox) flagBox.style.display = 'none';
        return;
    }
    logs.push(`<span style="color:#10b981;">[✓] DÒNG 10 ĐẠT: Phần thứ 3 chuẩn xác là 'THCS'.</span>`);
    logs.push(`<span style="color:#6ee7b7;font-weight:bold;">[★] TẤT CẢ ĐIỀU KIỆN ĐẠT! BẢN QUYỀN ĐÃ ĐƯỢC KÍCH HOẠT VĨNH VIỄN!</span>`);

    showCrackmeTrace(logs, true);
    if (flagBox) flagBox.style.display = 'block';
    if (typeof showToast === 'function') showToast('green', 'Bẻ Khóa Thành Công! 🔓', 'Mã bản quyền chuẩn xác!');
}

function showCrackmeTrace(logs, isSuccess) {
    const el = document.getElementById('re-trace-result');
    if (!el) return;
    el.innerHTML = logs.join('<br>');
    el.style.borderColor = isSuccess ? '#10b981' : '#ef4444';
}

// ========================================================
// 5. DIGITAL FORENSICS (HEX VIEWER & STEGO)
// ========================================================
const SAMPLE_HEX_STREAM = [
    { offset: "00000000", bytes: "89 50 4E 47 0D 0A 1A 0A 00 00 00 0D 49 48 44 52", ascii: ".PNG........IHDR" },
    { offset: "00000010", bytes: "00 00 02 80 00 00 01 E0 08 06 00 00 00 E8 D3 B2", ascii: "................" },
    { offset: "00000020", bytes: "00 00 00 01 73 52 47 42 00 AE CE 1C E9 00 00 00", ascii: "....sRGB........" },
    { offset: "00000030", bytes: "00 00 05 12 49 44 41 54 78 9C ED D1 B1 0D C0 20", ascii: "....IDATx...... " },
    { offset: "00000040", bytes: "0C 04 20 A1 02 A5 EF 7F 2E 12 8A 61 24 B1 C2 98", ascii: ".. ........a$..." },
    { offset: "00000050", bytes: "54 21 89 E2 B8 1A A0 45 12 CD EE 81 22 49 20 C1", ascii: 'T!.....E...."I .' },
    { offset: "00000060", bytes: "00 00 00 00 49 45 4E 44 AE 42 60 82 2F 2F 20 23", ascii: "....IEND.B`..//#" },
    { offset: "00000070", bytes: "46 4C 41 47 7B 66 6F 72 65 6E 73 69 63 73 5F 73", ascii: "FLAG{forensics_s" },
    { offset: "00000080", bytes: "74 65 67 6F 5F 68 69 64 64 65 6E 5F 69 6E 5F 70", ascii: "tego_hidden_in_p" },
    { offset: "00000090", bytes: "6C 61 69 6E 5F 73 69 67 68 74 7D 0A 00 00 00 00", ascii: "lain_sight}....." }
];

function renderHexViewer(searchTerm = '') {
    const pane = document.getElementById('hex-view-pane');
    if (!pane) return;
    pane.innerHTML = '';

    const term = (searchTerm || '').trim().toUpperCase();

    SAMPLE_HEX_STREAM.forEach(row => {
        let asciiDisplay = escapeHtml(row.ascii);
        let bytesDisplay = row.bytes;

        if (term && (row.ascii.toUpperCase().includes(term) || row.bytes.includes(term))) {
            asciiDisplay = asciiDisplay.replace(new RegExp(term, 'gi'), match => `<span class="hex-match">${match}</span>`);
        }

        const div = document.createElement('div');
        div.className = 'hex-row';
        div.innerHTML = `
            <span class="hex-offset">${row.offset}</span>
            <span class="hex-bytes">${bytesDisplay}</span>
            <span class="hex-ascii">${asciiDisplay}</span>
        `;
        pane.appendChild(div);
    });
}

function searchHexViewer() {
    const val = document.getElementById('hex-search-input').value;
    renderHexViewer(val);
    if (val.toUpperCase().includes("FLAG")) {
        const flagBox = document.getElementById('forensics-flag-found');
        if (flagBox) flagBox.style.display = 'block';
        if (typeof showToast === 'function') showToast('green', 'Đã tìm thấy Flag ẩn!', 'Cờ giấu sau đuôi file IEND!');
    }
}

// Utility: HTML Escaper
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Global initializer
window.addEventListener('DOMContentLoaded', () => {
    CTF_SYSTEM.updateHUD();
    updateSqliLiveQuery();
    runCaesarShift();
    renderPwnMemory();
    renderHexViewer();
});
