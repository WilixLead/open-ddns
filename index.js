'use strict';
const winston = require('winston');
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const URL = require('url');
const RegRuApi = require('./reg-ru-api');
const config = require('./config.json');

const log = new(winston.Logger)({
  transports: [ new (winston.transports.Console)({
    colorize: 'all',
    timestamp: true
  })
]})

const regruApi = new RegRuApi();

/**
 * Find record and check signature
 * @param provider
 * @param username
 * @param domain
 * @param host
 * @param signature
 * @return {boolean|object}
 */
function checkSignature(provider, username, domain, host, ip, signature) {
  if (!config[provider]) {
    return false;
  }
  if (!config[provider][username]) {
    return false;
  }
  if (!config[provider][username]['records'] || !config[provider][username]['records'].length) {
    return false;
  }
  let found = false;
  config[provider][username]['records'].forEach(record => {
    if (record.domain === domain && record.host === host) {
      found = record;
    }
  });
  if (!found) {
    return false;
  }
  let str = provider + username + domain + host + ip + found.secret;
  let checkSignature = crypto.createHash('md5').update(str).digest('hex');
  if (checkSignature !== signature) {
    return false;
  }
  return found;
}

const server = http.createServer((request, response) => {
  let url = URL.parse(request.url, true);
  log.debug('Requested change:', url.query.provider,
                                  url.query.username,
                                  url.query.domain,
                                  url.query.host,
                                  url.query.ip,
                                  url.query.signature);
  let record = checkSignature(url.query.provider,
                              url.query.username,
                              url.query.domain,
                              url.query.host,
                              url.query.ip,
                              url.query.signature);
  if (!record) {
    log.error('Request rejected: bad_signature');
    return response.end('bad_signature');
  }
  if (record['lastIp'] && record['lastIp'] === url.query.ip) {
    log.info('IP:', url.query.ip, 'already used');
    log.info('Zone NOT updated');
    response.end('ok');
    return;
  }
  if (url.query.provider === 'regru') {
    regruApi.updateRecord(url.query.username,
                          config.regru[url.query.username].password,
                          record.domain,
                          record.host,
                          url.query.ip)
      .then(() => {
        log.info('Zone updated');
        response.end('ok');
        record['lastIp'] = url.query.ip;
        updateConfig();
      })
      .catch((err) => {
        log.error('Request rejected: api-error', err);
        response.end('update_fail: ' + err);
      })
  }
});

function updateConfig() {
  fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
}

server.listen(config.server.port, config.server.host, (err) => {
  if (err) {
    return log.error(err);
  }
  log.info(`DDNS server is listening on ${config.server.host + ':' + config.server.port}`);
});

