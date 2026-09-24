/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron';
import { Browser, chromium, Page } from 'playwright';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import ExcelJS from 'exceljs';

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

ipcMain.on('ipc-example', async (event, arg) => {
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.reply('ipc-example', msgTemplate('pong'));
});

type Store = {
  name: string;
  url: string;
};

type Product = {
  name: string | null;
  isSoldOut: boolean;
};

const getProductsFromStore = async (
  page: Page,
): Promise<Product[]> => {
  const items = page.locator(
    '[data-test-id="horizontal-item-card"]',
  );

  return items.evaluateAll((elements) => {
    return elements.map((element) => {
      const nameElement = element.querySelector(
        '[data-test-id="horizontal-item-card-header"]',
      );

      const availabilityElement = element.querySelector(
        '[data-size="small"]',
      );

      return {
        name: nameElement?.textContent?.trim() ?? null,
        isSoldOut:
          availabilityElement?.textContent?.trim() === 'Elfogyott',
      };
    });
  });
};

const getStoreProducts = async (
  browser: Browser,
  store: Store,
): Promise<Product[]> => {
  const page = await browser.newPage();

  await page.goto(store.url, {
    timeout: 100000,
    waitUntil: 'domcontentloaded',
  });

  const products = await getProductsFromStore(page);

  await page.close();

  return products;
};

ipcMain.handle('get-page-html', async () => {
  const urls: Store[] = [
    {
      name: 'Deák',
      url: 'https://wolt.com/hu/hun/budapest/restaurant/pesti-pipi-i-deak-ter',
    },
    {
      name: 'Corvin',
      url: 'https://wolt.com/hu/hun/budapest/restaurant/pesti-pipi-corvin',
    },
    {
      name: 'Westend',
      url: 'https://wolt.com/hu/hun/budapest/restaurant/pesti-pipi-westend',
    },
    {
      name: 'Keleti',
      url: 'https://wolt.com/hu/hun/budapest/restaurant/pesti-pipi-i-keleti',
    },
    {
      name: 'Thököly',
      url: 'https://wolt.com/hu/hun/budapest/restaurant/pesti-pipi-thokoly',
    },
    {
      name: 'Stadion',
      url: 'https://wolt.com/hu/hun/budapest/restaurant/pesti-pipi-stadion',
    },
    {
      name: 'Campona',
      url: 'https://wolt.com/hu/hun/budapest/restaurant/pesti-pipi-campona',
    },
    {
      name: 'Pólus',
      url: 'https://wolt.com/hu/hun/budapest/restaurant/pesti-pipi-polus',
    },
    {
      name: 'Újpest',
      url: 'https://wolt.com/hu/hun/budapest/restaurant/pesti-pipi-ujpest-bp',
    },
    {
      name: 'Remiz (Kispest)',
      url: 'https://wolt.com/hu/hun/budapest/restaurant/pesti-pipi-19-ker-remiz',
    },
    {
      name: 'Vác',
      url: 'https://wolt.com/hu/hun/vac/restaurant/pesti-pipi-vac'
    }
  ];

  const browser = await chromium.launch({
    headless: true,
  });

  const result: Record<string, Record<string, boolean>> = {};

  for (const store of urls) {
    const products = await getStoreProducts(browser, store);

    for (const product of products) {
      if (!product.name) continue;

      if (!result[product.name]) {
        result[product.name] = {};
      }

      result[product.name][store.name] = !product.isSoldOut;
    }
  }

  await browser.close();

  return result;
});

const generateExcel = async (
  result: Record<string, Record<string, boolean>>,
  filePath: string,
) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Üzletek');

  const stores = [
    'Campona',
    'Corvin',
    'Deák',
    'Keleti',
    'Pólus',
    'Remiz (Kispest)',
    'Stadion',
    'Thököly',
    'Újpest',
    'Westend',
    'Vác',
  ];

  worksheet.addRow([
    'Üzletek:',
    ...stores,
  ]);

  for (const [productName, storeAvailability] of Object.entries(result)) {
    const row = worksheet.addRow([
      productName,
      ...stores.map((store) => {
        const available = storeAvailability[store];

        if (available === undefined) {
          return 'Nincsen';
        }

        return available ? 'Bekapcsolva' : 'Kikapcsolva';
      }),
    ]);

    stores.forEach((store, index) => {
      const cell = row.getCell(index + 2);
      const available = storeAvailability[store];

      if (available === true) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: {
            argb: 'C6EFCE',
          },
        };
      }

      if (available === false) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: {
            argb: 'FFC7CE',
          },
        };
      }
    });
  }

  worksheet.getColumn(1).width = 45;

  stores.forEach((_, index) => {
    worksheet.getColumn(index + 2).width = 18;
  });

  worksheet.getRow(1).font = {
    bold: true,
  };

  await workbook.xlsx.writeFile(filePath);
};

ipcMain.handle(
  'save-excel',
  async (
    _event,
    result: Record<string, Record<string, boolean>>,
  ) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Excel mentése',
      defaultPath: 'pipi-eredmeny.xlsx',
      filters: [
        {
          name: 'Excel fájl',
          extensions: ['xlsx'],
        },
      ],
    });

    if (canceled || !filePath) {
      return false;
    }

    await generateExcel(result, filePath);

    return true;
  },
);

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

// if (isDebug) {
//   require('electron-debug').default();
// }

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
