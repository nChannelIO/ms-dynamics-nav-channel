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

  if (!nc.isNonEmptyString(this.itemVariantsServiceName)) {
    invalid = true;
    out.errors.push("The itemVariantsServiceName is missing.")
  }

  if (!nc.isNonEmptyString(this.itemUrl)) {
    invalid = true;
    out.errors.push("The itemUrl is missing.")
  }

  if (!nc.isNonEmptyString(this.itemVariantsUrl)) {
    invalid = true;
    out.errors.push("The itemVariantsUrl is missing.")
  }

  if (flowContext.itemIsCodeUnit && !nc.isNonEmptyString(flowContext.itemRemoteIDProperty)) {
    invalid = true;
    out.errors.push("The itemRemoteIDProperty is missing from codeunit configuration.")
  }

  if (flowContext.itemIsCodeUnit && !nc.isNonEmptyString(flowContext.itemPageProperty)) {
    invalid = true;
    out.errors.push("The itemPageProperty is missing from codeunit configuration.")
  }

  if (flowContext.itemIsCodeUnit && !nc.isNonEmptyString(flowContext.itemPageSizeProperty)) {
    invalid = true;
    out.errors.push("The itemPageSizeProperty is missing from codeunit configuration.")
  }

  if (flowContext.itemVariantIsCodeUnit && !nc.isNonEmptyString(flowContext.itemVariantRemoteIDProperty)) {
    invalid = true;
    out.errors.push("The itemVariantRemoteIDProperty is missing from codeunit configuration.")
  }

  if (flowContext.itemVariantIsCodeUnit && !nc.isNonEmptyString(flowContext.itemVariantPageProperty)) {
    invalid = true;
    out.errors.push("The itemVariantPageProperty is missing from codeunit configuration.")
  }

  if (flowContext.itemVariantIsCodeUnit && !nc.isNonEmptyString(flowContext.itemVariantPageSizeProperty)) {
    invalid = true;
    out.errors.push("The itemVariantPageSizeProperty is missing from codeunit configuration.")
  }

  // Set Default Method Names
  let itemMethodName = "ReadMultiple";
  let itemVariantsMethodName = "ReadMultiple";

  if (flowContext.itemMethodName && nc.isNonEmptyString(flowContext.itemMethodName)) {
      itemMethodName = flowContext.itemMethodName;
  }

  if (flowContext.itemVariantsMethodName && this.nc.isNonEmptyString(flowContext.itemVariantsMethodName)) {
    itemVariantsMethodName = flowContext.itemVariantsMethodName;
  }

  if (!invalid) {
    let args = {};

    if (flowContext.itemIsCodeUnit) {
      args[flowContext.itemRemoteIDProperty] = payload.remoteIDs;
      args[flowContext.itemPageProperty] = payload.page;
      args[flowContext.itemPageSizeProperty] = payload.pageSize;
    } else {
      args.filter = [];
      let obj = {};
      obj["Field"] = "No";
      obj["Criteria"] = payload.remoteIDs.join('|'); // The pipe '|' symbol is a NAV filter for 'OR'
      args.filter.push(obj);

      if (payload.pagingContext) {
        args.bookmarkKey = payload.pagingContext.key;
      }

      if (payload.pageSize) {
        args.setSize = payload.pageSize;
      }
    }

    console.log(`Item Service Name: ${this.itemServiceName}`);
    console.log(`Item Service Name: ${this.itemVariantsServiceName}`);

    console.log(`Using URL [${this.itemUrl}]`);

    return new Promise((resolve, reject) => {
      let pagingContext = {};
      this.soap.createClient(this.itemUrl, this.options, (function(itemErr, itemClient) {
        if (!itemErr) {
          console.log(`Using URL [${this.itemVariantsUrl}]`);

          this.soap.createClient(this.itemVariantsUrl, this.options, (function(itemVariantsErr, variantClient) {
            if (!itemVariantsErr) {
              let m = this.nc.checkMethod(itemClient, itemMethodName);
              let n = this.nc.checkMethod(variantClient, itemVariantsMethodName);

              if (!m) {
                out.statusCode = 400;
                out.errors.push(`The provided item endpoint method name "${itemMethodName}" does not exist. Check your configuration.`);
                reject(out);
              } else if (!n) {
                out.statusCode = 400;
                out.errors.push(`The provided item variants endpoint method name "${itemVariantsMethodName}" does not exist. Check your configuration.`);
                reject(out);
              } else {
                itemClient[itemMethodName](args, (function (error, body) {
                  let data = _.get(body, this.itemServiceName);

                  if (!error) {
                    if (!data) {
                      out.statusCode = 204;
                      out.payload = [];
                      resolve(out);
                    } else {
                      // Begin processing Items
                      let items;
                      if (Array.isArray(data)) {
                        pagingContext.key = data[data.length - 1].Key;
                        items = data;
                      } else {
                        pagingContext.key = data.Key;
                        items = [data];
                      }

                      this.processVariants(variantClient, items, flowContext, itemVariantsMethodName)
                        .then((docs) => {
                          if (docs.length === payload.pageSize && pagingContext.key) {
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
              reject(this.handleClientError(itemVariantsErr));
            }
          }).bind(this));
        } else {
          reject(this.handleClientError(itemErr));
        }
      }).bind(this));
    });

  } else {
    return Promise.reject(out);
  }
};
