const { app, BrowserWindow, ipcMain, Notification } = require('electron');
const path = require('path');
const axios = require('axios');
const fs = require('fs');
const { parse } = require('csv-parse');
const { stringify } = require('csv-stringify');
const cheerio = require('cheerio');
const beep = require('beepbeep');
const { dialog } = require('electron');

app.disableHardwareAcceleration();

async function createWindow() {
  mainWindow = new BrowserWindow({
    // autoHideMenuBar: true,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  try {
    await mainWindow.loadFile('page/home.html');
  } catch (error) {
    console.log(error.message);
  }
}

app
  .whenReady()
  .then(async () => {
    await createWindow();

    app.on('activate', async function () {
      if (BrowserWindow.getAllWindows().length === 0) await createWindow();
    });
  })
  .catch(error => {
    console.log(error.message);
  });

app.on('window-all-closed', async function () {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('handle-convert', async (event, filepath) => {
  const fileWrite = 'shopify_item_' + Date.now() + '.csv';

  function convertToSlug(Text) {
    return Text.toLowerCase()
      .replace(/ /g, '-')
      .replace(/[^\w-]+/g, '');
  }

  const columns = [
    'Handle',
    'Title',
    'Body (HTML)',
    'Vendor',
    'Product Category',
    'Type',
    'Tags',
    'Published',
    'Option1 Name',
    'Option1 Value',
    'Option2 Name',
    'Option2 Value',
    'Option3 Name',
    'Option3 Value',
    'Variant SKU',
    'Variant Grams',
    'Variant Inventory Tracker',
    'Variant Inventory Qty',
    'Variant Inventory Policy',
    'Variant Fulfillment Service',
    'Variant Price',
    'Variant Compare At Price',
    'Variant Requires Shipping',
    'Variant Taxable',
    'Variant Barcode',
    'Image Src',
    'Image Position',
    'Image Alt Text',
    'Gift Card',
    'SEO Title',
    'SEO Description',
    'Google Shopping / Google Product Category',
    'Google Shopping / Gender',
    'Google Shopping / Age Group',
    'Google Shopping / MPN',
    'Google Shopping / AdWords Grouping',
    'Google Shopping / AdWords Labels',
    'Google Shopping / Condition',
    'Google Shopping / Custom Product',
    'Google Shopping / Custom Label 0',
    'Google Shopping / Custom Label 1',
    'Google Shopping / Custom Label 2',
    'Google Shopping / Custom Label 3',
    'Google Shopping / Custom Label 4',
    'Variant Image',
    'Variant Weight Unit',
    'Variant Tax Code',
    'Cost per item',
    'Price / International',
    'Compare At Price / International',
    'Status',
  ];

  dialog
    .showSaveDialog({
      title: 'Select the File Path to save',
      defaultPath: path.join(__dirname, '../assets/sample.txt'),
      buttonLabel: 'Save',
      filters: [
        {
          name: 'CSV Files',
          extensions: ['csv'],
        },
      ],
      properties: [],
    })
    .then(file => {
      if (!file.canceled) {
        const stringifier = stringify({ header: true, columns: columns });
        let totalDone = 0;
        fs.createReadStream(filepath)
          .pipe(parse({ delimiter: ',', from_line: 2 }))
          .on('data', async function (row) {
            try {
              const title = row[1];
              const handle = convertToSlug(title);
              const urlEbay = row[2] || '';

              const { data } = await axios.get(urlEbay, {
                headers: {
                  'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.246',
                },
              });
              const $ = cheerio.load(data);

              const listItems = $('.ux-image-carousel-item');

              let example = [
                'Handle',
                'Title', // 1
                'Body (HTML)', //2
                '',
                '',
                '',
                '',
                'TRUE', //7
                'Title', // 8
                'Default Title', // 9
                '',
                '',
                '',
                '',
                '',
                '0', // 15
                'shopify', //16
                'Variant Inventory Qty', //17
                'deny', //18
                'manual', //19
                'Variant Price', //20
                'Variant Price compare', //21
                'TRUE', //22
                'TRUE', //23
                '',
                'Image Src', //25
                'Image Position', // 26
                '',
                'FALSE', //28
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                'kg', // 45
                '',
                '',
                '',
                '',
                'active', // 50
              ];

              example[0] = handle;
              example[1] = title;
              example[2] = title + ' description';
              example[17] = row[4]; // quantity
              example[20] = row[7]; // price
              example[21] = row[10]; // price compare

              listItems.each((index, el) => {
                let src = $(el).find('img').attr('src');

                if (!src) src = $(el).find('img').attr('data-src');

                if (index != 0) {
                  example[1] = '';
                  example[2] = '';
                  example[7] = '';
                  example[8] = '';
                  example[9] = '';
                  example[15] = '';
                  example[16] = '';
                  example[17] = '';
                  example[18] = '';
                  example[19] = '';
                  example[20] = '';
                  example[21] = '';
                  example[22] = '';
                  example[23] = '';
                  example[28] = '';
                  example[45] = '';
                  example[50] = '';
                }

                example[25] = src;
                example[26] = index + 1;

                stringifier.write(example);
              });
              totalDone += 1;
            } catch (error) {
              console.log('Error ' + row[0]);
              // console.log(error);
            }
          });

        const writableStream = fs.createWriteStream(file.filePath.toString());
        stringifier.pipe(writableStream);
      }
    })
    .then(() => {
      showNotification('Done', 'Done');
    })
    .catch(err => {
      console.log(err);
    });
});

function showNotification(NOTIFICATION_TITLE, NOTIFICATION_BODY) {
  new Notification({ title: NOTIFICATION_TITLE, body: NOTIFICATION_BODY }).show();
}
