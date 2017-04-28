'use strict';

const http = require('http');
const crypto = require('crypto');
const URL = require('url');
const RegRuApi = require('./reg-ru-api');
const config = require('./config.json');

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
  console.log('Requested change:', url.query.provider,
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
    console.error('Request rejected: bad_signature');
    return response.end('bad_signature');
  }
  if (url.query.provider === 'regru') {
    regruApi.updateRecord(url.query.username,
                          config.regru[url.query.username].password,
                          record.domain,
                          record.host,
                          url.query.ip)
      .then(() => {
        console.log('Zone updated');
        response.end('ok');
      })
      .catch((err) => {
        console.error('Request rejected: api-error', err);
        response.end('update_fail: ' + err);
      })
  }
});

server.listen(config.server.port, (err) => {
  if (err) {
    return console.log(err);
  }
  console.log(`DDNS server is listening on ${config.server.port}`);
});

