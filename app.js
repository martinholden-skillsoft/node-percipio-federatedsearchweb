const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');

const home = require('./routes/home');
const rss = require('./routes/rss');
const slack = require('./routes/slack');
const percipioProxy = require('./proxies/percipioProxy');

const signVerification = require('./slack/signVerification');

const app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// parse form data
app.use(bodyParser.urlencoded({ extended: true }));
// parse application/json
app.use(bodyParser.json());

app.use(express.static('public'));
app.use('/', home);
app.use('/rss', rss);

app.use('/slack', signVerification, slack);
// app.use('/slack', slack);

app.use('/percipio', percipioProxy.percipio);

module.exports = app;
