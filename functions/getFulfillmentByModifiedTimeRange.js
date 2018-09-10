'use strict';

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

  if (!invalid) {
    let args = {
      filter: []
    };

    let obj = {};
    obj["Field"] = "Posting_Date";

    // Change to payload.modifiedDateRange
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

    console.log(`Sales Shipment Service Name: ${this.salesShipmentServiceName}`);

    console.log(`Using URL [${this.salesShipmentUrl}]`);

    return new Promise((resolve, reject) => {
      this.soap.createClient(this.salesShipmentUrl, this.options, (function(err, client) {
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
                if (Array.isArray(body.ReadMultiple_Result[this.salesShipmentServiceName])) {
                  // If an array is returned, multiple fulfillments were found
                  for (let i = 0; i < body.ReadMultiple_Result[this.salesShipmentServiceName].length; i++) {
                    let fulfillment = {
                      Sales_Shipment: body.ReadMultiple_Result[this.salesShipmentServiceName][i]
                    };
                    docs.push(fulfillment);

                    if (i == body.ReadMultiple_Result[this.salesShipmentServiceName].length - 1) {
                      if (!payload.pagingContext) {
                        payload.pagingContext = {};
                      }
                      payload.pagingContext.key = body.ReadMultiple_Result[this.salesShipmentServiceName][i].Key;
                    }
                  }
                } else if (typeof body.ReadMultiple_Result[this.salesShipmentServiceName] === 'object') {
                  // If an object is returned, one fulfillment was found
                  let fulfillment = {
                    Sales_Shipment: body.ReadMultiple_Result[this.salesShipmentServiceName]
                  };
                  docs.push(fulfillment);

                  if (!payload.pagingContext) {
                    payload.pagingContext = {};
                  }
                  payload.pagingContext.key = body.ReadMultiple_Result[this.salesShipmentServiceName].Key;
                }

                if (docs.length === payload.pageSize) {
                  out.statusCode = 206;
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
