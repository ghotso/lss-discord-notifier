# Frequently Asked Questions

## General Questions

### What is the LSS Webhook Notifier?
The LSS Webhook Notifier is a Tampermonkey script that monitors the Leitstellenspiel game interface and sends notifications to Discord when specific events occur, such as new missions, speaking requests, or special requirements.

### Is this script official?
No, this is an unofficial script created by the community. It is not affiliated with or endorsed by the Leitstellenspiel team.

### Is it safe to use?
Yes, the script is safe to use. It:
- Only reads game interface data
- Does not modify any game data
- Encrypts sensitive information
- Uses secure communication methods

## Installation

### How do I install the script?
1. Install the Tampermonkey browser extension
2. Click the installation link in the README
3. Configure your Supabase credentials
4. Set up your Discord webhook

### Do I need a Supabase account?
Yes, you need a Supabase account to store your settings securely. The free tier is sufficient for this purpose.

### How do I get my Supabase credentials?
1. Create a Supabase account at https://supabase.com
2. Create a new project
3. Go to Project Settings → API
4. Copy the URL and anon key

## Configuration

### How do I set up a Discord webhook?
1. Go to your Discord server settings
2. Select "Integrations" → "Webhooks"
3. Click "New Webhook"
4. Choose a channel and name
5. Copy the webhook URL

### Can I customize the notifications?
Yes, you can customize:
- The display name and avatar
- Colors for different event types
- Which events trigger notifications
- Whether to exclude patient transports

### How do I test if it's working?
1. Open the settings (⚙️ button)
2. Enter your webhook URL
3. Click "Test Webhook"
4. You should receive a test message in Discord

## Troubleshooting

### The script isn't working
1. Check if Tampermonkey is enabled
2. Verify your Supabase credentials
3. Ensure your Discord webhook URL is correct
4. Check the browser console for errors

### Notifications aren't appearing in Discord
1. Verify the webhook URL is correct
2. Check if the webhook is still active in Discord
3. Ensure the event category is enabled in settings
4. Try sending a test notification

### Settings aren't saving
1. Check your internet connection
2. Verify your Supabase credentials
3. Try refreshing the page
4. Check the browser console for errors

## Security

### Is my webhook URL secure?
Yes, the webhook URL is:
- Encrypted using AES-GCM (256-bit)
- Stored securely in Supabase
- Never transmitted in plain text
- Protected by row-level security

### Can others see my settings?
No, settings are:
- Tied to your user ID
- Protected by Supabase row-level security
- Encrypted when necessary
- Only accessible to you

## Support

### Where can I get help?
1. Check this FAQ
2. Search existing issues on GitHub
3. Create a new issue if needed
4. Join our Discord server (link in README)

### How do I report a bug?
1. Check if it's already reported
2. Create a new issue on GitHub
3. Include:
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Browser and script version

### Can I contribute?
Yes! We welcome contributions:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request 