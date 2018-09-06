'use strict';

module.exports = function(flowContext, payload) {
  let node = this;
  let nc = node.nc;
  let soap = node.soap;
  let invalid = false;
  let out = {
    statusCode: 400,
    payload: [],
    errors: []
  };

  if (!nc.isNonEmptyString(node.itemServiceName)) {
    invalid = true;
    out.errors.push("The itemServiceName is missing.")
  }

  if (!nc.isNonEmptyString(node.itemLedgerServiceName)) {
    invalid = true;
    out.errors.push("The itemLedgerServiceName is missing.")
  }

  if (!nc.isNonEmptyString(node.variantInventoryServiceName)) {
    invalid = true;
    out.errors.push("The variantInventoryServiceName is missing.")
  }

  if (!nc.isNonEmptyString(node.itemUrl)) {
    invalid = true;
    out.errors.push("The itemUrl is missing.")
  }

  if (!nc.isNonEmptyString(node.itemLedgerUrl)) {
    invalid = true;
    out.errors.push("The itemLedgerUrl is missing.")
  }

  if (!nc.isNonEmptyString(node.variantInventoryUrl)) {
    invalid = true;
    out.errors.push("The variantInventoryUrl is missing.")
  }

  if (!invalid) {
    let args = {
      filter: []
    };

    let obj = {};
    obj["Field"] = "Entry_No";
    obj["Criteria"] = payload.doc.remoteIDs.join('|'); // The pipe '|' symbol is a NAV filter for 'OR'
    args.filter.push(obj);

    console.log(`Item Service Name: ${node.itemServiceName}`);
    console.log(`Item Ledger Service Name: ${node.itemLedgerServiceName}`);
    console.log(`Variant Inventory Service Name: ${node.variantInventoryServiceName}`);

    console.log(`Using URL [${node.itemLedgerUrl}]`);

    return new Promise((resolve, reject) => {
      soap.createClient(node.itemLedgerUrl, node.options, function(err, client) {
        if (!err) {
          client.ReadMultiple(args, function(error, result, envelope, soapHeader) {

            if (!error) {
              if (!result.ReadMultiple_Result) {
                out.statusCode = 204;
                out.payload = result;
                resolve(out);
              } else {

                node.processLedger(result, payload)
                  .then((items) => {
                    if (flowContext && flowContext.useInventoryCalculation) {
                      return node.queryInventory(items, flowContext, payload);
                    } else {
                      return node.queryItems(items, flowContext);
                    }
                  })
                  .then((items) => {
                    if (flowContext && flowContext.useInventoryCalculation) {
                      return items;
                    } else {
                      return node.queryVariants(items, flowContext);
                    }
                  })
                  .then((docs) => {
                    if (docs.length === payload.doc.pageSize) {
                      out.statusCode = 206;
                    } else {
                      out.statusCode = 200;
                    }
                    out.payload = docs;
                    resolve(out);
                  }).catch((err) => {
                    out.statusCode = 400;
                    out.errors.push(err);
                    reject(out);
                  });
              }
            } else {
              reject(node.handleOperationError(error));
            }
          });
        } else {
          reject(node.handleClientError(err));
        }
      });
    });

  } else {
    return Promise.reject(out);
  }

  return Promise.reject(out);
};
