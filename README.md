# LSS Webhook Notifier

A Tampermonkey script that monitors the Leitstellenspiel game interface and sends notifications to Discord via webhook for various events.

## Features

- 🔔 Real-time event detection for:
  - New missions
  - Speaking requests
  - Incomplete missions
  - Special requirements (NEF, RTH, LNA, etc.)
  - Mission changes
  - Large missions
  - Patient transports (optional)
- ⚙️ Configurable settings:
  - Discord webhook URL
  - Display name and avatar
  - Event categories and colors
  - Patient transport filtering
- 🔐 Secure webhook storage with client-side encryption
- 💾 Settings synchronization via Supabase

## Technical Implementation

### Event Detection
The script uses MutationObserver to monitor changes in the game interface:
- Mission list changes
- Vehicle status updates
- Speaking request indicators
- Mission status changes

### Security
- Webhook URLs are encrypted using AES-GCM (256-bit)
- Encryption key is derived from the user ID using PBKDF2
- All data is stored securely in Supabase with row-level security
- No external authentication required

### Data Flow
1. Game events are detected by observers
2. Event data is formatted into Discord embeds
3. Settings are loaded from Supabase
4. Notifications are sent via webhook
5. Settings are saved back to Supabase when changed

## Installation

1. Install the [Tampermonkey](https://www.tampermonkey.net/) browser extension
2. Click [here](https://raw.githubusercontent.com/yourusername/lss-webhook-notifier/main/lss-webhook-notifier.user.js) to install the script
3. Configure your Supabase credentials in the script:
   ```javascript
   const SUPABASE_URL = 'YOUR_SUPABASE_URL';
   const SUPABASE_KEY = 'YOUR_SUPABASE_KEY';
   ```

## Setup

1. Create a Discord webhook:
   - Go to your Discord server settings
   - Select "Integrations" → "Webhooks"
   - Click "New Webhook"
   - Copy the webhook URL

2. Configure the script:
   - Click the ⚙️ button in the bottom-right corner of the game interface
   - Paste your Discord webhook URL
   - Customize the display name and avatar (optional)
   - Configure event categories and colors
   - Test the webhook connection

## Event Categories

| Category | Description | Default Color |
|----------|-------------|---------------|
| New Missions | New mission cards appear | #43B581 |
| Speaking Requests | Vehicles request manual instructions | #FAA61A |
| Incomplete Missions | Missions started but missing required vehicles | #F04747 |
| Special Requirements | Missions requiring NEF, RTH, LNA, OrgL, or SEG | #7289DA |
| Mission Changes | Additional vehicles requested or conditions changed | #5865F2 |
| Large Missions | Missions with multiple vehicle requirements | #EB459E |
| Patient Transports | Patient transport missions (can be disabled) | #57F287 |

## Development

### Project Structure
```
lss-webhook-notifier/
├── lss-webhook-notifier.user.js    # Main script
├── settings-modal.js               # Settings UI
├── event-detector.js              # Event monitoring
├── README.md                      # Documentation
├── docs/
│   └── FAQ.md                     # Common questions
└── LICENSE                        # MIT License
```

### Building
1. Clone the repository
2. Install dependencies (if any)
3. Make your changes
4. Test in Tampermonkey
5. Submit a pull request

## Security

- Webhook URLs are encrypted using AES-GCM (256-bit)
- Encryption key is derived from the user ID
- All data is stored securely in Supabase
- No external authentication required

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have questions, please:
1. Check the [FAQ](docs/FAQ.md)
2. Search existing [issues](https://github.com/yourusername/lss-webhook-notifier/issues)
3. Create a new issue if needed

## Screenshots

[Add screenshots of the settings interface and Discord notifications here] 