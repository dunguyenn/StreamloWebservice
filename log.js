const fs = require('fs');
const moment = require('moment');
const winston = require('winston');
const env = process.env.NODE_ENV || 'development';

// Create the log directory if it does not exist
const logDir = 'log';
if (!fs.existsSync(logDir)) {
 fs.mkdirSync(logDir);
}

const tsFormat = () => moment().format();

// Configure winston default logger to log to console && file
var logger = require('winston');
logger.configure({
  transports: [
    new (winston.transports.Console)({ 
      name: 'console.log',
      timestamp: tsFormat,
      colorize: true,
      level: env === 'development' ? 'debug' : 'info',
      silent: env === 'test' ? true : false
    }),
    new (require('winston-daily-rotate-file'))({
      name: 'file.log',
      filename: `${logDir}/-results.log`,
      timestamp: tsFormat,
      datePattern: 'yyyy-MM-dd',
      prepend: true,
      level: env === 'development' ? 'debug' : 'info',
      silent: env === 'test' ? true : false,
      maxDays: 30
    })
  ]
});

module.exports=logger;