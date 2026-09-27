// Karma sin navegador propio: el Chrome lo abre y lo emula `cdp-audit.mjs`.
const path = require('path');
const base = require(path.resolve(__dirname, '../../../../karma.conf.js'));

module.exports = function (config) {
  base(config);
  config.set({
    browsers: [],
    port: 9876,
    reporters: ['progress'],
    client: { captureConsole: false, clearContext: false, jasmine: { random: false, timeoutInterval: 300000 } },
    browserNoActivityTimeout: 600000,
  });
};
