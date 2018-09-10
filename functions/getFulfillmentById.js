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
    obj["Field"] = "No";
    obj["Criteria"] = payload.doc.remoteIDs.join('|'); // The pipe '|' symbol is a NAV filter for 'OR'
    args.filter.push(obj);

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
