'use strict';

const request = require('request');

class RegRu {
  constructor () {
    this.apiUrl = 'https://api.reg.ru/api/regru2';
  }

  /**
   * Update alias record
   * @param username
   * @param password
   * @param domain
   * @param hostName
   * @param newIpAddress
   * @return {Promise}
   */
  updateRecord(username, password, domain, hostName, newIpAddress) {
    let params = {
      username: username,
      password: password,
      domain_name: domain,
      subdomain: hostName,
      ipaddr: newIpAddress
    };
    return this
      .removeRecord(username, password, domain, hostName)
      .then(() => this.makeRequest('/zone/add_alias', params))
  }

  /**
   * Remove record
   * @param username
   * @param password
   * @param domain
   * @param hostName
   * @return {Promise}
   */
  removeRecord(username, password, domain, hostName) {
    let params = {
      username: username,
      password: password,
      domain_name: domain,
      subdomain: hostName,
      record_type: 'A'
    };
    return this
      .makeRequest('/zone/remove_record', params)
  }
  
  checkAccess(domain) {
    let params = {
      domain_name: domain
    };
    return this
      .makeRequest('/zone/nop', params);
  }
  
  /**
   * Make request to reg.ru server
   * @param {string} endpoint
   * @param {object} [params]
   */
  makeRequest(endpoint, params) {
    params.io_encoding = "utf8";
    params.output_format = 'json';
    
    let url = this.apiUrl + endpoint;
    url += '?input_format=json&output_format=json&show_input_params=0&input_data=' + JSON.stringify(params);
    
    return new Promise((resolve, reject) => {
      request(url, (err, response, body) => {
        if (err) {
          return reject({error: 1, message: 'Connection problem: ' + err.message ? err.message : err});
        }
        let json = JSON.parse(body);
        if (!json) {
          return reject({error: 2, message: 'Can\'t parse body to JSON', body});
        }
        if (json.result && json.result != 'success') {
          return reject({error: 3, message: 'API error response', json});
        }
        resolve({response, body, json});
      });
    });
  }
}

module.exports = RegRu;
