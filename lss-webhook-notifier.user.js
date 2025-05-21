// ==UserScript==
// @name         LSS Webhook Notifier
// @namespace    http://tampermonkey.net/
// @version      0.1.7
// @description  Notifies Discord about LSS events via webhook
// @author       Your Name
// @match        https://www.leitstellenspiel.de/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      api.supabase.co
// @connect      discord.com
// @updateURL   https://raw.githubusercontent.com/ghotso/lss-discord-notifier/main/lss-webhook-notifier.user.js
// @downloadURL https://raw.githubusercontent.com/ghotso/lss-discord-notifier/main/lss-webhook-notifier.user.js
// @require      https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2
// @require https://raw.githubusercontent.com/ghotso/lss-discord-notifier/main/settings-modal.js
// @require https://raw.githubusercontent.com/ghotso/lss-discord-notifier/main/event-detector.js
// ==/UserScript==

(function() {
    'use strict';

    // Import required modules
    const { createClient } = supabase;
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

    // Configuration
    const SUPABASE_URL = 'https://nebghhnkcrwtggktzfcg.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lYmdoaG5rY3J3dGdna3R6ZmNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4MjY0MTksImV4cCI6MjA2MzQwMjQxOX0.QPrUjT1R96tC44F8dUFOEgDK5Z-ls5y7-qgFd2IRadw';
    const ENCRYPTION_PREFIX = 'lss-webhook-';

    // Get user ID once at initialization
    const userId = getUserId();
    const userToken = userId ? `user-${userId}` : null;

    // Event categories
    const EVENT_CATEGORIES = {
        NEW_MISSIONS: 'new_missions',
        SPEAKING_REQUESTS: 'speaking_requests',
        INCOMPLETE_MISSIONS: 'incomplete_missions',
        PATIENT_NEEDS_SPECIAL: 'patient_needs_special',
        MISSION_CHANGED: 'mission_changed',
        LARGE_MISSIONS: 'large_missions',
        PATIENT_TRANSPORTS: 'patient_transports'
    };

    // UI Elements
    let settingsButton;
    let settingsModal;

    // Initialize the script
    function init() {
        if (!userId) {
            console.error('Could not initialize: No user ID found');
            return;
        }

        // Add styles for the settings UI
        const style = document.createElement('style');
        style.textContent = `
            .lss-webhook-settings-modal {
                font-family: Arial, sans-serif;
            }
            .lss-webhook-settings-modal .form-group {
                margin-bottom: 15px;
            }
            .lss-webhook-settings-modal label {
                display: block;
                margin-bottom: 5px;
                font-weight: bold;
            }
            .lss-webhook-settings-modal input[type="text"] {
                width: 100%;
                padding: 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
            }
            .lss-webhook-settings-modal .category-settings {
                display: grid;
                grid-template-columns: 1fr auto;
                gap: 10px;
                margin-top: 10px;
            }
            .lss-webhook-settings-modal .button-group {
                display: flex;
                gap: 10px;
                margin-top: 20px;
            }
            .lss-webhook-settings-modal button {
                padding: 8px 16px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-weight: bold;
            }
            .lss-webhook-settings-modal #test-webhook {
                background: #7289da;
                color: white;
            }
            .lss-webhook-settings-modal #save-settings {
                background: #43b581;
                color: white;
            }
            .lss-webhook-settings-modal #close-modal {
                background: #f04747;
                color: white;
            }
        `;
        document.head.appendChild(style);

        createSettingsButton();
        loadSettings();
        setupEventListeners();
    }

    function createSettingsButton() {
        const INTERVAL_ID = 'lss-webhook-settings-button';
    
        const observer = new MutationObserver(() => {
            const navBar = document.querySelector('ul.nav.navbar-nav.navbar-right');
            if (!navBar) return;
    
            // Prüfen, ob Button schon existiert und ob er im DOM ist
            let existing = document.getElementById(INTERVAL_ID);
            if (existing && navBar.contains(existing)) return;
    
            // Wenn vorhanden aber entfernt → löschen
            if (existing) existing.remove();
    
            // Button erstellen
            const li = document.createElement('li');
            li.id = INTERVAL_ID;
    
            const a = document.createElement('a');
            a.href = '#';
            a.textContent = '⚙️ Webhook Settings';
            a.style.color = '#7289da';
            a.addEventListener('click', (e) => {
                e.preventDefault();
                const modal = new SettingsModal();
                modal.show();
            });
    
            li.appendChild(a);
    
            // Direkt vor Logout-Button einfügen
            const logoutBtn = navBar.querySelector('a[href*="sign_out"]');
            if (logoutBtn && logoutBtn.parentElement && logoutBtn.parentElement.parentElement === navBar) {
                navBar.insertBefore(li, logoutBtn.parentElement);
            } else {
                navBar.appendChild(li);
            }
        });
    
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }    

    // Load settings from Supabase
    async function loadSettings() {
        if (!userToken) return;

        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/settings?user_token=eq.${userToken}`, {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'user_token': userToken
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to load settings: ${response.statusText}`);
            }

            const data = await response.json();
            if (data && data.length > 0) {
                const settings = data[0];
                // Decrypt webhook URL
                const webhookUrl = await decryptWebhook(settings.webhook_enc, settings.webhook_iv, userId);
                GM_setValue('settings', {
                    ...settings.config_json,
                    webhookUrl
                });
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    // Get user ID from the game
    function getUserId() {
        // Try to get user ID from the user menu
        const userMenu = document.querySelector('#user-menu');
        if (userMenu) {
            const userId = userMenu.getAttribute('data-user-id');
            if (userId) return userId;
        }

        // Try to get from the mission list (missions have user_id attribute)
        const missions = document.querySelectorAll('.mission');
        if (missions.length > 0) {
            const userId = missions[0].getAttribute('data-user-id');
            if (userId) return userId;
        }

        // Try to get from the vehicle list
        const vehicles = document.querySelectorAll('.vehicle');
        if (vehicles.length > 0) {
            const userId = vehicles[0].getAttribute('data-user-id');
            if (userId) return userId;
        }

        // If all else fails, try to extract from the page source
        const pageSource = document.documentElement.innerHTML;
        const userIdMatch = pageSource.match(/user_id["']?\s*:\s*["']?(\d+)["']?/);
        if (userIdMatch && userIdMatch[1]) {
            return userIdMatch[1];
        }

        console.error('Could not find user ID in the game interface');
        return null;
    }

    // Encrypt webhook URL
    async function encryptWebhook(webhookUrl, userId) {
        const key = await deriveKey(userId);
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encoded = new TextEncoder().encode(webhookUrl);
        
        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            key,
            encoded
        );

        return {
            encrypted: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
            iv: btoa(String.fromCharCode(...iv))
        };
    }

    // Decrypt webhook URL
    async function decryptWebhook(encrypted, iv, userId) {
        const key = await deriveKey(userId);
        const decoded = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
        const ivArray = Uint8Array.from(atob(iv), c => c.charCodeAt(0));

        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: ivArray },
            key,
            decoded
        );

        return new TextDecoder().decode(decrypted);
    }

    // Derive encryption key
    async function deriveKey(userId) {
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(ENCRYPTION_PREFIX + userId),
            'PBKDF2',
            false,
            ['deriveBits', 'deriveKey']
        );

        return crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: encoder.encode(ENCRYPTION_PREFIX),
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    }

    // Send Discord webhook notification
    async function sendDiscordNotification(eventData) {
        const settings = GM_getValue('settings');
        if (!settings || !settings.webhookUrl) return;

        const embed = {
            title: eventData.title,
            description: eventData.description,
            color: parseInt(settings.colors[eventData.category] || '0x000000', 16),
            url: eventData.url,
            timestamp: new Date().toISOString()
        };

        const payload = {
            username: settings.displayName || 'LSS Notifier',
            avatar_url: settings.avatarUrl,
            embeds: [embed]
        };

        try {
            await fetch(settings.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (error) {
            console.error('Error sending Discord notification:', error);
        }
    }

    // Send test notification
    async function sendTestNotification(webhookUrl) {
        const testEmbed = {
            title: 'Test Notification',
            description: 'This is a test notification from the LSS Webhook Notifier.',
            color: 0x7289da,
            timestamp: new Date().toISOString(),
            fields: [
                {
                    name: 'Status',
                    value: '✅ Webhook is working correctly',
                    inline: true
                },
                {
                    name: 'Time',
                    value: new Date().toLocaleTimeString(),
                    inline: true
                }
            ]
        };

        const payload = {
            username: 'LSS Notifier Test',
            avatar_url: 'https://www.leitstellenspiel.de/images/lss_logo.png',
            embeds: [testEmbed]
        };

        try {
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                return { success: true, message: 'Test notification sent successfully!' };
            } else {
                const error = await response.text();
                return { success: false, message: `Failed to send test notification: ${error}` };
            }
        } catch (error) {
            return { success: false, message: `Error sending test notification: ${error.message}` };
        }
    }

    // Setup event listeners for game events
    function setupEventListeners() {
        // Initialize event detector
        const eventDetector = new EventDetector();
        eventDetector.init();

        // Add click handler for settings button
        settingsButton.addEventListener('click', () => {
            const modal = new SettingsModal();
            modal.show();
        });
    }

    // Initialize the script when the page is loaded
    if (document.readyState === 'complete') {
        init();
    } else {
        window.addEventListener('load', init);
    }
})(); 