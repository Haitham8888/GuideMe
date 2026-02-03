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
        this.footerLiveBtn = document.getElementById('footer-live-btn');
        this.recordingIndicator = document.getElementById('recording-indicator');
        this.recordingDuration = document.getElementById('recording-duration');
        this.settingsModal = document.getElementById('settings-modal');
        this.settingsForm = document.getElementById('settings-form');
        this.auditBtn = document.getElementById('audit-btn');
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

        this.liveBroadcastBtn.addEventListener('click', () => this.toggleLive());
        if (this.footerLiveBtn) {
            this.footerLiveBtn.addEventListener('click', () => this.toggleLive());
        }

        if (this.auditBtn) {
            this.auditBtn.addEventListener('click', () => this.handleWebsiteAudit());
        }

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
        this.addMessage('assistant', 'أبشر، قاعد أبحث لك في المتاجر الموثوقة وأقارن الأسعار... لحظة بس', null, thinkingId);

        setTimeout(() => {
            this.removeMessage(thinkingId);
            this.addMessage('assistant', 'لقيت لك أفضل العروض المتوفرة حالياً بناءً على طلبك:');

            const products = [
                {
                    name: 'iPhone 16 Pro Max - 256GB',
                    price: '5,199 ريال',
                    specs: 'تيتانيوم طبيعي، شاشة 6.9 بوصة',
                    img: 'https://m.media-amazon.com/images/I/61mNn9-mGAL._AC_SL1500_.jpg',
                    store: 'Amazon'
                },
                {
                    name: 'iPhone 16 Pro Max - 256GB',
                    price: '4,999 ريال',
                    specs: 'تيتانيوم صحراوي، شحن سريع',
                    img: 'https://m.media-amazon.com/images/I/61N9fD5N9fL._AC_SL1500_.jpg',
                    store: 'Noon'
                }
            ];

            products.forEach(p => this.renderProductCard(p));
            this.speak('لقيت لك أفضل الأسعار. في نون بـ 4999 ريال، وهو الأرخص حالياً. وفي أمازون بـ 5199 ريال. وش تختار؟');
        }, 1500);
    }

    async handleWebsiteAudit() {
        const url = prompt('من فضلك أدخل رابط الموقع الذي تريد فحصه:');
        if (!url) return;

        if (this.welcomeScreen) this.welcomeScreen.style.display = 'none';
        this.addMessage('user', `افحص لي توافق هذا الموقع للوصول الشامل: ${url}`);

        const thinkingId = Date.now();
        this.addMessage('assistant', `جاري تحليل هيكلية الموقع ${url} وفحص معايير الـ WCAG... لحظة فضلك`, null, thinkingId);

        // MVP Simulation without backend
        setTimeout(() => {
            this.removeMessage(thinkingId);
            const mockReport = `
### 📊 تقرير فحص سهولة الوصول لـ ${url}

**النتيجة الإجمالية: 65/100 (تحتاج تحسين)**

1. **الصور:** وجدنا 12 صورة تفتقد للنص البديل (Alt Text). قارئ الشاشة لن يستطيع وصفها للكفيف.
2. **العناوين:** هرمية العناوين (H1, H2) غير منطقية، مما يصعب التنقل السريع.
3. **التباين:** الألوان في أزرار "شراء" ضعيفة التباين، قد تصعب رؤيتها لضعاف البصر.
4. **الأزرار:** توجد أزرار "أيقونات" لا تملك وسوم ARIA توضح وظيفتها.

**التوصية:** نوصي بإضافة نصوص بديلة للصور وتحسين تباين الألوان فوراً.
            `;
            this.addMessage('assistant', mockReport);
            this.speak(`انتهيت من فحص الموقع. النتيجة الإجمالية هي خمسة وستين من مئة. الموقع يحتاج بعض التحسينات خاصة في وصف الصور وتباين الألوان. يمكنك قراءة التقرير التفصيلي الآن.`);
        }, 2500);
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

        // Add ARIA label for the message role
        const roleLabel = msg.role === 'assistant' ? 'رد المساعد:' : 'رسالتك:';
        div.setAttribute('aria-label', roleLabel);

        div.innerHTML = `<div class="message-content">
            <span class="sr-only">${roleLabel}</span>
            <div class="message-text">${msg.content}</div>
        </div>`;

        if (msg.imageUrl) {
            const img = document.createElement('img');
            img.src = msg.imageUrl;
            img.className = 'message-image';
            img.alt = 'صورة ملتقطة من الكاميرا';
            div.querySelector('.message-content').appendChild(img);
        }

        this.messagesArea.appendChild(div);
        this.scrollToBottom();

        // Announce new message to screen readers
        if (msg.role === 'assistant' && msg.content !== 'جاري التفكير...') {
            this.announce(`وصل رد جديد من المساعد: ${msg.content}`);
        }
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
            this.announce('تم فتح الكاميرا. يمكنك الآن التقاط صورة أو بدء بث مباشر.');
            this.cameraPreview.focus();
        } catch (e) {
            this.announce('خطأ في الوصول إلى الكاميرا. تأكد من إعطاء الصلاحيات.');
            console.error(e);
        }
    }

    closeCamera() {
        if (this.cameraStream) this.cameraStream.getTracks().forEach(t => t.stop());
        this.cameraPreview.hidden = true;
        this.isCameraActive = false;
        this.announce('تم إغلاق الكاميرا.');
        this.cameraBtn.focus();
    }

    captureImage() {
        const ctx = this.cameraCanvas.getContext('2d');
        this.cameraCanvas.width = this.cameraVideo.videoWidth;
        this.cameraCanvas.height = this.cameraVideo.videoHeight;
        ctx.drawImage(this.cameraVideo, 0, 0);
        const url = this.cameraCanvas.toDataURL('image/jpeg');
        this.addMessage('user', 'تم التقاط صورة لتحليلها.');
        this.closeCamera();
        this.analyzeVision(url);
    }

    async analyzeVision(url) {
        const tid = Date.now();
        this.addMessage('assistant', 'جاري تحليل الصورة، لحظة واحدة...', null, tid);
        try {
            const res = await fetch(`${this.settings.aiUrl}/v1/vision/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: url.split(',')[1] })
            });
            const data = await res.json();
            this.removeMessage(tid);
            this.addMessage('assistant', data.content);
        } catch (e) {
            this.removeMessage(tid);
            this.addMessage('assistant', 'عذراً، حدث خطأ أثناء تحليل الصورة. تأكد من اتصال السيرفر.');
        }
    }

    toggleLive() {
        if (this.isLiveMode) this.stopLiveBroadcast();
        else this.startLiveBroadcast();
    }

    async startLiveBroadcast() {
        if (!this.isCameraActive) await this.openCamera();

        this.isLiveMode = true;
        this.liveBroadcastBtn.classList.add('active');
        if (this.footerLiveBtn) {
            this.footerLiveBtn.classList.add('active');
            this.footerLiveBtn.setAttribute('aria-pressed', 'true');
        }
        this.announce('بدأ البث المباشر. سأقوم بوصف ما أراه بشكل مستمر.');
        this.speak('بدأ البث المباشر. سأقوم بوصف ما أراه كل 5 ثوانٍ.');

        this.liveInterval = setInterval(() => {
            if (this.isLiveMode) this.captureLiveFrame();
        }, 5000);
    }

    stopLiveBroadcast() {
        this.isLiveMode = false;
        this.liveBroadcastBtn.classList.remove('active');
        if (this.footerLiveBtn) {
            this.footerLiveBtn.classList.remove('active');
            this.footerLiveBtn.setAttribute('aria-pressed', 'false');
        }
        clearInterval(this.liveInterval);
        this.announce('تم إيقاف البث المباشر.');
        this.speak('تم إيقاف البث المباشر.');
    }

    captureLiveFrame() {
        if (!this.isCameraActive) return;
        const ctx = this.cameraCanvas.getContext('2d');
        this.cameraCanvas.width = this.cameraVideo.videoWidth;
        this.cameraCanvas.height = this.cameraVideo.videoHeight;
        ctx.drawImage(this.cameraVideo, 0, 0);
        const url = this.cameraCanvas.toDataURL('image/jpeg');
        this.analyzeVisionForLive(url);
    }

    async analyzeVisionForLive(url) {
        try {
            const res = await fetch(`${this.settings.aiUrl}/v1/vision/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: url.split(',')[1] })
            });
            const data = await res.json();
            if (data.content) {
                this.addMessage('assistant', data.content);
            }
        } catch (e) {
            console.error('Live Vision Error:', e);
        }
    }


    toggleRecording() {
        if (this.isRecording) {
            this.recognition.stop();
            this.isRecording = false;
            this.micBtn.setAttribute('aria-pressed', 'false');
        } else {
            try {
                this.recognition.start();
                this.isRecording = true;
                this.micBtn.setAttribute('aria-pressed', 'true');
                this.announce('الميكروفون يعمل، أنا أسمعك الآن...');
            } catch (e) {
                this.announce('فشل تشغيل الميكروفون، يرجى المحاولة مرة أخرى.');
            }
        }
    }

    speak(text) {
        if (!text || !this.synth) return;

        // Cancel current speaking
        this.synth.cancel();

        const ut = new SpeechSynthesisUtterance(text);
        ut.lang = 'ar-SA';
        ut.rate = this.settings.voiceSpeed || 1;
        ut.volume = (this.settings.voiceVolume || 80) / 100;
        this.synth.speak(ut);
    }

    loadSettings() {
        const s = localStorage.getItem('guideme-settings');
        const defaultSettings = {
            voiceSpeed: 1,
            voiceVolume: 80,
            aiUrl: window.location.origin.includes('github.io') ? 'https://your-ngrok-url.ngrok-free.app' : 'http://localhost:8888',
            fontSize: 'medium',
            darkMode: false
        };
        return s ? JSON.parse(s) : defaultSettings;
    }

    saveSettings() {
        this.settings.aiUrl = document.getElementById('ai-url').value;
        this.settings.voiceSpeed = parseFloat(document.getElementById('voice-speed').value);
        this.settings.voiceVolume = parseInt(document.getElementById('voice-volume').value);
        this.settings.fontSize = document.getElementById('font-size').value;
        this.settings.darkMode = document.getElementById('dark-mode').checked;

        localStorage.setItem('guideme-settings', JSON.stringify(this.settings));
        this.applySettings();
        this.settingsModal.hidden = true;
        this.announce('تم حفظ الإعدادات بنجاح.');
        document.getElementById('settings-btn').focus();
    }

    applySettings() {
        // Apply font size
        document.body.className = `font-${this.settings.fontSize}`;
        if (this.settings.darkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }

        // Update UI elements in settings modal
        document.getElementById('ai-url').value = this.settings.aiUrl;
        document.getElementById('voice-speed').value = this.settings.voiceSpeed;
        document.getElementById('voice-speed-output').textContent = this.settings.voiceSpeed + 'x';
        document.getElementById('voice-volume').value = this.settings.voiceVolume;
        document.getElementById('voice-volume-output').textContent = this.settings.voiceVolume + '%';
        document.getElementById('dark-mode').checked = this.settings.darkMode;
        document.getElementById('font-size').value = this.settings.fontSize;
    }

    scrollToBottom() {
        this.messagesArea.scrollTop = this.messagesArea.scrollHeight;
    }

    announce(message) {
        const announcementDiv = document.getElementById('announcements');
        if (announcementDiv) {
            announcementDiv.textContent = message;
            // Clear after a while to allow same message to be announced again
            setTimeout(() => {
                if (announcementDiv.textContent === message) {
                    announcementDiv.textContent = '';
                }
            }, 3000);
        }
        console.log("Accessibility Announcement:", message);
    }
}

window.onload = () => new GuideMeChat();
