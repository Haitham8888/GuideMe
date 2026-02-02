// ===================================
// GuideMe Extension - Popup Script
// ===================================

class ExtensionPopup {
    constructor() {
        this.settings = {};
        this.init();
    }

    async init() {
        await this.loadSettings();
        this.setupEventListeners();
        this.updateUI();
    }

    async loadSettings() {
        const result = await chrome.storage.sync.get({
            voiceEnabled: false,
            autoEnhance: true,
            highContrast: false
        });
        this.settings = result;
    }

    async saveSettings() {
        await chrome.storage.sync.set(this.settings);
    }

    setupEventListeners() {
        // Voice toggle
        const voiceToggle = document.getElementById('voice-toggle');
        voiceToggle.addEventListener('change', async (e) => {
            this.settings.voiceEnabled = e.target.checked;
            await this.saveSettings();
            this.sendMessageToContent({ action: 'toggleVoice', enabled: e.target.checked });
            this.updateStatus(e.target.checked ? 'الأوامر الصوتية مفعلة' : 'الأوامر الصوتية متوقفة');
        });

        // Auto enhance toggle
        const autoEnhance = document.getElementById('auto-enhance');
        autoEnhance.addEventListener('change', async (e) => {
            this.settings.autoEnhance = e.target.checked;
            await this.saveSettings();
            this.updateStatus(e.target.checked ? 'التحسين التلقائي مفعل' : 'التحسين التلقائي متوقف');
        });

        // High contrast toggle
        const highContrast = document.getElementById('high-contrast');
        highContrast.addEventListener('change', async (e) => {
            this.settings.highContrast = e.target.checked;
            await this.saveSettings();
            this.sendMessageToContent({ action: 'toggleHighContrast', enabled: e.target.checked });
            this.updateStatus(e.target.checked ? 'وضع التباين العالي مفعل' : 'وضع التباين العالي متوقف');
        });

        // Simplify button
        const simplifyBtn = document.getElementById('simplify-btn');
        simplifyBtn.addEventListener('click', () => {
            this.sendMessageToContent({ action: 'simplifyPage' });
            this.updateStatus('جاري تبسيط الصفحة...');
        });

        // Enhance button
        const enhanceBtn = document.getElementById('enhance-btn');
        enhanceBtn.addEventListener('click', () => {
            this.sendMessageToContent({ action: 'enhanceAccessibility' });
            this.updateStatus('جاري تحسين إمكانية الوصول...');
        });

        // Read button
        const readBtn = document.getElementById('read-btn');
        readBtn.addEventListener('click', () => {
            this.sendMessageToContent({ action: 'readPage' });
            this.updateStatus('جاري قراءة الصفحة...');
        });

        // Open dashboard
        const openDashboard = document.getElementById('open-dashboard');
        openDashboard.addEventListener('click', () => {
            chrome.tabs.create({ url: chrome.runtime.getURL('app.html') });
        });

        // Help link
        const helpLink = document.getElementById('help-link');
        helpLink.addEventListener('click', (e) => {
            e.preventDefault();
            chrome.tabs.create({ url: chrome.runtime.getURL('app.html') });
        });
    }

    updateUI() {
        document.getElementById('voice-toggle').checked = this.settings.voiceEnabled;
        document.getElementById('auto-enhance').checked = this.settings.autoEnhance;
        document.getElementById('high-contrast').checked = this.settings.highContrast;
    }

    async sendMessageToContent(message) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
            chrome.tabs.sendMessage(tab.id, message);
        }
    }

    updateStatus(message) {
        const statusText = document.getElementById('status-text');
        statusText.textContent = message;

        // Reset after 3 seconds
        setTimeout(() => {
            statusText.textContent = 'الإضافة نشطة وجاهزة';
        }, 3000);
    }
}

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
    new ExtensionPopup();
});
