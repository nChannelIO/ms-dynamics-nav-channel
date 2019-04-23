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

  if (!invalid) {
    let args = {}

    if (flowContext.itemLedgerIsCodeUnit) {
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
      obj["Field"] = "Posting_Date";
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
        fc["Criteria"] = nc.formatDateTime(new Date(Date.parse(payload.modifiedDateRange.startDateGMT) - 1).toISOString()) + ".." + nc.formatDateTime(new Date(Date.parse(payload.modifiedDateRange.endDateGMT) + 1).toISOString();
      }
      args.filter.push(obj, fc);

      if (flowContext.field && flowContext.criteria) {
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

    // Set Default Method Names
    let itemLedgerMethodName = "ReadMultiple";

    if (flowContext.itemLedgerMethodName && nc.isNonEmptyString(flowContext.itemLedgerMethodName)) {
        itemLedgerMethodName = flowContext.itemLedgerMethodName;
    }

    this.info(`Item Service Name: ${this.itemServiceName}`);
    this.info(`Item Ledger Service Name: ${this.itemLedgerServiceName}`);
    this.info(`Variant Inventory Service Name: ${this.variantInventoryServiceName}`);

    this.info(`Using URL [${this.itemLedgerUrl}]`);

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
