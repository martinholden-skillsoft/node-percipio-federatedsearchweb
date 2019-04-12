// Handle home
const view = (req, res) => {
  res.render('home', { title: 'Percipio Search Example' });
};

module.exports = {
  view
};
