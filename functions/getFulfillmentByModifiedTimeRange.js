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

    if (payload.doc.modifiedDateRange.startDateGMT && !payload.doc.modifiedDateRange.endDateGMT) {
      obj["Criteria"] = nc.formatDate(new Date(Date.parse(payload.doc.modifiedDateRange.startDateGMT) - 1).toISOString()) + "..";
    } else if (payload.doc.modifiedDateRange.endDateGMT && !payload.doc.modifiedDateRange.startDateGMT) {
      obj["Criteria"] = ".." + nc.formatDate(new Date(Date.parse(payload.doc.modifiedDateRange.endDateGMT) + 1).toISOString());
    } else if (payload.doc.modifiedDateRange.startDateGMT && payload.doc.modifiedDateRange.endDateGMT) {
      obj["Criteria"] = nc.formatDate(new Date(Date.parse(payload.doc.modifiedDateRange.startDateGMT) - 1).toISOString()) + ".." + nc.formatDate(new Date(Date.parse(payload.doc.modifiedDateRange.endDateGMT) + 1).toISOString());
    }

    args.filter.push(obj);

    if (payload.doc.pagingContext) {
      args.bookmarkKey = payload.doc.pagingContext.key;
    }

    if (payload.doc.pageSize) {
      args.setSize = payload.doc.pageSize;
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
                    docs.push({
                      doc: fulfillment,
                      fulfillmentRemoteID: fulfillment.Sales_Shipment.No,
                      fulfillmentBusinessReference: nc.extractBusinessReference(this.channelProfile.fulfillmentBusinessReferences, fulfillment),
                      salesOrderRemoteID: fulfillment.Sales_Shipment.Order_No
                    });

                    if (i == body.ReadMultiple_Result[this.salesShipmentServiceName].length - 1) {
                      if (!payload.doc.pagingContext) {
                        payload.doc.pagingContext = {};
                      }
                      payload.doc.pagingContext.key = body.ReadMultiple_Result[this.salesShipmentServiceName][i].Key;
                    }
                  }
                } else if (typeof body.ReadMultiple_Result[this.salesShipmentServiceName] === 'object') {
                  // If an object is returned, one fulfillment was found
                  let fulfillment = {
                    Sales_Shipment: body.ReadMultiple_Result[this.salesShipmentServiceName]
                  };
                  docs.push({
                    doc: fulfillment,
                    fulfillmentRemoteID: fulfillment.Sales_Shipment.No,
                    fulfillmentBusinessReference: nc.extractBusinessReference(this.channelProfile.fulfillmentBusinessReferences, fulfillment),
                    salesOrderRemoteID: fulfillment.Sales_Shipment.Order_No
                  });

                  if (!payload.doc.pagingContext) {
                    payload.doc.pagingContext = {};
                  }
                  payload.doc.pagingContext.key = body.ReadMultiple_Result[this.salesShipmentServiceName].Key;
                }

                if (docs.length === payload.doc.pageSize) {
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
