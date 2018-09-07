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

  if (!invalid) {
    let args = {
      No: payload.customerRemoteID
    }

    console.log(`Customer Service Name: ${this.customerServiceName}`);

    console.log(`Using URL [${this.customerUrl}]`);

    return new Promise((resolve, reject) => {
      this.soap.createClient(this.customerUrl, this.options, (function(err, client) {
        if (!err) {
          client.Read(args, (function(error, body, envelope, soapHeader) {
            if (!error) {
              if (body[this.customerServiceName]) {
                payload.doc[this.customerServiceName].Key = body[this.customerServiceName].Key;
                args = payload.doc;

                client.Update(args, (function(error, body, envelope, soapHeader) {
                  if (!error) {
                    if (body[this.customerServiceName]) {
                      out.statusCode = 200;
                      out.payload = {
                        doc: body,
                        customerBusinessReference: nc.extractBusinessReference(this.channelProfile.customerBusinessReferences, body)
                      };
                      resolve(out);
                    } else {
                      out.statusCode = 400;
                      out.errors.push(`The customer was updated but customerServiceName does not match the wrapper of the response. ${JSON.stringify(body)}`);
                      reject(out);
                    }
                  } else {
                    reject(this.handleOperationError(error));
                  }
                }).bind(this));
              } else {
                out.statusCode = 400;
                out.errors.push(body);
                reject(out);
              }
            } else {
              reject(this.handleOperationError(error));
            }
          }).bind(this));
        } else {
          reject(this.handleClientError(err));
        }
      }).bind(this));
    });
  } else {
    return Promise.reject(out);
  }
};
