// ===== js/survey-db.js — Client-Side Database & Google Sheets API Connector =====

const SurveyDB = (function() {
    const LOCAL_DB_KEY = 'cyber_survey_submissions_db';
    const GOOGLE_SHEET_KEY = 'cyber_google_sheet_webapp_url';
    const DEFAULT_GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwXJ9eIzSFWQuwE36eeJe-sXS9gy_ar32mDT3etRphQlQQX85kphkfnVlIXzZU2tzAu/exec';

    // Get configured Google Apps Script Web App URL
    function getGoogleScriptUrl() {
        return localStorage.getItem(GOOGLE_SHEET_KEY) || DEFAULT_GOOGLE_SCRIPT_URL;
    }

    function setGoogleScriptUrl(url) {
        localStorage.setItem(GOOGLE_SHEET_KEY, (url || DEFAULT_GOOGLE_SCRIPT_URL).trim());
    }

    // Helper: determine Node.js server API base URL
    function getApiBase() {
        if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
            return window.location.origin;
        }
        return 'http://localhost:3000';
    }

    function extractScore(val) {
        if (val === null || val === undefined || val === '') return null;
        if (typeof val === 'number') {
            return (val >= 1 && val <= 5) ? val : null;
        }
        const str = String(val).trim();
        const m = str.match(/^(\d+)/);
        if (m) {
            const num = parseInt(m[1], 10);
            return (num >= 1 && num <= 5) ? num : null;
        }
        return null;
    }

    function normalizeSubmission(s) {
        if (!s) return null;
        let rawAns = s.answers || {};
        if (typeof rawAns === 'string') {
            try { rawAns = JSON.parse(rawAns); } catch(e) { rawAns = {}; }
        }

        let gender = rawAns.gender;
        if (!gender && rawAns[1]) {
            const m = String(rawAns[1]).match(/Giới tính:\s*(.+)/i);
            gender = m ? m[1].trim() : String(rawAns[1]).trim();
        }

        let grade = rawAns.grade;
        if (!grade && rawAns[2]) {
            const m = String(rawAns[2]).match(/Khối lớp:\s*(.+)/i);
            grade = m ? m[1].trim() : String(rawAns[2]).trim();
        }

        let timeOnline = rawAns.timeOnline;
        if (!timeOnline && rawAns[3]) {
            const m = String(rawAns[3]).match(/Thời gian online:\s*(.+)/i);
            timeOnline = m ? m[1].trim() : String(rawAns[3]).trim();
        }

        let purpose = rawAns.purpose;
        if (!purpose && rawAns[4]) {
            const m = String(rawAns[4]).match(/Mục đích:\s*(.+)/i);
            purpose = m ? m[1].trim() : String(rawAns[4]).trim();
        }

        let open1 = rawAns.open1;
        if (!open1 && rawAns[29]) {
            const m = String(rawAns[29]).match(/Nguy cơ lớn nhất:\s*(.+)/i);
            open1 = m ? m[1].trim() : String(rawAns[29]).trim();
        }
        let open2 = rawAns.open2;
        if (!open2 && rawAns[30]) {
            const m = String(rawAns[30]).match(/Mong muốn hỗ trợ:\s*(.+)/i);
            open2 = m ? m[1].trim() : String(rawAns[30]).trim();
        }

        const phase = rawAns.phase || (rawAns['Dot'] ? String(rawAns['Dot']).replace(/\D/g, '') : 1);

        const normAns = {
            ...rawAns,
            gender: gender || '—',
            grade: grade || '—',
            timeOnline: timeOnline || '—',
            purpose: purpose || '—',
            open1: open1 || '',
            open2: open2 || '',
            phase: phase || 1
        };

        for (let q = 5; q <= 32; q++) {
            const val = extractScore(rawAns[q] !== undefined ? rawAns[q] : rawAns[String(q)]);
            if (val !== null) {
                normAns[q] = val;
                normAns[String(q)] = val;
            }
        }

        return {
            id: s.id || (s.serverDbId ? `#${s.serverDbId}` : '—'),
            studentName: (s.studentName || s.student_name || 'Học sinh').trim(),
            studentClass: (s.studentClass || s.student_class || 'THCS').trim().toUpperCase(),
            submittedAt: s.submittedAt || s.submitted_at || new Date().toLocaleString('vi-VN'),
            totalAnswered: s.totalAnswered || s.total_answered || Object.keys(normAns).length,
            riskScore: s.riskScore || s.risk_score || 0,
            answers: normAns
        };
    }

    // Helper: get local submissions from localStorage
    function getLocalSubmissions() {
        try {
            const data = localStorage.getItem(LOCAL_DB_KEY);
            const list = data ? JSON.parse(data) : [];
            return list.map(normalizeSubmission).filter(Boolean);
        } catch(e) {
            return [];
        }
    }

    // Helper: save local submissions to localStorage
    function saveLocalSubmissions(submissions) {
        try {
            const normalized = (submissions || []).map(normalizeSubmission).filter(Boolean);
            localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(normalized));
        } catch(e) {
            console.error('Error saving to localStorage:', e);
        }
    }

    /**
     * Submit survey responses to:
     * 1. Google Sheets (via Apps Script Web App Webhook)
     * 2. Local Node.js SQLite Database (/api/survey/submit)
     * 3. LocalStorage Database backup
     */
    async function submit({ studentName, studentClass, answers, sheetAnswers, totalAnswered, riskScore }) {
        const timestamp = new Date().toLocaleString('vi-VN');
        const localRecord = {
            id: Date.now(),
            studentName: studentName.trim(),
            studentClass: studentClass.trim().toUpperCase(),
            submittedAt: timestamp,
            totalAnswered: totalAnswered || Object.keys(answers || {}).length,
            riskScore: riskScore || 0,
            answers: answers || {}
        };

        // 1. Always save to LocalStorage DB for instant offline reliability
        const localList = getLocalSubmissions();
        localList.unshift(localRecord);
        saveLocalSubmissions(localList);

        // 2. Send to Google Sheets (Direct Cloud Database)
        let googleSheetSaved = false;
        const googleScriptUrl = getGoogleScriptUrl();
        if (googleScriptUrl) {
            try {
                // Using text/plain to avoid CORS preflight options check on Google Apps Script
                await fetch(googleScriptUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({
                        studentName: localRecord.studentName,
                        studentClass: localRecord.studentClass,
                        answers: sheetAnswers || localRecord.answers,
                        totalAnswered: localRecord.totalAnswered,
                        riskScore: localRecord.riskScore
                    })
                });
                googleSheetSaved = true;
                console.log('✅ Successfully sent to Google Sheets!');
            } catch(gErr) {
                console.warn('⚠️ Could not send to Google Sheets Webhook:', gErr);
            }
        }

        // 3. Try submitting to Node.js SQLite Server
        let serverResult = null;
        try {
            const response = await fetch(`${getApiBase()}/api/survey/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentName: localRecord.studentName,
                    studentClass: localRecord.studentClass,
                    answers: localRecord.answers,
                    totalAnswered: localRecord.totalAnswered,
                    riskScore: localRecord.riskScore
                })
            });

            if (response.ok) {
                serverResult = await response.json();
                console.log('✅ Saved to SQLite Database:', serverResult);
                if (serverResult.submission && serverResult.submission.id) {
                    localRecord.id = serverResult.submission.id;
                    localRecord.serverDbId = serverResult.submission.id;
                    saveLocalSubmissions(localList);
                }
            }
        } catch(err) {
            console.warn('⚠️ Server API not reachable (using local/cloud database):', err.message);
        }

        return {
            success: true,
            submission: localRecord,
            savedToServer: !!serverResult,
            savedToGoogleSheet: googleSheetSaved
        };
    }

    /**
     * Get all submissions from Google Sheets, Server SQLite, or LocalStorage
     */
    async function getAll() {
        const mergedMap = new Map();

        // 1. Seed with local storage
        getLocalSubmissions().forEach(item => {
            const key = `${item.studentName}|${item.studentClass}|${item.submittedAt}`;
            mergedMap.set(key, item);
        });

        // 2. Try Node.js SQLite server
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3500);
            const response = await fetch(`${getApiBase()}/api/survey/submissions`, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data.submissions)) {
                    data.submissions.forEach(raw => {
                        const norm = normalizeSubmission(raw);
                        if (norm) {
                            const key = `${norm.studentName}|${norm.studentClass}|${norm.submittedAt}`;
                            mergedMap.set(key, norm);
                        }
                    });
                }
            }
        } catch(e) {}

        // 3. Try Google Sheets Cloud API
        const googleScriptUrl = getGoogleScriptUrl();
        if (googleScriptUrl) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 12000);
                const gRes = await fetch(googleScriptUrl, { signal: controller.signal });
                clearTimeout(timeoutId);
                if (gRes.ok) {
                    const gData = await gRes.json();
                    if (Array.isArray(gData.submissions)) {
                        gData.submissions.forEach(raw => {
                            const norm = normalizeSubmission(raw);
                            if (norm) {
                                const key = `${norm.studentName}|${norm.studentClass}|${norm.submittedAt}`;
                                mergedMap.set(key, norm);
                            }
                        });
                    }
                }
            } catch(e) {}
        }

        const combinedList = Array.from(mergedMap.values()).sort((a, b) => {
            return (b.id || 0) - (a.id || 0);
        });

        if (combinedList.length > 0) {
            saveLocalSubmissions(combinedList);
        }

        return combinedList;
    }

    /**
     * Get aggregate statistics from Database
     */
    async function getStats() {
        const list = await getAll();
        const classMap = {};
        let totalRisk = 0;

        list.forEach(item => {
            const cls = item.studentClass || 'Khác';
            classMap[cls] = (classMap[cls] || 0) + 1;
            totalRisk += (item.riskScore || 0);
        });

        const byClass = Object.entries(classMap).map(([student_class, count]) => ({
            student_class,
            count
        })).sort((a,b) => b.count - a.count);

        return {
            totalSubmissions: list.length,
            byClass,
            avgRisk: list.length ? Number((totalRisk / list.length).toFixed(1)) : 0
        };
    }

    /**
     * Export all submissions as CSV download
     */
    async function exportCSV() {
        const list = await getAll();
        if (!list || list.length === 0) {
            alert('Hiện tại cơ sở dữ liệu chưa có phiếu khảo sát thực tế nào để xuất file!');
            return;
        }

        // CSV Header
        let headers = ['Mã số', 'Họ và tên', 'Lớp', 'Đợt khảo sát', 'Thời gian nộp', 'Giới tính', 'Khối', 'Thời lượng online', 'Mục đích dùng mạng'];
        for (let q = 5; q <= 32; q++) {
            headers.push(`Câu ${q} (Thang 1-5)`);
        }
        headers.push('Điểm TB Likert', 'Nguy cơ lớn nhất', 'Đề xuất nhà trường');
        
        let csv = '\uFEFF' + headers.join(',') + '\n';

        list.forEach((s, idx) => {
            const id = s.id || (idx + 1);
            const name = `"${(s.studentName || '').replace(/"/g, '""')}"`;
            const cls = `"${(s.studentClass || '').replace(/"/g, '""')}"`;
            const time = `"${(s.submittedAt || '').replace(/"/g, '""')}"`;
            const ans = s.answers || {};
            const phase = ans.phase ? `Đợt ${ans.phase}` : 'Đợt 1';

            const gender = `"${(ans.gender || '').replace(/"/g, '""')}"`;
            const grade = `"${(ans.grade || '').replace(/"/g, '""')}"`;
            const timeOnline = `"${(ans.timeOnline || '').replace(/"/g, '""')}"`;
            const purpose = `"${(ans.purpose || '').replace(/"/g, '""')}"`;

            let row = [id, name, cls, `"${phase}"`, time, gender, grade, timeOnline, purpose];
            let sumLikert = 0, countLikert = 0;

            for (let q = 5; q <= 32; q++) {
                const val = Number(ans[q] || 0);
                if (val >= 1 && val <= 5) {
                    row.push(val);
                    sumLikert += val;
                    countLikert++;
                } else {
                    row.push('');
                }
            }

            const avgScore = countLikert > 0 ? (sumLikert / countLikert).toFixed(2) : '';
            row.push(avgScore);

            const open1 = `"${(ans.open1 || '').replace(/"/g, '""')}"`;
            const open2 = `"${(ans.open2 || '').replace(/"/g, '""')}"`;
            row.push(open1, open2);

            csv += row.join(',') + '\n';
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `khao_sat_an_toan_mang_likert_${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * Clear all submissions
     */
    function clearLocal() {
        localStorage.removeItem(LOCAL_DB_KEY);
    }

    return {
        submit,
        getAll,
        getStats,
        exportCSV,
        clearLocal,
        getGoogleScriptUrl,
        setGoogleScriptUrl
    };
})();

window.SurveyDB = SurveyDB;
