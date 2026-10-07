// ===== shared.js =====

// --- LOADER ---
(function(){
    const texts=['Đang tải nội dung...','Chuẩn bị bài học...','Sắp xong rồi...','Sẵn sàng!'];
    let prog=0;
    const bar=document.getElementById('loader-bar');
    const txt=document.getElementById('loader-text');
    const l=document.getElementById('loader');

    function dismissLoader() {
        if(bar) bar.style.width='100%';
        if(txt) txt.textContent='Sẵn sàng!';
        setTimeout(()=>{
            if(l) l.classList.add('hidden');
        },250);
    }

    const iv=setInterval(()=>{
        prog+=Math.random()*35+25;
        if(prog>100)prog=100;
        if(bar)bar.style.width=prog+'%';
        if(txt)txt.textContent=texts[Math.min(Math.floor(prog/28),texts.length-1)];
        if(prog>=100){
            clearInterval(iv);
            dismissLoader();
        }
    },120);

    // Fail-safe timeout: never leave user stuck
    setTimeout(()=>{
        clearInterval(iv);
        dismissLoader();
    }, 1200);

    window.addEventListener('load', ()=>{
        setTimeout(dismissLoader, 300);
    });
})();

// --- PARTICLE CANVAS ---
(function(){
    const canvas=document.getElementById('bg-canvas');
    if(!canvas)return;
    const ctx=canvas.getContext('2d');
    let pts=[];
    function resize(){canvas.width=window.innerWidth;canvas.height=window.innerHeight;}
    resize();window.addEventListener('resize',resize);
    const colors=['rgba(124,58,237,','rgba(6,182,212,','rgba(236,72,153,','rgba(251,191,36,'];
    class Pt{
        constructor(){this.reset();}
        reset(){
            this.x=Math.random()*canvas.width;
            this.y=Math.random()*canvas.height;
            this.r=Math.random()*2+.5;
            this.dx=(Math.random()-.5)*.4;
            this.dy=(Math.random()-.5)*.4;
            this.op=Math.random()*.4+.1;
            this.col=colors[Math.floor(Math.random()*colors.length)];
        }
        update(){
            this.x+=this.dx;this.y+=this.dy;
            if(this.x<0||this.x>canvas.width||this.y<0||this.y>canvas.height)this.reset();
        }
        draw(){
            ctx.beginPath();ctx.arc(this.x,this.y,this.r,0,Math.PI*2);
            ctx.fillStyle=this.col+this.op+')';ctx.fill();
        }
    }
    for(let i=0;i<70;i++)pts.push(new Pt());
    function anim(){
        ctx.clearRect(0,0,canvas.width,canvas.height);
        pts.forEach(p=>{p.update();p.draw();});
        for(let i=0;i<pts.length;i++){
            for(let j=i+1;j<pts.length;j++){
                const dx=pts[i].x-pts[j].x,dy=pts[i].y-pts[j].y;
                const d=Math.sqrt(dx*dx+dy*dy);
                if(d<110){
                    ctx.beginPath();ctx.moveTo(pts[i].x,pts[i].y);ctx.lineTo(pts[j].x,pts[j].y);
                    ctx.strokeStyle=`rgba(124,58,237,${.04*(1-d/110)})`;
                    ctx.lineWidth=.5;ctx.stroke();
                }
            }
        }
        requestAnimationFrame(anim);
    }
    anim();
})();

// --- NAVBAR SCROLL ---
window.addEventListener('scroll',()=>{
    const nav=document.getElementById('navbar');
    const btt=document.getElementById('back-to-top');
    if(nav)nav.classList.toggle('scrolled',window.scrollY>50);
    if(btt)btt.classList.toggle('visible',window.scrollY>500);
});
function toggleMenu(){
    const l=document.getElementById('nav-links');
    const h=document.getElementById('hamburger');
    if(l)l.classList.toggle('open');
    if(h)h.classList.toggle('open');
}

// --- REVEAL ON SCROLL ---
const revObs=new IntersectionObserver(entries=>{
    entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('in');});
},{threshold:.1});
document.querySelectorAll('.reveal,.reveal-left,.reveal-right').forEach(el=>revObs.observe(el));

// --- TOAST ---
function showToast(type,title,msg){
    const c=document.getElementById('toast-container');
    if(!c)return;
    const icons={green:'✅',red:'❌',yellow:'⚠️',blue:'💡'};
    const t=document.createElement('div');
    t.className=`toast ${type}`;
    t.innerHTML=`<span class="toast-icon">${icons[type]||'ℹ️'}</span>
    <div class="toast-body"><div class="toast-title">${title}</div><div class="toast-msg">${msg}</div></div>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>`;
    c.appendChild(t);
    setTimeout(()=>{if(t.parentElement)t.remove();},4500);
}

// --- SMOOTH SCROLL ---
document.querySelectorAll('a[href^="#"]').forEach(a=>{
    a.addEventListener('click',e=>{
        const id=a.getAttribute('href');
        const el=document.querySelector(id);
        if(el){e.preventDefault();el.scrollIntoView({behavior:'smooth'});}
        const links=document.getElementById('nav-links');
        if(links)links.classList.remove('open');
    });
});

// ===== STUDENT LOGIN SYSTEM (NAME & CLASS e.g. 9A5) =====
const STUDENT_STORAGE_KEY = 'cyber_student_session';

function getLoggedInStudent() {
    try {
        const data = localStorage.getItem(STUDENT_STORAGE_KEY);
        return data ? JSON.parse(data) : null;
    } catch(e) {
        return null;
    }
}

function saveStudent(name, className) {
    const student = {
        name: name.trim(),
        className: className.trim().toUpperCase(),
        loginTime: new Date().toISOString()
    };
    localStorage.setItem(STUDENT_STORAGE_KEY, JSON.stringify(student));
    return student;
}

function studentLogout() {
    localStorage.removeItem(STUDENT_STORAGE_KEY);
    showToast('yellow', 'Đã đăng xuất', 'Hẹn gặp lại bạn trong các bài học tiếp theo!');
    renderStudentNavWidget();
    const dropdown = document.getElementById('student-dropdown');
    if (dropdown) dropdown.classList.remove('show');
    // Dispatch custom event for pages like survey to update
    window.dispatchEvent(new CustomEvent('studentLoginStateChanged', { detail: null }));
}

function openStudentModal() {
    let overlay = document.getElementById('student-modal-overlay');
    if (!overlay) {
        injectStudentModal();
        overlay = document.getElementById('student-modal-overlay');
    }
    const student = getLoggedInStudent();
    if (student) {
        document.getElementById('modal-student-name').value = student.name;
        document.getElementById('modal-student-class').value = student.className;
    }
    overlay.classList.add('active');
    setTimeout(() => {
        const inputName = document.getElementById('modal-student-name');
        if (inputName) inputName.focus();
    }, 200);
}

function closeStudentModal() {
    const overlay = document.getElementById('student-modal-overlay');
    if (overlay) overlay.classList.remove('active');
}

function handleStudentLogin(e) {
    e.preventDefault();
    const nameInput = document.getElementById('modal-student-name');
    const classInput = document.getElementById('modal-student-class');

    const name = nameInput.value.trim();
    const className = classInput.value.trim();

    if (!name) {
        showToast('red', 'Lỗi', 'Vui lòng nhập họ và tên của bạn');
        return;
    }
    if (!className) {
        showToast('red', 'Lỗi', 'Vui lòng nhập lớp học (ví dụ: 9A5, 8A2...)');
        return;
    }

    const student = saveStudent(name, className);
    closeStudentModal();
    renderStudentNavWidget();

    showToast('green', 'Đăng nhập thành công! 🎓', `Chào mừng ${student.name} — Lớp ${student.className}`);
    window.dispatchEvent(new CustomEvent('studentLoginStateChanged', { detail: student }));
}

function toggleStudentDropdown(e) {
    e.stopPropagation();
    const dropdown = document.getElementById('student-dropdown');
    if (dropdown) dropdown.classList.toggle('show');
}

document.addEventListener('click', () => {
    const dropdown = document.getElementById('student-dropdown');
    if (dropdown) dropdown.classList.remove('show');
});

function injectStudentModal() {
    if (document.getElementById('student-modal-overlay')) return;
    const modalHtml = `
    <div class="student-modal-overlay" id="student-modal-overlay" onclick="if(event.target===this)closeStudentModal()">
        <div class="student-modal-box">
            <button onclick="closeStudentModal()" style="position:absolute;top:18px;right:18px;background:none;border:none;color:var(--muted);font-size:1.3rem;cursor:pointer;"><i class="fas fa-times"></i></button>
            <div style="font-size:3.2rem;margin-bottom:10px;">🎓</div>
            <h3 style="font-family:'Orbitron',sans-serif;font-size:1.3rem;margin-bottom:6px;color:#fff;">HỌC SINH ĐĂNG NHẬP</h3>
            <p style="color:var(--muted);font-size:.88rem;margin-bottom:24px;">Điền thông tin để lưu tiến trình học tập, làm bài khảo sát và thi đấu trò chơi</p>
            <form onsubmit="handleStudentLogin(event)">
                <div class="student-input-group">
                    <label><i class="fas fa-user" style="margin-right:6px;"></i>Họ và tên học sinh *</label>
                    <input type="text" id="modal-student-name" class="student-input" placeholder="Ví dụ: Nguyễn Văn Nam" required autocomplete="name">
                </div>
                <div class="student-input-group">
                    <label><i class="fas fa-graduation-cap" style="margin-right:6px;"></i>Lớp học * (Ví dụ: 9A5, 8A2, 7C)</label>
                    <input type="text" id="modal-student-class" class="student-input" placeholder="Ví dụ: 9A5" required>
                </div>
                <button type="submit" class="btn-primary" style="width:100%;border-radius:12px;padding:14px;justify-content:center;margin-top:10px;font-size:1rem;cursor:pointer;">
                    <i class="fas fa-check-circle"></i> XÁC NHẬN ĐĂNG NHẬP
                </button>
            </form>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function renderStudentNavWidget() {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;

    let widget = document.getElementById('nav-student-widget');
    if (!widget) {
        widget = document.createElement('div');
        widget.id = 'nav-student-widget';
        widget.style.marginLeft = '12px';
        widget.style.display = 'inline-flex';
        widget.style.alignItems = 'center';

        const hamburger = document.getElementById('hamburger');
        if (hamburger) {
            navbar.insertBefore(widget, hamburger);
        } else {
            navbar.appendChild(widget);
        }
    }

    const student = getLoggedInStudent();

    if (student) {
        widget.innerHTML = `
            <div class="student-pill" onclick="toggleStudentDropdown(event)" title="Nhấn để đổi thông tin hoặc đăng xuất">
                <i class="fas fa-user-graduate" style="color:#a78bfa;"></i>
                <span style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${student.name}</span>
                <span class="class-tag">${student.className}</span>
                <i class="fas fa-chevron-down" style="font-size:.65rem;opacity:.6;margin-left:2px;"></i>
                <div class="student-dropdown" id="student-dropdown">
                    <div style="padding:6px 12px 10px;border-bottom:1px solid rgba(255,255,255,0.1);font-size:.78rem;color:var(--muted);text-align:left;">
                        Học sinh lớp <strong style="color:#fff;">${student.className}</strong>
                    </div>
                    <button onclick="openStudentModal()" style="margin-top:4px;"><i class="fas fa-user-edit" style="color:#67e8f9;"></i> Đổi thông tin</button>
                    <button onclick="studentLogout()"><i class="fas fa-sign-out-alt" style="color:#f87171;"></i> Đăng xuất</button>
                </div>
            </div>
        `;
    } else {
        widget.innerHTML = `
            <button class="btn-nav-login" onclick="openStudentModal()">
                <i class="fas fa-user-circle"></i> Đăng Nhập
            </button>
        `;
    }
}

// AUTO INIT ON PAGE LOAD
window.addEventListener('DOMContentLoaded', () => {
    injectStudentModal();
    renderStudentNavWidget();
    initCyberMusicPlayer();
});

// ===== BACKGROUND MUSIC PLAYER (SEAMLESS MULTI-TAB & PERSISTENT PLAYLIST) =====
const CYBER_PLAYLIST = [
    { id: 'bid-30DgpEQ', title: 'Cyber Beat I', label: '1/2' },
    { id: 'tfV9Y6UXVXg', title: 'Cyber Beat II', label: '2/2' }
];

let currentTrackIdx = localStorage.getItem('cyber_music_track_idx') ? parseInt(localStorage.getItem('cyber_music_track_idx'), 10) : 0;
if (isNaN(currentTrackIdx) || currentTrackIdx < 0 || currentTrackIdx >= CYBER_PLAYLIST.length) {
    currentTrackIdx = 0;
}

const CYBER_TAB_ID = 'tab_' + Math.random().toString(36).substring(2, 9);
let ytMusicPlayer = null;
let ytPlayerReady = false;
let isMusicPlaying = false;
let musicPendingPlay = false;
let musicTimeTracker = null;
let isMasterAudioTab = false;

// Broadcast Channel for Instant Multi-Tab Synchronization
let musicChannel = null;
try {
    if (typeof BroadcastChannel !== 'undefined') {
        musicChannel = new BroadcastChannel('cyber_music_sync_channel');
        musicChannel.onmessage = handleMusicBroadcast;
    }
} catch(e) {
    console.warn('[CyberMusic] BroadcastChannel not supported, using storage fallback');
}

// Fallback to storage event for older browsers
window.addEventListener('storage', (e) => {
    if (e.key === 'cyber_music_sync_event') {
        try {
            const data = JSON.parse(e.newValue);
            if (data && data.tabId !== CYBER_TAB_ID) {
                applyExternalMusicState(data);
            }
        } catch(err){}
    }
});

function broadcastMusicState(action, extra = {}) {
    const payload = {
        action,
        tabId: CYBER_TAB_ID,
        trackIdx: currentTrackIdx,
        isPlaying: isMusicPlaying,
        time: ytMusicPlayer && ytPlayerReady ? ytMusicPlayer.getCurrentTime() : parseFloat(localStorage.getItem('cyber_music_time') || 0),
        volume: parseInt(localStorage.getItem('cyber_music_volume') || 50, 10),
        muted: localStorage.getItem('cyber_music_muted') === 'true',
        timestamp: Date.now(),
        ...extra
    };

    if (musicChannel) {
        musicChannel.postMessage(payload);
    }
    // Also trigger storage event for backup
    try {
        localStorage.setItem('cyber_music_sync_event', JSON.stringify(payload));
    } catch(e){}
}

function handleMusicBroadcast(event) {
    const data = event.data;
    if (!data || data.tabId === CYBER_TAB_ID) return;
    applyExternalMusicState(data);
}

function applyExternalMusicState(data) {
    // 1. Another tab started playing
    if (data.action === 'PLAY') {
        // If this tab is also playing audio, pause local sound to avoid echo!
        if (isMusicPlaying && !document.hasFocus()) {
            if (ytMusicPlayer && ytPlayerReady) {
                ytMusicPlayer.pauseVideo();
            }
        }
        currentTrackIdx = data.trackIdx;
        setMusicUIPlaying(true);
        updateTrackUI();
    } 
    // 2. Another tab paused
    else if (data.action === 'PAUSE') {
        if (isMusicPlaying && ytMusicPlayer && ytPlayerReady) {
            ytMusicPlayer.pauseVideo();
        }
        setMusicUIPlaying(false);
    }
    // 3. Another tab changed track
    else if (data.action === 'TRACK_CHANGE') {
        currentTrackIdx = data.trackIdx;
        updateTrackUI();
        if (isMusicPlaying && ytMusicPlayer && ytPlayerReady) {
            ytMusicPlayer.loadVideoById(CYBER_PLAYLIST[currentTrackIdx].id);
        }
    }
    // 4. Volume changed
    else if (data.action === 'VOLUME_CHANGE') {
        const slider = document.getElementById('music-vol-slider');
        if (slider) slider.value = data.volume;
        if (ytMusicPlayer && ytPlayerReady) {
            ytMusicPlayer.setVolume(data.volume);
        }
    }
    // 5. Mute toggled
    else if (data.action === 'MUTE_CHANGE') {
        updateMuteUI(data.muted);
        if (ytMusicPlayer && ytPlayerReady) {
            if (data.muted) ytMusicPlayer.mute(); else ytMusicPlayer.unMute();
        }
    }
}

function initCyberMusicPlayer() {
    injectCyberMusicWidget();
    loadYouTubeIframeAPI();
}

function injectCyberMusicWidget() {
    if (document.getElementById('cyber-music-widget')) return;

    // 1. Rendered on-screen hidden player container (prevents Chromium from throttling background tab audio!)
    if (!document.getElementById('yt-bg-player-container')) {
        const playerCont = document.createElement('div');
        playerCont.id = 'yt-bg-player-container';
        // Size 200x200 and opacity 0.002 keeps it active in compositor tree even when tab is switched
        playerCont.style.cssText = 'position:fixed;bottom:0;left:0;width:200px;height:200px;opacity:0.002;pointer-events:none;z-index:-999;overflow:hidden;';
        playerCont.innerHTML = '<div id="yt-bg-player"></div>';
        document.body.appendChild(playerCont);
    }

    // 2. Music Player Widget
    const savedVol = localStorage.getItem('cyber_music_volume') ? parseInt(localStorage.getItem('cyber_music_volume'), 10) : 50;
    const initialTrack = CYBER_PLAYLIST[currentTrackIdx];

    const widget = document.createElement('div');
    widget.className = 'cyber-music-widget';
    widget.id = 'cyber-music-widget';
    widget.innerHTML = `
        <div class="cyber-music-disc" id="music-disc-btn" onclick="toggleCyberMusic()" title="Bài ${initialTrack.label} — ${initialTrack.title} (Nhấn để Bật / Tạm dừng)">
            <i class="fas fa-compact-disc"></i>
        </div>
        <div class="cyber-music-info" onclick="toggleCyberMusic()" style="cursor:pointer;" title="Bật / Tạm dừng nhạc nền">
            <div class="cyber-music-title" id="music-track-title">🎵 ${initialTrack.title} (${initialTrack.label})</div>
            <div class="cyber-music-status">
                <span class="status-dot"></span>
                <span id="music-status-text">Đang tắt</span>
            </div>
        </div>
        <div class="cyber-music-eq" id="music-eq" title="Equalizer">
            <div class="cyber-eq-bar"></div>
            <div class="cyber-eq-bar"></div>
            <div class="cyber-eq-bar"></div>
            <div class="cyber-eq-bar"></div>
        </div>
        <div class="cyber-music-controls">
            <button class="cyber-music-btn" onclick="prevCyberTrack(true)" title="Bài trước (1/2)" style="width:26px;height:26px;font-size:0.68rem;">
                <i class="fas fa-backward-step"></i>
            </button>
            <button class="cyber-music-btn play-btn" id="music-toggle-btn" onclick="toggleCyberMusic()" title="Phát / Tạm dừng">
                <i class="fas fa-play" id="music-toggle-icon"></i>
            </button>
            <button class="cyber-music-btn" onclick="nextCyberTrack(true)" title="Bài tiếp theo (2/2)" style="width:26px;height:26px;font-size:0.68rem;">
                <i class="fas fa-forward-step"></i>
            </button>
            <div class="cyber-music-vol-wrapper">
                <button class="cyber-music-btn" id="music-mute-btn" onclick="toggleCyberMute()" title="Bật / Tắt tiếng" style="width:26px;height:26px;font-size:0.75rem;">
                    <i class="fas fa-volume-high" id="music-mute-icon"></i>
                </button>
                <input type="range" class="cyber-music-vol" id="music-vol-slider" min="0" max="100" value="${savedVol}" oninput="changeCyberMusicVolume(this.value)" title="Âm lượng: ${savedVol}%">
            </div>
        </div>
    `;
    document.body.appendChild(widget);

    // If music was enabled on previous page/tab, auto-resume seamlessly
    if (localStorage.getItem('cyber_music_enabled') === 'true') {
        setMusicUIPlaying(true);
        // Proactive listeners to resume immediately on first touch/click/scroll if autoplay was initially held
        const proactiveResume = () => {
            if (localStorage.getItem('cyber_music_enabled') === 'true' && !isMusicPlaying) {
                playCyberMusic();
            }
            ['click', 'pointerdown', 'keydown', 'scroll', 'touchstart'].forEach(ev => {
                window.removeEventListener(ev, proactiveResume);
            });
        };
        ['click', 'pointerdown', 'keydown', 'scroll', 'touchstart'].forEach(ev => {
            window.addEventListener(ev, proactiveResume, { once: true, passive: true });
        });
    }
}

function loadYouTubeIframeAPI() {
    if (window.YT && window.YT.Player) {
        setupYouTubePlayer();
        return;
    }

    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function() {
        if (typeof prevReady === 'function') prevReady();
        setupYouTubePlayer();
    };

    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        if (firstScriptTag && firstScriptTag.parentNode) {
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        } else {
            document.head.appendChild(tag);
        }
    }
}

function setupYouTubePlayer() {
    if (ytMusicPlayer) return;
    try {
        const currentTrack = CYBER_PLAYLIST[currentTrackIdx];
        
        // Calculate exact resume time from last page/tab
        let startSec = 0;
        const lastTime = parseFloat(localStorage.getItem('cyber_music_time') || 0);
        const lastStamp = parseInt(localStorage.getItem('cyber_music_time_stamp') || 0, 10);
        if (lastStamp > 0 && !isNaN(lastTime)) {
            const elapsed = (Date.now() - lastStamp) / 1000;
            // If transitioned within 15 seconds, add elapsed time to continue seamlessly!
            if (elapsed > 0 && elapsed < 15) {
                startSec = Math.floor(lastTime + elapsed);
            } else {
                startSec = Math.floor(lastTime);
            }
        }

        ytMusicPlayer = new YT.Player('yt-bg-player', {
            videoId: currentTrack.id,
            playerVars: {
                autoplay: localStorage.getItem('cyber_music_enabled') === 'true' ? 1 : 0,
                start: startSec,
                controls: 0,
                disablekb: 1,
                fs: 0,
                modestbranding: 1,
                rel: 0,
                playsinline: 1
            },
            events: {
                onReady: onYouTubePlayerReady,
                onStateChange: onYouTubePlayerStateChange,
                onError: (e) => {
                    console.warn('[CyberMusic] YouTube Player Error:', e.data);
                    setTimeout(() => nextCyberTrack(isMusicPlaying), 2000);
                }
            }
        });
    } catch(err) {
        console.warn('[CyberMusic] Failed to initialize YouTube player:', err);
    }
}

function onYouTubePlayerReady(event) {
    ytPlayerReady = true;
    const savedVol = localStorage.getItem('cyber_music_volume') ? parseInt(localStorage.getItem('cyber_music_volume'), 10) : 50;
    ytMusicPlayer.setVolume(savedVol);

    if (localStorage.getItem('cyber_music_muted') === 'true') {
        ytMusicPlayer.mute();
        updateMuteUI(true);
    }

    // Auto-resume if enabled
    if (localStorage.getItem('cyber_music_enabled') === 'true' || musicPendingPlay) {
        musicPendingPlay = false;
        playCyberMusic();
    }
}

function onYouTubePlayerStateChange(event) {
    // YT.PlayerState: PLAYING = 1, PAUSED = 2, ENDED = 0, BUFFERING = 3
    if (event.data === YT.PlayerState.PLAYING) {
        setMusicUIPlaying(true);
        startMusicTimeTracking();
        broadcastMusicState('PLAY');
    } else if (event.data === YT.PlayerState.PAUSED) {
        setMusicUIPlaying(false);
        stopMusicTimeTracking();
        broadcastMusicState('PAUSE');
    } else if (event.data === YT.PlayerState.ENDED) {
        // Continuous auto-play next track
        nextCyberTrack(true);
    }
}

function startMusicTimeTracking() {
    stopMusicTimeTracking();
    musicTimeTracker = setInterval(() => {
        if (ytMusicPlayer && ytPlayerReady && isMusicPlaying) {
            try {
                const cur = ytMusicPlayer.getCurrentTime();
                if (cur > 0) {
                    localStorage.setItem('cyber_music_time', cur);
                    localStorage.setItem('cyber_music_time_stamp', Date.now());
                }
            } catch(e){}
        }
    }, 800);
}

function stopMusicTimeTracking() {
    if (musicTimeTracker) {
        clearInterval(musicTimeTracker);
        musicTimeTracker = null;
    }
}

// When page is unloading or navigating, record exact timestamp
window.addEventListener('beforeunload', () => {
    if (ytMusicPlayer && ytPlayerReady && isMusicPlaying) {
        try {
            localStorage.setItem('cyber_music_time', ytMusicPlayer.getCurrentTime());
            localStorage.setItem('cyber_music_time_stamp', Date.now());
        } catch(e){}
    }
});

// When user switches back to this tab from another browser tab
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && localStorage.getItem('cyber_music_enabled') === 'true') {
        // If tab was idle or blocked, ensure player is active
        if (!isMusicPlaying && ytMusicPlayer && ytPlayerReady) {
            const lastTime = parseFloat(localStorage.getItem('cyber_music_time') || 0);
            const lastStamp = parseInt(localStorage.getItem('cyber_music_time_stamp') || 0, 10);
            const elapsed = lastStamp > 0 ? (Date.now() - lastStamp) / 1000 : 0;
            const resumeTime = (elapsed > 0 && elapsed < 20) ? (lastTime + elapsed) : lastTime;
            ytMusicPlayer.seekTo(resumeTime, true);
            ytMusicPlayer.playVideo();
        }
    }
});

function changeCyberTrack(newIdx, autoPlay = true) {
    currentTrackIdx = (newIdx + CYBER_PLAYLIST.length) % CYBER_PLAYLIST.length;
    localStorage.setItem('cyber_music_track_idx', currentTrackIdx);
    localStorage.setItem('cyber_music_time', 0);
    localStorage.setItem('cyber_music_time_stamp', Date.now());
    updateTrackUI();

    if (ytMusicPlayer && ytPlayerReady) {
        const track = CYBER_PLAYLIST[currentTrackIdx];
        if (autoPlay || isMusicPlaying) {
            ytMusicPlayer.loadVideoById(track.id);
            setMusicUIPlaying(true);
            showToast('green', `🎵 Phát bài (${track.label})`, track.title);
        } else {
            ytMusicPlayer.cueVideoById(track.id);
        }
    }

    broadcastMusicState('TRACK_CHANGE');
}

function nextCyberTrack(autoPlay = true) {
    changeCyberTrack(currentTrackIdx + 1, autoPlay);
}

function prevCyberTrack(autoPlay = true) {
    changeCyberTrack(currentTrackIdx - 1, autoPlay);
}

function updateTrackUI() {
    const track = CYBER_PLAYLIST[currentTrackIdx];
    const titleEl = document.getElementById('music-track-title');
    const discBtn = document.getElementById('music-disc-btn');
    if (titleEl) {
        titleEl.textContent = `🎵 ${track.title} (${track.label})`;
        titleEl.title = `Đang chọn: ${track.title} (${track.label})`;
    }
    if (discBtn) {
        discBtn.title = `Bài ${track.label} — ${track.title} (Nhấn để Bật / Tạm dừng)`;
    }
}

function toggleCyberMusic(forcePlay = false) {
    if (!ytPlayerReady) {
        musicPendingPlay = true;
        showToast('blue', '🎵 Nhạc nền', 'Đang khởi động nhạc nền...');
        return;
    }

    if (isMusicPlaying && !forcePlay) {
        pauseCyberMusic();
    } else {
        playCyberMusic();
    }
}

function playCyberMusic() {
    if (!ytMusicPlayer || !ytPlayerReady) {
        musicPendingPlay = true;
        return;
    }
    try {
        localStorage.setItem('cyber_music_enabled', 'true');
        ytMusicPlayer.playVideo();
        setMusicUIPlaying(true);
        const track = CYBER_PLAYLIST[currentTrackIdx];
        showToast('green', '🎵 Nhạc nền', `Đang phát ${track.title} (${track.label})`);
        broadcastMusicState('PLAY');
    } catch(e) {
        console.warn('[CyberMusic] play error:', e);
    }
}

function pauseCyberMusic() {
    if (!ytMusicPlayer || !ytPlayerReady) return;
    try {
        localStorage.setItem('cyber_music_enabled', 'false');
        ytMusicPlayer.pauseVideo();
        setMusicUIPlaying(false);
        broadcastMusicState('PAUSE');
    } catch(e) {
        console.warn('[CyberMusic] pause error:', e);
    }
}

function setMusicUIPlaying(playing) {
    isMusicPlaying = playing;
    const widget = document.getElementById('cyber-music-widget');
    const toggleIcon = document.getElementById('music-toggle-icon');
    const statusText = document.getElementById('music-status-text');

    if (widget) {
        widget.classList.toggle('playing', playing);
    }
    if (toggleIcon) {
        toggleIcon.className = playing ? 'fas fa-pause' : 'fas fa-play';
    }
    if (statusText) {
        statusText.textContent = playing ? 'Đang phát 🎶' : 'Đang tắt';
    }
}

function changeCyberMusicVolume(val) {
    const vol = parseInt(val, 10);
    localStorage.setItem('cyber_music_volume', vol);
    const slider = document.getElementById('music-vol-slider');
    if (slider) slider.title = `Âm lượng: ${vol}%`;

    if (ytMusicPlayer && ytPlayerReady) {
        ytMusicPlayer.setVolume(vol);
        if (vol > 0 && ytMusicPlayer.isMuted()) {
            ytMusicPlayer.unMute();
            updateMuteUI(false);
        }
    }
    broadcastMusicState('VOLUME_CHANGE', { volume: vol });
}

function toggleCyberMute() {
    if (!ytMusicPlayer || !ytPlayerReady) return;
    const isMuted = ytMusicPlayer.isMuted();
    if (isMuted) {
        ytMusicPlayer.unMute();
        localStorage.setItem('cyber_music_muted', 'false');
        updateMuteUI(false);
        broadcastMusicState('MUTE_CHANGE', { muted: false });
    } else {
        ytMusicPlayer.mute();
        localStorage.setItem('cyber_music_muted', 'true');
        updateMuteUI(true);
        broadcastMusicState('MUTE_CHANGE', { muted: true });
    }
}

function updateMuteUI(muted) {
    const muteIcon = document.getElementById('music-mute-icon');
    if (muteIcon) {
        muteIcon.className = muted ? 'fas fa-volume-xmark' : 'fas fa-volume-high';
    }
}

// ===================================================================
// CYBER WEB AUDIO SYNTHESIZER (No external files needed)
// ===================================================================
let cyberAudioCtx = null;
let cyberSfxEnabled = true;

function initCyberAudioContext() {
    if (!cyberAudioCtx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) cyberAudioCtx = new AudioCtx();
    }
    if (cyberAudioCtx && cyberAudioCtx.state === 'suspended') {
        cyberAudioCtx.resume();
    }
}

function playCyberSfx(type = 'beep') {
    if (!cyberSfxEnabled) return;
    try {
        initCyberAudioContext();
        if (!cyberAudioCtx) return;
        const now = cyberAudioCtx.currentTime;
        const osc = cyberAudioCtx.createOscillator();
        const gain = cyberAudioCtx.createGain();

        if (type === 'beep') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(1200, now + 0.08);
            gain.gain.setValueAtTime(0.04, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
            osc.connect(gain);
            gain.connect(cyberAudioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.08);
        } else if (type === 'receive') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(520, now);
            osc.frequency.exponentialRampToValueAtTime(780, now + 0.12);
            gain.gain.setValueAtTime(0.06, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
            osc.connect(gain);
            gain.connect(cyberAudioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.12);
        } else if (type === 'alert') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.linearRampToValueAtTime(250, now + 0.2);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            osc.connect(gain);
            gain.connect(cyberAudioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.2);
        }
    } catch(e) {}
}

// ===================================================================
// CYBERBOT AI ASSISTANT (Trợ Lý Ảo An Toàn Mạng Cho Học Sinh THCS)
// ===================================================================
// ===================================================================
// CYBERBOT PRESET QUESTIONS (CÂU HỎI CÓ SẴN TRÊN GIAO DIỆN)
// ===================================================================
const CYBERBOT_PRESET_TOPICS = [
    {
        title: 'Nhận biết link lừa đảo',
        triggers: ['nhận biết link lừa đảo', 'link lừa đảo', 'bẫy link lừa đảo', 'dấu hiệu link lừa đảo', 'phishing link', 'trang web giả mạo'],
        answer: "⚠️ **Mẹo nhận biết bẫy link lừa đảo:**\n1. **Kiểm tra kỹ tên miền**: Kẻ lừa thường dùng đuôi lạ hoặc sai chính tả (vd: `facebook-nhanqua.com`, `garena-free.vn`).\n2. **Nguyên tắc vàng**: Không bao giờ đăng nhập tài khoản hay nhập mật khẩu/OTP vào link người khác gửi qua tin nhắn Zalo, Facebook.\n3. **Cảnh giác quà tặng miễn phí**: Không có thẻ nạp hay skin game miễn phí nào yêu cầu mật khẩu!"
    },
    {
        title: 'Mật khẩu mạnh & 2FA',
        triggers: ['mật khẩu mạnh & 2fa', 'mật khẩu mạnh', 'cách đặt mật khẩu mạnh', 'xác thực 2 lớp', 'bật 2fa', 'tạo mật khẩu an toàn'],
        answer: "🔐 **Quy tắc tạo mật khẩu bất khả xâm phạm:**\n1. **Độ dài**: Tối thiểu 12 ký tự trở lên.\n2. **Kết hợp**: Gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt (`!@#$%^&*`).\n3. **Tránh**: Không dùng ngày sinh, tên riêng, số điện thoại hay `123456`.\n4. **Bật 2FA ngay**: Kích hoạt xác thực 2 bước (gửi mã về SMS hoặc Google Authenticator) cho mọi tài khoản Zalo, Facebook, Google!"
    },
    {
        title: 'Cách xử lý bạo lực mạng',
        triggers: ['cách xử lý bạo lực mạng', 'xử lý bạo lực mạng', 'bị bắt nạt trên mạng', 'ứng phó bạo lực mạng', 'cyberbullying'],
        answer: "🚨 **4 bước xử lý ngay khi bị bạo lực / bắt nạt mạng:**\n1. **Dừng phản hồi**: Tuyệt đối không chửi lại kẻ bắt nạt (phản ứng của bạn làm chúng thích thú hơn).\n2. **Chụp màn hình làm bằng chứng**: Lưu lại tin nhắn, bình luận xúc phạm.\n3. **Chặn & Báo cáo**: Nhấn Block và Report tài khoản vi phạm trên nền tảng.\n4. **Tìm sự giúp đỡ**: Tâm sự với bố mẹ, thầy cô hoặc gọi ngay miễn phí **Tổng đài 111** (Bảo vệ trẻ em 24/7)!"
    },
    {
        title: 'Dùng AI an toàn & đúng cách',
        triggers: ['dùng ai an toàn & đúng cách', 'dùng ai an toàn', 'nguyên tắc dùng ai', 'dùng chatgpt an toàn'],
        answer: "🤖 **Nguyên tắc dùng AI an toàn & văn minh của học sinh:**\n1. **Không tin tưởng tuyệt đối**: AI có thể 'bịa' thông tin (ảo giác AI). Phải luôn đối chiếu sách giáo khoa và nguồn chính thống.\n2. **Tự suy nghĩ trước**: Dùng AI để gợi mở ý tưởng, không sao chép nguyên văn nộp bài (đạo văn).\n3. **Bảo vệ quyền riêng tư**: Tuyệt đối KHÔNG cung cấp họ tên, ảnh riêng tư, mật khẩu cho các công cụ AI.\n4. **Cảnh giác Deepfake**: Công nghệ ghép mặt/giả giọng nói của người quen gọi điện mượn tiền!"
    },
    {
        title: 'Bảo mật mã OTP',
        triggers: ['bảo mật mã otp', 'bảo mật otp', 'mã otp là gì', 'lộ mã otp'],
        answer: "🚫 **BẢO MẬT MÃ OTP TUYỆT ĐỐI:**\nMã OTP là chìa khóa mở két sắt tiền của bạn. Không một nhân viên ngân hàng, công an hay admin game nào được quyền hỏi mã OTP. Nếu ai đó xin mã OTP -> **100% LÀ LỪA ĐẢO!** Hãy ngắt liên lạc ngay lập tức!"
    },
    {
        title: 'Cảnh giác lừa nạp game',
        triggers: ['cảnh giác lừa nạp game', 'lừa nạp game', 'nạp thẻ game lừa đảo', 'lừa nạp thẻ'],
        answer: "🎮 **Cảnh báo lừa đảo trong game:**\n- Chiêu trò phổ biến: Tặng 'Robux miễn phí', 'Quân Huy free', 'Vòng quay trúng skin hiếm'.\n- Khi bấm vào, chúng yêu cầu đăng nhập tài khoản -> bị đổi mật khẩu và mất nick vĩnh viễn!\n- Lời khuyên: Chỉ nạp thẻ tại cổng thanh toán chính thức của nhà phát hành game."
    },
    {
        title: 'Chào hỏi cơ bản',
        triggers: ['xin chào', 'chào bạn', 'chào bot', 'bạn là ai', 'bot là ai'],
        answer: "Xin chào bạn! Mình là **CyberBot AI** 🤖 — Trợ lý ảo an toàn số của dự án An Toàn Mạng THCS. Mình có thể giúp bạn giải đáp mọi thắc mắc về: nhận diện bẫy lừa đảo, bảo mật mật khẩu, ứng phó bạo lực mạng, dùng AI có trách nhiệm và hỗ trợ khẩn cấp 24/7!"
    }
];

function getCyberBotReply(input) {
    const text = (input || '').toLowerCase().trim();
    if (!text) return null;

    // Chỉ dùng câu trả lời có sẵn nếu trùng khớp hoặc chứa trọn vẹn cụm từ câu hỏi mẫu
    for (const item of CYBERBOT_PRESET_TOPICS) {
        for (const phrase of item.triggers) {
            if (text === phrase || text === phrase + '?' || text.includes(phrase)) {
                return item.answer;
            }
        }
    }

    return null;
}


// ===================================================================
// UTILITY: HTML ESCAPE
// ===================================================================
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ===================================================================
// POLLINATIONS.AI INTEGRATION & HYBRID FALLBACK
// ===================================================================
function updateCyberBotStatusBadge() {
    const statusEl = document.getElementById('cyberbot-status-text');
    if (!statusEl) return;
    const hasKey = !!localStorage.getItem('pollinations_api_key');
    if (hasKey) {
        statusEl.innerHTML = '<span class="dot" style="background:#10b981;"></span> Cyber AI Pro 🔑';
        statusEl.title = 'Đang dùng Cyber AI với khóa cá nhân';
    } else {
        statusEl.innerHTML = '<span class="dot" style="background:#00ff88;"></span> Trực tuyến 24/7';
        statusEl.title = 'AI Trực tuyến 24/7';
    }
}

function promptPollinationsApiKey() {
    const currentKey = localStorage.getItem('pollinations_api_key') || '';
    const newKey = prompt(
        "Nhập Pollinations API Key của bạn (lấy tại https://enter.pollinations.ai) để tăng tốc độ phản hồi và mở khóa mô hình cao cấp:\n(Bỏ trống để tiếp tục dùng chế độ miễn phí công cộng)",
        currentKey
    );
    if (newKey !== null) {
        const trimmed = newKey.trim();
        if (trimmed) {
            localStorage.setItem('pollinations_api_key', trimmed);
            showToast('green', 'Đã lưu API Key 🌸', 'Đã kích hoạt khóa cá nhân Pollinations AI thành công!');
        } else {
            localStorage.removeItem('pollinations_api_key');
            showToast('yellow', 'Chế độ cộng đồng 🌐', 'Đang sử dụng Pollinations AI miễn phí mặc định.');
        }
        updateCyberBotStatusBadge();
    }
}

// ===================================================================
// CYBERBOT AI REASONING & KNOWLEDGE ENGINE (CLIENT-SIDE)
// ===================================================================
function generateCyberBotAiResponse(userPrompt) {
    const raw = (userPrompt || '').trim();
    const text = raw.toLowerCase();

    // 1. Nạp game / Nạp tiền / Mua nick / Robux / Quân huy / Kim cương / Cày thuê
    if (/nạp.*(game|thẻ|tiền|lậu|robux|quân huy|kim cương)|game.*(giá rẻ|rẻ|lậu)|mua.*(nick|acc)|cày thuê|bán.*(nick|acc)/.test(text)) {
        return `🎮 **Về việc nạp game giá rẻ, bạn cần hết sức cảnh giác:**\n\n` +
               `1. **Rủi ro lừa đảo cực cao (99%):** Tuyệt đối không nạp qua các trang web quảng cáo 'giảm giá 50-70%', 'x2 nạp thẻ' hay người lạ trên Facebook/TikTok. Đây hầu hết là bẫy lừa cướp tiền nạp hoặc lấy cắp nick game!\n` +
               `2. **Nguy cơ bị khóa tài khoản vĩnh viễn:** Nhiều dịch vụ giá rẻ nạp bằng thẻ tín dụng 'bẩn' (thẻ ăn cắp). Khi bị truy thu tiền (chargeback), nhà phát hành game (Garena, Riot, VNG, Roblox...) sẽ khóa vĩnh viễn tài khoản của bạn mà không thể khiếu nại.\n` +
               `3. **Cách nạp an toàn nhất:** Bạn chỉ nên nạp qua cổng chính thống của nhà phát hành (như napthe.vn, pay.zing.vn...) hoặc qua Google Play / App Store trong các dịp ưu đãi chính thức nhé! 🛡️`;
    }

    // 2. Wifi công cộng / Quán cafe / Wifi miễn phí
    if (/wifi.*(công cộng|cafe|quán|chùa|miễn phí|ngoài đường)|kết nối wifi/.test(text)) {
        return `📶 **Nguyên tắc an toàn khi dùng Wifi công cộng / Quán cà phê:**\n\n` +
               `1. **Nguy cơ bị nghe lén (Man-in-the-Middle):** Kẻ xấu có thể tạo wifi giả mạo trùng tên hoặc theo dõi lưu lượng mạng để đánh cắp mật khẩu và thông tin đăng nhập của bạn.\n` +
               `2. **Không giao dịch quan trọng:** Tuyệt đối không đăng nhập tài khoản ngân hàng, ví điện tử hay nhập mã OTP khi đang kết nối wifi nơi công cộng.\n` +
               `3. **Giải pháp bảo vệ:** Luôn ưu tiên dùng mạng 4G/5G cá nhân khi cần làm việc quan trọng, hoặc bật VPN uy tín để mã hóa dữ liệu nhé! 🛡️`;
    }

    // 3. Mật khẩu & Xác thực 2 bước (2FA)
    if (/mật khẩu|password|đổi pass|xác thực 2|2fa|bảo mật tài khoản/.test(text)) {
        return `🔐 **Bí kíp bảo vệ tài khoản với Mật Khẩu Mạnh & 2FA:**\n\n` +
               `1. **Quy tắc tạo mật khẩu:** Đặt tối thiểu 12 ký tự, kết hợp cả chữ hoa, chữ thường, số và ký tự đặc biệt (ví dụ: \`Xuan2026@AnToan!\`). Tuyệt đối không dùng ngày sinh hay số điện thoại.\n` +
               `2. **Không dùng chung một mật khẩu:** Dùng các mật khẩu khác nhau cho Facebook, Zalo, Google để nếu một nơi bị lộ thì các tài khoản khác vẫn an toàn.\n` +
               `3. **Bật xác thực 2 lớp (2FA):** Vào phần Cài đặt Bảo mật và kích hoạt gửi mã OTP qua SMS hoặc ứng dụng Google Authenticator ngay hôm nay nhé! 🛡️`;
    }

    // 4. Mã OTP & Lừa đảo tiền bạc
    if (/mã otp|lộ otp|xin otp|ngân hàng|chuyển khoản|mất tiền/.test(text)) {
        return `🚫 **CẢNH BÁO BẢO VỆ MÃ OTP TUYỆT ĐỐI:**\n\n` +
               `1. **Mã OTP là chìa khóa két sắt:** Mã này chỉ gửi về cho bạn để xác nhận giao dịch hoặc đổi mật khẩu. Không ai có quyền yêu cầu bạn đọc mã này.\n` +
               `2. **Không có ngoại lệ:** Kể cả người tự xưng là công an, nhân viên ngân hàng, giáo viên hay admin game thì **100% đều là lừa đảo** nếu đòi mã OTP!\n` +
               `3. **Xử lý khi lỡ lộ OTP:** Ngay lập tức đăng nhập đổi mật khẩu, đăng xuất khỏi tất cả thiết bị và báo cho người lớn/ngân hàng khóa tài khoản khẩn cấp! 🚨`;
    }

    // 5. Link lừa đảo / Phishing / Link lạ
    if (/link lạ|link độc|nhận biết link|phishing|bấm vào link|trang web giả/.test(text)) {
        return `⚠️ **Cách nhận biết và phòng tránh bẫy link lừa đảo (Phishing):**\n\n` +
               `1. **Soi kỹ tên miền:** Kẻ lừa thường dùng tên miền gần giống trang thật nhưng sai chính tả hoặc có đuôi lạ (ví dụ: \`facebook-nhanqua.com\`, \`garena-free.xyz\`).\n` +
               `2. **Nguyên tắc không nhập thông tin:** Dù giao diện có giống 100% trang đăng nhập Facebook hay Zalo, tuyệt đối không nhập tài khoản/mật khẩu khi truy cập từ đường link người khác gửi.\n` +
               `3. **Kiểm tra độ uy tín:** Bạn có thể dán link vào công cụ kiểm tra miễn phí như \`chongluadao.vn\` hoặc \`virustotal.com\` trước khi truy cập nhé! 🛡️`;
    }

    // 6. Bạo lực mạng / Bắt nạt / Bóc phốt / Tẩy chay
    if (/bạo lực mạng|bắt nạt|cyberbullying|bêu xấu|bóc phốt|chửi bới|tẩy chay|xúc phạm/.test(text)) {
        return `🚨 **4 bước xử lý khẩn cấp khi bị bạo lực / bắt nạt trên mạng:**\n\n` +
               `1. **Dừng đối đáp:** Không chửi bới hay đôi co lại vì điều đó chỉ khiến kẻ xấu khiêu khích nhiều hơn.\n` +
               `2. **Lưu bằng chứng:** Chụp ảnh màn hình toàn bộ tin nhắn, bình luận xúc phạm kèm tên tài khoản và thời gian rõ ràng.\n` +
               `3. **Chặn & Báo cáo:** Nhấn Chặn (Block) và Báo cáo (Report) tài khoản quấy rối lên mạng xã hội.\n` +
               `4. **Tìm sự giúp đỡ:** Hãy tâm sự ngay với bố mẹ, thầy cô hoặc gọi miễn phí **Tổng đài Quốc gia 111** (Bảo vệ trẻ em 24/7) để được bảo vệ kịp thời nhé! ❤️`;
    }

    // 7. Deepfake / Giả mạo giọng nói & video call
    if (/deepfake|giả giọng|giả mặt|video call lừa|mượn tiền qua mạng/.test(text)) {
        return `🎭 **Cảnh giác chiêu trò Deepfake AI giả mặt & giả giọng nói:**\n\n` +
               `1. **Dấu hiệu nhận biết:** Khuôn mặt người gọi hay bị mờ nhạt, giật lag, cử động miệng không khớp tiếng, chớp mắt bất thường hoặc chỉ gọi vài giây rồi tắt máy báo 'mạng yếu'.\n` +
               `2. **Quy tắc xác minh:** Khi người quen/bạn bè nhắn tin hoặc gọi video nhờ chuyển tiền gấp, hãy cúp máy và gọi trực tiếp bằng số điện thoại di động thông thường.\n` +
               `3. **Hỏi câu hỏi riêng tư:** Đặt câu hỏi mà chỉ 2 người biết (ví dụ: 'Hôm qua tụi mình học môn gì?') để kiểm tra xem có phải kẻ mạo danh không nhé! 🛡️`;
    }

    // 8. Virus / Mã độc / Điện thoại bị hack / Máy tính nhiễm độc
    if (/virus|mã độc|trojan|bị hack|nhiễm độc|điện thoại nóng|tải phần mềm lạ/.test(text)) {
        return `🛡️ **Dấu hiệu thiết bị bị nhiễm mã độc & cách khắc phục:**\n\n` +
               `1. **Dấu hiệu cảnh báo:** Máy chạy chậm đơ, pin tụt nhanh bất thường, máy nóng khi không dùng, tự động hiện quảng cáo hoặc gửi tin nhắn lạ cho bạn bè.\n` +
               `2. **Xử lý ngay lập tức:** Tắt kết nối Wi-Fi/4G để ngắt liên lạc giữa mã độc và máy chủ kẻ tấn công.\n` +
               `3. **Quét và gỡ bỏ:** Kiểm tra và gỡ cài đặt các ứng dụng lạ vừa tải về, sử dụng phần mềm diệt virus uy tín để quét toàn diện, hoặc khôi phục cài đặt gốc nếu cần nhé! 💻`;
    }

    // 9. Tải game lậu / Hack game / Mod APK / File crack
    if (/tải.*(lậu|crack|mod|hack)|cheat game|mod apk|bản crack/.test(text)) {
        return `⚠️ **Nguy cơ tiềm ẩn từ phần mềm crack và mod game:**\n\n` +
               `1. **Kẻ lừa không cho không:** Các bản 'hack game' hay 'phần mềm bẻ khóa miễn phí' gần như 100% đều bị chèn sẵn mã độc trojan, keylogger hoặc virus đào tiền ảo.\n` +
               `2. **Mất tài khoản toàn bộ:** Khi bạn mở file cài đặt, mã độc sẽ tự động quét trộm cookie trình duyệt, mật khẩu lưu trên máy và gửi về cho hacker.\n` +
               `3. **Lời khuyên:** Chỉ tải game và phần mềm từ các nguồn chính thống như Steam, Google Play, App Store hoặc trang web chính thức của nhà phát triển nhé! 🛡️`;
    }

    // 10. Cách dùng AI / ChatGPT trong học tập
    if (/dùng ai|chatgpt|trí tuệ nhân tạo|hỏi bài ai|làm bài bằng ai|đạo văn/.test(text)) {
        return `🤖 **Nguyên tắc vàng khi dùng AI trong học tập dành cho học sinh:**\n\n` +
               `1. **AI là trợ lý gợi ý, không phải người làm hộ:** Dùng AI để tìm ý tưởng, giải thích khái niệm khó hiểu hoặc chữa lỗi ngữ pháp; tuyệt đối không chép nguyên văn nộp bài (đạo văn).\n` +
               `2. **Luôn kiểm chứng thông tin:** AI có thể bị 'ảo giác' (tạo ra thông tin sai lệch nhưng diễn đạt rất tự tin). Bạn cần đối chiếu với sách giáo khoa và tài liệu chuẩn.\n` +
               `3. **Bảo mật quyền riêng tư:** Không gửi thông tin cá nhân, bài kiểm tra mật hoặc ảnh của mình/gia đình cho các công cụ AI nhé! 💡`;
    }

    // 11. Bị tống tiền / Đe dọa đăng ảnh nhạy cảm
    if (/tống tiền|đe dọa|ảnh nhạy cảm|ảnh riêng tư|đe dọa tung clip|bị đe dọa/.test(text)) {
        return `🚨 **HƯỚNG DẪN KHẨN CẤP KHI BỊ ĐE DỌA / TỐNG TIỀN TRỰC TUYẾN:**\n\n` +
               `1. **Tuyệt đối KHÔNG chuyển tiền:** Kẻ tống tiền sẽ không bao giờ dừng lại dù bạn chuyển bao nhiêu tiền. Càng chuyển tiền chúng càng ép buộc nhiều hơn.\n` +
               `2. **Giữ bình tĩnh và lưu chứng cứ:** Chụp màn hình toàn bộ tin nhắn, tài khoản tống tiền, số tài khoản nhận tiền mà chúng cung cấp.\n` +
               `3. **Chia sẻ ngay với người lớn tin cậy:** Bạn không có lỗi trong việc bị kẻ xấu lừa gạt. Hãy báo ngay cho bố mẹ, thầy cô hoặc gọi **Tổng đài 111** để được pháp luật và cơ quan công an bảo vệ an toàn nhé! ❤️`;
    }

    // 12. Chào hỏi / Giới thiệu / Câu hỏi mở
    if (/^(chào|hello|hi|xin chào|hey|bạn là ai|giới thiệu|cyberbot)/.test(text)) {
        return `Xin chào bạn! 👋 Mình là **CyberBot AI** — Trợ lý ảo bảo vệ không gian mạng thông minh của dự án An Toàn Mạng THCS. Mình luôn sẵn sàng giải đáp mọi thắc mắc của bạn về: bảo mật tài khoản, nhận diện bẫy lừa đảo, phòng chống bạo lực mạng, sử dụng AI an toàn và kỹ năng số thông minh. Bạn cứ thoải mái đặt câu hỏi nhé! 🛡️✨`;
    }

    // 13. Phân tích ngữ nghĩa thông minh cho các câu hỏi khác
    return `Chào bạn! 🛡️ Về câu hỏi **"${raw ? raw.slice(0, 60) : 'của bạn'}"**, dưới đây là những lưu ý an toàn số quan trọng từ CyberBot AI:\n\n` +
           `1. **Luôn đặt an toàn lên hàng đầu:** Trong môi trường mạng, hãy cảnh giác trước những lời mời gọi quá hấp dẫn, thông tin không rõ nguồn gốc hoặc yêu cầu cung cấp dữ liệu cá nhân.\n` +
           `2. **Bảo vệ tài khoản và thiết bị:** Giữ kín mật khẩu, bật xác thực 2 lớp (2FA) và không bao giờ chia sẻ mã OTP cho bất kỳ ai.\n` +
           `3. **Cần hỗ trợ thêm:** Bạn có thể tham khảo thêm các bài học chi tiết tại thanh điều hướng (**Công Dân Số**, **Bạo Lực Mạng**, **Lừa Đảo Mạng**) hoặc gọi Tổng đài **111** miễn phí nếu gặp tình huống khẩn cấp nhé! 🌟`;
}

function isEnglishResponse(text) {
    if (!text || typeof text !== 'string') return false;
    const hasVietnameseAccents = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/.test(text);
    if (hasVietnameseAccents) return false;
    const englishWords = /\b(the|is|are|you|your|hello|hey|safe|online|password|cyber|help|how|what|can|this|that|with|for|and|to|in|of|it|on|we)\b/i;
    return englishWords.test(text);
}

async function fetchPollinationsAiReply(userPrompt) {
    const apiKey = (localStorage.getItem('pollinations_api_key') || '').trim();

    // 1. Try via local server proxy (handles Pollinations Pro, Public, and Cyber AI Engine with Vietnamese enforcement)
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);
        const res = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: userPrompt, apiKey: apiKey }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (res.ok) {
            const data = await res.json();
            if (data.success && data.reply && !isEnglishResponse(data.reply)) {
                return { text: data.reply, source: data.source || 'cyber-ai' };
            }
        }
    } catch (e) {
        console.warn('[CyberBot] Local AI proxy attempt failed, trying browser fallbacks:', e);
    }

    // 2. Direct Pollinations API Key (if user configured one in browser)
    if (apiKey) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            const response = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + apiKey
                },
                body: JSON.stringify({
                    model: 'openai',
                    messages: [
                        {
                            role: 'system',
                            content: 'QUY TẮC BẮT BUỘC: Bạn PHẢI LUÔN LUÔN trả lời HOÀN TOÀN BẰNG TIẾNG VIỆT 100% trong mọi trường hợp. Tuyệt đối không trả lời bằng tiếng Anh. Bạn là CyberBot AI - trợ lý bảo vệ không gian mạng dành cho học sinh THCS Việt Nam.'
                        },
                        { role: 'user', content: userPrompt }
                    ],
                    temperature: 0.7
                }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                const content = data?.choices?.[0]?.message?.content;
                if (content && typeof content === 'string' && content.trim() && !isEnglishResponse(content)) {
                    return { text: content.trim(), source: 'pollinations-pro' };
                }
            }
        } catch (e) {
            console.warn('[CyberBot] Pollinations Pro API attempt failed:', e);
        }
    }

    // 3. Fallback to resilient CyberBot AI Reasoning Engine (guaranteed 100% Vietnamese)
    const reasoningText = generateCyberBotAiResponse(userPrompt);
    return { text: reasoningText, source: 'cyber-ai' };
}

function initCyberBotUI() {
    if (document.getElementById('cyberbot-launcher')) return;

    // 1. Launcher button
    const launcher = document.createElement('div');
    launcher.className = 'cyberbot-launcher';
    launcher.id = 'cyberbot-launcher';
    launcher.onclick = toggleCyberBotWindow;
    launcher.innerHTML = `
        <div class="cyberbot-badge-bubble">
            <span class="dot-pulse"></span>
            <span>Hỏi Trợ Lý Cyber AI</span>
        </div>
        <div class="cyberbot-btn-avatar">
            🤖
        </div>
    `;
    document.body.appendChild(launcher);

    // 2. Chat window
    const win = document.createElement('div');
    win.className = 'cyberbot-window';
    win.id = 'cyberbot-window';
    win.innerHTML = `
        <div class="cyberbot-header">
            <div class="cyberbot-header-left">
                <div class="cyberbot-avatar-mini">🤖</div>
                <div>
                    <div class="cyberbot-header-title">CyberBot AI</div>
                    <div class="cyberbot-header-status" id="cyberbot-status-text"><span class="dot"></span> Trực tuyến 24/7</div>
                </div>
            </div>
            <div class="cyberbot-header-actions">
                <button class="cyberbot-action-btn" onclick="promptPollinationsApiKey()" title="Cài đặt API Key (Tùy chọn)">
                    <i class="fas fa-key"></i>
                </button>
                <button class="cyberbot-action-btn" onclick="toggleCyberSfx(this)" title="Bật/Tắt âm thanh bot">
                    <i class="fas fa-volume-high" id="bot-sfx-icon"></i>
                </button>
                <button class="cyberbot-action-btn" onclick="toggleCyberBotWindow()" title="Đóng chat">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
        <div class="cyberbot-body" id="cyberbot-body">
            <div class="cyberbot-msg bot">
                <div class="cyberbot-msg-bubble">
                    👋 Chào bạn! Mình là <strong>CyberBot AI</strong> — Trợ lý ảo bảo vệ không gian mạng dành cho học sinh THCS! Bạn muốn tìm hiểu hoặc cần trợ giúp về vấn đề an toàn nào hôm nay?
                </div>
            </div>
        </div>
        <div class="cyberbot-chips-bar">
            <button class="cyberbot-chip" onclick="askCyberBotChip(this)">🔍 Nhận biết link lừa đảo</button>
            <button class="cyberbot-chip" onclick="askCyberBotChip(this)">🔑 Mật khẩu mạnh &amp; 2FA</button>
            <button class="cyberbot-chip" onclick="askCyberBotChip(this)">🚨 Cách xử lý bạo lực mạng</button>
            <button class="cyberbot-chip" onclick="askCyberBotChip(this)">🤖 Dùng AI an toàn &amp; đúng cách</button>
            <button class="cyberbot-chip" onclick="askCyberBotChip(this)">🚫 Bảo mật mã OTP</button>
            <button class="cyberbot-chip" onclick="askCyberBotChip(this)">🎮 Cảnh giác lừa nạp game</button>
        </div>
        <div class="cyberbot-footer">
            <input type="text" class="cyberbot-input" id="cyberbot-input" placeholder="Hỏi CyberBot bất kỳ điều gì..." autocomplete="off">
            <button class="cyberbot-send-btn" id="cyberbot-send-btn" onclick="sendCyberBotUserMsg()" title="Gửi tin nhắn">
                <i class="fas fa-paper-plane"></i>
            </button>
        </div>
    `;
    document.body.appendChild(win);
    updateCyberBotStatusBadge();

    // Attach robust listeners for input and button
    const chatInput = win.querySelector('#cyberbot-input');
    const sendBtn = win.querySelector('#cyberbot-send-btn');
    if (chatInput) {
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendCyberBotUserMsg();
            }
        });
    }
    if (sendBtn) {
        sendBtn.addEventListener('click', (e) => {
            e.preventDefault();
            sendCyberBotUserMsg();
        });
    }

    // 3. Emergency SOS Modal
    initSosModalUI();
}

function toggleCyberBotWindow() {
    const win = document.getElementById('cyberbot-window');
    if (!win) return;
    const isActive = win.classList.toggle('active');
    playCyberSfx(isActive ? 'receive' : 'beep');
    if (isActive) {
        setTimeout(() => {
            const inp = document.getElementById('cyberbot-input');
            if (inp) inp.focus();
            const body = document.getElementById('cyberbot-body');
            if (body) body.scrollTop = body.scrollHeight;
        }, 150);
    }
}

function toggleCyberSfx(btn) {
    cyberSfxEnabled = !cyberSfxEnabled;
    const icon = document.getElementById('bot-sfx-icon');
    if (icon) icon.className = cyberSfxEnabled ? 'fas fa-volume-high' : 'fas fa-volume-xmark';
    showToast(cyberSfxEnabled ? 'green' : 'yellow', 'Âm thanh Bot', cyberSfxEnabled ? 'Đã bật hiệu ứng âm thanh cyber' : 'Đã tắt âm thanh bot');
}

function askCyberBotChip(btn) {
    const text = btn.textContent.replace(/^[^\w\s\u00C0-\u1EF9\u0110\u0111]+/, '').trim();
    const inp = document.getElementById('cyberbot-input');
    if (inp) {
        inp.value = text;
        inp.focus();
    }
    sendCyberBotUserMsg();
}

async function sendCyberBotUserMsg() {
    const inp = document.getElementById('cyberbot-input');
    const body = document.getElementById('cyberbot-body');
    if (!inp || !body) return;

    const val = inp.value.trim();
    if (!val) return;
    inp.value = '';

    // Append User Message
    const userMsg = document.createElement('div');
    userMsg.className = 'cyberbot-msg user';
    userMsg.innerHTML = `<div class="cyberbot-msg-bubble">${escapeHtml(val)}</div>`;
    body.appendChild(userMsg);
    body.scrollTop = body.scrollHeight;
    playCyberSfx('beep');

    // 1. NẾU LÀ CÂU HỎI CÓ SẴN (Ví dụ: Nhận biết link lừa đảo, Mật khẩu, Bạo lực mạng,...) -> Dùng câu trả lời có sẵn
    const presetAnswer = getCyberBotReply(val);

    if (presetAnswer) {
        const typingMsg = document.createElement('div');
        typingMsg.className = 'cyberbot-msg bot';
        typingMsg.id = 'bot-typing-indicator';
        typingMsg.innerHTML = `<div class="cyberbot-msg-bubble" style="display:flex;align-items:center;"><div class="typing-dots"><span></span><span></span><span></span></div> <span style="font-size:0.78rem;color:#c084fc;margin-left:8px;font-weight:700;"><i class="fas fa-brain"></i> AI đang suy nghĩ...</span></div>`;
        body.appendChild(typingMsg);
        body.scrollTop = body.scrollHeight;

        setTimeout(() => {
            const ind = document.getElementById('bot-typing-indicator');
            if (ind) ind.remove();

            const formattedReply = presetAnswer
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n/g, '<br>');

            const badgeHtml = `<div class="cyberbot-source-tag local"><i class="fas fa-shield-halved"></i> Tri thức chuẩn An Toàn Mạng 🛡️</div>`;

            const botMsg = document.createElement('div');
            botMsg.className = 'cyberbot-msg bot';
            botMsg.innerHTML = `<div class="cyberbot-msg-bubble">${formattedReply}${badgeHtml}</div>`;
            body.appendChild(botMsg);
            body.scrollTop = body.scrollHeight;
            playCyberSfx('receive');
        }, 450 + Math.random() * 300);
        return;
    }

    // 2. NHỮNG CÂU HỎI KHÁC -> DÙNG AI (Pollinations AI) ĐỂ TRẢ LỜI
    const typingMsg = document.createElement('div');
    typingMsg.className = 'cyberbot-msg bot';
    typingMsg.id = 'bot-typing-indicator';
    typingMsg.innerHTML = `<div class="cyberbot-msg-bubble" style="display:flex;align-items:center;"><div class="typing-dots"><span></span><span></span><span></span></div> <span id="typing-status-txt" style="font-size:0.78rem;color:#c084fc;margin-left:8px;font-weight:700;"><i class="fas fa-brain"></i> AI đang suy nghĩ...</span></div>`;
    body.appendChild(typingMsg);
    body.scrollTop = body.scrollHeight;

    try {
        const replyObj = await fetchPollinationsAiReply(val);
        const ind = document.getElementById('bot-typing-indicator');
        if (ind) ind.remove();

        const textReply = (replyObj && replyObj.text) ? replyObj.text : generateCyberBotAiResponse(val);
        const formattedReply = textReply
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');

        let badgeHtml = `<div class="cyberbot-source-tag"><i class="fas fa-brain"></i> Phản hồi bởi Cyber AI 🤖</div>`;
        if (replyObj && replyObj.source === 'pollinations-pro') {
            badgeHtml = `<div class="cyberbot-source-tag pro"><i class="fas fa-sparkles"></i> Phản hồi bởi Pollinations Pro 🌸</div>`;
        }

        const botMsg = document.createElement('div');
        botMsg.className = 'cyberbot-msg bot';
        botMsg.innerHTML = `<div class="cyberbot-msg-bubble">${formattedReply}${badgeHtml}</div>`;
        body.appendChild(botMsg);
        body.scrollTop = body.scrollHeight;
        playCyberSfx('receive');
    } catch (err) {
        console.error('[CyberBot] Error processing message, using smart reasoning engine:', err);
        const ind = document.getElementById('bot-typing-indicator');
        if (ind) ind.remove();

        const fallbackAns = generateCyberBotAiResponse(val);
        const formattedReply = fallbackAns
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');

        const botMsg = document.createElement('div');
        botMsg.className = 'cyberbot-msg bot';
        botMsg.innerHTML = `<div class="cyberbot-msg-bubble">${formattedReply}<div class="cyberbot-source-tag"><i class="fas fa-brain"></i> Phản hồi bởi Cyber AI 🤖</div></div>`;
        body.appendChild(botMsg);
        body.scrollTop = body.scrollHeight;
        playCyberSfx('receive');
    }
}



// Bind to window for absolute reliability
window.escapeHtml = escapeHtml;
window.updateCyberBotStatusBadge = updateCyberBotStatusBadge;
window.promptPollinationsApiKey = promptPollinationsApiKey;
window.fetchPollinationsAiReply = fetchPollinationsAiReply;
window.initCyberBotUI = initCyberBotUI;
window.toggleCyberBotWindow = toggleCyberBotWindow;
window.toggleCyberSfx = toggleCyberSfx;
window.askCyberBotChip = askCyberBotChip;
window.sendCyberBotUserMsg = sendCyberBotUserMsg;



// ===================================================================
// SOS EMERGENCY MODAL UI (Cứu Trợ Khẩn Cấp 24/7)
// ===================================================================
function initSosModalUI() {
    if (document.getElementById('sos-modal')) return;

    const modal = document.createElement('div');
    modal.className = 'sos-modal-overlay';
    modal.id = 'sos-modal';
    modal.onclick = (e) => { if (e.target === modal) closeSosModal(); };
    modal.innerHTML = `
        <div class="sos-modal-card">
            <button class="sos-close-btn" onclick="closeSosModal()"><i class="fas fa-times"></i></button>
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
                <div style="font-size:2rem;color:#ef4444;animation:pulseGlow 1.5s infinite;"><i class="fas fa-triangle-exclamation"></i></div>
                <div>
                    <h2 style="font-family:'Orbitron',sans-serif;font-size:1.4rem;color:#fff;margin:0;">TRUNG TÂM CỨU TRỢ KHẨN CẤP SOS 24/7</h2>
                    <div style="font-size:0.85rem;color:#fca5a5;">Bạn hoặc bạn bè đang gặp sự cố trên mạng? Hãy bình tĩnh và chọn tình huống dưới đây:</div>
                </div>
            </div>

            <div class="sos-crisis-grid">
                <div class="sos-crisis-item">
                    <div class="sos-crisis-header">
                        <i class="fas fa-shield-heart" style="color:#ef4444;font-size:1.2rem;"></i>
                        <span>1. Đang bị bạo lực mạng, bêu xấu hoặc tống tiền hình ảnh:</span>
                    </div>
                    <ul style="padding-left:20px;font-size:0.86rem;color:#e2e8f0;line-height:1.6;">
                        <li><strong>Dừng trả lời ngay</strong>: Không nhượng bộ, không tiếp tục tranh cãi.</li>
                        <li><strong>Chụp ảnh màn hình</strong>: Lưu tất cả tin nhắn, bình luận và đường link trang cá nhân kẻ xấu.</li>
                        <li><strong>Tuyệt đối KHÔNG chuyển tiền</strong> nếu bị dọa phát tán ảnh riêng tư.</li>
                        <li><strong>Gọi ngay Tổng đài 111</strong> (miễn cước 24/7) để chuyên gia bảo vệ quyền lợi và bảo mật danh tính.</li>
                    </ul>
                </div>

                <div class="sos-crisis-item">
                    <div class="sos-crisis-header">
                        <i class="fas fa-key" style="color:#f59e0b;font-size:1.2rem;"></i>
                        <span>2. Bị chiếm đoạt nick Facebook / Zalo hoặc lỡ bấm link độc:</span>
                    </div>
                    <ul style="padding-left:20px;font-size:0.86rem;color:#e2e8f0;line-height:1.6;">
                        <li>Đăng nhập ngay từ thiết bị quen thuộc và <strong>đổi mật khẩu ngay lập tức</strong>.</li>
                        <li>Chọn tính năng <strong>"Đăng xuất khỏi tất cả các thiết bị khác"</strong>.</li>
                        <li>Bật Xác thực 2 yếu tố (2FA) bằng ứng dụng hoặc tin nhắn SMS.</li>
                        <li>Báo người thân, bạn bè biết tài khoản đang bị hack để tránh kẻ gian mạo danh mượn tiền.</li>
                    </ul>
                </div>

                <div class="sos-crisis-item">
                    <div class="sos-crisis-header">
                        <i class="fas fa-credit-card" style="color:#06b6d4;font-size:1.2rem;"></i>
                        <span>3. Bị lừa tiền nạp thẻ game hoặc chuyển khoản trực tuyến:</span>
                    </div>
                    <ul style="padding-left:20px;font-size:0.86rem;color:#e2e8f0;line-height:1.6;">
                        <li>Lưu lại biên lai chuyển khoản, số tài khoản nhận tiền và lịch sử chat.</li>
                        <li>Báo ngay cho phụ huynh và liên hệ hotline ngân hàng đề nghị tra soát / phong tỏa.</li>
                        <li>Gửi báo cáo lừa đảo tới Cục An toàn thông tin qua trang <code>canhbao.ncsc.gov.vn</code>.</li>
                    </ul>
                </div>
            </div>

            <div style="font-size:0.88rem;font-weight:800;color:#c4b5fd;margin-top:16px;">
                <i class="fas fa-phone-volume"></i> CÁC ĐƯỜNG DÂY NÓNG HỖ TRỢ TRỰC TIẾP (MIỄN CƯỚC 100%):
            </div>

            <div class="sos-hotline-bar">
                <a href="tel:111" class="sos-hotline-card">
                    <div style="font-size:0.78rem;color:#cbd5e1;">Tổng Đài Trẻ Em</div>
                    <div class="sos-hotline-number">111</div>
                    <div style="font-size:0.75rem;color:#34d399;"><i class="fas fa-phone"></i> Gọi Miễn Phí</div>
                </a>
                <a href="tel:18006868" class="sos-hotline-card">
                    <div style="font-size:0.78rem;color:#cbd5e1;">Cục An Toàn Thông Tin</div>
                    <div class="sos-hotline-number" style="font-size:1.15rem;">1800 6868</div>
                    <div style="font-size:0.75rem;color:#34d399;"><i class="fas fa-phone"></i> Hỗ Trợ Kỹ Thuật</div>
                </a>
                <a href="https://canhbao.ncsc.gov.vn" target="_blank" class="sos-hotline-card" style="border-color:rgba(6,182,212,0.4);">
                    <div style="font-size:0.78rem;color:#cbd5e1;">Cổng Cảnh Báo An Toàn</div>
                    <div class="sos-hotline-number" style="font-size:1.05rem;color:#67e8f9;">NCSC.GOV</div>
                    <div style="font-size:0.75rem;color:#67e8f9;"><i class="fas fa-external-link-alt"></i> Tố Cáo Online</div>
                </a>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Inject SOS button to navbar if not exists
    injectSosButtonToNav();
}

function openSosModal() {
    const modal = document.getElementById('sos-modal');
    if (modal) {
        modal.classList.add('active');
        playCyberSfx('alert');
    }
}

function closeSosModal() {
    const modal = document.getElementById('sos-modal');
    if (modal) modal.classList.remove('active');
}

function injectSosButtonToNav() {
    const navLinks = document.getElementById('nav-links');
    if (!navLinks || document.getElementById('btn-nav-sos-btn')) return;

    const li = document.createElement('li');
    li.innerHTML = `
        <a href="#" id="btn-nav-sos-btn" class="btn-nav-sos" onclick="openSosModal();return false;" title="Hỗ trợ khẩn cấp 24/7">
            <i class="fas fa-shield-halved"></i> SOS 24/7
        </a>
    `;
    navLinks.appendChild(li);
}

// ===================================================================
// MATRIX RAIN CANVAS EFFECT TOGGLER
// ===================================================================
let isMatrixRainActive = false;
let matrixInterval = null;

function toggleMatrixRain() {
    isMatrixRainActive = !isMatrixRainActive;
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (isMatrixRainActive) {
        showToast('green', 'Matrix Mode Kích Hoạt 🌌', 'Chào mừng bạn đến với ma trận phòng thủ an ninh số!');
        playCyberSfx('receive');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const chars = '0123456789ABCDEF01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
        const fontSize = 14;
        const columns = Math.floor(canvas.width / fontSize);
        const drops = Array(columns).fill(1);

        matrixInterval = setInterval(() => {
            ctx.fillStyle = 'rgba(7, 4, 26, 0.08)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.font = `${fontSize}px monospace`;

            for (let i = 0; i < drops.length; i++) {
                const char = chars.charAt(Math.floor(Math.random() * chars.length));
                ctx.fillStyle = (Math.random() > 0.85) ? '#67e8f9' : '#00ff88';
                ctx.fillText(char, i * fontSize, drops[i] * fontSize);

                if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                    drops[i] = 0;
                }
                drops[i]++;
            }
        }, 33);
    } else {
        if (matrixInterval) clearInterval(matrixInterval);
        showToast('yellow', 'Đã tắt Matrix FX', 'Đã chuyển về hiệu ứng hạt ánh sáng nhẹ nhàng.');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initCyberBotUI();
});
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initCyberBotUI();
}




