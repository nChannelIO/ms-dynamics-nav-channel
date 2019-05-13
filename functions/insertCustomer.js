'use strict';

module.exports = function(flowContext, payload) {
  let nc = this.nc;
  let invalid = false;
  let out = {
    statusCode: 400,
    payload: {},
    errors: []
  };

  if (!nc.isNonEmptyString(this.customerUrl)) {
    invalid = true;
    out.errors.push("The customerUrl is missing.")
  }

  if (!nc.isNonEmptyString(this.customerServiceName)) {
    invalid = true;
    out.errors.push("The customerServiceName is missing.")
  }

  // Set Default Method Name
  let insertMethodName = "Create";

  if (flowContext.insertMethodName && nc.isNonEmptyString(flowContext.insertMethodName)) {
      insertMethodName = flowContext.insertMethodName;
  }

  if (!invalid) {
    let args = payload.doc;

    this.info(`Customer Service Name: ${this.customerServiceName}`);

    this.info(`Using URL [${this.customerUrl}]`);

    this.opts = {
      url: this.customerUrl,
      username: this.username,
      password: this.password,
      domain: this.domain,
      workstation: this.workstation
    };

    return new Promise((resolve, reject) => {
      this.soap.ntlm.handshake(this.soap.request, this.opts).then(options => {
        this.options.wsdl_options = options;
        this.soap.createClient(this.customerUrl, this.options, ((err, client) => {
          if (!err) {
            let m = this.nc.checkMethod(client, insertMethodName);

            if (!m) {
              out.statusCode = 400;
              out.errors.push(`The provided customer endpoint method name "${insertMethodName}" does not exist. Check your configuration.`);
              reject(out);
            } else {
              this.soap.ntlm.handshake(this.soap.request, this.opts).then(options => {
                client[insertMethodName](args, ((error, body) => {
                  if (!error) {
                    if (typeof body !== 'undefined') {
                      out.statusCode = 201;
                      out.payload = body;
                      resolve(out);
                    } else {
                      out.statusCode = 400;
                      out.errors.push(`A response body was not returned.`);
                      reject(out);
                    }
                  } else {
                    reject(this.handleOperationError(error));
                  }
                }).bind(this), options, options.headers);
              }).catch(err => {
                reject(this.handleOperationError(err));
              });
            }
          } else {
            reject(this.handleClientError(err));
          }
        }).bind(this));
      }).catch(err => {
        reject(this.handleOperationError(err));
      });
    });
  } else {
    return Promise.reject(out);
  }
};
