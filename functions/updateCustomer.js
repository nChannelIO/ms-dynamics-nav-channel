'use strict';

module.exports = function(flowContext, payload) {
  let node = this;
  let nc = node.nc;
  let soap = node.soap;
  let invalid = false;
  let out = {
    statusCode: 400,
    payload: {},
    errors: []
  };

  if (!nc.isNonEmptyString(node.customerUrl)) {
    invalid = true;
    out.errors.push("The customerUrl is missing.")
  }

  if (!nc.isNonEmptyString(node.customerServiceName)) {
    invalid = true;
    out.errors.push("The customerServiceName is missing.")
  }

  if (!invalid) {
    let args = {
      No: payload.customerRemoteID
    }

    console.log(`Customer Service Name: ${node.customerServiceName}`);

    console.log(`Using URL [${node.customerUrl}]`);

    return new Promise((resolve, reject) => {
      soap.createClient(node.customerUrl, node.options, function(err, client) {
        if (!err) {
          client.Read(args, function(error, body, envelope, soapHeader) {
            if (!error) {
              if (body[node.customerServiceName]) {
                payload.doc[node.customerServiceName].Key = body[node.customerServiceName].Key;
                args = payload.doc;

                client.Update(args, function(error, body, envelope, soapHeader) {
                  if (!error) {
                    if (body[node.customerServiceName]) {
                      out.statusCode = 200;
                      out.payload = {
                        doc: body,
                        customerBusinessReference: nc.extractBusinessReference(node.channelProfile.customerBusinessReferences, body)
                      };
                      resolve(out);
                    } else {
                      out.statusCode = 400;
                      out.errors.push(`The customer was updated but customerServiceName does not match the wrapper of the response. ${JSON.stringify(body)}`);
                      reject(out);
                    }
                  } else {
                    reject(node.handleOperationError(error));
                  }
                });
              } else {
                out.statusCode = 400;
                out.errors.push(body);
                reject(out);
              }
            } else {
              reject(node.handleOperationError(error));
            }
          });
        } else {
          reject(node.handleClientError(err));
        }
      });
    });
  } else {
    return Promise.reject(out);
  }
};
