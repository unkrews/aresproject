
const audioEngine = {
    ctx: null,

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    },

    playTone(freq, type, duration, volume = 0.1) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type; 
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        gain.gain.setValueAtTime(volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    },

    click() { this.playTone(800, 'sine', 0.1, 0.05); },
    success() {
        this.playTone(400, 'triangle', 0.3, 0.1);
        setTimeout(() => this.playTone(600, 'triangle', 0.3, 0.1), 100);
    },
    warning() { this.playTone(150, 'sawtooth', 0.5, 0.05); },
    danger() {
        this.playTone(100, 'square', 0.8, 0.1);
        setTimeout(() => this.playTone(120, 'square', 0.8, 0.1), 400);
    },
    gameOver() {
        this.playTone(50, 'sawtooth', 2, 0.2);
        setTimeout(() => this.playTone(40, 'sawtooth', 2, 0.2), 500);
    },
    ambient() {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(40, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.02, this.ctx.currentTime);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
    }
};

// --- GAME LOGIC ---
const game = {
    state: {
        oxygen: 100,
        energy: 100,
        food: 100,
        population: 12,
        isGameOver: false,
        alarmActive: false,
        ambientStarted: false
    },

    config: {
        decayRate: 1.5,
        tickSpeed: 3000
    },

    init() {
        this.updateUI();
        this.startLoops();
        this.log("Система завантажена. Вітаємо, Командоре.", "info");
        
        // Активація звуку при першому кліку (вимога браузерів)
        window.addEventListener('mousedown', () => {
            audioEngine.init();
            if (!this.state.ambientStarted) {
                audioEngine.ambient();
                this.state.ambientStarted = true;
            }
        }, { once: true });
    },

    startLoops() {
        setInterval(() => {
            if (this.state.isGameOver) return;
            this.processDecay();
        }, this.config.tickSpeed);

        setInterval(() => {
            if (this.state.isGameOver) return;
            this.triggerRandomEvent();
        }, 10000);
    },

    processDecay() {
        this.state.oxygen -= this.config.decayRate;
        this.state.energy -= this.config.decayRate * 0.5;
        this.state.food -= this.config.decayRate * 0.8;

        this.checkGameOver();
        this.updateUI();
        this.handleAlarm();
    },

    handleAlarm() {
        if ((this.state.oxygen < 25 || this.state.energy < 25) && !this.state.isGameOver) {
            if (!this.state.alarmActive) {
                audioEngine.danger();
                this.state.alarmActive = true;
                setTimeout(() => { this.state.alarmActive = false; }, 5000);
            }
        } else {
            this.state.alarmActive = false;
        }
    },

    performAction(type) {
        if (this.state.isGameOver) return;
        audioEngine.click();

        switch(type) {
            case 'oxygen':
                if (this.state.energy >= 15) {
                    this.state.oxygen = Math.min(100, this.state.oxygen + 20);
                    this.state.energy -= 15;
                    this.log("Генератор O₂ запущено.", "info");
                    audioEngine.success();
                } else {
                    this.log("Недостатньо енергії для кисню!", "warning");
                    audioEngine.warning();
                }
                break;
            case 'energy':
                this.state.energy = Math.min(100, this.state.energy + 25);
                this.log("Сонячні панелі накопичили заряд.", "info");
                audioEngine.success();
                break;
            case 'food':
                if (this.state.energy >= 15) {
                    this.state.food = Math.min(100, this.state.food + 20);
                    this.state.energy -= 15;
                    this.log("Збір врожаю завершено.", "info");
                    audioEngine.success();
                } else {
                    this.log("Недостатньо енергії для гідропоніки!", "warning");
                    audioEngine.warning();
                }
                break;
        }
        this.updateUI();
    },

    triggerRandomEvent() {
        const events = [
            { msg: "Починається піщана буря! Енергія падає.", effect: () => { this.state.energy -= 20; }, type: "warning" },
            { msg: "Виявлено метеоритний дощ. Пошкодження систем.", effect: () => { this.state.oxygen -= 15; }, type: "danger" },
            { msg: "Космічна радіація підвищена.", effect: () => { this.state.food -= 10; }, type: "warning" },
            { msg: "Знайдено запасний ресурс у модулі.", effect: () => { this.state.energy += 10; this.state.food += 10; }, type: "info" }
        ];

        const randomIdx = Math.floor(Math.random() * events.length);
        const event = events[randomIdx];

        event.effect();
        this.log(event.msg, event.type);
        
        if (event.type === "warning") audioEngine.warning();
        if (event.type === "danger") audioEngine.danger();
        if (event.type === "info") audioEngine.success();

        this.updateUI();
    },

    updateUI() {
        document.getElementById('val-oxygen').innerText = `${Math.floor(this.state.oxygen)}%`;
        document.getElementById('val-energy').innerText = `${Math.floor(this.state.energy)}%`;
        document.getElementById('val-food').innerText = `${Math.floor(this.state.food)}%`;
        document.getElementById('val-pop').innerText = this.state.population;

        document.getElementById('bar-oxygen').style.width = `${this.state.oxygen}%`;
        document.getElementById('bar-energy').style.width = `${this.state.energy}%`;
        document.getElementById('bar-food').style.width = `${this.state.food}%`;

        this.applyColorLogic('bar-oxygen', this.state.oxygen);
        this.applyColorLogic('bar-energy', this.state.energy);
        this.applyColorLogic('bar-food', this.state.food);

        const statusEl = document.getElementById('system-status');
        if (this.state.oxygen < 25 || this.state.energy < 25) {
            statusEl.innerText = "КРИТИЧНО";
            statusEl.className = "status-error";
        } else {
            statusEl.innerText = "АКТИВНО";
            statusEl.className = "status-ok";
        }
    },

    applyColorLogic(id, value) {
        const el = document.getElementById(id);
        if (value < 25) el.style.backgroundColor = 'var(--danger)';
        else if (value < 50) el.style.backgroundColor = 'var(--accent-orange)';
        else el.style.backgroundColor = 'var(--accent-blue)';
    },

    log(message, type) {
        const logContainer = document.getElementById('logs');
        const entry = document.createElement('div');
        entry.className = `log-entry log-${type}`;
        entry.innerText = `[${new Date().toLocaleTimeString()}] ${message}`;
        logContainer.prepend(entry);
    },

    checkGameOver() {
        let reason = "";
        if (this.state.oxygen <= 0) reason = "Закінчився кисень.";
        if (this.state.energy <= 0) reason = "Повна деградація енергомережі.";
        if (this.state.food <= 0) reason = "Голод у колонії.";

        if (reason) {
            this.state.isGameOver = true;
            audioEngine.gameOver();
            document.getElementById('death-reason').innerText = reason;
            document.getElementById('game-over-overlay').style.display = 'flex';
        }
    }
};

game.init();