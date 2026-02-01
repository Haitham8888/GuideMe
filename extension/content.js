// ===================================
// GuideMe Extension - Content Script
// This script runs on all web pages to enhance accessibility
// ===================================

class GuideMeContentEnhancer {
    constructor() {
        this.voiceEnabled = false;
        this.recognition = null;
        this.synth = window.speechSynthesis;
        this.isReading = false;
        this.settings = {};

        this.init();
    }

    async init() {
        await this.loadSettings();
        this.setupMessageListener();
        this.setupVoiceRecognition();

        // Auto-enhance if enabled
        if (this.settings.autoEnhance) {
            this.enhanceAccessibility();
        }

        // Apply high contrast if enabled
        if (this.settings.highContrast) {
            this.applyHighContrast();
        }
    }

    async loadSettings() {
        const result = await chrome.storage.sync.get({
            voiceEnabled: false,
            autoEnhance: true,
            highContrast: false
        });
        this.settings = result;
        this.voiceEnabled = result.voiceEnabled;
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            switch (message.action) {
                case 'toggleVoice':
                    this.voiceEnabled = message.enabled;
                    this.announce(message.enabled ? 'تم تفعيل الأوامر الصوتية' : 'تم إيقاف الأوامر الصوتية');
                    break;

                case 'simplifyPage':
                    this.simplifyPage();
                    break;

                case 'enhanceAccessibility':
                    this.enhanceAccessibility();
                    break;

                case 'readPage':
                    this.readPage();
                    break;

                case 'toggleHighContrast':
                    if (message.enabled) {
                        this.applyHighContrast();
                    } else {
                        this.removeHighContrast();
                    }
                    break;
            }
            sendResponse({ success: true });
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
                const command = event.results[0][0].transcript.trim();
                this.processVoiceCommand(command);
            };

            // Listen for Ctrl+Shift+V to activate voice
            document.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.shiftKey && e.key === 'V' && this.voiceEnabled) {
                    e.preventDefault();
                    this.startListening();
                }
            });
        }
    }

    startListening() {
        if (this.recognition && this.voiceEnabled) {
            try {
                this.recognition.start();
                this.announce('أنا أستمع...');
            } catch (error) {
                console.error('Error starting recognition:', error);
            }
        }
    }

    processVoiceCommand(command) {
        const lowerCommand = command.toLowerCase();

        if (lowerCommand.includes('بسّط') || lowerCommand.includes('بسط الصفحة')) {
            this.simplifyPage();
        } else if (lowerCommand.includes('اقرأ') || lowerCommand.includes('قراءة')) {
            this.readPage();
        } else if (lowerCommand.includes('توقف')) {
            this.stopReading();
        } else if (lowerCommand.includes('تحسين')) {
            this.enhanceAccessibility();
        } else {
            this.announce('عذراً، لم أفهم الأمر');
        }
    }

    // ===================================
    // Page Simplification
    // ===================================

    simplifyPage() {
        this.announce('جاري تبسيط الصفحة');

        // Remove unnecessary elements
        const selectorsToRemove = [
            'aside',
            '.sidebar',
            '.advertisement',
            '.ad',
            '.popup',
            '.modal:not(.guideme-modal)',
            'iframe[src*="ads"]',
            '[class*="banner"]',
            '[id*="banner"]'
        ];

        selectorsToRemove.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                el.style.display = 'none';
            });
        });

        // Simplify layout
        const main = document.querySelector('main, article, [role="main"], .content, #content');
        if (main) {
            main.style.maxWidth = '800px';
            main.style.margin = '0 auto';
            main.style.padding = '2rem';
            main.style.fontSize = '1.125rem';
            main.style.lineHeight = '1.8';
        }

        // Increase text size
        document.body.style.fontSize = '18px';

        this.announce('تم تبسيط الصفحة بنجاح');
    }

    // ===================================
    // Accessibility Enhancement
    // ===================================

    enhanceAccessibility() {
        this.announce('جاري تحسين إمكانية الوصول');

        // Add ARIA labels to images without alt text
        document.querySelectorAll('img:not([alt])').forEach((img, index) => {
            img.setAttribute('alt', `صورة ${index + 1}`);
            img.setAttribute('role', 'img');
        });

        // Add ARIA labels to links without text
        document.querySelectorAll('a:not([aria-label])').forEach((link, index) => {
            if (!link.textContent.trim()) {
                link.setAttribute('aria-label', `رابط ${index + 1}`);
            }
        });

        // Add ARIA labels to buttons without text
        document.querySelectorAll('button:not([aria-label])').forEach((button, index) => {
            if (!button.textContent.trim()) {
                button.setAttribute('aria-label', `زر ${index + 1}`);
            }
        });

        // Ensure all form inputs have labels
        document.querySelectorAll('input:not([aria-label]):not([id])').forEach((input, index) => {
            const label = input.previousElementSibling?.tagName === 'LABEL'
                ? input.previousElementSibling.textContent
                : `حقل إدخال ${index + 1}`;
            input.setAttribute('aria-label', label);
        });

        // Add skip links if not present
        if (!document.querySelector('.guideme-skip-link')) {
            const skipLink = document.createElement('a');
            skipLink.href = '#main';
            skipLink.className = 'guideme-skip-link';
            skipLink.textContent = 'انتقل إلى المحتوى الرئيسي';
            skipLink.style.cssText = `
                position: absolute;
                top: -100px;
                right: 0;
                background: #2563eb;
                color: white;
                padding: 1rem 1.5rem;
                text-decoration: none;
                font-weight: 700;
                border-radius: 0.5rem;
                z-index: 10000;
                transition: top 0.3s;
            `;
            skipLink.addEventListener('focus', () => {
                skipLink.style.top = '1rem';
            });
            skipLink.addEventListener('blur', () => {
                skipLink.style.top = '-100px';
            });
            document.body.insertBefore(skipLink, document.body.firstChild);
        }

        // Enhance focus visibility
        const style = document.createElement('style');
        style.textContent = `
            .guideme-enhanced *:focus {
                outline: 3px solid #2563eb !important;
                outline-offset: 2px !important;
            }
        `;
        document.head.appendChild(style);
        document.body.classList.add('guideme-enhanced');

        this.announce('تم تحسين إمكانية الوصول بنجاح');
    }

    // ===================================
    // Page Reading
    // ===================================

    readPage() {
        if (this.isReading) {
            this.stopReading();
            return;
        }

        this.isReading = true;
        this.announce('بدء قراءة الصفحة');

        // Get main content
        const main = document.querySelector('main, article, [role="main"], .content, #content') || document.body;

        // Extract text content
        const textContent = this.extractTextContent(main);

        if (textContent) {
            this.speak(textContent);
        } else {
            this.announce('لم أتمكن من العثور على محتوى للقراءة');
            this.isReading = false;
        }
    }

    extractTextContent(element) {
        // Clone element to avoid modifying the page
        const clone = element.cloneNode(true);

        // Remove script and style elements
        clone.querySelectorAll('script, style, nav, header, footer, aside').forEach(el => el.remove());

        // Get text content
        let text = clone.textContent || '';

        // Clean up whitespace
        text = text.replace(/\s+/g, ' ').trim();

        return text;
    }

    speak(text) {
        if (this.synth.speaking) {
            this.synth.cancel();
        }

        // Split text into chunks (speech synthesis has limits)
        const chunks = this.splitTextIntoChunks(text, 200);

        chunks.forEach((chunk, index) => {
            const utterance = new SpeechSynthesisUtterance(chunk);
            utterance.lang = 'ar-SA';
            utterance.rate = 1;
            utterance.volume = 0.8;

            // Try to find Arabic voice
            const voices = this.synth.getVoices();
            const arabicVoice = voices.find(voice => voice.lang.startsWith('ar'));
            if (arabicVoice) {
                utterance.voice = arabicVoice;
            }

            if (index === chunks.length - 1) {
                utterance.onend = () => {
                    this.isReading = false;
                    this.announce('انتهت القراءة');
                };
            }

            this.synth.speak(utterance);
        });
    }

    splitTextIntoChunks(text, wordsPerChunk) {
        const words = text.split(' ');
        const chunks = [];

        for (let i = 0; i < words.length; i += wordsPerChunk) {
            chunks.push(words.slice(i, i + wordsPerChunk).join(' '));
        }

        return chunks;
    }

    stopReading() {
        if (this.synth.speaking) {
            this.synth.cancel();
            this.isReading = false;
            this.announce('تم إيقاف القراءة');
        }
    }

    // ===================================
    // High Contrast Mode
    // ===================================

    applyHighContrast() {
        const style = document.createElement('style');
        style.id = 'guideme-high-contrast';
        style.textContent = `
            body.guideme-high-contrast {
                background: #000000 !important;
                color: #ffffff !important;
            }
            body.guideme-high-contrast * {
                background-color: #000000 !important;
                color: #ffffff !important;
                border-color: #ffffff !important;
            }
            body.guideme-high-contrast a {
                color: #ffff00 !important;
                text-decoration: underline !important;
            }
            body.guideme-high-contrast button,
            body.guideme-high-contrast input,
            body.guideme-high-contrast select,
            body.guideme-high-contrast textarea {
                background: #ffffff !important;
                color: #000000 !important;
                border: 2px solid #ffffff !important;
            }
            body.guideme-high-contrast img {
                filter: contrast(1.2) brightness(1.1);
            }
        `;

        if (!document.getElementById('guideme-high-contrast')) {
            document.head.appendChild(style);
        }
        document.body.classList.add('guideme-high-contrast');

        this.announce('تم تفعيل وضع التباين العالي');
    }

    removeHighContrast() {
        const style = document.getElementById('guideme-high-contrast');
        if (style) {
            style.remove();
        }
        document.body.classList.remove('guideme-high-contrast');

        this.announce('تم إيقاف وضع التباين العالي');
    }

    // ===================================
    // Utilities
    // ===================================

    announce(message) {
        // Create or get announcement region
        let announcer = document.getElementById('guideme-announcer');
        if (!announcer) {
            announcer = document.createElement('div');
            announcer.id = 'guideme-announcer';
            announcer.setAttribute('role', 'status');
            announcer.setAttribute('aria-live', 'polite');
            announcer.setAttribute('aria-atomic', 'true');
            announcer.style.cssText = `
                position: absolute;
                width: 1px;
                height: 1px;
                padding: 0;
                margin: -1px;
                overflow: hidden;
                clip: rect(0, 0, 0, 0);
                white-space: nowrap;
                border: 0;
            `;
            document.body.appendChild(announcer);
        }

        announcer.textContent = message;

        // Also speak the message
        if (this.synth && !this.isReading) {
            const utterance = new SpeechSynthesisUtterance(message);
            utterance.lang = 'ar-SA';
            utterance.rate = 1;
            utterance.volume = 0.8;

            const voices = this.synth.getVoices();
            const arabicVoice = voices.find(voice => voice.lang.startsWith('ar'));
            if (arabicVoice) {
                utterance.voice = arabicVoice;
            }

            this.synth.speak(utterance);
        }

        // Clear after announcement
        setTimeout(() => {
            announcer.textContent = '';
        }, 1000);
    }
}

// Initialize the content enhancer
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new GuideMeContentEnhancer();
    });
} else {
    new GuideMeContentEnhancer();
}
