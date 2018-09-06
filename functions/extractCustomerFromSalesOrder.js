
'use strict';

module.exports = function (flowContext, payload) {
  let out = {
    errors: []
  };

  if (!nc.isNonEmptyString(this.customerServiceName)) {
    out.errors.push("The customerServiceName is missing.")
    out.statusCode = 400;
    return Promise.reject(out);
  }

  if (payload.doc[this.customerServiceName]) {
    out.payload = payload.doc[this.customerServiceName];
    out.statusCode = 200;
  } else {
    out.statusCode = 204;
  }

  return Promise.resolve(out);
};
