'use strict';

module.exports = function(flowContext, payload) {
  let nc = this.nc;
  let invalid = false;
  let out = {
    statusCode: 400,
    payload: [],
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
      filter: []
    };

    let obj = {};
    obj["Field"] = "No";
    obj["Criteria"] = payload.remoteIDs.join('|'); // The pipe '|' symbol is a NAV filter for 'OR'
    args.filter.push(obj);

    console.log(`Customer Service Name: ${this.customerServiceName}`);

    console.log(`Using URL [${this.customerUrl}]`);

    return new Promise((resolve, reject) => {
      this.soap.createClient(this.customerUrl, this.options, (function(err, client) {
        if (!err) {
          client.ReadMultiple(args, (function(error, body, envelope, soapHeader) {

            let docs = [];
            let data = body;

            if (!error) {
              if (!body.ReadMultiple_Result) {
                // If ReadMultiple_Result is undefined, no results were returned
                out.statusCode = 204;
                out.payload = data;
                resolve(out);
              } else {
                if (Array.isArray(body.ReadMultiple_Result[this.customerServiceName])) {
                  // If an array is returned, multiple customers were found
                  for (let i = 0; i < body.ReadMultiple_Result[this.customerServiceName].length; i++) {
                    let customer = {
                      Customer: body.ReadMultiple_Result[this.customerServiceName][i]
                    };
                    docs.push(customer);
                  }
                } else if (typeof body.ReadMultiple_Result[this.customerServiceName] === 'object') {
                  // If an object is returned, one customer was found
                  let customer = {
                    Customer: body.ReadMultiple_Result[this.customerServiceName]
                  };
                  docs.push(customer);
                }

                out.statusCode = 200;
                out.payload = docs;
                resolve(out);
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

  return Promise.reject(out);
};
