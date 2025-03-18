import * as vscode from 'vscode';
import { CronJob } from 'cron';

export function activate(context: vscode.ExtensionContext) {
  // Function to change the theme
	const changeTheme = (theme: string) => {
    const config = vscode.workspace.getConfiguration();
    config.update('workbench.colorTheme', theme, true).then(() => {
		vscode.window.showInformationMessage(`Theme changed to: ${theme}`);
    });
	};

  // Schedule themes based on time of day
	const config = vscode.workspace.getConfiguration('dynamicThemeSwitcher');
	const dayTheme = config.get('dayTheme', 'Default Light+');
		const nightTheme = config.get('nightTheme', 'Default Dark+');
	const nightTime = config.get('nightTime', '19:00');
	const dayTime = config.get('dayTime', '07:00');
	const enableZenMode = config.get('enableZenMode', true);

  const nightJob = new CronJob(`0 0 ${nightTime} * * *`, () => changeTheme(nightTheme));
  const dayJob = new CronJob(`0 0 ${dayTime} * * *`, () => changeTheme(dayTheme));

	nightJob.start();
	dayJob.start();

  // Zen Mode: Minimal UI
	const zenMode = vscode.workspace.getConfiguration('zenMode');
	zenMode.onDidChangeConfiguration(() => {
    if (zenMode.get('enabled')) {
      changeTheme('Default Light+'); // Use a minimal theme for Zen Mode
    }
	});

  // Webview UI
	context.subscriptions.push(
    vscode.commands.registerCommand('dynamicThemeSwitcher.openUI', () => {
	const panel = vscode.window.createWebviewPanel(
        'dynamicThemeSwitcher',
        'Dynamic Theme Switcher',
        vscode.ViewColumn.One,
        {}
	);

	panel.webview.html = getWebviewContent();

	panel.webview.onDidReceiveMessage((message) => {
        switch (message.command) {
		case 'saveSettings':
            const config = vscode.workspace.getConfiguration('dynamicThemeSwitcher');
            config.update('dayTheme', message.dayTheme, true);
            config.update('nightTheme', message.nightTheme, true);
            config.update('dayTime', message.dayTime, true);
            config.update('nightTime', message.nightTime, true);
            config.update('enableZenMode', message.enableZenMode, true);
            break;
		case 'loadSettings':
            const settings = vscode.workspace.getConfiguration('dynamicThemeSwitcher');
            panel.webview.postMessage({
			command: 'updateSettings',
				dayTheme: settings.get('dayTheme'),
			nightTheme: settings.get('nightTheme'),
			dayTime: settings.get('dayTime'),
			nightTime: settings.get('nightTime'),
			enableZenMode: settings.get('enableZenMode')
            });
            break;
        }
	});
    })
	);

  // Cleanup on deactivation
	context.subscriptions.push({
    dispose: () => {
	nightJob.stop();
	dayJob.stop();
    },
	});
}

function getWebviewContent() {
		return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Dynamic Theme Switcher</title>
	<style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        label { display: block; margin-bottom: 10px; }
        select, input { width: 100%; padding: 5px; margin-bottom: 20px; }
        button { padding: 10px 20px; background: #007acc; color: white; border: none; cursor: pointer; }
	</style>
    </head>
    <body>
	<h1>Dynamic Theme Switcher</h1>
	<label for="dayTheme">Day Theme:</label>
	<select id="dayTheme">
        <option value="Default Light+">Default Light+</option>
        <option value="Default Dark+">Default Dark+</option>
        <!-- Add more themes here -->
	</select>

	<label for="nightTheme">Night Theme:</label>
	<select id="nightTheme">
        <option value="Default Light+">Default Light+</option>
        <option value="Default Dark+">Default Dark+</option>
        <!-- Add more themes here -->
	</select>

	<label for="dayTime">Day Time:</label>
	<input type="time" id="dayTime" value="07:00">

<label for="nightTime">Night Time:</label>
	<input type="time" id="nightTime" value="19:00">

	<label>
        <input type="checkbox" id="enableZenMode" checked> Enable Zen Mode
	</label>

	<button id="save">Save Settings</button>

	<script>
        const vscode = acquireVsCodeApi();

        // Load saved settings
        vscode.postMessage({ command: 'loadSettings' });

        // Handle save button click
        document.getElementById('save').addEventListener('click', () => {
		const dayTheme = document.getElementById('dayTheme').value;
		const nightTheme = document.getElementById('nightTheme').value;
const dayTime = document.getElementById('dayTime').value;
const nightTime = document.getElementById('nightTime').value;
const enableZenMode = document.getElementById('enableZenMode').checked;

		vscode.postMessage({
            command: 'saveSettings',
            dayTheme,
            nightTheme,
            dayTime,
            nightTime,
            enableZenMode
		});
        });

        // Listen for settings updates
        window.addEventListener('message', (event) => {
	const message = event.data;
		if (message.command === 'updateSettings') {
            document.getElementById('dayTheme').value = message.dayTheme;
            document.getElementById('nightTheme').value = message.nightTheme;
            document.getElementById('dayTime').value = message.dayTime;
            document.getElementById('nightTime').value = message.nightTime;
            document.getElementById('enableZenMode').checked = message.enableZenMode;
		}
        });
	</script>
    </body>
    </html>
`;
}

export function deactivate() {}