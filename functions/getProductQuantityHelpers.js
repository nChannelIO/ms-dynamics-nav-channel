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
    this.info(`Using URL [${this.itemUrl}]`);

    let itemMethodName = "ReadMultiple";

    if (flowContext.itemMethodName && this.nc.isNonEmptyString(flowContext.itemMethodName)) {
        itemMethodName = flowContext.itemMethodName;
    }
    this.opts.url = this.itemUrl;
    this.soap.ntlm.handshake(this.soap.request, this.opts).then(options => {
      this.options.wsdl_options = options;
      this.soap.createClient(this.itemUrl, this.options, (function (err, client) {
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

                this.soap.ntlm.handshake(this.soap.request, this.opts).then(options => {
                  client[itemMethodName](args, (function (error, body) {
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
                  }).bind(this), options, options.headers);
                }).catch(err => {
                  reject(this.handleOperationError(err));
                });
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
    }).catch(err => {
      reject(this.handleOperationError(err));
    });
  });
}

function queryVariants(items, flowContext) {
  return new Promise((resolve, reject) => {
    this.info(`Using URL [${this.variantInventoryUrl}]`);

    let variantInventoryMethodName = "ReadMultiple";

    if (flowContext.variantInventoryMethodName && this.nc.isNonEmptyString(flowContext.variantInventoryMethodName)) {
        variantInventoryMethodName = flowContext.variantInventoryMethodName;
    }
    this.opts.url = this.variantInventoryUrl;
    this.soap.ntlm.handshake(this.soap.request, this.opts).then(options => {
      this.options.wsdl_options = options;
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

                this.soap.ntlm.handshake(this.soap.request, this.opts).then(options => {
                  client[variantInventoryMethodName](args, (function (error, body) {
                    let data = _.get(body, this.variantInventoryServiceName);
                    if (!data) {
                      pReject("Query Variant - Variant Not Found");
                    } else {
                      if (Array.isArray(data)) {
                        items[i].Item.Variant_Inventory = data[0];
                        docs.push({ Item: items[i].Item });
                      } else if (typeof data === 'object') {
                        items[i].Item.Variant_Inventory = data;
                        docs.push({ Item: items[i].Item });
                      }
                      pResolve();
                    }
                  }).bind(this), options, options.headers);
                }).catch(err => {
                  reject(this.handleOperationError(err));
                });
              } else {
                docs.push({ Item: items[i].Item });
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
    }).catch(err => {
      reject(this.handleOperationError(err));
    });
  });
}

function queryInventory(items, flowContext) {
  return new Promise((resolve, reject) => {
    // Set Default Method Names
    let variantInventoryMethodName = "ReadMultiple";

    if (flowContext.variantInventoryMethodName && this.nc.isNonEmptyString(flowContext.variantInventoryMethodName)) {
        variantInventoryMethodName = flowContext.variantInventoryMethodName;
    }

    this.opts.url = this.variantInventoryUrl;
    this.soap.ntlm.handshake(this.soap.request, this.opts).then(options => {
      this.options.wsdl_options = options;
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
                args["asOfDate"] = this.nc.formatDate(new Date().toISOString(), '-', true);

                this.soap.ntlm.handshake(this.soap.request, this.opts).then(options => {
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
                  }).bind(this), options, options.headers);
                }).catch(err => {
                  reject(this.handleOperationError(err));
                });
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
    }).catch(err => {
      reject(this.handleOperationError(err));
    });
  });
}
