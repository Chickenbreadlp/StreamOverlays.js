'use strict'

import * as path from "path";
import { app, protocol, BrowserWindow, ipcMain, dialog } from 'electron'
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
import installExtension, { VUEJS_DEVTOOLS } from 'electron-devtools-installer'

import * as streamlets from "@/nodeContext/streamlets";

const isDevelopment = process.env.NODE_ENV !== 'production'

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } }
])

let win;

async function createWindow() {
  // Create the browser window.
  win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      
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
    await win.loadURL(process.env.WEBPACK_DEV_SERVER_URL)
    if (!process.env.IS_TEST) win.webContents.openDevTools()
  } else {
    createProtocol('app')
    // Load the index.html when not in development
    win.loadURL('app://./index.html')
  }

  if (!streamlets.isServiceRunning()) {
    streamlets.startAll();
  }

  win.addListener("maximize", () => {
    win.webContents.send('maximize', true);
  })
  win.addListener('unmaximize', () => {
    win.webContents.send('maximize', false);
  })
}

// Function to close all servers & listeners and then force-quit Electron
function quitApp() {
  streamlets.closeAll().then(() => {
    process.exit(0);
  });
}

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  quitApp();
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
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
          message: 'Closing this window will also stop all Streamlets from working until restarted.\nDo you want to proceed?'
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
