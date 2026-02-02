// ===================================
// GuideMe - Application Logic
// ===================================

class GuideMeChat {
    constructor() {
        this.messages = [];
        this.isRecording = false;
        this.isCameraActive = false;
        this.cameraStream = null;
        this.settings = this.loadSettings();
        this.synth = window.speechSynthesis;
        this.recognition = null;
        this.isLiveMode = false;
        this.liveInterval = null;

        this.init();
    }

    init() {
        this.setupElements();
        this.setupEventListeners();
        this.setupVoiceRecognition();
        this.applySettings();
        this.announce('مرحباً بك في GuideMe.');

        // ربط الكائن بالنافذة ليسهل استدعاء الوظائف من HTML
        window.guideMe = this;
    }

    setupElements() {
        this.messageInput = document.getElementById('message-input');
        this.sendBtn = document.getElementById('send-btn');
        this.micBtn = document.getElementById('mic-btn');
        this.cameraBtn = document.getElementById('camera-btn');
        this.messagesArea = document.getElementById('messages-area');
        this.welcomeScreen = document.getElementById('welcome-screen');
        this.cameraPreview = document.getElementById('camera-preview');
        this.cameraVideo = document.getElementById('camera-video');
        this.cameraCanvas = document.getElementById('camera-canvas');
        this.captureBtn = document.getElementById('capture-btn');
        this.liveBroadcastBtn = document.getElementById('live-broadcast-btn');
        this.recordingIndicator = document.getElementById('recording-indicator');
        this.recordingDuration = document.getElementById('recording-duration');
        this.settingsModal = document.getElementById('settings-modal');
        this.settingsForm = document.getElementById('settings-form');
    }

    setupEventListeners() {
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        this.micBtn.addEventListener('click', () => this.toggleRecording());
        this.cameraBtn.addEventListener('click', () => this.toggleCamera());

        document.getElementById('close-camera-btn').addEventListener('click', () => this.closeCamera());
        this.captureBtn.addEventListener('click', () => this.captureImage());

        this.liveBroadcastBtn.addEventListener('click', () => {
            if (this.isLiveMode) this.stopLiveBroadcast();
            else this.startLiveBroadcast();
        });

        document.getElementById('settings-btn').addEventListener('click', () => {
            this.settingsModal.hidden = false;
        });

        document.getElementById('close-settings-btn').addEventListener('click', () => {
            this.settingsModal.hidden = true;
        });

        this.settingsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSettings();
        });
    }

    setupVoiceRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.lang = 'ar-SA';
            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript.toLowerCase();
                this.messageInput.value = transcript;

                // فحص الأوامر الذكية
                if (transcript.includes('وش تشوف') || transcript.includes('صور')) {
                    this.speak('أبشر، قاعد أشوف لك الآن');
                    if (!this.isCameraActive) {
                        this.openCamera().then(() => setTimeout(() => this.captureImage(), 1000));
                    } else {
                        this.captureImage();
                    }
                } else {
                    this.sendMessage();
                }
            };
            this.recognition.onend = () => this.stopRecording();
        }
    }

    async sendMessage() {
        const text = this.messageInput.value.trim();
        if (!text) return;

        if (this.welcomeScreen) this.welcomeScreen.style.display = 'none';
        this.addMessage('user', text);
        this.messageInput.value = '';

        // وضع التسوق التجريبي
        if (text.includes('ايفون') || text.includes('أيفون') || text.includes('تسوق')) {
            this.handleShoppingMode(text);
        } else {
            this.generateResponse(text);
        }
    }

    handleShoppingMode(query) {
        const thinkingId = Date.now();
        this.addMessage('assistant', 'أبشر، قاعد أبحث لك في أمازون ونون وأقارن الأسعار... لحظة بس', null, thinkingId);

        setTimeout(() => {
            this.removeMessage(thinkingId);
            this.addMessage('assistant', 'لقيت لك هالعروض الممتازة للايفون 17 برو ماكس:');

            const products = [
                { name: 'iPhone 17 Pro Max - Amazon', price: '5,499 ريال', specs: '512GB, Titanium', img: 'https://m.media-amazon.com/images/I/61mNn9-mGAL._AC_SL1500_.jpg' },
                { name: 'iPhone 17 Pro Max - Noon', price: '5,350 ريال', specs: '256GB, Silver', img: 'https://m.media-amazon.com/images/I/61N9fD5N9fL._AC_SL1500_.jpg' }
            ];

            products.forEach(p => this.renderProductCard(p));
            this.speak('لقيت لك عرضين للايفون. في أمازون بـ 5499 وفي نون بـ 5350. وش تختار؟');
        }, 2000);
    }

    renderProductCard(p) {
        const div = document.createElement('div');
        div.className = 'product-card';
        div.innerHTML = `
            <img src="${p.img}" class="product-image">
            <div class="product-info">
                <h3>${p.name}</h3>
                <p>${p.specs}</p>
                <div class="product-price">${p.price}</div>
                <button class="buy-btn" onclick="guideMe.handlePurchase('${p.name}', '${p.price}')">اختيار وشراء</button>
            </div>
        `;
        this.messagesArea.appendChild(div);
        this.scrollToBottom();
    }

    handlePurchase(name, price) {
        this.speak(`تم اختيار ${name}. جاري تأكيد الدفع.`);
        this.addMessage('assistant', `جاري معالجة الدفع لـ ${name}...`);
        setTimeout(() => {
            const success = document.createElement('div');
            success.className = 'payment-success';
            success.innerHTML = `✅ تم الشراء بنجاح! بيوصلك بكرة بإذن الله.`;
            this.messagesArea.appendChild(success);
            this.scrollToBottom();
            this.speak('ألف مبروك! تمت عملية الشراء بنجاح.');
        }, 2000);
    }

    async generateResponse(text) {
        const thinkingId = Date.now();
        this.addMessage('assistant', 'جاري التفكير...', null, thinkingId);
        try {
            const response = await fetch(`${this.settings.aiUrl}/v1/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: [{ role: 'user', content: text }] })
            });
            const data = await response.json();
            this.removeMessage(thinkingId);

            if (data.choices && data.choices[0] && data.choices[0].message) {
                this.addMessage('assistant', data.choices[0].message.content);
            } else {
                this.addMessage('assistant', 'معليش، فيه مشكلة في الرد من السيرفر، جرب مرة ثانية.');
            }
        } catch (e) {
            console.error(e);
            this.removeMessage(thinkingId);
            this.addMessage('assistant', 'عذراً، السيرفر ما يرد.');
        }
    }

    addMessage(role, content, imageUrl = null, id = null) {
        const msg = { role, content, imageUrl, id: id || Date.now(), timestamp: new Date() };
        this.messages.push(msg);
        this.renderMessage(msg);
        if (role === 'assistant' && content !== 'جاري التفكير...') this.speak(content);
    }

    renderMessage(msg) {
        const div = document.createElement('div');
        div.className = `message ${msg.role}`;
        div.innerHTML = `<div class="message-content"><div class="message-text">${msg.content}</div></div>`;
        if (msg.imageUrl) {
            const img = document.createElement('img');
            img.src = msg.imageUrl;
            img.className = 'message-image';
            div.querySelector('.message-content').appendChild(img);
        }
        this.messagesArea.appendChild(div);
        this.scrollToBottom();
    }

    removeMessage(id) {
        this.messages = this.messages.filter(m => m.id !== id);
        this.messagesArea.innerHTML = '';
        this.messages.forEach(m => this.renderMessage(m));
    }

    async toggleCamera() {
        if (this.isCameraActive) this.closeCamera();
        else await this.openCamera();
    }

    async openCamera() {
        try {
            this.cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
            this.cameraVideo.srcObject = this.cameraStream;
            this.cameraPreview.hidden = false;
            this.isCameraActive = true;
        } catch (e) { this.announce('خطأ في الكاميرا'); }
    }

    closeCamera() {
        if (this.cameraStream) this.cameraStream.getTracks().forEach(t => t.stop());
        this.cameraPreview.hidden = true;
        this.isCameraActive = false;
    }

    captureImage() {
        const ctx = this.cameraCanvas.getContext('2d');
        this.cameraCanvas.width = this.cameraVideo.videoWidth;
        this.cameraCanvas.height = this.cameraVideo.videoHeight;
        ctx.drawImage(this.cameraVideo, 0, 0);
        const url = this.cameraCanvas.toDataURL('image/jpeg');
        this.addMessage('user', 'صورة ملتقطة', url);
        this.closeCamera();
        this.analyzeVision(url);
    }

    async analyzeVision(url) {
        const tid = Date.now();
        this.addMessage('assistant', 'أحلل الصورة...', null, tid);
        try {
            const res = await fetch(`${this.settings.aiUrl}/v1/vision/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: url.split(',')[1] })
            });
            const data = await res.json();
            this.removeMessage(tid);
            this.addMessage('assistant', data.content);
        } catch (e) { this.removeMessage(tid); this.addMessage('assistant', 'خطأ في التحليل'); }
    }

    toggleRecording() {
        if (this.isRecording) {
            this.recognition.stop();
            this.isRecording = false;
        } else {
            this.recognition.start();
            this.isRecording = true;
            this.announce('أسمعك...');
        }
    }

    speak(text) {
        if (!text) return;
        const ut = new SpeechSynthesisUtterance(text);
        ut.lang = 'ar-SA';
        ut.rate = this.settings.voiceSpeed || 1;
        this.synth.speak(ut);
    }

    loadSettings() {
        const s = localStorage.getItem('guideme-settings');
        return s ? JSON.parse(s) : { voiceSpeed: 1, voiceVolume: 80, aiUrl: 'http://localhost:8888' };
    }

    saveSettings() {
        this.settings.aiUrl = document.getElementById('ai-url').value;
        localStorage.setItem('guideme-settings', JSON.stringify(this.settings));
        this.settingsModal.hidden = true;
    }

    scrollToBottom() { this.messagesArea.scrollTop = this.messagesArea.scrollHeight; }
    announce(m) { console.log("Announce:", m); }
}

window.onload = () => new GuideMeChat();
