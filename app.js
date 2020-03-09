const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');

const home = require('./routes/home');
const rss = require('./routes/rss');
const slack = require('./routes/slack');
const slackDelayed = require('./routes/slackDelayed');
const percipioProxy = require('./proxies/percipioProxy');

const caseInsensitiveQueryString = require('./middleware/caseInsensitiveQueryString');
const verifySlackSignature = require('./middleware/slack/verifySlackSignature');

const slackSigningSecret = process.env.SLACK_SIGNING_SECRET;

if (!slackSigningSecret) {
  throw new Error('SLACK_SIGNING_SECRET environment variable is not defined');
}

const app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// parse form data
app.use(bodyParser.urlencoded({ extended: true }));
// parse application/json
app.use(bodyParser.json());

app.use(express.static('public'));
app.use('/', home);
app.use('/rss', caseInsensitiveQueryString, rss);

app.use('/slack', verifySlackSignature(slackSigningSecret), slack);
app.use('/slack2', verifySlackSignature(slackSigningSecret), slackDelayed);
// app.use('/slack', slack);

app.use('/percipio', percipioProxy.percipio);

module.exports = app;
