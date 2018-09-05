'use strict';

module.exports = {
  processLedger,
  queryItems,
  queryVariants,
  queryInventory
};

let node;

function processLedger(body, payload) {
  return new Promise((resolve, reject) => {
    node = this;
    let items = [];
    if (!payload.doc.pagingContext) {
      payload.doc.pagingContext = {};
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
      payload.doc.pagingContext.key = body.ReadMultiple_Result[this.itemLedgerServiceName][body.ReadMultiple_Result[this.itemLedgerServiceName].length - 1].Key;
      resolve(items);
    } else if (typeof body.ReadMultiple_Result[this.itemLedgerServiceName] === 'object') {
      let code = body.ReadMultiple_Result[this.itemLedgerServiceName].Variant_Code;
      let itemNo = body.ReadMultiple_Result[this.itemLedgerServiceName].Item_No;
      payload.doc.pagingContext.key = body.ReadMultiple_Result[this.itemLedgerServiceName].Key;
      resolve([{ itemNo: itemNo, code: code }]);
    } else {
      resolve();
    }
  });
}

function queryItems(items, flowContext) {
  return new Promise((resolve, reject) => {
    console.log(`Using URL [${node.itemUrl}]`);
    node.soap.createClient(node.itemUrl, node.options, function(err, client) {
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

            client.ReadMultiple(args, function(error, body, envelope, soapHeader) {
              if (!body.ReadMultiple_Result) {
                pReject("Query Item - Item Not Found");
              } else {
                if (Array.isArray(body.ReadMultiple_Result[node.itemServiceName])) {
                  items[i].Item = body.ReadMultiple_Result[node.itemServiceName][0];
                } else if (typeof body.ReadMultiple_Result[node.itemServiceName] === 'object') {
                  items[i].Item = body.ReadMultiple_Result[node.itemServiceName];
                }
                pResolve();
              }
            });
          }));
        }

        Promise.all(p).then(() => {
          resolve(items);
        }).catch((err) => {
          reject(err);
        });
      } else {
        reject(node.handleClientError(err));
      }
    });
  });
}

function queryVariants(items, flowContext) {
  return new Promise((resolve, reject) => {
    console.log(`Using URL [${node.variantInventoryUrl}]`);
    node.soap.createClient(node.variantInventoryUrl, node.options, function(err, client) {
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

              if (flowContext && flowContext.itemField && flowContext.itemCriteria) {
                let obj = {};
                obj["Field"] = flowContext.itemField;
                obj["Criteria"] = flowContext.itemCriteria;
                args.filter.push(obj);
              }

              client.ReadMultiple(args, function(error, body, envelope, soapHeader) {
                if (!body.ReadMultiple_Result) {
                  pReject("Query Variant - Variant Not Found");
                } else {
                  if (Array.isArray(body.ReadMultiple_Result[node.variantInventoryServiceName])) {
                    items[i].Item.Variant_Inventory = body.ReadMultiple_Result[node.variantInventoryServiceName][0];
                    docs.push({
                      doc: items[i].Item,
                      productQuantityRemoteID: items[i].Item.No,
                      productQuantityBusinessReference: node.nc.extractBusinessReference(node.channelProfile.productQuantityBusinessReferences, items[i])
                    });
                  } else if (typeof body.ReadMultiple_Result[node.variantInventoryServiceName] === 'object') {
                    items[i].Item.Variant_Inventory = body.ReadMultiple_Result[node.variantInventoryServiceName];
                    docs.push({
                      doc: items[i].Item,
                      productQuantityRemoteID: items[i].Item.No,
                      productQuantityBusinessReference: node.nc.extractBusinessReference(node.channelProfile.productQuantityBusinessReferences, items[i])
                    });
                  }
                  pResolve();
                }
              });
            } else {
              docs.push({
                doc: items[i].Item,
                productQuantityRemoteID: items[i].Item.No,
                productQuantityBusinessReference: node.nc.extractBusinessReference(node.channelProfile.productQuantityBusinessReferences, items[i])
              });
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
        reject(node.handleClientError(err));
      }
    });
  });
}

function queryInventory(items, flowContext, payload) {
  return new Promise((resolve, reject) => {
    node.soap.createClient(node.variantInventoryUrl, node.options, function(err, client) {
      if (!err) {
        let p = [];
        let docs = [];
        for (let i = 0; i < items.length; i++) {
          p.push(new Promise((pResolve, pReject) => {
            let args = {
              itemNo: items[i].itemNo,
              itemVariantCode: items[i].code,
              locationCode: flowContext.locationCode,
              asOfDate: node.nc.formatDate(new Date(Date.parse(payload.doc.modifiedDateRange.startDateGMT) - 1).toISOString(), '-', true)
            }

            client.GetAvailableToday(args, function(error, body, envelope, soapHeader) {
              if (!body.ReadMultiple_Result) {
                pReject("Query Inventory - Inventory Not Found");
              } else {
                items[i].Inventory = body.ReadMultiple_Result[node.variantInventoryServiceName];
                docs.push({
                  doc: items[i].Inventory,
                  productQuantityRemoteID: itemNo,
                  productQuantityBusinessReference: node.nc.extractBusinessReference(node.channelProfile.productQuantityBusinessReferences, items[i])
                });
                pResolve();
              }
            });
          }));
        }

        Promise.all(p).then(() => {
          resolve(docs);
        }).catch((err) => {
          reject(err);
        });
      } else {
        reject(node.handleClientError(err));
      }
    });
  });
}
