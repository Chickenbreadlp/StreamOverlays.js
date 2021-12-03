'use strict'

import * as path from "path";
import { app, protocol, BrowserWindow, ipcMain, dialog } from 'electron'
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
import installExtension, { VUEJS_DEVTOOLS } from 'electron-devtools-installer'
import { title } from '../package.json';

import * as constants from '@/constants';
import * as config from '@/nodeContext/config';
import * as streamlets from '@/nodeContext/streamlets';
import * as serviceManager from '@/nodeContext/serviceManager';

const isDevelopment = constants.isDevelopment;

streamlets.setup(config, serviceManager);
serviceManager.setup(config, streamlets.broadcastData);

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } }
])

let win;

// Function to close all servers & listeners and then force-quit Electron
function quitApp() {
  streamlets.closeAll().then(() => {
    process.exit(0);
  });
}

async function createWindow() {
  await streamlets.checkPorts().then(async () => {
    // Create the browser window.
    win = new BrowserWindow({
      width: 1000,
      minWidth: 640,
      height: 700,
      minHeight: 480,
      webPreferences: {
        devTools: isDevelopment,
        // Use pluginOptions.nodeIntegration, leave this alone
        // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
        nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION,
        contextIsolation: !process.env.ELECTRON_NODE_INTEGRATION,
        preload: path.join(__dirname, 'preload.js')
      },
      frame: false
    });

    if (process.env.WEBPACK_DEV_SERVER_URL) {
      // Load the url of the dev server if in development mode
      await win.loadURL(process.env.WEBPACK_DEV_SERVER_URL);
      if (!process.env.IS_TEST) win.webContents.openDevTools();
    } else {
      createProtocol('app')
      // Load the index.html when not in development
      win.loadURL('app://./index.html');
    }

    if (!streamlets.isServiceRunning()) {
      streamlets.startAll();
    }

    win.addListener("maximize", () => {
      win.webContents.send('maximize', true);
    });
    win.addListener('unmaximize', () => {
      win.webContents.send('maximize', false);
    });
  }).catch(() => {
    dialog.showMessageBoxSync({
      type: 'error',
      buttons: ['OK'],
      title: 'Ports in use!',
      message: `For ${title} to function correctly, the following ports need to be available: ${process.env.VUE_APP_REQUIRED_PORTS}
Since one or more of these ports seems to be in use, this application will now quit.`
    });
    quitApp();
  });
}

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  quitApp();
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  if (isDevelopment && !process.env.IS_TEST) {
    // Install Vue Devtools
    try {
      await installExtension(VUEJS_DEVTOOLS)
    } catch (e) {
      console.error('Vue Devtools failed to install:', e.toString())
    }
  }
  createWindow()
})

// Configure IPC functions to minimize and maximize window
ipcMain.on('close', () => {
  if (win) {
    const res = dialog.showMessageBoxSync(
        win,
        {
          type: 'question',
          buttons: ['no', 'yes'],
          defaultId: 1,
          title: 'Are you sure?',
          message: `Closing this window will also stop all streamlets from working until ${title} restarted.\nDo you want to proceed?`
        }
    )

    if (res === 1) {
      quitApp();
    }
  }
});
ipcMain.on('minimize', () => {
  if (win) {
    win.minimize();
  }
});
ipcMain.on('maximize', (event, args) => {
  if (win) {
    if (args) {
      win.maximize();
    }
    else {
      win.unmaximize();
    }
  }
});

// Other IPC functions
ipcMain.on('auth', (event, args) => {
  if (win && constants.isSupported(args.service)) {
    const response = {
      type: args.cmd,
      service: args.service,
      channel: args.channel
    }

    switch (args.cmd) {
      case 'request':
        if (serviceManager.getCurrentService() === args.service) {
          serviceManager.api.requestToken(win, args.channel).then((data) => {
            response.data = data;
          }).catch(() => {
            response.error = 'Cancelled Token Request';
          }).finally(() => {
            win.webContents.send('auth', response);
          });
        }
        else {
          response.error = 'Service not active!';
          win.webContents.send('auth', response);
        }
        break;
      case 'load':
        if (serviceManager.getCurrentService() === args.service) {
          config.token.set(args.service, args.channel, args.token);
          serviceManager.api.getUserInfo(args.token).then(info => {
            config.userInfo.set(args.service, args.channel, info);

            serviceManager.reconnectSockets();

            response.info = info;
          }).catch(() => {
            response.error = 'Token invalidated';
          }).finally(() => {
            win.webContents.send('auth', response);
          });
        }
        else {
          response.error = 'Service not active!';
          win.webContents.send('auth', response);
        }
        break;
      case 'clear':
        config.token.set(args.service, args.channel, null);
        break;
    }
  }
})
ipcMain.on('service', (event, args) => {
  if (win && constants.isSupported(args.service)) {
    const response = {
      type: args.cmd,
      service: args.service
    }

    if (args.cmd === 'switch') {
      console.log('Service switch requested', args.service);
      serviceManager.setService(args.service);

      win.webContents.send('service', response);
    }
  }
})

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === 'win32') {
    process.on('message', (data) => {
      if (data === 'graceful-exit') {
        quitApp();
      }
    })
  } else {
    process.on('SIGTERM', () => {
      quitApp();
    })
  }
}
