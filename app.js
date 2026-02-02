// ===================================
// GuideMe - Chat Interface Application
// ===================================

class GuideMeChat {
    constructor() {
        this.messages = [];
        this.isRecording = false;
        this.isCameraActive = false;
        this.mediaRecorder = null;
        this.cameraStream = null;
        this.recordingStartTime = null;
        this.recordingInterval = null;
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
        this.announce('مرحباً بك في GuideMe. يمكنك الكتابة أو استخدام المايك أو الكاميرا');
    }

    setupElements() {
        // Input elements
        this.messageInput = document.getElementById('message-input');
        this.sendBtn = document.getElementById('send-btn');
        this.micBtn = document.getElementById('mic-btn');
        this.cameraBtn = document.getElementById('camera-btn');

        // Chat elements
        this.messagesArea = document.getElementById('messages-area');
        this.welcomeScreen = document.getElementById('welcome-screen');

        // Camera elements
        this.cameraPreview = document.getElementById('camera-preview');
        this.cameraVideo = document.getElementById('camera-video');
        this.cameraCanvas = document.getElementById('camera-canvas');
        this.captureBtn = document.getElementById('capture-btn');
        this.toggleCameraBtn = document.getElementById('toggle-camera-btn');
        this.closeCameraBtn = document.getElementById('close-camera-btn');
        this.liveBroadcastBtn = document.getElementById('live-broadcast-btn');

        // Recording indicator
        this.recordingIndicator = document.getElementById('recording-indicator');
        this.recordingDuration = document.getElementById('recording-duration');

        // Settings
        this.settingsBtn = document.getElementById('settings-btn');
        this.settingsModal = document.getElementById('settings-modal');
        this.closeSettingsBtn = document.getElementById('close-settings-btn');
        this.cancelSettingsBtn = document.getElementById('cancel-settings-btn');
        this.settingsForm = document.getElementById('settings-form');
        this.modalOverlay = document.getElementById('modal-overlay');

        // New chat button
        this.newChatBtn = document.getElementById('new-chat-btn');
    }

    setupEventListeners() {
        // Send message
        this.sendBtn.addEventListener('click', () => {
            this.speak('إرسال');
            this.sendMessage();
        });
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Enable/disable send button based on input
        this.messageInput.addEventListener('input', () => {
            this.sendBtn.disabled = !this.messageInput.value.trim();
            this.autoResizeTextarea();
        });

        // Microphone
        this.micBtn.addEventListener('click', () => {
            if (!this.isRecording) this.speak('اسمعني');
            this.toggleRecording();
        });

        // Camera
        this.cameraBtn.addEventListener('click', () => {
            if (!this.isCameraActive) this.speak('شوف بدالي');
            this.toggleCamera();
        });
        this.closeCameraBtn.addEventListener('click', () => {
            this.speak('إغلاق الكاميرا');
            this.closeCamera();
        });
        this.captureBtn.addEventListener('click', () => {
            this.speak('صور بدالي');
            this.captureImage();
        });
        this.toggleCameraBtn.addEventListener('click', () => {
            this.speak('تبديل الكاميرا');
            this.switchCamera();
        });
        this.liveBroadcastBtn.addEventListener('click', () => {
            if (this.isLiveMode) {
                this.speak('إيقاف البث');
                this.stopLiveBroadcast();
            } else {
                this.speak('بدأ البث المباشر');
                this.startLiveBroadcast();
            }
        });

        // Settings
        this.settingsBtn.addEventListener('click', () => {
            this.speak('الإعدادات');
            this.openSettings();
        });
        this.closeSettingsBtn.addEventListener('click', () => {
            this.speak('إغلاق الإعدادات');
            this.closeSettings();
        });
        this.cancelSettingsBtn.addEventListener('click', () => {
            this.speak('إلغاء');
            this.closeSettings();
        });
        this.modalOverlay.addEventListener('click', () => {
            this.speak('إغلاق الإعدادات');
            this.closeSettings();
        });
        this.settingsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSettings();
        });

        // Settings controls
        this.setupSettingsControls();

        // New chat
        this.newChatBtn.addEventListener('click', () => {
            this.speak('محادثة جديدة');
            this.startNewChat();
        });

        // Escape key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (!this.settingsModal.hidden) {
                    this.closeSettings();
                }
                if (this.isCameraActive) {
                    this.closeCamera();
                }
            }
        });
    }

    setupSettingsControls() {
        // Voice speed
        const voiceSpeed = document.getElementById('voice-speed');
        const voiceSpeedOutput = document.getElementById('voice-speed-output');
        voiceSpeed.addEventListener('input', (e) => {
            voiceSpeedOutput.textContent = `${e.target.value}x`;
        });

        // Voice volume
        const voiceVolume = document.getElementById('voice-volume');
        const voiceVolumeOutput = document.getElementById('voice-volume-output');
        voiceVolume.addEventListener('input', (e) => {
            voiceVolumeOutput.textContent = `${e.target.value}%`;
        });
    }

    setupVoiceRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();

            this.recognition.lang = 'ar-SA';
            this.recognition.continuous = false;
            this.recognition.interimResults = false;

            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                this.messageInput.value = transcript;
                this.sendBtn.disabled = false;
                this.announce(`تم التعرف على: ${transcript}`);
            };

            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.announce('عذراً، لم أتمكن من فهم الصوت. حاول مرة أخرى');
                this.stopRecording();
            };

            this.recognition.onend = () => {
                this.stopRecording();
            };
        }
    }

    // ===================================
    // Message Handling
    // ===================================

    sendMessage() {
        const text = this.messageInput.value.trim();
        if (!text) return;

        // Hide welcome screen
        if (this.welcomeScreen) {
            this.welcomeScreen.style.display = 'none';
        }

        // Add user message
        this.addMessage('user', text);

        // Clear input
        this.messageInput.value = '';
        this.sendBtn.disabled = true;
        this.autoResizeTextarea();

        // Simulate assistant response
        this.generateResponse(text);
    }

    addMessage(role, content, imageUrl = null, id = null) {
        const message = {
            role,
            content,
            imageUrl,
            id: id || Date.now(),
            timestamp: new Date()
        };

        this.messages.push(message);
        this.renderMessage(message);
        this.scrollToBottom();

        // Announce for screen readers
        if (role === 'assistant' && content !== 'جاري التفكير...') {
            this.speak(content);
        }
    }

    removeMessage(id) {
        const index = this.messages.findIndex(m => m.id === id);
        if (index !== -1) {
            this.messages.splice(index, 1);
            // Refresh messages area
            this.messagesArea.innerHTML = '';
            this.messages.forEach(m => this.renderMessage(m));
        }
    }

    renderMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.role}`;
        messageDiv.setAttribute('role', 'article');
        messageDiv.setAttribute('aria-label', `رسالة من ${message.role === 'user' ? 'المستخدم' : 'المساعد'}`);

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.setAttribute('aria-hidden', 'true');

        // Create SVG icon for avatar
        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('width', '20');
        svg.setAttribute('height', '20');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');

        if (message.role === 'user') {
            // User icon
            const circle = document.createElementNS(svgNS, 'circle');
            circle.setAttribute('cx', '12');
            circle.setAttribute('cy', '8');
            circle.setAttribute('r', '4');
            circle.setAttribute('stroke', 'currentColor');
            circle.setAttribute('stroke-width', '2');

            const path = document.createElementNS(svgNS, 'path');
            path.setAttribute('d', 'M4 20C4 16.6863 6.68629 14 10 14H14C17.3137 14 20 16.6863 20 20');
            path.setAttribute('stroke', 'currentColor');
            path.setAttribute('stroke-width', '2');
            path.setAttribute('stroke-linecap', 'round');

            svg.appendChild(circle);
            svg.appendChild(path);
        } else {
            // Assistant icon (robot)
            const rect1 = document.createElementNS(svgNS, 'rect');
            rect1.setAttribute('x', '6');
            rect1.setAttribute('y', '8');
            rect1.setAttribute('width', '12');
            rect1.setAttribute('height', '12');
            rect1.setAttribute('rx', '2');
            rect1.setAttribute('stroke', 'currentColor');
            rect1.setAttribute('stroke-width', '2');

            const circle1 = document.createElementNS(svgNS, 'circle');
            circle1.setAttribute('cx', '10');
            circle1.setAttribute('cy', '13');
            circle1.setAttribute('r', '1');
            circle1.setAttribute('fill', 'currentColor');

            const circle2 = document.createElementNS(svgNS, 'circle');
            circle2.setAttribute('cx', '14');
            circle2.setAttribute('cy', '13');
            circle2.setAttribute('r', '1');
            circle2.setAttribute('fill', 'currentColor');

            const path = document.createElementNS(svgNS, 'path');
            path.setAttribute('d', 'M12 8V5M12 5L10 7M12 5L14 7');
            path.setAttribute('stroke', 'currentColor');
            path.setAttribute('stroke-width', '2');
            path.setAttribute('stroke-linecap', 'round');
            path.setAttribute('stroke-linejoin', 'round');

            svg.appendChild(rect1);
            svg.appendChild(circle1);
            svg.appendChild(circle2);
            svg.appendChild(path);
        }

        avatar.appendChild(svg);

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';

        const textDiv = document.createElement('div');
        textDiv.className = 'message-text';
        textDiv.textContent = message.content;

        contentDiv.appendChild(textDiv);

        if (message.imageUrl) {
            const img = document.createElement('img');
            img.src = message.imageUrl;
            img.className = 'message-image';
            img.alt = 'صورة مرفقة مع الرسالة';
            contentDiv.appendChild(img);
        }

        const timeDiv = document.createElement('div');
        timeDiv.className = 'message-time';
        timeDiv.textContent = this.formatTime(message.timestamp);
        contentDiv.appendChild(timeDiv);

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(contentDiv);

        this.messagesArea.appendChild(messageDiv);
    }

    async generateResponse(userMessage) {
        try {
            // Add a thinking message
            const thinkingId = Date.now();
            this.addMessage('assistant', 'جاري التفكير...', null, thinkingId);

            const response = await fetch(`${this.settings.aiUrl}/v1/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: this.messages.slice(-5).map(m => ({
                        role: m.role,
                        content: m.content
                    }))
                })
            });

            if (!response.ok) throw new Error('سيرفر الدردشة لا يستجيب');

            const data = await response.json();
            const reply = data.choices[0].message.content;

            // Remove thinking message and add real reply
            this.removeMessage(thinkingId);
            this.addMessage('assistant', reply);

        } catch (error) {
            console.error('Chat Error:', error);
            this.announce('حدث خطأ في الاتصال بالسيرفر');
        }
    }

    // ===================================
    // Voice Recording
    // ===================================

    async toggleRecording() {
        if (this.isRecording) {
            this.stopRecording();
        } else {
            await this.startRecording();
        }
    }

    async startRecording() {
        if (!this.recognition) {
            this.announce('عذراً، متصفحك لا يدعم التعرف على الصوت');
            return;
        }

        try {
            this.isRecording = true;
            this.micBtn.setAttribute('aria-pressed', 'true');
            this.recordingIndicator.hidden = false;

            this.recordingStartTime = Date.now();
            this.updateRecordingDuration();
            this.recordingInterval = setInterval(() => {
                this.updateRecordingDuration();
            }, 1000);

            this.recognition.start();
            this.announce('بدأ التسجيل');
        } catch (error) {
            console.error('Error starting recording:', error);
            this.announce('حدث خطأ أثناء بدء التسجيل');
            this.stopRecording();
        }
    }

    stopRecording() {
        if (!this.isRecording) return;

        this.isRecording = false;
        this.micBtn.setAttribute('aria-pressed', 'false');
        this.recordingIndicator.hidden = true;

        if (this.recordingInterval) {
            clearInterval(this.recordingInterval);
            this.recordingInterval = null;
        }

        if (this.recognition) {
            try {
                this.recognition.stop();
            } catch (error) {
                console.error('Error stopping recognition:', error);
            }
        }
    }

    updateRecordingDuration() {
        if (!this.recordingStartTime) return;

        const elapsed = Math.floor((Date.now() - this.recordingStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        this.recordingDuration.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    // ===================================
    // Camera Functions
    // ===================================

    async toggleCamera() {
        if (this.isCameraActive) {
            this.closeCamera();
        } else {
            await this.openCamera();
        }
    }

    async openCamera() {
        try {
            this.cameraStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user' },
                audio: false
            });

            this.cameraVideo.srcObject = this.cameraStream;
            this.cameraPreview.hidden = false;
            this.isCameraActive = true;
            this.cameraBtn.setAttribute('aria-pressed', 'true');

            // Hide welcome screen
            if (this.welcomeScreen) {
                this.welcomeScreen.style.display = 'none';
            }

            this.announce('تم فتح الكاميرا');
        } catch (error) {
            console.error('Error accessing camera:', error);
            this.announce('عذراً، لا يمكن الوصول إلى الكاميرا');
        }
    }

    closeCamera() {
        if (this.cameraStream) {
            this.cameraStream.getTracks().forEach(track => track.stop());
            this.cameraStream = null;
        }

        this.cameraVideo.srcObject = null;
        this.cameraPreview.hidden = true;
        this.isCameraActive = false;
        this.cameraBtn.setAttribute('aria-pressed', 'false');

        this.announce('تم إغلاق الكاميرا');
        this.stopLiveBroadcast();
    }

    async switchCamera() {
        if (!this.cameraStream) return;

        const currentFacingMode = this.cameraStream.getVideoTracks()[0].getSettings().facingMode;
        const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';

        this.closeCamera();

        try {
            this.cameraStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: newFacingMode },
                audio: false
            });

            this.cameraVideo.srcObject = this.cameraStream;
            this.announce('تم تبديل الكاميرا');
        } catch (error) {
            console.error('Error switching camera:', error);
            this.announce('عذراً، لا يمكن تبديل الكاميرا');
        }
    }

    captureImage() {
        if (!this.cameraStream) return;

        const video = this.cameraVideo;
        const canvas = this.cameraCanvas;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);

        const imageUrl = canvas.toDataURL('image/jpeg');

        // Add message with image
        this.addMessage('user', 'صورة ملتقطة من الكاميرا', imageUrl);

        // Close camera
        this.closeCamera();

        this.announce('تم التقاط الصورة وإرسالها');

        // Simulate response while thinking
        const thinkingMsg = "جاري تحليل الصورة... لحظة واحدة";
        this.addMessage('assistant', thinkingMsg);
        this.speak(thinkingMsg);

        // Send for vision analysis
        this.analyzeWithVisionServer(imageUrl);
    }

    async analyzeWithVisionServer(imageUrl) {
        try {
            const thinkingId = Date.now();
            this.addMessage('assistant', 'جاري تحليل الصورة بعيون دليل...', null, thinkingId);

            const base64Data = imageUrl.split(',')[1];

            const response = await fetch(`${this.settings.aiUrl}/v1/vision/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image: base64Data,
                    prompt: "ماذا ترى في هذه الصورة؟ صفها بدقة لمكفوف باللغة العربية بأسلوب دليل (باللهجة السعودية)."
                })
            });

            if (!response.ok) throw new Error('سيرفر الرؤية لا يستجيب');

            const data = await response.json();
            const result = data.content;

            this.removeMessage(thinkingId);
            this.addMessage('assistant', result);

        } catch (error) {
            console.error('Vision Error:', error);
            this.addMessage('assistant', "عذراً، ما قدرت أحلل الصورة. تأكد إن السيرفر شغال.");
        }
    }

    async startLiveBroadcast() {
        if (!this.cameraStream) return;
        this.isLiveMode = true;
        this.liveBroadcastBtn.classList.add('active');
        this.liveBroadcastBtn.querySelector('.btn-text').textContent = 'إيقاف البث';

        const runCycle = async () => {
            if (!this.isLiveMode || !this.isCameraActive) return;

            const canvas = this.cameraCanvas;
            const video = this.cameraVideo;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0);
            const imageUrl = canvas.toDataURL('image/jpeg', 0.6); // Quality 0.6 to reduce bandwidth
            const base64Data = imageUrl.split(',')[1];

            try {
                const response = await fetch(`${this.settings.aiUrl}/v1/vision/analyze`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        image: base64Data,
                        prompt: "صف ما تراه بعينك الآن باختصار شديد ومرح لمكفوف (باللهجة السعودية)."
                    })
                });
                if (response.ok) {
                    const data = await response.json();
                    if (this.isLiveMode) {
                        this.addMessage('assistant', data.content); // Optional: if you want text log
                        this.speak(data.content);
                    }
                }
            } catch (e) {
                console.error("Live Vision Error:", e);
            }

            // Next frame after 5 seconds
            if (this.isLiveMode) {
                this.liveInterval = setTimeout(runCycle, 5000);
            }
        };

        runCycle();
    }

    stopLiveBroadcast() {
        this.isLiveMode = false;
        if (this.liveInterval) {
            clearTimeout(this.liveInterval);
            this.liveInterval = null;
        }
        if (this.liveBroadcastBtn) {
            this.liveBroadcastBtn.classList.remove('active');
            this.liveBroadcastBtn.querySelector('.btn-text').textContent = 'بث مباشر';
        }
    }

    // ===================================
    // Settings
    // ===================================

    openSettings() {
        this.settingsModal.hidden = false;
        this.settingsModal.setAttribute('aria-hidden', 'false');
        document.getElementById('voice-speed').focus();
        this.announce('فتح نافذة الإعدادات');
    }

    closeSettings() {
        this.settingsModal.hidden = true;
        this.settingsModal.setAttribute('aria-hidden', 'true');
        this.announce('إغلاق نافذة الإعدادات');
    }

    loadSettings() {
        const saved = localStorage.getItem('guideme-settings');
        return saved ? JSON.parse(saved) : {
            voiceSpeed: 1,
            voiceVolume: 80,
            fontSize: 'medium',
            darkMode: false,
            highContrast: false,
            reduceMotion: false,
            aiUrl: 'http://localhost:8888'
        };
    }

    saveSettings() {
        this.settings = {
            voiceSpeed: parseFloat(document.getElementById('voice-speed').value),
            voiceVolume: parseInt(document.getElementById('voice-volume').value),
            fontSize: document.getElementById('font-size').value,
            darkMode: document.getElementById('dark-mode').checked,
            highContrast: document.getElementById('high-contrast').checked,
            reduceMotion: document.getElementById('reduce-motion').checked,
            aiUrl: document.getElementById('ai-url').value || 'http://localhost:8888'
        };

        localStorage.setItem('guideme-settings', JSON.stringify(this.settings));
        this.speak('تم حفظ الإعدادات');
        this.applySettings();
        this.closeSettings();
        this.announce('تم حفظ الإعدادات بنجاح');
    }

    applySettings() {
        // Apply font size
        const fontSizeMap = {
            'small': '14px',
            'medium': '16px',
            'large': '18px',
            'xlarge': '20px'
        };
        document.documentElement.style.fontSize = fontSizeMap[this.settings.fontSize] || '16px';

        // Apply dark mode
        document.documentElement.setAttribute('data-theme', this.settings.darkMode ? 'dark' : 'light');

        // Apply high contrast
        document.body.setAttribute('data-high-contrast', this.settings.highContrast);

        // Apply reduced motion
        if (this.settings.reduceMotion) {
            document.body.style.setProperty('--transition', '0ms');
        } else {
            document.body.style.removeProperty('--transition');
        }

        // Update form values
        if (document.getElementById('voice-speed')) {
            document.getElementById('voice-speed').value = this.settings.voiceSpeed;
            document.getElementById('voice-speed-output').textContent = `${this.settings.voiceSpeed}x`;
            document.getElementById('voice-volume').value = this.settings.voiceVolume;
            document.getElementById('voice-volume-output').textContent = `${this.settings.voiceVolume}%`;
            document.getElementById('font-size').value = this.settings.fontSize;
            document.getElementById('dark-mode').checked = this.settings.darkMode;
            document.getElementById('high-contrast').checked = this.settings.highContrast;
            document.getElementById('reduce-motion').checked = this.settings.reduceMotion;
            document.getElementById('ai-url').value = this.settings.aiUrl || 'http://localhost:8888';
        }
    }

    // ===================================
    // Utilities
    // ===================================

    startNewChat() {
        this.messages = [];
        this.messagesArea.innerHTML = '';
        if (this.welcomeScreen) {
            this.welcomeScreen.style.display = 'flex';
        }
        this.announce('بدء محادثة جديدة');
    }

    autoResizeTextarea() {
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 200) + 'px';
    }

    scrollToBottom() {
        this.messagesArea.scrollTop = this.messagesArea.scrollHeight;
    }

    formatTime(date) {
        return date.toLocaleTimeString('ar-SA', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    announce(message) {
        const announcer = document.getElementById('announcements');
        if (announcer) {
            announcer.textContent = message;
            setTimeout(() => {
                announcer.textContent = '';
            }, 1000);
        }
    }

    speak(text) {
        if (this.synth.speaking) {
            this.synth.cancel();
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ar-SA';
        utterance.rate = this.settings.voiceSpeed;
        utterance.volume = this.settings.voiceVolume / 100;

        const voices = this.synth.getVoices();
        const arabicVoice = voices.find(voice => voice.lang.startsWith('ar'));
        if (arabicVoice) {
            utterance.voice = arabicVoice;
        }

        this.synth.speak(utterance);
    }
}

// Initialize the app
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.guideMeChat = new GuideMeChat();
    });
} else {
    window.guideMeChat = new GuideMeChat();
}

// Load voices for speech synthesis
if ('speechSynthesis' in window) {
    speechSynthesis.onvoiceschanged = () => {
        speechSynthesis.getVoices();
    };
}
