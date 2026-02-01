// ===================================
// GuideMe Extension - Background Service Worker
// ===================================

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        // Set default settings
        chrome.storage.sync.set({
            voiceEnabled: false,
            autoEnhance: true,
            highContrast: false,
            fontSize: 'medium',
            voiceSpeed: 1,
            voiceVolume: 0.8
        });

        // Open welcome page
        chrome.tabs.create({
            url: chrome.runtime.getURL('index.html')
        });
    }
});

// Listen for keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
            switch (command) {
                case 'toggle-voice':
                    chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleVoice' });
                    break;

                case 'simplify-page':
                    chrome.tabs.sendMessage(tabs[0].id, { action: 'simplifyPage' });
                    break;

                case 'read-page':
                    chrome.tabs.sendMessage(tabs[0].id, { action: 'readPage' });
                    break;
            }
        }
    });
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'getSettings') {
        chrome.storage.sync.get(null, (settings) => {
            sendResponse({ settings });
        });
        return true; // Keep channel open for async response
    }
});

// Context menu for right-click actions
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'guideme-simplify',
        title: 'تبسيط هذه الصفحة',
        contexts: ['page']
    });

    chrome.contextMenus.create({
        id: 'guideme-read',
        title: 'قراءة هذه الصفحة',
        contexts: ['page']
    });

    chrome.contextMenus.create({
        id: 'guideme-read-selection',
        title: 'قراءة النص المحدد',
        contexts: ['selection']
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (!tab?.id) return;

    switch (info.menuItemId) {
        case 'guideme-simplify':
            chrome.tabs.sendMessage(tab.id, { action: 'simplifyPage' });
            break;

        case 'guideme-read':
            chrome.tabs.sendMessage(tab.id, { action: 'readPage' });
            break;

        case 'guideme-read-selection':
            chrome.tabs.sendMessage(tab.id, {
                action: 'readSelection',
                text: info.selectionText
            });
            break;
    }
});
