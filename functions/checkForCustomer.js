'use strict';

let jsonata = require('jsonata');

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
      filter: [],
      setSize: 2
    };

    console.log("Processing Business References");
    this.channelProfile.customerBusinessReferences.forEach(function (businessReference) {
      console.log(`Processing ${businessReference}`);
      let expression = jsonata(businessReference);
      let value = expression.evaluate(payload.doc);
      if (value) {
        let obj = {};
        let lookup = businessReference.split('.').pop();
        console.log(`Filter Field: ${lookup}`);
        console.log(`Filter Criteria: ${value}`);
        obj["Field"] = lookup;
        obj["Criteria"] = value;
        args.filter.push(obj);
      } else {
        console.log(`WARN: Could not find a value for businessReference: ${businessReference}`);
      }
    });

    console.log(`Customer Service Name: ${this.customerServiceName}`);

    console.log(`Using URL [${this.customerUrl}]`);

    return new Promise((resolve, reject) => {
       this.soap.createClient(this.customerUrl, this.options, ((err, client) => {
         if (!err) {
           client.ReadMultiple(args, (function(error, body, envelope, soapHeader) {
             if (!error) {
               if (!body.ReadMultiple_Result) {
                 // If ReadMultiple_Result is undefined, no results were returned
                 console.log("body.ReadMultiple_Result returned empty.");
                 out.statusCode = 204;
               } else if (Array.isArray(body.ReadMultiple_Result[this.customerServiceName])) {
                 // If an array is returned, multiple customers were found
                 console.log(`body.ReadMultiple_Result returned multiple customers. Count: ${body.ReadMultiple_Result[this.customerServiceName].length}`);
                 out.statusCode = 409;
                 out.payload.error = body;
               } else if (typeof body.ReadMultiple_Result[this.customerServiceName] === 'object') {
                 // If an object is returned, one customer was found
                 console.log(`body.ReadMultiple_Result returned 1 customer.`);
                 console.log(`Customer: ${body.ReadMultiple_Result[this.customerServiceName]}`);
                 out.statusCode = 200;
                 out.payload = {
                   customerRemoteID: body.ReadMultiple_Result[this.customerServiceName].No,
                   customerBusinessReference: nc.extractBusinessReference(this.channelProfile.customerBusinessReferences, body.ReadMultiple_Result)
                 };
               } else {
                 // Unexpected case
                 console.log(`Unexpected result: ${body}`)
                 out.statusCode = 400;
                 out.errors.push(body);
               }

               resolve(out);
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
