'use strict';

module.exports = {
  processLedger,
  queryItems,
  queryVariants,
  queryInventory
};

function processLedger(body, payload) {
  return new Promise((resolve, reject) => {
    let items = [];
    if (!payload.pagingContext) {
      payload.pagingContext = {};
    }
    if (Array.isArray(body.ReadMultiple_Result[this.itemLedgerServiceName])) {
      for (let i = 0; i < body.ReadMultiple_Result[this.itemLedgerServiceName].length; i++) {
        let code = body.ReadMultiple_Result[this.itemLedgerServiceName][i].Variant_Code;
        let itemNo = body.ReadMultiple_Result[this.itemLedgerServiceName][i].Item_No;
        items.push({ itemNo: itemNo, code: code });
      }

      // Remove Duplicates
      items = items.reduce((arr, x) => {
        if(!arr.some(obj => obj.itemNo === x.itemNo && obj.code === x.code)) {
          arr.push(x);
        }
        return arr;
      }, []);
      payload.pagingContext.key = body.ReadMultiple_Result[this.itemLedgerServiceName][body.ReadMultiple_Result[this.itemLedgerServiceName].length - 1].Key;
      resolve(items);
    } else if (typeof body.ReadMultiple_Result[this.itemLedgerServiceName] === 'object') {
      let code = body.ReadMultiple_Result[this.itemLedgerServiceName].Variant_Code;
      let itemNo = body.ReadMultiple_Result[this.itemLedgerServiceName].Item_No;
      payload.pagingContext.key = body.ReadMultiple_Result[this.itemLedgerServiceName].Key;
      resolve([{ itemNo: itemNo, code: code }]);
    } else {
      resolve();
    }
  });
}

function queryItems(items, flowContext) {
  return new Promise((resolve, reject) => {
    console.log(`Using URL [${this.itemUrl}]`);
    this.soap.createClient(this.itemUrl, this.options, (function(err, client) {
      if (!err) {
        let p = [];
        for (let i = 0; i < items.length; i++) {
          p.push(new Promise((pResolve, pReject) => {
            let args = {
              filter: [
                {
                  Field: "No",
                  Criteria: items[i].itemNo
                }
              ]
            }

            if (flowContext && flowContext.itemField && flowContext.itemCriteria) {
              let obj = {};
              obj["Field"] = flowContext.itemField;
              obj["Criteria"] = flowContext.itemCriteria;
              args.filter.push(obj);
            }

            client.ReadMultiple(args, (function(error, body, envelope, soapHeader) {
              if (!body.ReadMultiple_Result) {
                pReject("Query Item - Item Not Found");
              } else {
                if (Array.isArray(body.ReadMultiple_Result[this.itemServiceName])) {
                  items[i].Item = body.ReadMultiple_Result[this.itemServiceName][0];
                } else if (typeof body.ReadMultiple_Result[this.itemServiceName] === 'object') {
                  items[i].Item = body.ReadMultiple_Result[this.itemServiceName];
                }
                pResolve();
              }
            }).bind(this));
          }));
        }

        Promise.all(p).then(() => {
          resolve(items);
        }).catch((err) => {
          reject(err);
        });
      } else {
        reject(this.handleClientError(err));
      }
    }).bind(this));
  });
}

function queryVariants(items, flowContext) {
  return new Promise((resolve, reject) => {
    console.log(`Using URL [${this.variantInventoryUrl}]`);
    this.soap.createClient(this.variantInventoryUrl, this.options, (function(err, client) {
      if (!err) {
        let p = [];
        let docs = [];
        for (let i = 0; i < items.length; i++) {
          p.push(new Promise((pResolve, pReject) => {
            // If no code, skip
            if (items[i].code != null) {
              let args = {
                filter: [
                  {
                    Field: "Code",
                    Criteria: items[i].code
                  }
                ]
              }

              if (flowContext && flowContext.variantField && flowContext.variantCriteria) {
                let obj = {};
                obj["Field"] = flowContext.variantField;
                obj["Criteria"] = flowContext.variantCriteria;
                args.filter.push(obj);
              }

              client.ReadMultiple(args, (function(error, body, envelope, soapHeader) {
                if (!body.ReadMultiple_Result) {
                  pReject("Query Variant - Variant Not Found");
                } else {
                  if (Array.isArray(body.ReadMultiple_Result[this.variantInventoryServiceName])) {
                    items[i].Item.Variant_Inventory = body.ReadMultiple_Result[this.variantInventoryServiceName][0];
                    docs.push(items[i].Item);
                  } else if (typeof body.ReadMultiple_Result[this.variantInventoryServiceName] === 'object') {
                    items[i].Item.Variant_Inventory = body.ReadMultiple_Result[this.variantInventoryServiceName];
                    docs.push(items[i].Item);
                  }
                  pResolve();
                }
              }).bind(this));
            } else {
              docs.push(items[i].Item);
              pResolve();
            }
          }));
        }

        Promise.all(p).then(() => {
          resolve(docs);
        }).catch((err) => {
          reject(err);
        });
      } else {
        reject(this.handleClientError(err));
      }
    }).bind(this));
  });
}

function queryInventory(items, flowContext, payload) {
  return new Promise((resolve, reject) => {
    this.soap.createClient(this.variantInventoryUrl, this.options, (function(err, client) {
      if (!err) {
        let p = [];
        let docs = [];
        for (let i = 0; i < items.length; i++) {
          p.push(new Promise((pResolve, pReject) => {
            let args = {
              itemNo: items[i].itemNo,
              itemVariantCode: items[i].code,
              locationCode: flowContext.locationCode,
              asOfDate: this.nc.formatDate(new Date(Date.parse(payload.modifiedDateRange.startDateGMT) - 1).toISOString(), '-', true)
            }

            client.GetAvailableToday(args, (function(error, body, envelope, soapHeader) {
              if (!body.ReadMultiple_Result) {
                pReject("Query Inventory - Inventory Not Found");
              } else {
                let doc = {
                  No: items[i].itemNo,
                  VariantCode: items[i].code,
                  LocationCode: flowContext.locationCode,
                  Item: body.ReadMultiple_Result[this.variantInventoryServiceName]
                };
                docs.push(doc);
                pResolve();
              }
            }).bind(this));
          }));
        }

        Promise.all(p).then(() => {
          resolve(docs);
        }).catch((err) => {
          reject(err);
        });
      } else {
        reject(this.handleClientError(err));
      }
    }).bind(this));
  });
}
