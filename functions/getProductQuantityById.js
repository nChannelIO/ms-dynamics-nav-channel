'use strict';

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

  if (!nc.isNonEmptyString(this.itemLedgerServiceName)) {
    invalid = true;
    out.errors.push("The itemLedgerServiceName is missing.")
  }

  if (!nc.isNonEmptyString(this.variantInventoryServiceName)) {
    invalid = true;
    out.errors.push("The variantInventoryServiceName is missing.")
  }

  if (!nc.isNonEmptyString(this.itemUrl)) {
    invalid = true;
    out.errors.push("The itemUrl is missing.")
  }

  if (!nc.isNonEmptyString(this.itemLedgerUrl)) {
    invalid = true;
    out.errors.push("The itemLedgerUrl is missing.")
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

    console.log(`Item Service Name: ${this.itemServiceName}`);
    console.log(`Item Ledger Service Name: ${this.itemLedgerServiceName}`);
    console.log(`Variant Inventory Service Name: ${this.variantInventoryServiceName}`);

    console.log(`Using URL [${this.itemLedgerUrl}]`);

    return new Promise((resolve, reject) => {
      this.soap.createClient(this.itemLedgerUrl, this.options, (function(err, client) {
        if (!err) {

          let p = [];
          payload.remoteIDs.forEach(remoteID => {
            let remoteArgs = remoteID.split('|');
            if (remoteArgs.length == 2) {

              if (flowContext && flowContext.useInventoryCalculation) {
                this.queryInventory(items, flowContext, payload).then(docs => {
                  out.statusCode = 200;
                  out.payload = docs;
                  resolve(out);
                }).catch((err) => {
                  out.statusCode = 400;
                  out.errors.push(err);
                  reject(out);
                });
              } else {
                out.errors.push("Rertrieving inventory by remoteID requires a code unit endpoint.");
                reject(out);
              }
            }
          });
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
