/*
 * winston-mailgun.js: Winston Transport for MailGun
 *
 * (C) 2015 Josh Madewell
 * MIT License
 */
var util    = require('util');
var os      = require('os');
var mailgun = require('mailgun-js');
var winston = require('winston');

/**
 * @constructs MailGun
 * @param {object} Object containing all the options for transport.
 */

var MailGun = exports.MailGun = function (options) {
  options = options || {};

  if (!options.to){
    throw new Error("winston-mailgun requires 'to' property");
  }

  if (!options.apiKey) {
    throw new Error("winston-mailgun requires 'apiKey' property");
  }

  if (!options.domain) {
    throw new Error("winston-mailgun requires 'domain' property");
  }

  this.to         = options.to;
  this.from       = options.from                   || "winston@" + os.hostname();
  this.level      = options.level                  || 'info';
  this.silent     = options.silent                 || false;
  this.subject    = options.subject

  this.handleExceptions = options.handleExceptions || false;
  this.mailgun = mailgun({
    apiKey          : options.apiKey,
    domain          : options.domain,
    proxy           : options.proxy,
    timeout         : options.timeout
  });
};

util.inherits(MailGun, winston.Transport);
winston.transports.MailGun = MailGun;

/**
 * Winston requires log function to be exposed on all
 * transports. This is the core logging functionality
 * for winston-mailgun transport.
 *
 * @function log
 * @param level {String} Level to log msg for.
 * @param msg {String} String message that will be logged.
 * @param meta {Object} Optional meta data to log into the body of the email.
 * @param callback {function} Callback to winston.
 */
MailGun.prototype.log = function (level, msg, meta, callback) {
  var self = this;
  if (this.silent) return callback(null, true);

  var body = msg;
  var attachment;
  // add meta info into the body if not empty
  if (meta !== null && meta !== undefined && (typeof meta !== 'object' || Object.keys(meta).length > 0)) {
    if (typeof meta.attachment !== 'undefined') {
      if (typeof meta.attachment === 'string') {
        attachment = meta.attachment;
      } else if (typeof meta.attachment.data !== 'undefined') {
        attachment = new this.mailgun.Attachment(meta.attachment);
      } else {
        body += "\n\n" + util.inspect(meta, {depth: 5});
      }
    } else {
      body += "\n\n" + util.inspect(meta, {depth: 5});
    }
  }

  var msgOptions = {
    from: this.from,
    to: this.to,
    subject: this.subject,
    text: body,
    attachment: attachment
  };

  this.mailgun.messages().send(msgOptions, function (err, body) {
    if (err) self.emit('error', err);
    self.emit('logged');
    callback(null, true);
  });
};
