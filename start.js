const app = require('./app');

const server = app.listen(3000, () => {
  // eslint-disable-next-line no-console
  console.log(`Express is running on port ${server.address().port}`);
});
