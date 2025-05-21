// Settings Modal Component
class SettingsModal {
    constructor() {
        this.modal = null;
        this.settings = null;
    }

    create() {
        this.modal = document.createElement('div');
        this.modal.className = 'lss-webhook-settings-modal';
        this.modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 10000;
            min-width: 400px;
        `;

        this.modal.innerHTML = `
            <h2>Webhook Settings</h2>
            <div class="settings-form">
                <div class="form-group">
                    <label>Discord Webhook URL</label>
                    <input type="text" id="webhook-url" placeholder="https://discord.com/api/webhooks/...">
                </div>
                <div class="form-group">
                    <label>Display Name</label>
                    <input type="text" id="display-name" placeholder="LSS Notifier">
                </div>
                <div class="form-group">
                    <label>Avatar URL</label>
                    <input type="text" id="avatar-url" placeholder="https://...">
                </div>
                <div class="form-group">
                    <label>Event Categories</label>
                    <div class="category-settings">
                        ${Object.entries(EVENT_CATEGORIES).map(([key, value]) => `
                            <div class="category-item">
                                <label>
                                    <input type="checkbox" id="category-${value}" checked>
                                    ${this.formatCategoryName(key)}
                                </label>
                                <input type="color" id="color-${value}" value="#000000">
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="exclude-transports">
                        Exclude Patient Transports
                    </label>
                </div>
                <div class="button-group">
                    <button id="test-webhook">Test Webhook</button>
                    <button id="save-settings">Save Settings</button>
                    <button id="close-modal">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.modal);
        this.setupEventListeners();
    }

    formatCategoryName(key) {
        return key
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }

    setupEventListeners() {
        const closeBtn = this.modal.querySelector('#close-modal');
        const saveBtn = this.modal.querySelector('#save-settings');
        const testBtn = this.modal.querySelector('#test-webhook');

        closeBtn.addEventListener('click', () => this.hide());
        saveBtn.addEventListener('click', () => this.saveSettings());
        testBtn.addEventListener('click', () => this.testWebhook());
    }

    async saveSettings() {
        try {
            const webhookUrl = this.modal.querySelector('#webhook-url').value;
            if (!webhookUrl) {
                throw new Error('Please enter a webhook URL');
            }

            const displayName = this.modal.querySelector('#display-name').value;
            const avatarUrl = this.modal.querySelector('#avatar-url').value;
            const excludeTransports = this.modal.querySelector('#exclude-transports').checked;

            const categories = {};
            Object.values(EVENT_CATEGORIES).forEach(category => {
                categories[category] = {
                    enabled: this.modal.querySelector(`#category-${category}`).checked,
                    color: this.modal.querySelector(`#color-${category}`).value
                };
            });

            const settings = {
                webhookUrl,
                displayName,
                avatarUrl,
                categories,
                excludeTransports
            };

            if (!userToken) {
                throw new Error('Could not determine user token');
            }

            const { encrypted, iv } = await encryptWebhook(webhookUrl, userId);
            
            const response = await fetch(`${SUPABASE_URL}/rest/v1/settings`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'user_token': userToken,
                    'Content-Type': 'application/json',
                    'Prefer': 'resolution=merge-duplicates'
                },
                body: JSON.stringify({
                    user_token: userToken,
                    config_json: {
                        displayName,
                        avatarUrl,
                        categories,
                        excludeTransports
                    },
                    webhook_enc: encrypted,
                    webhook_iv: iv
                })
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Failed to save settings: ${error}`);
            }

            GM_setValue('settings', settings);
            this.hide();
            alert('Settings saved successfully!');
        } catch (error) {
            console.error('Error saving settings:', error);
            alert(error.message || 'Error saving settings. Please try again.');
        }
    }

    async testWebhook() {
        try {
            const webhookUrl = this.modal.querySelector('#webhook-url').value;
            if (!webhookUrl) {
                throw new Error('Please enter a webhook URL first.');
            }

            const result = await sendTestNotification(webhookUrl);
            if (result.success) {
                alert(result.message);
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Error testing webhook:', error);
            alert(error.message || 'Error testing webhook. Please check your webhook URL.');
        }
    }

    show() {
        if (!this.modal) {
            this.create();
        }
        this.modal.style.display = 'block';
        this.loadCurrentSettings();
    }

    hide() {
        if (this.modal) {
            this.modal.style.display = 'none';
        }
    }

    loadCurrentSettings() {
        const settings = GM_getValue('settings');
        if (!settings) return;

        this.modal.querySelector('#webhook-url').value = settings.webhookUrl || '';
        this.modal.querySelector('#display-name').value = settings.displayName || '';
        this.modal.querySelector('#avatar-url').value = settings.avatarUrl || '';
        this.modal.querySelector('#exclude-transports').checked = settings.excludeTransports || false;

        Object.entries(settings.categories || {}).forEach(([category, config]) => {
            const checkbox = this.modal.querySelector(`#category-${category}`);
            const colorInput = this.modal.querySelector(`#color-${category}`);
            if (checkbox) checkbox.checked = config.enabled;
            if (colorInput) colorInput.value = config.color;
        });
    }
} 