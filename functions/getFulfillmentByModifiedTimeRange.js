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
      if (nc.isNonEmptyString(flowContext.startDateProperty)) {
        args[flowContext.startDateProperty] = payload.modifiedDateRange.startDateGMT;
      }
      if (nc.isNonEmptyString(flowContext.endDateProperty)) {
        args[flowContext.endDateProperty] = payload.modifiedDateRange.endDateGMT;
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
      let fc = {};
      obj["Field"] = "Posted_Date";
      fc["Field"] = flowContext.dateTimeField || "PostingDateTime";

      this.info(`Using DateTime Field Name: ${flowContext.dateTimeField || "PostingDateTime"}`);

      if (payload.modifiedDateRange.startDateGMT && !payload.modifiedDateRange.endDateGMT) {
        obj["Criteria"] = nc.formatDate(new Date(Date.parse(payload.modifiedDateRange.startDateGMT) - 1).toISOString()) + "..";
        fc["Criteria"] = nc.formatDateTime(new Date(Date.parse(payload.modifiedDateRange.startDateGMT) - 1).toISOString()) + "..";
      } else if (payload.modifiedDateRange.endDateGMT && !payload.modifiedDateRange.startDateGMT) {
        obj["Criteria"] = ".." + nc.formatDate(new Date(Date.parse(payload.modifiedDateRange.endDateGMT) + 1).toISOString());
        fc["Criteria"] = ".." + nc.formatDateTime(new Date(Date.parse(payload.modifiedDateRange.endDateGMT) + 1).toISOString());
      } else if (payload.modifiedDateRange.startDateGMT && payload.modifiedDateRange.endDateGMT) {
        obj["Criteria"] = nc.formatDate(new Date(Date.parse(payload.modifiedDateRange.startDateGMT) - 1).toISOString()) + ".." + nc.formatDate(new Date(Date.parse(payload.modifiedDateRange.endDateGMT) + 1).toISOString());
        fc["Criteria"] = nc.formatDateTime(new Date(Date.parse(payload.modifiedDateRange.startDateGMT) - 1).toISOString()) + ".." + nc.formatDateTime(new Date(Date.parse(payload.modifiedDateRange.endDateGMT) + 1).toISOString());
      }
      args.filter.push(obj, fc);

      if (flowContext && flowContext.field && flowContext.criteria) {
        let fieldCriteria = {};
        fieldCriteria["Field"] = flowContext.field;
        fieldCriteria["Criteria"] = flowContext.criteria;
        args.filter.push(fieldCriteria);
      }

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
