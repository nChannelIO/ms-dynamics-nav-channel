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

  if (!invalid) {
    let args = {
      filter: []
    };

    let obj = {};
    obj["Field"] = "Last_Date_Modified";

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

    console.log(`Item Service Name: ${this.itemServiceName}`);
    console.log(`Item Service Name: ${this.itemVariantsServiceName}`);

    console.log(`Using URL [${this.itemUrl}]`);

    return new Promise((resolve, reject) => {
      this.soap.createClient(this.itemUrl, this.options, (function(itemErr, itemClient) {
        if (!itemErr) {
          console.log(`Using URL [${this.itemVariantsUrl}]`);

          this.soap.createClient(this.itemVariantsUrl, this.options, (function(itemVariantsErr, variantClient) {
            if (!itemVariantsErr) {
            itemClient.ReadMultiple(args, (function(error, result, envelope, soapHeader) {
                let data = result;

                if (!error) {
                  if (!result.ReadMultiple_Result) {
                    out.statusCode = 204;
                    out.payload = data;
                    resolve(out);
                  } else {
                    // Begin processing Items
                    this.processItems(result, payload)
                      .then((result) => {
                        return this.processVariants(variantClient, result)
                      })
                      .then((docs) => {
                        if (docs.length === payload.pageSize) {
                          out.statusCode = 206;
                        } else {
                          out.statusCode = 200;
                        }
                        out.payload = docs;
                        resolve(out);
                      }).catch((err) => {
                        out.statusCode = 400;
                        out.errors.push(error);
                        reject(out);
                      });
                  }
                } else {
                  reject(this.handleOperationError(error));
                }
              }).bind(this));
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

  return Promise.reject(out);
};
