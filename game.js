// ========== AUDIO ==========
class Audio {
    constructor() { this.ctx = null; }

    init() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }

    play(freq, dur, type = 'square', vol = 0.1, delay = 0) {
        if (!this.ctx) return;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.connect(g); g.connect(this.ctx.destination);
        o.type = type;
        o.frequency.setValueAtTime(freq, this.ctx.currentTime + delay);
        g.gain.setValueAtTime(vol, this.ctx.currentTime + delay);
        g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + delay + dur);
        o.start(this.ctx.currentTime + delay);
        o.stop(this.ctx.currentTime + delay + dur);
    }

    beep()    { this.play(520, 0.1, 'square', 0.08); }
    beepHi()  { this.play(880, 0.1, 'square', 0.08); }
    tick()    { this.play(600, 0.12, 'sine', 0.1); }
    tickHi()  { this.play(900, 0.12, 'sine', 0.12); }

    scanPerfect() {
        this.play(880, 0.08, 'square', 0.1);
        this.play(1320, 0.1, 'square', 0.1, 0.04);
    }
    scanGood() { this.play(660, 0.1, 'square', 0.08); }
    scanMiss() { this.play(200, 0.15, 'sawtooth', 0.06); }

    jingle() {
        [523, 659, 784, 1047].forEach((f, i) => this.play(f, 0.2, 'triangle', 0.06, i * 0.1));
    }
}

// ========== ITEMS ==========
const ITEMS = ['📱','🦕','🌺','⚽','🍌','🎾','🧸','📦','🍎','🥤','🍪','🎨','🍫','🧃','🎀','🍩','🎈','🌸','🧴','🕹️'];

// ========== PATTERNS ==========
function getPatterns(level) {
    const L = 500; // lead-in so first beat isn't at t=0
    const easy = [
        [L, L+500, L+1000, L+1500],
        [L, L+500, L+1000, L+1500],
        [L, L+400, L+800, L+1500],
        [L, L+500, L+1000, L+1500, L+2000],
        [L, L+400, L+800, L+1200, L+1600],
        [L, L+600, L+1000, L+1400, L+2000],
    ];
    const normal = [
        [L, L+300, L+600, L+1000, L+1400, L+1800],
        [L, L+250, L+500, L+750, L+1200, L+1600],
        [L, L+400, L+600, L+1000, L+1250, L+1500, L+1800],
        [L, L+250, L+500, L+1000, L+1250, L+1500, L+2000],
        [L, L+300, L+600, L+900, L+1200, L+1500, L+1800],
        [L, L+250, L+500, L+750, L+1250, L+1500, L+1750],
    ];
    const hard = [
        [L, L+200, L+400, L+600, L+1000, L+1200, L+1500, L+1800],
        [L, L+250, L+500, L+750, L+1000, L+1250, L+1500, L+1750],
        [L, L+200, L+400, L+700, L+900, L+1200, L+1500, L+1700, L+2000],
        [L, L+250, L+500, L+750, L+1000, L+1250, L+1500, L+1750, L+2000],
        [L, L+200, L+500, L+700, L+1000, L+1200, L+1400, L+1700, L+2000],
        [L, L+250, L+400, L+600, L+800, L+1000, L+1250, L+1500, L+1750],
    ];
    return level === 'easy' ? easy : level === 'normal' ? normal : hard;
}

// ========== DEVICE & AUTH & RANKING ==========
const STORAGE_KEY_DEVICE = 'rhythm_superstore_device';
const STORAGE_KEY_ACCOUNTS = 'rhythm_superstore_accounts';
const STORAGE_KEY_AUTOLOGIN = 'rhythm_superstore_autologin';
const STORAGE_KEY_RANKING = 'rhythm_superstore_ranking';

function getSavedDevice() {
    return localStorage.getItem(STORAGE_KEY_DEVICE) || '';
}

function saveDevice(type) {
    localStorage.setItem(STORAGE_KEY_DEVICE, type);
}

function getAccounts() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY_ACCOUNTS)) || {}; }
    catch { return {}; }
}

function saveAccounts(accounts) {
    localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(accounts));
}

function getAutoLogin() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY_AUTOLOGIN)) || null; }
    catch { return null; }
}

function saveAutoLogin(id, password) {
    localStorage.setItem(STORAGE_KEY_AUTOLOGIN, JSON.stringify({ id, password }));
}

function clearAutoLogin() {
    localStorage.removeItem(STORAGE_KEY_AUTOLOGIN);
}

function getRanking() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY_RANKING)) || { easy: [], normal: [], hard: [] }; }
    catch { return { easy: [], normal: [], hard: [] }; }
}

function saveRankingEntry(level, nickname, score, grade) {
    const ranking = getRanking();
    if (!ranking[level]) ranking[level] = [];
    // Update best score for this nickname, or add new entry
    const existing = ranking[level].find(r => r.name === nickname);
    if (existing) {
        if (score > existing.score) {
            existing.score = score;
            existing.grade = grade;
        }
    } else {
        ranking[level].push({ name: nickname, score, grade });
    }
    // Sort descending by score, keep top 20
    ranking[level].sort((a, b) => b.score - a.score);
    ranking[level] = ranking[level].slice(0, 20);
    localStorage.setItem(STORAGE_KEY_RANKING, JSON.stringify(ranking));
}

function renderRanking(level, currentNickname) {
    const ranking = getRanking();
    const list = ranking[level] || [];
    const container = document.getElementById('ranking-list');
    if (list.length === 0) {
        container.innerHTML = '<div class="ranking-empty">아직 기록이 없어요!</div>';
        return;
    }
    container.innerHTML = list.map((r, i) => {
        const isMe = r.name === currentNickname;
        const gradeClass = r.grade || '';
        return `<div class="ranking-item${isMe ? ' me' : ''}">
            <span class="ranking-rank">${i + 1}</span>
            <span class="ranking-name">${escapeHtml(r.name)}${isMe ? ' (나)' : ''}</span>
            <span class="ranking-score">${r.score.toLocaleString()}</span>
            <span class="ranking-grade ${gradeClass}">${r.grade || ''}</span>
        </div>`;
    }).join('');
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ========== GAME ==========
const game = {
    state: 'device', // starts at device screen
    phase: 'idle',
    level: 'easy',
    audio: new Audio(),
    nickname: '',
    deviceType: '', // 'mobile' or 'pc'

    round: 0,
    totalRounds: 8,
    patterns: [],
    pattern: [],
    items: [],
    noteElements: [],

    playStartTime: 0,
    playBeatIdx: 0,
    timeouts: [],

    score: 0, combo: 0, maxCombo: 0,
    perfect: 0, good: 0, miss: 0,
    perfectW: 180, goodW: 350,

    // Fall area dimensions
    fallAreaHeight: 0,
    hitLineY: 0,

    init() {
        // Check for saved device type
        const savedDevice = getSavedDevice();
        if (savedDevice) {
            this.deviceType = savedDevice;
            this.applyDeviceMode();
            // Try auto-login
            const auto = getAutoLogin();
            if (auto) {
                const accounts = getAccounts();
                if (accounts[auto.id] && accounts[auto.id].password === auto.password) {
                    this.nickname = auto.id;
                    this.showTitleScreen();
                } else {
                    clearAutoLogin();
                    this.showAuthScreen();
                }
            } else {
                this.showAuthScreen();
            }
        }

        // Device selection buttons
        document.querySelectorAll('.device-btn').forEach(btn => {
            btn.addEventListener('click', () => this.selectDevice(btn.dataset.device));
        });

        // Auth: login
        document.getElementById('login-btn').addEventListener('click', () => this.doLogin());
        document.getElementById('login-pw').addEventListener('keydown', e => {
            if (e.key === 'Enter') this.doLogin();
        });

        // Auth: goto signup
        document.getElementById('goto-signup-btn').addEventListener('click', () => this.showSignupForm());

        // Auth: signup
        document.getElementById('signup-btn').addEventListener('click', () => this.doSignup());
        document.getElementById('signup-pw-confirm').addEventListener('keydown', e => {
            if (e.key === 'Enter') this.doSignup();
        });

        // Auth: goto login
        document.getElementById('goto-login-btn').addEventListener('click', () => this.showLoginForm());

        // Ranking button
        document.getElementById('ranking-btn').addEventListener('click', () => this.showRanking());
        document.getElementById('ranking-back-btn').addEventListener('click', () => this.hideRanking());

        // Ranking tabs
        document.querySelectorAll('.ranking-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.ranking-tab').forEach(t => t.classList.remove('selected'));
                tab.classList.add('selected');
                renderRanking(tab.dataset.level, this.nickname);
            });
        });

        // Level buttons
        document.querySelectorAll('.level-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.level-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                this.level = btn.dataset.level;
            });
        });

        // Keyboard input (PC mode)
        document.addEventListener('keydown', e => {
            if (e.code === 'Space') { e.preventDefault(); this.input(); }
        });

        // Touch input for mobile mode - title screen
        document.getElementById('title-screen').addEventListener('touchstart', e => {
            if (this.deviceType !== 'mobile') return;
            if (e.target.closest('.level-btn') || e.target.closest('.ranking-btn')) return;
            e.preventDefault();
            this.input();
        }, { passive: false });

        // Touch input for mobile mode - game play area
        document.getElementById('fall-area').addEventListener('touchstart', e => {
            if (this.deviceType !== 'mobile') return;
            e.preventDefault();
            if (this.state === 'playing' && this.phase === 'play') this.tap();
        }, { passive: false });

        // Touch input for mobile mode - result screen
        document.getElementById('result-screen').addEventListener('touchstart', e => {
            if (this.deviceType !== 'mobile') return;
            e.preventDefault();
            this.input();
        }, { passive: false });

        // Click input for fall-area (PC fallback)
        document.getElementById('fall-area').addEventListener('click', () => {
            if (this.state === 'playing' && this.phase === 'play') this.tap();
        });
    },

    selectDevice(type) {
        this.deviceType = type;
        saveDevice(type);
        this.applyDeviceMode();
        // Try auto-login
        const auto = getAutoLogin();
        if (auto) {
            const accounts = getAccounts();
            if (accounts[auto.id] && accounts[auto.id].password === auto.password) {
                this.nickname = auto.id;
                this.showTitleScreen();
                return;
            }
            clearAutoLogin();
        }
        this.showAuthScreen();
    },

    applyDeviceMode() {
        if (this.deviceType === 'mobile') {
            document.body.classList.add('mobile-mode');
        } else {
            document.body.classList.remove('mobile-mode');
        }
    },

    showAuthScreen() {
        this.state = 'auth';
        document.getElementById('device-screen').style.display = 'none';
        document.getElementById('auth-screen').style.display = 'flex';
        this.showLoginForm();
    },

    showLoginForm() {
        document.getElementById('login-form').style.display = 'block';
        document.getElementById('signup-form').style.display = 'none';
        document.getElementById('login-error').textContent = '';
        document.getElementById('login-id').value = '';
        document.getElementById('login-pw').value = '';
        document.getElementById('login-id').focus();
    },

    showSignupForm() {
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('signup-form').style.display = 'block';
        document.getElementById('signup-error').textContent = '';
        document.getElementById('signup-id').value = '';
        document.getElementById('signup-pw').value = '';
        document.getElementById('signup-pw-confirm').value = '';
        document.getElementById('signup-id').focus();
    },

    doLogin() {
        const id = document.getElementById('login-id').value.trim();
        const pw = document.getElementById('login-pw').value;
        const errorEl = document.getElementById('login-error');

        if (!id || !pw) { errorEl.textContent = '아이디와 비밀번호를 입력하세요.'; return; }

        const accounts = getAccounts();
        if (!accounts[id]) { errorEl.textContent = '존재하지 않는 아이디입니다.'; return; }
        if (accounts[id].password !== pw) { errorEl.textContent = '비밀번호가 틀렸습니다.'; return; }

        this.nickname = id;

        if (document.getElementById('autologin-check').checked) {
            saveAutoLogin(id, pw);
        } else {
            clearAutoLogin();
        }

        this.showTitleScreen();
    },

    doSignup() {
        const id = document.getElementById('signup-id').value.trim();
        const pw = document.getElementById('signup-pw').value;
        const pwConfirm = document.getElementById('signup-pw-confirm').value;
        const errorEl = document.getElementById('signup-error');

        if (!id || id.length < 2) { errorEl.textContent = '아이디는 2자 이상이어야 합니다.'; return; }
        if (pw.length < 4) { errorEl.textContent = '비밀번호는 4자 이상이어야 합니다.'; return; }
        if (pw !== pwConfirm) { errorEl.textContent = '비밀번호가 일치하지 않습니다.'; return; }

        const accounts = getAccounts();
        if (accounts[id]) { errorEl.textContent = '이미 사용 중인 아이디입니다.'; return; }

        accounts[id] = { password: pw };
        saveAccounts(accounts);

        this.nickname = id;
        saveAutoLogin(id, pw);
        this.showTitleScreen();
    },

    updateInstructions() {
        const isMobile = this.deviceType === 'mobile';
        const startEl = document.getElementById('start-instruction');
        const resultEl = document.getElementById('result-instruction');
        if (startEl) startEl.textContent = isMobile ? '화면을 터치해 시작!' : '스페이스바를 눌러 시작!';
        if (resultEl) resultEl.textContent = isMobile ? '화면을 터치해 다시 시작!' : '스페이스바를 눌러 다시 시작!';
    },

    showTitleScreen() {
        this.state = 'title';
        document.getElementById('device-screen').style.display = 'none';
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('ranking-screen').style.display = 'none';
        document.getElementById('result-screen').style.display = 'none';
        document.getElementById('game-screen').style.display = 'none';
        document.getElementById('title-screen').style.display = 'flex';
        document.getElementById('welcome-msg').textContent = `${this.nickname} 님, 환영합니다!`;
        this.updateInstructions();
    },

    showRanking() {
        this.state = 'ranking';
        document.getElementById('title-screen').style.display = 'none';
        document.getElementById('ranking-screen').style.display = 'flex';
        // Reset tab to easy
        document.querySelectorAll('.ranking-tab').forEach(t => t.classList.remove('selected'));
        document.querySelector('.ranking-tab[data-level="easy"]').classList.add('selected');
        renderRanking('easy', this.nickname);
    },

    hideRanking() {
        this.showTitleScreen();
    },

    input() {
        if (this.state === 'title') this.start();
        else if (this.state === 'playing' && this.phase === 'play') this.tap();
        else if (this.state === 'result') this.toTitle();
    },

    start() {
        this.audio.init();
        this.state = 'playing';
        this.phase = 'idle';
        this.round = 0;
        this.score = this.combo = this.maxCombo = this.perfect = this.good = this.miss = 0;

        const cfg = {
            easy:   { rounds: 7,  pW: 150, gW: 300 },
            normal: { rounds: 9,  pW: 110, gW: 240 },
            hard:   { rounds: 12, pW: 75,  gW: 180 },
        }[this.level];
        this.totalRounds = cfg.rounds;
        this.perfectW = cfg.pW;
        this.goodW = cfg.gW;
        this.patterns = getPatterns(this.level);

        document.getElementById('title-screen').style.display = 'none';
        document.getElementById('result-screen').style.display = 'none';
        document.getElementById('game-screen').style.display = 'block';
        document.getElementById('falling-items').innerHTML = '';
        document.getElementById('feedback-overlay').innerHTML = '';

        // Measure fall area
        const fallArea = document.getElementById('fall-area');
        this.fallAreaHeight = fallArea.clientHeight;
        const hitZone = document.getElementById('hit-zone');
        this.hitLineY = hitZone.offsetTop;

        this.updateHUD();
        this.updateProgress();

        setTimeout(() => this.nextRound(), 600);
    },

    customerEmojis: ['🐰','🐻','🐱','🧑','🐧','🐸','🐶','🦊','🐼','🐨'],

    nextRound() {
        if (this.round >= this.totalRounds) { this.endGame(); return; }

        this.pattern = this.patterns[this.round % this.patterns.length];
        this.items = this.pattern.map(() => ITEMS[Math.floor(Math.random() * ITEMS.length)]);
        this.noteElements = [];
        this.updateProgress();

        document.getElementById('falling-items').innerHTML = '';

        // Update customer emoji
        const sprite = document.getElementById('customer-sprite');
        if (sprite) sprite.textContent = this.customerEmojis[this.round % this.customerEmojis.length];

        this.listenPhase();
    },

    // ===== LISTEN PHASE: notes fall down to hit line =====
    listenPhase() {
        this.phase = 'listen';
        this.setLabel('듣기');

        const container = document.getElementById('falling-items');
        container.innerHTML = '';

        const fallDuration = 1200; // ms for note to fall from top to hit line
        const hitY = this.hitLineY - 36; // center of note at hit line
        const startDelay = 300; // small delay before first note

        // For each beat, create a note that falls and arrives at hitY at beat time
        this.pattern.forEach((beatTime, i) => {
            const el = document.createElement('div');
            el.className = 'falling-note listen-note';
            el.textContent = this.items[i];
            el.style.left = this.getNoteX(i) + 'px';
            el.style.top = '-70px';
            el.style.opacity = '0';
            container.appendChild(el);

            // Start falling so it arrives at hitY at the right time
            const fallStart = startDelay + beatTime - fallDuration;
            const actualFallStart = Math.max(0, fallStart);
            const actualFallDuration = fallDuration - (actualFallStart - fallStart);

            const t1 = setTimeout(() => {
                el.style.opacity = '1';
                el.style.transition = `top ${actualFallDuration}ms linear`;
                el.style.top = hitY + 'px';
            }, actualFallStart);
            this.timeouts.push(t1);

            // Play beep when note reaches hit line
            const t2 = setTimeout(() => {
                this.audio.beep();
                // Flash the hit zone
                const hz = document.getElementById('hit-zone');
                hz.classList.add('active');
                setTimeout(() => hz.classList.remove('active'), 120);
                // Pulse the note
                el.style.transform = 'scale(1.2)';
                setTimeout(() => { el.style.transform = 'scale(1)'; }, 150);
            }, startDelay + beatTime);
            this.timeouts.push(t2);
        });

        // After listen, transition to play phase
        const lastBeat = this.pattern[this.pattern.length - 1];
        const t3 = setTimeout(() => this.transitionToPlay(), startDelay + lastBeat + 600);
        this.timeouts.push(t3);
    },

    getNoteX(index) {
        const containerWidth = document.getElementById('falling-items').clientWidth || 460;
        const noteSize = 72;
        const margin = 45;
        const usable = containerWidth - margin * 2;
        const count = this.pattern.length;
        if (count === 1) return containerWidth / 2 - noteSize / 2;
        return margin + (usable / (count - 1)) * index - noteSize / 2;
    },

    // ===== TRANSITION: Listen -> Play (like original game) =====
    transitionToPlay() {
        this.phase = 'ready';

        // Step 1: Listen notes shimmer and fade out
        const notes = document.querySelectorAll('.listen-note');
        notes.forEach(n => {
            n.style.transition = 'all 0.4s ease-out';
            n.style.opacity = '0.3';
            n.style.transform = 'scale(0.8)';
        });

        // Step 2: Customer nods - "네 차례!" with swoosh sound
        const t1 = setTimeout(() => {
            this.audio.play(400, 0.15, 'sine', 0.08);
            this.audio.play(600, 0.15, 'sine', 0.08, 0.08);

            // Show customer speech bubble
            const bubble = document.getElementById('customer-bubble');
            if (bubble) {
                bubble.textContent = '네 차례!';
                bubble.classList.add('show');
            }

            this.setLabel('');

            // Nod animation on customer
            const cust = document.getElementById('customer-sprite');
            if (cust) {
                cust.classList.add('nod');
                setTimeout(() => cust.classList.remove('nod'), 500);
            }
        }, 400);
        this.timeouts.push(t1);

        // Step 3: Clear notes, Lala bounces to get ready
        const t2 = setTimeout(() => {
            document.getElementById('falling-items').innerHTML = '';

            const lala = document.getElementById('lala-bottom');
            if (lala) {
                lala.classList.remove('bounce');
                void lala.offsetWidth;
                lala.classList.add('bounce');
            }

            // Ready sound - two quick ticks
            this.audio.tick();
        }, 900);
        this.timeouts.push(t2);

        // Step 4: "따라하기!" flash with energy
        const t3 = setTimeout(() => {
            const bubble = document.getElementById('customer-bubble');
            if (bubble) bubble.classList.remove('show');

            this.setLabel('따라하기!');
            this.audio.tickHi();

            // Flash the hit zone
            const hz = document.getElementById('hit-zone');
            hz.classList.add('active');
            setTimeout(() => hz.classList.remove('active'), 200);
        }, 1300);
        this.timeouts.push(t3);

        // Step 5: Start play phase
        const t4 = setTimeout(() => {
            this.setLabel('');
            this.playPhase();
        }, 1800);
        this.timeouts.push(t4);
    },

    // ===== PLAY PHASE: ghost notes fall, player taps =====
    playPhase() {
        this.phase = 'play';
        this.playStartTime = performance.now();
        this.playBeatIdx = 0;
        this.setLabel('');

        const container = document.getElementById('falling-items');
        container.innerHTML = '';
        this.noteElements = [];

        const hitY = this.hitLineY - 36;
        const fallDuration = 1200;
        const startDelay = 0; // playStartTime is already set

        // Create ghost notes that fall to hit line at pattern timing
        this.pattern.forEach((beatTime, i) => {
            const el = document.createElement('div');
            el.className = 'falling-note ghost-note';
            el.textContent = this.items[i];
            el.style.left = this.getNoteX(i) + 'px';
            el.style.top = '-70px';
            el.style.opacity = '0';
            container.appendChild(el);
            this.noteElements.push(el);

            const fallStart = beatTime - fallDuration;
            const actualFallStart = Math.max(0, fallStart);
            const actualFallDuration = fallDuration - (actualFallStart - fallStart);

            const t = setTimeout(() => {
                el.style.opacity = '';
                el.style.transition = `top ${actualFallDuration}ms linear`;
                el.style.top = hitY + 'px';
            }, actualFallStart);
            this.timeouts.push(t);
        });

        // Timeout to end play phase
        const lastBeat = this.pattern[this.pattern.length - 1];
        const endT = setTimeout(() => this.endPlayPhase(), lastBeat + 2000);
        this.timeouts.push(endT);
        this._playEndTimeout = endT;
    },

    tap() {
        if (this.phase !== 'play') return;

        const tapTime = performance.now() - this.playStartTime;
        const idx = this.playBeatIdx;
        if (idx >= this.pattern.length) return;

        const expected = this.pattern[idx];
        const diff = Math.abs(tapTime - expected);

        // Bounce Lala
        const lala = document.getElementById('lala-bottom');
        lala.classList.remove('bounce');
        void lala.offsetWidth;
        lala.classList.add('bounce');

        // Hit zone flash
        const hz = document.getElementById('hit-zone');

        let result;
        if (diff <= this.perfectW) {
            result = 'perfect';
            this.perfect++;
            this.combo++;
            this.score += 300 + Math.floor(this.combo / 5) * 50;
            this.audio.scanPerfect();
            hz.classList.add('active');
            setTimeout(() => hz.classList.remove('active'), 120);

            const mouth = document.querySelector('.lala-mouth');
            if (mouth) { mouth.classList.add('happy'); setTimeout(() => mouth.classList.remove('happy'), 300); }
        } else if (diff <= this.goodW) {
            result = 'good';
            this.good++;
            this.combo++;
            this.score += 150 + Math.floor(this.combo / 5) * 25;
            this.audio.scanGood();
            hz.classList.add('active');
            setTimeout(() => hz.classList.remove('active'), 120);
        } else {
            result = 'miss';
            this.miss++;
            this.combo = 0;
            this.audio.scanMiss();
            hz.classList.add('miss');
            setTimeout(() => hz.classList.remove('miss'), 150);
        }

        if (this.combo > this.maxCombo) this.maxCombo = this.combo;

        // Animate the note
        const el = this.noteElements[idx];
        if (el) {
            el.classList.remove('ghost-note');
            el.classList.add('hit-' + result);
        }

        this.showFeedback(result);
        this.playBeatIdx++;
        this.updateHUD();

        // All beats tapped -> end early
        if (this.playBeatIdx >= this.pattern.length) {
            clearTimeout(this._playEndTimeout);
            setTimeout(() => this.endPlayPhase(), 400);
        }
    },

    endPlayPhase() {
        // Remaining beats are misses
        while (this.playBeatIdx < this.pattern.length) {
            this.miss++;
            this.combo = 0;
            const el = this.noteElements[this.playBeatIdx];
            if (el) { el.classList.remove('ghost-note'); el.classList.add('hit-miss'); }
            this.showFeedback('miss');
            this.playBeatIdx++;
        }
        this.updateHUD();

        this.phase = 'roundEnd';
        this.audio.jingle();
        this.round++;
        this.updateProgress();

        // Customer reacts based on performance
        const roundMisses = this.miss; // approximate
        const bubble = document.getElementById('customer-bubble');
        if (bubble) {
            bubble.textContent = roundMisses === 0 ? '완벽해요!' : '좋아요!';
            bubble.classList.add('show');
            setTimeout(() => bubble.classList.remove('show'), 1000);
        }

        this.setLabel(this.round >= this.totalRounds ? '끝!' : '다음 손님!');

        const t = setTimeout(() => {
            if (this.round >= this.totalRounds) this.endGame();
            else this.nextRound();
        }, 1400);
        this.timeouts.push(t);
    },

    // ===== UI HELPERS =====
    showFeedback(type) {
        const overlay = document.getElementById('feedback-overlay');
        const fb = document.createElement('div');
        fb.className = 'feedback-text ' + type;
        fb.textContent = type === 'perfect' ? 'PERFECT!' : type === 'good' ? 'GOOD!' : 'MISS';
        fb.style.left = (180 + Math.random() * 140) + 'px';
        fb.style.top = (this.hitLineY - 60 + Math.random() * 30) + 'px';
        overlay.appendChild(fb);
        setTimeout(() => fb.remove(), 500);

        const rating = document.getElementById('rating');
        rating.textContent = fb.textContent;
        rating.style.color = type === 'perfect' ? '#d4960a' : type === 'good' ? '#2da855' : '#dd4444';
    },

    setLabel(text) {
        const el = document.getElementById('phase-label');
        if (el) {
            el.textContent = text;
            el.style.opacity = text ? '1' : '0';
        }
    },

    updateHUD() {
        document.getElementById('score').textContent = this.score.toLocaleString();
        document.getElementById('combo').textContent = this.combo;
        document.getElementById('round-display').textContent =
            `라운드 ${Math.min(this.round + 1, this.totalRounds)} / ${this.totalRounds}`;
    },

    updateProgress() {
        const pct = Math.min((this.round / this.totalRounds) * 100, 100);
        document.getElementById('progress-fill').style.width = pct + '%';
    },

    endGame() {
        this.state = 'result';
        this.phase = 'idle';
        this.timeouts.forEach(t => clearTimeout(t));
        this.timeouts = [];

        document.getElementById('game-screen').style.display = 'none';
        document.getElementById('result-screen').style.display = 'flex';

        document.getElementById('final-score').textContent = this.score.toLocaleString();
        document.getElementById('final-combo').textContent = this.maxCombo;
        document.getElementById('final-perfect').textContent = this.perfect;
        document.getElementById('final-good').textContent = this.good;
        document.getElementById('final-miss').textContent = this.miss;

        const total = this.perfect + this.good + this.miss;
        const acc = total > 0 ? (this.perfect * 100 + this.good * 50) / (total * 100) : 0;
        let grade = 'D';
        if (acc >= 0.95) grade = 'S';
        else if (acc >= 0.85) grade = 'A';
        else if (acc >= 0.70) grade = 'B';
        else if (acc >= 0.50) grade = 'C';

        const el = document.getElementById('result-grade');
        el.textContent = grade;
        el.className = 'result-grade ' + grade;

        // Save to ranking
        saveRankingEntry(this.level, this.nickname, this.score, grade);

        this.updateInstructions();
    },

    toTitle() {
        this.timeouts.forEach(t => clearTimeout(t));
        this.timeouts = [];
        this.showTitleScreen();
    }
};

game.init();
