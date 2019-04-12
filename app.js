const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');

const home = require('./routes/home');
const percipioProxy = require('./proxies/percipioProxy');

const app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// parse form data
app.use(bodyParser.urlencoded({ extended: true }));
// parse application/json
app.use(bodyParser.json());

app.use(express.static('public'));
app.use('/', home);

app.use('/percipio', percipioProxy.percipio);

module.exports = app;
