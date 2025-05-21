// ==UserScript==
// @name         LSS Webhook Notifier
// @namespace    http://tampermonkey.net/
// @version      0.1.9
// @description  Notifies Discord about LSS events via webhook
// @author       Your Name
// @match        https://www.leitstellenspiel.de/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      api.supabase.co
// @connect      discord.com
// @updateURL    https://raw.githubusercontent.com/ghotso/lss-discord-notifier/main/lss-webhook-notifier.user.js
// @downloadURL  https://raw.githubusercontent.com/ghotso/lss-discord-notifier/main/lss-webhook-notifier.user.js
// @require      https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2
// @require      https://raw.githubusercontent.com/ghotso/lss-discord-notifier/main/settings-modal.js
// @require      https://raw.githubusercontent.com/ghotso/lss-discord-notifier/main/event-detector.js
// ==/UserScript==

(function() {
    'use strict';

    const SUPABASE_URL = 'https://nebghhnkcrwtggktzfcg.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // verkürzt für Übersicht
    const ENCRYPTION_PREFIX = 'lss-webhook-';

    const userId = getUserId();
    const userToken = userId ? `user-${userId}` : null;

    const { createClient } = supabase;
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

    const EVENT_CATEGORIES = {
        NEW_MISSIONS: 'new_missions',
        SPEAKING_REQUESTS: 'speaking_requests',
        INCOMPLETE_MISSIONS: 'incomplete_missions',
        PATIENT_NEEDS_SPECIAL: 'patient_needs_special',
        MISSION_CHANGED: 'mission_changed',
        LARGE_MISSIONS: 'large_missions',
        PATIENT_TRANSPORTS: 'patient_transports'
    };

    function init() {
        if (!userId) return console.error('No user ID found');

        const style = document.createElement('style');
        style.textContent = `
            .lss-webhook-settings-modal { font-family: Arial, sans-serif; }
            .lss-webhook-settings-modal .form-group { margin-bottom: 15px; }
            .lss-webhook-settings-modal label { display: block; margin-bottom: 5px; font-weight: bold; }
            .lss-webhook-settings-modal input[type="text"] {
                width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;
            }
            .lss-webhook-settings-modal .category-settings {
                display: grid; grid-template-columns: 1fr auto; gap: 10px; margin-top: 10px;
            }
            .lss-webhook-settings-modal .button-group {
                display: flex; gap: 10px; margin-top: 20px;
            }
            .lss-webhook-settings-modal button {
                padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;
            }
            .lss-webhook-settings-modal #test-webhook { background: #7289da; color: white; }
            .lss-webhook-settings-modal #save-settings { background: #43b581; color: white; }
            .lss-webhook-settings-modal #close-modal { background: #f04747; color: white; }
        `;
        document.head.appendChild(style);

        createSettingsButton();
        loadSettings();
        setupEventListeners();
    }

    function createSettingsButton() {
        const BUTTON_ID = 'lss-webhook-settings-button';

        function insertButton() {
            const navBar = document.querySelector('ul.nav.navbar-nav.navbar-right');
            if (!navBar || document.getElementById(BUTTON_ID)) return;

            const li = document.createElement('li');
            li.id = BUTTON_ID;

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

            const logoutBtn = navBar.querySelector('a[href*="sign_out"]');
            if (logoutBtn?.parentElement?.parentElement === navBar) {
                navBar.insertBefore(li, logoutBtn.parentElement);
            } else {
                navBar.appendChild(li);
            }
        }

        const observer = new MutationObserver(() => {
            const navBar = document.querySelector('ul.nav.navbar-nav.navbar-right');
            if (navBar && !document.getElementById(BUTTON_ID)) insertButton();
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    async function loadSettings() {
        if (!userToken) return;

        try {
            const { data, error } = await supabaseClient
                .from('settings')
                .select('*')
                .eq('user_token', userToken)
                .maybeSingle();

            if (error) throw error;

            if (data) {
                const webhookUrl = await decryptWebhook(data.webhook_enc, data.webhook_iv, userId);
                GM_setValue('settings', {
                    ...data.config_json,
                    webhookUrl
                });
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    function getUserId() {
        const idFromAttr = document.querySelector('#user-menu')?.getAttribute('data-user-id')
            || document.querySelector('.mission')?.getAttribute('data-user-id')
            || document.querySelector('.vehicle')?.getAttribute('data-user-id');
        if (idFromAttr) return idFromAttr;

        const match = document.documentElement.innerHTML.match(/user_id["']?\s*:\s*["']?(\d+)["']?/);
        return match?.[1] ?? null;
    }

    async function encryptWebhook(webhookUrl, userId) {
        const key = await deriveKey(userId);
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encoded = new TextEncoder().encode(webhookUrl);

        const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);

        return {
            encrypted: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
            iv: btoa(String.fromCharCode(...iv))
        };
    }

    async function decryptWebhook(encrypted, iv, userId) {
        const key = await deriveKey(userId);
        const decoded = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
        const ivArray = Uint8Array.from(atob(iv), c => c.charCodeAt(0));

        const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivArray }, key, decoded);
        return new TextDecoder().decode(decrypted);
    }

    async function deriveKey(userId) {
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(ENCRYPTION_PREFIX + userId),
            'PBKDF2',
            false,
            ['deriveKey']
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

    async function sendDiscordNotification(eventData) {
        const settings = GM_getValue('settings');
        if (!settings?.webhookUrl) return;

        const embed = {
            title: eventData.title,
            description: eventData.description,
            color: parseInt(settings.colors?.[eventData.category] ?? '0x000000', 16),
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

    async function sendTestNotification(webhookUrl) {
        const payload = {
            username: 'LSS Notifier Test',
            avatar_url: 'https://www.leitstellenspiel.de/images/lss_logo.png',
            embeds: [{
                title: 'Test Notification',
                description: 'This is a test notification from the LSS Webhook Notifier.',
                color: 0x7289da,
                timestamp: new Date().toISOString(),
                fields: [
                    { name: 'Status', value: '✅ Webhook is working correctly', inline: true },
                    { name: 'Time', value: new Date().toLocaleTimeString(), inline: true }
                ]
            }]
        };

        try {
            const res = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const text = await res.text();
            return res.ok
                ? { success: true, message: 'Test notification sent successfully!' }
                : { success: false, message: `Failed: ${text}` };
        } catch (e) {
            return { success: false, message: `Error: ${e.message}` };
        }
    }

    function setupEventListeners() {
        const eventDetector = new EventDetector();
        eventDetector.init();
    }

    if (document.readyState === 'complete') init();
    else window.addEventListener('load', init);
})();
