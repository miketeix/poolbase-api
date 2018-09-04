const path = require('path');
const favicon = require('serve-favicon');
const compress = require('compression');
const cors = require('cors');
const helmet = require('helmet');
const bodyParser = require('body-parser');

const feathers = require('feathers');
const configuration = require('feathers-configuration');
const hooks = require('feathers-hooks');
const rest = require('feathers-rest');

import socketsConfig from './socketsConfig';
import logger from './utils/logger';

const handler = require('feathers-errors/handler');
const notFound = require('feathers-errors/not-found');

import middleware from './middleware';
import services from './services';
import appHooks from './app.hooks';
import authentication from './authentication';
import blockchain from './blockchain';

const mongoose = require('./mongoose');

const app = feathers();

// Load app configuration
app.configure(configuration());

// Enable and configure CORS, security, compression, favicon and body parsing
let origin;

app.get('env') === 'production' ? origin = app.get('dappUrl') : origin = "*";
console.log('origin', origin);

var corsOptions = {
  origin: origin,
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}


app.use(cors(corsOptions));

app.use(helmet());
app.use(compress());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({
    limit: '10mb',
    extended: true
}));

app.use(favicon(path.join(app.get('public'), 'favicon.ico')));
// Host the public folder
app.use('/', feathers.static(app.get('public')));

// Set up Plugins and providers
app.configure(hooks());
app.configure(mongoose);
app.configure(rest());
app.configure(socketsConfig);

app.configure(logger);

// Configure other middleware (see `middleware/index.js`)
app.configure(middleware);
app.configure(authentication);
// Set up our services (see `services/index.js`)
app.configure(services);
// blockchain must be initialized after services
app.configure(blockchain);
// Configure a middleware for 404s and the error handler
app.use(notFound());
app.use(handler());

app.hooks(appHooks);

const { percentFee } = app.get('poolbase');

// set standard fee in database from config if not already there
app.service('fees').patch(1, {
  type: 'standard',
  percent: percentFee,
}, {
  mongoose: { upsert: true }  
});
module.exports = app;
