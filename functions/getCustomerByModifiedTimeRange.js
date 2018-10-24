'use strict';

const _ = require('lodash');

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
    let args = {};

    if (flowContext.customerIsCodeUnit) {
      if (flowContext.startDateProperty) {
        args[flowContext.startDateProperty] = payload.modifiedDateRange.startDateGMT;
      }
      if (flowContext.endDateProperty) {
        args[flowContext.endDateProperty] = payload.modifiedDateRange.endDateGMT;
      }
      if (flowContext.pageProperty) {
        args[flowContext.pageProperty] = payload.page;
      }
      if (flowContext.pageSizeProperty) {
        args[flowContext.pageSizeProperty] = payload.pageSize;
      }
    } else {
      args.filter = [];
      let obj = {};
      obj["Field"] = "Last_Modified_Date";

      if (payload.modifiedDateRange.startDateGMT && !payload.modifiedDateRange.endDateGMT) {
        obj["Criteria"] = nc.formatDate(new Date(Date.parse(payload.modifiedDateRange.startDateGMT) - 1).toISOString()) + "..";
      } else if (payload.modifiedDateRange.endDateGMT && !payload.modifiedDateRange.startDateGMT) {
        obj["Criteria"] = ".." + nc.formatDate(new Date(Date.parse(payload.modifiedDateRange.endDateGMT) + 1).toISOString());
      } else if (payload.modifiedDateRange.startDateGMT && payload.modifiedDateRange.endDateGMT) {
        obj["Criteria"] = nc.formatDate(new Date(Date.parse(payload.modifiedDateRange.startDateGMT) - 1).toISOString()) + ".." + nc.formatDate(new Date(Date.parse(payload.modifiedDateRange.endDateGMT) + 1).toISOString());
      }
      args.filter.push(obj);

      if (payload.pagingContext) {
        args.bookmarkKey = payload.pagingContext.key;
      }

      if (payload.pageSize) {
        args.setSize = payload.pageSize;
      }
    }

    // Set Default Method Name
    let methodName = "ReadMultiple";

    if (flowContext.methodName && nc.isNonEmptyString(flowContext.methodName)) {
        methodName = flowContext.methodName;
    }

    console.log(`Customer Service Name: ${this.customerServiceName}`);

    console.log(`Using URL [${this.customerUrl}]`);

    return new Promise((resolve, reject) => {
      let pagingContext = {};
      this.soap.createClient(this.customerUrl, this.options, (function(err, client) {
        if (!err) {
          let m = this.nc.checkMethod(client, methodName);

          if (!m) {
            out.statusCode = 400;
            out.errors.push(`The provided customer endpoint method name "${methodName}" does not exist. Check your configuration.`);
            reject(out);
          } else {
            client[methodName](args, (function (error, body) {

              let docs = [];
              let data = _.get(body, this.customerServiceName);

              if (!error) {
                if (!data) {
                  // If data is undefined, no results were returned
                  out.statusCode = 204;
                  out.payload = [];
                  resolve(out);
                } else {
                  if (Array.isArray(data)) {
                    // If an array is returned, multiple customers were found
                    for (let i = 0; i < data.length; i++) {
                      docs.push(data[i]);
                      if (i == data.length - 1) {
                        pagingContext.key = data[i].Key;
                      }
                    }
                  } else if (typeof data === 'object') {
                    // If an object is returned, one customers was found
                    docs.push(data);
                    pagingContext.key = data.Key;
                  }

                  if (docs.length === payload.pageSize && pagingContext.key) {
                    out.statusCode = 206;
                    out.pagingContext = pagingContext;
                  } else {
                    out.statusCode = 200;
                  }
                  out.payload = docs;
                  resolve(out);
                }
              } else {
                reject(this.handleOperationError(error));
              }
            }).bind(this));
          }
        } else {
          reject(this.handleClientError(err));
        }
      }).bind(this));
    });

  } else {
    return Promise.reject(out);
  }
};
