'use strict';

let _ = require('lodash');

module.exports = function(flowContext, payload) {
  let nc = this.nc;
  let invalid = false;
  let out = {
    statusCode: 400,
    payload: [],
    errors: []
  };

  if (!nc.isNonEmptyString(this.itemServiceName)) {
    invalid = true;
    out.errors.push("The itemServiceName is missing.")
  }

  if (!nc.isNonEmptyString(this.variantInventoryServiceName)) {
    invalid = true;
    out.errors.push("The variantInventoryServiceName is missing.")
  }

  if (!nc.isNonEmptyString(this.itemUrl)) {
    invalid = true;
    out.errors.push("The itemUrl is missing.")
  }

  if (!nc.isNonEmptyString(this.variantInventoryUrl)) {
    invalid = true;
    out.errors.push("The variantInventoryUrl is missing.")
  }

  if (!invalid) {
    let args = {
      filter: []
    };

    let obj = {};
    obj["Field"] = "Item_No";
    obj["Criteria"] = payload.remoteIDs.join('|'); // The pipe '|' symbol is a NAV filter for 'OR'
    args.filter.push(obj);

    this.info(`Item Service Name: ${this.itemServiceName}`);
    this.info(`Variant Inventory Service Name: ${this.variantInventoryServiceName}`);

    this.info(`Using URL [${this.itemLedgerUrl}]`);

    return new Promise((resolve, reject) => {
      payload.remoteIDs.forEach(remoteID => {
        let remoteArgs = remoteID.split('|');
        if (remoteArgs.length == 2) {

          if (flowContext && flowContext.useInventoryCalculation) {
            this.queryInventory(remoteArgs, flowContext, payload).then(docs => {
              out.statusCode = 200;
              out.payload = docs;
              resolve(out);
            }).catch((err) => {
              out.statusCode = 400;
              out.errors.push(err);
              reject(out);
            });
          } else {
            out.errors.push("Retrieving inventory by remoteID requires a code unit endpoint.");
            reject(out);
          }
        } else {
          out.errors.push(`The RemoteID ${remoteID} was not formatted correctly or did not have the correct number of arguments.`);
          reject(out);
        }
      });
    });

  } else {
    return Promise.reject(out);
  }
};
