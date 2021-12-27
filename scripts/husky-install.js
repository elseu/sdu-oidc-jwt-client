if (process.env.CI !== 'true') {
  const husky = require('husky');
  husky.install();
}
