'use strict';

module.exports = function(flowContext, payload) {
  let nc = this.nc;
  let invalid = false;
  let out = {
    statusCode: 400,
    payload: {},
    errors: []
  };

  if (!nc.isNonEmptyString(this.orderUrl)) {
    invalid = true;
    out.errors.push("The orderUrl is missing.")
  }

  if (!nc.isNonEmptyString(this.orderServiceName)) {
    invalid = true;
    out.errors.push("The orderServiceName is missing.")
  }

  if (!invalid) {
    let args = payload.doc;

    console.log(`Customer Service Name: ${this.orderServiceName}`);

    console.log(`Using URL [${this.orderUrl}]`);

    return new Promise((resolve, reject) => {
       this.soap.createClient(this.orderUrl, this.options, ((err, client) => {
         if (!err) {
           client.Create(args, ((error, body, envelope, soapHeader) => {
             if (!error) {
               if (typeof body !== 'undefined') {
                 if (body[this.orderServiceName]) {
                   out.statusCode = 201;
                   out.payload = body;
                   resolve(out);
                 } else {
                   out.statusCode = 400;
                   out.errors.push(`The order was inserted but orderServiceName does not match the wrapper of the response. ${JSON.stringify(body)}`);
                   reject(out);
                 }
               } else {
                 out.statusCode = 400;
                 out.errors.push(`A response body was not returned.`);
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
