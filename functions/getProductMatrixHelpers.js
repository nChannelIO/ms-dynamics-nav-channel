'use strict';

let _ = require('lodash');

module.exports = {
  processVariants
};

function processVariants(client, items, flowContext, itemVariantsMethodName, key) {
  return new Promise((resolve, reject) => {
    let p = [];
    let docs = [];

    for (let i = 0; i < items.length; i++) {
      p.push(new Promise((pResolve, pReject) => {
        let args = {};

        if (flowContext.itemVariantIsCodeUnit) {
          args[flowContext.itemVariantRemoteIDProperty] = items[i].No;
          args[flowContext.itemVariantPageProperty] = 1;
          args[flowContext.itemVariantPageSizeProperty] = 250;
        } else {
          args.filter = [
            {
              Field: "Item_No",
              Criteria: items[i].No
            }
          ];

          if (key) {
            args.bookmarkKey = key;
          }
        }

        if (!items[i].Item_Variants) {
          items[i].Item_Variants = [];
        }

        this.opts.url = this.itemVariantsUrl;
        this.soap.ntlm.handshake(this.soap.request, this.opts).then(options => {
          client[itemVariantsMethodName](args, (function (error, body) {
            let data = _.get(body, this.itemVariantsServiceName);
            if (!data) {
              docs.push({Item: items[i]});
              pResolve();
            } else {
              if (Array.isArray(data)) {

                // Join existing Item_Variants with those pulled
                items[i].Item_Variants = items[i].Item_Variants.concat(data);
                let n = data.length - 1;
                // Recursively call processVariants to determine if there are more variants using the key from the last variant pulled
                processVariants(client, items[i], flowContext, itemVariantsMethodName, data[n].Key).then((result) => {
                  docs.push({Item: items[i]});
                  pResolve(result);
                }).catch((err) => {
                  pReject(err);
                });
              } else if (typeof data === 'object') {
                items[i].Item_Variants.push(data);

                // Recursively call processVariants to determine if there are more variants using the key from the last variant pulled
                processVariants(client, items[i], flowContext, itemVariantsMethodName, data.Key).then((result) => {
                  docs.push({Item: items[i]});
                  pResolve(result);
                }).catch((err) => {
                  pReject(err);
                });
              } else {
                pResolve();
              }
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
  });
}
