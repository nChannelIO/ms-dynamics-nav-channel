
'use strict';

module.exports = function (flowContext, payload) {
  let out = {
    errors: []
  };

  let customerObj = !this.nc.isNonEmptyString(flowContext.extractCustomerName) ? flowContext.extractCustomerName : "Customer";

  if (!payload.doc[customerObj]) {
    out.errors.push('The field to identify the customer on a sales order was not found or is missing. Check your configuration.')
    out.statusCode = 400;
    return Promise.reject(out);
  }

  if (payload.doc[customerObj]) {
    let data = {};
    data[customerObj] = payload.doc[customerObj];
    out.payload = data;
    out.statusCode = 200;
  } else {
    out.statusCode = 204;
  }

  return Promise.resolve(out);
};
