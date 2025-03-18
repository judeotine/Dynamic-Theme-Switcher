import * as vscode from 'vscode';
import { CronJob } from 'cron';

export function activate(context: vscode.ExtensionContext) {
  console.log('Dynamic Theme Switcher is now active!');

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

  // Parse nightTime and dayTime into hour and minute
  const [nightHour, nightMinute] = nightTime.split(':').map(Number);
  const [dayHour, dayMinute] = dayTime.split(':').map(Number);

  // Create cron jobs with the correct format
  const nightJob = new CronJob(`${nightMinute} ${nightHour} * * *`, () => changeTheme(nightTheme));
  const dayJob = new CronJob(`${dayMinute} ${dayHour} * * *`, () => changeTheme(dayTheme));

  nightJob.start();
  dayJob.start();

  // Zen Mode: Minimal UI
  vscode.workspace.onDidChangeConfiguration((e: vscode.ConfigurationChangeEvent) => {
    if (e.affectsConfiguration('workbench.zenMode')) {
      const workbenchConfig = vscode.workspace.getConfiguration('workbench');
      const isZenModeEnabled = workbenchConfig.get('zenMode');
      if (isZenModeEnabled) {
        changeTheme('Default Light+'); 
      }
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
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #f9fafb;
          padding: 20px;
          color: #1f2937;
        }
        .container {
          max-width: 400px;
          margin: 0 auto;
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        h1 {
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 20px;
          color: #111827;
        }
        label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 8px;
          color: #374151;
        }
        select, input[type="time"], input[type="checkbox"] {
          width: 100%;
          padding: 8px;
          margin-bottom: 16px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 14px;
          color: #1f2937;
          background-color: #f9fafb;
        }
        input[type="checkbox"] {
          width: auto;
          margin-right: 8px;
        }
        button {
          width: 100%;
          padding: 10px;
          background-color: #3b82f6;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        button:hover {
          background-color: #2563eb;
        }
      </style>
    </head>
    <body>
      <div class="container">
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
      </div>

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