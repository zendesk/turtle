var winston = require('winston');

module.exports = function(namespace) {

  return winston.loggers.get(namespace, {
    console: {
      level: 'debug',
      colorize: false
    }
  });

};