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

  // Set Default Method Name
  let orderMethodName = "Create";

  if (flowContext.orderMethodName && nc.isNonEmptyString(flowContext.orderMethodName)) {
    orderMethodName = flowContext.orderMethodName;
  }

  if (!invalid) {
    let args = {};
    args[this.orderServiceName] = payload.doc[this.orderServiceName];

    this.info(`Order Service Name: ${this.orderServiceName}`);

    this.info(`Using URL [${this.orderUrl}]`);

    this.opts = {
      url: this.orderUrl,
      username: this.username,
      password: this.password,
      domain: this.domain,
      workstation: this.workstation
    };

    return new Promise((resolve, reject) => {
      this.soap.ntlm.handshake(this.soap.request, this.opts).then(options => {
        this.options.wsdl_options = options;
        this.soap.createClient(this.orderUrl, this.options, ((err, client) => {
         if (!err) {
           let m = this.nc.checkMethod(client, orderMethodName);

           if (!m) {
             out.statusCode = 400;
             out.errors.push(`The provided sales order endpoint method name "${orderMethodName}" does not exist. Check your configuration.`);
             reject(out);
           } else {
             this.soap.ntlm.handshake(this.soap.request, this.opts).then(options => {
               client[orderMethodName](args, ((error, body) => {
                 if (!error) {
                   if (typeof body !== 'undefined') {
                     console.log(body);
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
