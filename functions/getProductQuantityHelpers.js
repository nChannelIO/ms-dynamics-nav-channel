'use strict';

let _ = require('lodash');

module.exports = {
  processLedger,
  queryItems,
  queryVariants,
  queryInventory
};

function processLedger(body) {
  return new Promise(resolve => {
    // Remove Duplicates
    let items = body.reduce((arr, x) => {
      if(!arr.some(obj => obj.itemNo === x.itemNo && obj.code === x.code)) {
        arr.push(x);
      }
      return arr;
    }, []);
    resolve(items);
  });
}

function queryItems(items, flowContext) {
  return new Promise((resolve, reject) => {
    console.log(`Using URL [${this.itemUrl}]`);

    let itemMethodName = "ReadMultiple";

    if (flowContext.itemMethodName && this.nc.isNonEmptyString(flowContext.itemMethodName)) {
        itemMethodName = flowContext.itemMethodName;
    }
    this.soap.createClient(this.itemUrl, this.options, (function(err, client) {
      if (!err) {
        let m = this.nc.checkMethod(client, itemMethodName);

        if (!m) {
          reject(`The provided item endpoint method name "${itemMethodName}" does not exist. Check your configuration.`);
        } else {
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
              };

              if (flowContext && flowContext.itemField && flowContext.itemCriteria) {
                let obj = {};
                obj["Field"] = flowContext.itemField;
                obj["Criteria"] = flowContext.itemCriteria;
                args.filter.push(obj);
              }

              client[itemMethodName](args, (function(error, body) {
                let data = _.get(body, this.itemServiceName);
                if (!data) {
                  pReject("Query Item - Item Not Found");
                } else {
                  if (Array.isArray(data)) {
                    items[i].Item = data[0];
                  } else if (typeof data === 'object') {
                    items[i].Item = data;
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
        }
      } else {
        reject(this.handleClientError(err));
      }
    }).bind(this));
  });
}

function queryVariants(items, flowContext) {
  return new Promise((resolve, reject) => {
    console.log(`Using URL [${this.variantInventoryUrl}]`);

    let variantInventoryMethodName = "ReadMultiple";

    if (flowContext.variantInventoryMethodName && this.nc.isNonEmptyString(flowContext.variantInventoryMethodName)) {
        variantInventoryMethodName = flowContext.variantInventoryMethodName;
    }
    this.soap.createClient(this.variantInventoryUrl, this.options, (function(err, client) {
      if (!err) {
        let m = this.nc.checkMethod(client, variantInventoryMethodName);

        if (!m) {
          reject(`The provided item endpoint method name "${variantInventoryMethodName}" does not exist. Check your configuration.`);
        } else {
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
                };

                if (flowContext && flowContext.variantField && flowContext.variantCriteria) {
                  let obj = {};
                  obj["Field"] = flowContext.variantField;
                  obj["Criteria"] = flowContext.variantCriteria;
                  args.filter.push(obj);
                }

                client[variantInventoryMethodName](args, (function (error, body) {
                  let data = _.get(body, this.variantInventoryServiceName);
                  if (!data) {
                    pReject("Query Variant - Variant Not Found");
                  } else {
                    if (Array.isArray(data)) {
                      items[i].Item.Variant_Inventory = data[0];
                      docs.push(items[i].Item);
                    } else if (typeof data === 'object') {
                      items[i].Item.Variant_Inventory = data;
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
        }
      } else {
        reject(this.handleClientError(err));
      }
    }).bind(this));
  });
}

function queryInventory(items, flowContext) {
  return new Promise((resolve, reject) => {
    // Set Default Method Names
    let variantInventoryMethodName = "ReadMultiple";

    if (flowContext.variantInventoryMethodName && this.nc.isNonEmptyString(flowContext.variantInventoryMethodName)) {
        variantInventoryMethodName = flowContext.variantInventoryMethodName;
    }

    this.soap.createClient(this.variantInventoryUrl, this.options, (function(err, client) {
      if (!err) {
        let m = this.nc.checkMethod(client, variantInventoryMethodName);

        if (!m) {
          reject(`The provided variant endpoint method name "${variantInventoryMethodName}" does not exist. Check your configuration.`);
        } else {
          let p = [];
          let docs = [];
          for (let i = 0; i < items.length; i++) {
            p.push(new Promise((pResolve, pReject) => {
              let args = {};
              args[flowContext.itemNameField] = items[i].itemNo;
              args[flowContext.itemVariantCode] = items[i].code;
              args[flowContext.locationCode] = flowContext.locationCode;

              // Craft's Inventory Endpoint Arguments
              // args = {
              //   itemNo: items[i].itemNo,
              //   itemVariantCode: items[i].code,
              //   locationCode: flowContext.locationCode,
              //   asOfDate: this.nc.formatDate(new Date(Date.parse(payload.modifiedDateRange.startDateGMT) - 1).toISOString(), '-', true)
              // };

              client[variantInventoryMethodName](args, (function (error, body) {
                if (!body) {
                  pReject("Query Inventory - Inventory Not Found");
                } else {
                  let doc = {
                    No: items[i].itemNo,
                    VariantCode: items[i].code,
                    LocationCode: flowContext.locationCode,
                    Item: _.get(body, this.variantInventoryServiceName)
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
        }
      } else {
        reject(this.handleClientError(err));
      }
    }).bind(this));
  });
}
