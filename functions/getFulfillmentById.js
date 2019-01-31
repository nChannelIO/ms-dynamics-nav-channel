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

  if (!nc.isNonEmptyString(this.salesShipmentUrl)) {
    invalid = true;
    out.errors.push("The salesShipmentUrl is missing.")
  }

  if (!nc.isNonEmptyString(this.salesShipmentServiceName)) {
    invalid = true;
    out.errors.push("The salesShipmentServiceName is missing.")
  }
  // Set Default Method Name
  let methodName = "ReadMultiple";

  if (flowContext.methodName && nc.isNonEmptyString(flowContext.methodName)) {
      methodName = flowContext.methodName;
  }

  if (!invalid) {
    let args = {};

    if (flowContext.fulfillmentIsCodeUnit) {
      if (nc.isNonEmptyString(flowContext.field) && nc.isNonEmptyString(flowContext.criteria)) {
        args[flowContext.field] = flowContext.criteria;
      }
      if (nc.isNonEmptyString(flowContext.remoteIDProperty)) {
        args[flowContext.remoteIDProperty] = payload.remoteIDs;
      }
      if (nc.isNonEmptyString(flowContext.pageProperty)) {
        args[flowContext.pageProperty] = payload.page;
      }
      if (nc.isNonEmptyString(flowContext.pageSizeProperty)) {
        args[flowContext.pageSizeProperty] = payload.pageSize;
      }
    } else {
      args.filter = [];
      let obj = {};
      obj["Field"] = "No";
      obj["Criteria"] = payload.remoteIDs.join('|'); // The pipe '|' symbol is a NAV filter for 'OR'
      args.filter.push(obj);

      if (payload.pagingContext) {
        args.bookmarkKey = payload.pagingContext.key;
      }

      if (payload.pageSize) {
        args.setSize = payload.pageSize;
      }
    }

    this.info(`Sales Shipment Service Name: ${this.salesShipmentServiceName}`);

    this.info(`Using URL [${this.salesShipmentUrl}]`);

    return new Promise((resolve, reject) => {
      let pagingContext = {};
      this.soap.createClient(this.salesShipmentUrl, this.options, (function(err, client) {
        if (!err) {
          let m = this.nc.checkMethod(client, methodName);

          if (!m) {
            out.statusCode = 400;
            out.errors.push(`The provided fulfillment endpoint method name "${methodName}" does not exist. Check your configuration.`);
            reject(out);
          } else {
            client[methodName](args, (function (error, body) {

              let docs = [];
              let data = _.get(body, this.salesShipmentServiceName);

              if (!error) {
                if (!data) {
                  // If data is undefined, no results were returned
                  out.statusCode = 204;
                  out.payload = [];
                  resolve(out);
                } else {
                  if (Array.isArray(data)) {
                    // If an array is returned, multiple fulfillments were found
                    for (let i = 0; i < data.length; i++) {
                      docs.push({ Sales_Shipment: data[i] });
                      if (i == data.length - 1) {
                        pagingContext.key = data[i].Key;
                      }
                    }
                  } else if (typeof data === 'object') {
                    // If an object is returned, one fulfillment was found
                    docs.push({ Sales_Shipment: data });
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
