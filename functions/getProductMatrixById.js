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

  if (!nc.isNonEmptyString(node.itemVariantsServiceName)) {
    invalid = true;
    out.errors.push("The itemVariantsServiceName is missing.")
  }

  if (!nc.isNonEmptyString(node.itemUrl)) {
    invalid = true;
    out.errors.push("The itemUrl is missing.")
  }

  if (!nc.isNonEmptyString(node.itemVariantsUrl)) {
    invalid = true;
    out.errors.push("The itemVariantsUrl is missing.")
  }

  if (!invalid) {
    let args = {
      filter: []
    };

    let obj = {};
    obj["Field"] = "No";
    obj["Criteria"] = payload.doc.remoteIDs.join('|'); // The pipe '|' symbol is a NAV filter for 'OR'
    args.filter.push(obj);

    console.log(`Item Service Name: ${node.itemServiceName}`);
    console.log(`Item Service Name: ${node.itemVariantsServiceName}`);

    console.log(`Using URL [${node.itemUrl}]`);

    return new Promise((resolve, reject) => {
      soap.createClient(node.itemUrl, node.options, function(itemErr, itemClient) {
        if (!itemErr) {
          console.log(`Using URL [${node.itemVariantsUrl}]`);

          soap.createClient(node.itemVariantsUrl, node.options, function(itemVariantsErr, variantClient) {
            if (!itemVariantsErr) {
            itemClient.ReadMultiple(args, function(error, result, envelope, soapHeader) {
                let data = result;

                if (!error) {
                  if (!result.ReadMultiple_Result) {
                    out.statusCode = 204;
                    out.payload = data;
                    resolve(out);
                  } else {
                    // Begin processing Items
                    node.processItems(result, payload)
                      .then((result) => {
                        return node.processVariants(variantClient, result)
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
                        out.errors.push(error);
                        reject(out);
                      });
                  }
                } else {
                  reject(node.handleOperationError(error));
                }
              });
            } else {
              reject(node.handleClientError(itemVariantsErr));
            }
          });
        } else {
          reject(node.handleClientError(itemErr));
        }
      });
    });

  } else {
    return Promise.reject(out);
  }

  return Promise.reject(out);
};
