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

    if (flowContext.itemVariantIsCodeUnit) {
      let invalidProps = [];
      if (!nc.isNonEmptyString(flowContext.itemVariantRemoteIDProperty)) {
        invalidProps.push("itemVariantRemoteIDProperty");
      }
      if (!nc.isNonEmptyString(flowContext.itemVariantPageProperty)) {
        invalidProps.push("itemVariantPageProperty");
      }
      if (!nc.isNonEmptyString(flowContext.itemVariantPageSizeProperty)) {
        invalidProps.push("itemVariantPageSizeProperty");
      }

      if (invalidProps.length > 0) {
        out.statusCode = 400;
        out.errors.push(`Not all codeunit variant properties were provided. Missing properties: ${invalidProps.join(", ")}`);
        return Promise.reject(out);
      }
    }

    if (flowContext.itemIsCodeUnit) {
      if (flowContext.field && flowContext.criteria) {
        args[flowContext.field] = flowContext.criteria;
      }
      if (flowContext.startDateProperty) {
        args[flowContext.startDateProperty] = payload.modifiedDateRange.startDateGMT;
      }
      if (flowContext.endDateProperty) {
        args[flowContext.endDateProperty] = payload.modifiedDateRange.endDateGMT;
      }
      if (flowContext.pageProperty) {
        args[flowContext.pageProperty] = payload.page;
      }
      if (flowContext.pageSizeProperty) {
        args[flowContext.pageSizeProperty] = payload.pageSize;
      }
    } else {
      args.filter = [];
      let obj = {};
      let fc = {};
      obj["Field"] = "Last_Date_Modified";
      fc["Field"] = flowContext.dateTimeField || "LastModifiedDateTime";

      this.info(`Using DateTime Field Name: ${flowContext.dateTimeField || "LastModifiedDateTime"}`);

      if (payload.modifiedDateRange.startDateGMT && !payload.modifiedDateRange.endDateGMT) {
        obj["Criteria"] = nc.formatDate(new Date(Date.parse(payload.modifiedDateRange.startDateGMT) - 1).toISOString()) + "..";
        fc["Criteria"] = nc.formatDateTime(new Date(Date.parse(payload.modifiedDateRange.startDateGMT) - 1).toISOString()) + "..";
      } else if (payload.modifiedDateRange.endDateGMT && !payload.modifiedDateRange.startDateGMT) {
        obj["Criteria"] = ".." + nc.formatDate(new Date(Date.parse(payload.modifiedDateRange.endDateGMT) + 1).toISOString());
        fc["Criteria"] = ".." + nc.formatDateTime(new Date(Date.parse(payload.modifiedDateRange.endDateGMT) + 1).toISOString());
      } else if (payload.modifiedDateRange.startDateGMT && payload.modifiedDateRange.endDateGMT) {
        obj["Criteria"] = nc.formatDate(new Date(Date.parse(payload.modifiedDateRange.startDateGMT) - 1).toISOString()) + ".." + nc.formatDate(new Date(Date.parse(payload.modifiedDateRange.endDateGMT) + 1).toISOString());
        fc["Criteria"] = nc.formatDateTime(new Date(Date.parse(payload.modifiedDateRange.startDateGMT) - 1).toISOString()) + ".." + nc.formatDateTime(new Date(Date.parse(payload.modifiedDateRange.endDateGMT) + 1).toISOString());
      }
      args.filter.push(obj, fc);

      if (flowContext && flowContext.field && flowContext.criteria) {
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

    this.info(`Item Service Name: ${this.itemServiceName}`);
    this.info(`Item Service Name: ${this.itemVariantsServiceName}`);

    this.info(`Using URL [${this.itemUrl}]`);

    return new Promise((resolve, reject) => {
      let pagingContext = {};
      this.soap.createClient(this.itemUrl, this.options, (function(itemErr, itemClient) {
        if (!itemErr) {
          this.info(`Using URL [${this.itemVariantsUrl}]`);

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
