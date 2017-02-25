var fs = require('fs')
  , ini = require('ini')
  , login = require('facebook-chat-api')

var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/sheets.googleapis.com-nodejs-quickstart.json
var SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'sheets.googleapis.com-nodejs-quickstart.json';

// Load client secrets from a local file.
fs.readFile('client_secret.json', function processClientSecrets(err, content) {
  if (err) {
    console.log('Error loading client secret file: ' + err);
    return;
  }
  // Authorize a client with the loaded credentials, then call the
  // Google Sheets API.
  authorize(JSON.parse(content), main);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  var clientSecret = credentials.installed.client_secret;
  var clientId = credentials.installed.client_id;
  var redirectUrl = credentials.installed.redirect_uris[0];
  var auth = new googleAuth();
  var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, function(err, token) {
    if (err) {
      getNewToken(oauth2Client, callback);
    } else {
      oauth2Client.credentials = JSON.parse(token);
      callback(oauth2Client);
    }
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
  var authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
  console.log('Authorize this app by visiting this url: ', authUrl);
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question('Enter the code from that page here: ', function(code) {
    rl.close();
    oauth2Client.getToken(code, function(err, token) {
      if (err) {
        console.log('Error while trying to retrieve access token', err);
        return;
      }
      oauth2Client.credentials = token;
      storeToken(token);
      callback(oauth2Client);
    });
  });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (err) {
    if (err.code != 'EEXIST') {
      throw err;
    }
  }
  fs.writeFile(TOKEN_PATH, JSON.stringify(token));
  console.log('Token stored to ' + TOKEN_PATH);
}

function main(auth) {
  var config = ini.parse(fs.readFileSync('.login', 'utf-8'))
  login({email: config.email, password: config.password}, function(err, api) {
    if (err) return console.error(err);
    api.listen(function(err, msg) {
      getResponses(auth, function(responses) {
        if (msg.body.startsWith('+lynx ')) {
          var message;
          try {
            message = responses[msg.body.split(" ")[1]].replace("[$]", msg.body.split(" ").slice(2).join(" "))
          }
          catch (err) {
            message = "Error in message '" + err + "': " 
          }
          if (msg.body.split(" ")[1] == "info") {
            message = {
              body: "Hi! I'm a customizable bot. To customize my responses, go to https://goo.gl/iXFbhT.",
              url: "https://goo.gl/iXFbhT"
            }
          }
          api.sendMessage(message, msg.threadID);
        }
      })
    })
  })
}

function getResponses(auth, callback) {
  var sheets = google.sheets('v4');
  sheets.spreadsheets.values.get({
    auth: auth,
    spreadsheetId: '1euoHs0Z0nNgPb2_UT0BYFCsOuBAE6Bxc51lXtI_J08s',
    range: 'A:B',
  }, function(err, response) {
    if (err) {
      return;
    }
    var rows = response.values;
    responses = {}
    if (rows.length == 0) {
      console.log('No responses found.');
    } else {
      for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        responses[row[0]] = row[1]
      }
    }
    if (callback) callback(responses);
  });
}
