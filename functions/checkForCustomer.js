'use strict';

let jsonata = require('jsonata');

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

    console.log(`Customer Service Name: ${node.customerServiceName}`);

    console.log(`Using URL [${node.customerUrl}]`);

    return new Promise((resolve, reject) => {
       soap.createClient(node.customerUrl, node.options, (err, client) => {
         if (!err) {
           client.ReadMultiple(args, function(error, body, envelope, soapHeader) {
             if (!error) {
               if (!body.ReadMultiple_Result) {
                 // If ReadMultiple_Result is undefined, no results were returned
                 console.log("body.ReadMultiple_Result returned empty.");
                 out.statusCode = 204;
               } else if (Array.isArray(body.ReadMultiple_Result[node.customerServiceName])) {
                 // If an array is returned, multiple customers were found
                 console.log(`body.ReadMultiple_Result returned multiple customers. Count: ${body.ReadMultiple_Result[node.customerServiceName].length}`);
                 out.statusCode = 409;
                 out.payload.error = body;
               } else if (typeof body.ReadMultiple_Result[node.customerServiceName] === 'object') {
                 // If an object is returned, one customer was found
                 console.log(`body.ReadMultiple_Result returned 1 customer.`);
                 console.log(`Customer: ${body.ReadMultiple_Result[node.customerServiceName]}`);
                 out.statusCode = 200;
                 out.payload = {
                   customerRemoteID: body.ReadMultiple_Result[node.customerServiceName].No,
                   customerBusinessReference: nc.extractBusinessReference(node.channelProfile.customerBusinessReferences, body.ReadMultiple_Result)
                 };
               } else {
                 // Unexpected case
                 console.log(`Unexpected result: ${body}`)
                 out.statusCode = 400;
                 out.errors.push(body);
               }

               resolve(out);
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
