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

  // Set Default Method Names
  let getMethodName = "Read";
  let updateMethodName = "Update";

  if (flowContext.getMethodName && nc.isNonEmptyString(flowContext.getMethodName)) {
      getMethodName = flowContext.getMethodName;
  }

  if (flowContext.updateMethodName && nc.isNonEmptyString(flowContext.updateMethodName)) {
      updateMethodName = flowContext.updateMethodName;
  }

  if (!invalid) {
    let args = {};

    if (flowContext.customerIsCodeUnit) {
      args[flowContext.updateCustomerNoField] = payload.customerRemoteID;
    } else {
      args["No"] = payload.customerRemoteID;
    }

    this.info(`Customer Service Name: ${this.customerServiceName}`);

    this.info(`Using URL [${this.customerUrl}]`);

    return new Promise((resolve, reject) => {
      this.soap.createClient(this.customerUrl, this.options, (function(err, client) {
        if (!err) {
          let m = this.nc.checkMethod(client, getMethodName);

          if (!m) {
            out.statusCode = 400;
            out.errors.push(`The provided GET customer endpoint method name "${getMethodName}" does not exist. Check your configuration.`);
            reject(out);
          } else {
            client[getMethodName](args, (function (error, body) {
              if (!error) {
                if (body) {
                  let doc = JSON.parse(JSON.stringify(payload.doc));
                  if (!flowContext.customerIsCodeUnit) {
                    doc["Customer"].Key = body["Customer"].Key;
                  }

                  let n = this.nc.checkMethod(client, updateMethodName);

                  if (!n) {
                    out.statusCode = 400;
                    out.errors.push(`The provided UPDATE customer endpoint method name "${updateMethodName}" does not exist. Check your configuration.`);
                    reject(out);
                  } else {
                    client[updateMethodName](doc, (function (error, body) {
                      if (!error) {
                        if (typeof body !== 'undefined') {
                          out.statusCode = 200;
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
                    }).bind(this));
                  }
                } else {
                  out.statusCode = 400;
                  out.errors.push(body);
                  reject(out);
                }
              } else {
                reject(this.handleOperationError(error));
              }
              }).bind(this));
          }
        } else {
          reject(this.handleClientError(err));
        }
      }).bind(this));
    });
  } else {
    return Promise.reject(out);
  }
};
