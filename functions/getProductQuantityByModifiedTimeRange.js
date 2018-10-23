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

  if (flowContext.itemLedgerIsCodeUnit && !nc.isNonEmptyString(flowContext.itemLedgerStartDateProperty)) {
    invalid = true;
    out.errors.push("The itemLedgerStartDateProperty is missing from codeunit configuration.")
  }

  if (flowContext.itemLedgerIsCodeUnit && !nc.isNonEmptyString(flowContext.itemLedgerEndDateProperty)) {
    invalid = true;
    out.errors.push("The itemLedgerEndDateProperty is missing from codeunit configuration.")
  }

  if (flowContext.itemLedgerIsCodeUnit && !nc.isNonEmptyString(flowContext.itemLedgerPageProperty)) {
    invalid = true;
    out.errors.push("The itemLedgerPageProperty is missing from codeunit configuration.")
  }

  if (flowContext.itemLedgerIsCodeUnit && !nc.isNonEmptyString(flowContext.itemLedgerPageSizeProperty)) {
    invalid = true;
    out.errors.push("The itemLedgerPageSizeProperty is missing from codeunit configuration.")
  }

  if (!invalid) {
    let args = {}

    if (flowContext.itemLedgerIsCodeUnit) {
      args[flowContext.itemLedgerStartDateProperty] = payload.modifiedDateRange.startDateGMT;
      args[flowContext.itemLedgerEndDateProperty] = payload.modifiedDateRange.endDateGMT;
      args[flowContext.itemLedgerPageProperty] = payload.page;
      args[flowContext.itemLedgerPageSizeProperty] = payload.pageSize;
    } else {
      args.filter = [];
      let obj = {};
      obj["Field"] = "Posting_Date";

      if (payload.modifiedDateRange.startDateGMT && !payload.modifiedDateRange.endDateGMT) {
        obj["Criteria"] = nc.formatDate(new Date(Date.parse(payload.modifiedDateRange.startDateGMT) - 1).toISOString()) + "..";
      } else if (payload.modifiedDateRange.endDateGMT && !payload.modifiedDateRange.startDateGMT) {
        obj["Criteria"] = ".." + nc.formatDate(new Date(Date.parse(payload.modifiedDateRange.endDateGMT) + 1).toISOString());
      } else if (payload.modifiedDateRange.startDateGMT && payload.modifiedDateRange.endDateGMT) {
        obj["Criteria"] = nc.formatDate(new Date(Date.parse(payload.modifiedDateRange.startDateGMT) - 1).toISOString()) + ".." + nc.formatDate(new Date(Date.parse(payload.modifiedDateRange.endDateGMT) + 1).toISOString());
      }
      args.filter.push(obj);

      if (flowContext && flowContext.field && flowContext.criteria) {
        let fc = {};
        fc["Field"] = flowContext.field;
        fc["Criteria"] = flowContext.criteria;
        args.filter.push(fc);
      }

      if (payload.pagingContext) {
        args.bookmarkKey = payload.pagingContext.key;
      }

      if (payload.pageSize) {
        args.setSize = payload.pageSize;
      }
    }

    // Set Default Method Names
    let itemLedgerMethodName = "ReadMultiple";

    if (flowContext.itemLedgerMethodName && nc.isNonEmptyString(flowContext.itemLedgerMethodName)) {
        itemLedgerMethodName = flowContext.itemLedgerMethodName;
    }

    console.log(`Item Service Name: ${this.itemServiceName}`);
    console.log(`Item Ledger Service Name: ${this.itemLedgerServiceName}`);
    console.log(`Variant Inventory Service Name: ${this.variantInventoryServiceName}`);

    console.log(`Using URL [${this.itemLedgerUrl}]`);

    return new Promise((resolve, reject) => {
      let pagingContext = {};
      this.soap.createClient(this.itemLedgerUrl, this.options, (function(err, client) {
        if (!err) {
          let m = this.nc.checkMethod(client, itemLedgerMethodName);

          if (!m) {
            out.statusCode = 400;
            out.errors.push(`The provided item ledger endpoint method name "${itemLedgerMethodName}" does not exist. Check your configuration.`);
            reject(out);
          } else {
            client[itemLedgerMethodName](args, (function (error, body) {
              let data = _.get(body, this.itemLedgerServiceName);

              if (!error) {
                if (!data) {
                  out.statusCode = 204;
                  out.payload = [];
                  resolve(out);
                } else {
                  let items = [];
                  if (Array.isArray(data)) {
                    for (let i = 0; i < data.length; i++) {
                      let code = data[i].Variant_Code;
                      let itemNo = data[i].Item_No;
                      items.push({itemNo: itemNo, code: code});
                    }
                    pagingContext.key = data[data.length - 1].Key;
                  } else if (typeof data === 'object') {
                    let code = data.Variant_Code;
                    let itemNo = data.Item_No;
                    items.push({itemNo: itemNo, code: code});
                    pagingContext.key = data.Key;
                  }

                  this.processLedger(items, flowContext, payload)
                      .then((result) => {
                        if (flowContext && flowContext.useInventoryCalculation) {
                          return this.queryInventory(result, flowContext, payload);
                        } else {
                          return this.queryItems(result, flowContext);
                        }
                      })
                      .then((result) => {
                        if (flowContext && flowContext.useInventoryCalculation) {
                          return result;
                        } else {
                          return this.queryVariants(result, flowContext);
                        }
                      })
                      .then((docs) => {
                        if (data.length === payload.pageSize && pagingContext.key) {
                          out.statusCode = 206;
                          out.pagingContext = pagingContext;
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
