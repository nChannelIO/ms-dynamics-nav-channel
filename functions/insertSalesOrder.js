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

  if (!nc.isNonEmptyString(node.orderUrl)) {
    invalid = true;
    out.errors.push("The orderUrl is missing.")
  }

  if (!nc.isNonEmptyString(node.orderServiceName)) {
    invalid = true;
    out.errors.push("The orderServiceName is missing.")
  }

  if (!invalid) {
    let args = payload.doc;

    console.log(`Customer Service Name: ${node.orderServiceName}`);

    console.log(`Using URL [${node.orderUrl}]`);

    return new Promise((resolve, reject) => {
       soap.createClient(node.orderUrl, node.options, (err, client) => {
         if (!err) {
           client.Create(args, (error, body, envelope, soapHeader) => {
             if (!error) {
               if (body[node.orderServiceName]) {
                 out.statusCode = 201;
                 out.payload = {
                   doc: body,
                   orderRemoteID: body[node.orderServiceName].No,
                   orderBusinessReference: nc.extractBusinessReference(node.channelProfile.orderBusinessReferences, body)
                 };
                 resolve(out);
               } else {
                 out.statusCode = 400;
                 out.errors.push(`The order was inserted but orderServiceName does not match the wrapper of the response. ${JSON.stringify(body)}`);
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
