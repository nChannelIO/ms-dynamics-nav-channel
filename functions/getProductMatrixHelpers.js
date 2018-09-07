'use strict';

module.exports = {
  processItems,
  processVariants
};

function processItems(body, payload) {
  return new Promise((resolve, reject) => {
    if (!payload.doc.pagingContext) {
      payload.doc.pagingContext = {};
    }
    if (Array.isArray(body.ReadMultiple_Result[this.itemServiceName])) {
      payload.doc.pagingContext.key = body.ReadMultiple_Result[this.itemServiceName][body.ReadMultiple_Result[this.itemServiceName].length - 1].Key;
      resolve(body.ReadMultiple_Result[this.itemServiceName]);
    } else if (typeof body.ReadMultiple_Result[this.itemServiceName] === 'object') {
      payload.doc.pagingContext.key = body.ReadMultiple_Result[this.itemServiceName].Key;
      resolve([body.ReadMultiple_Result[this.itemServiceName]]);
    } else {
      resolve();
    }
  });
}

function processVariants(client, items, key) {
  return new Promise((resolve, reject) => {
    let p = [];
    let docs = [];

    for (let i = 0; i < items.length; i++) {
      items[i] = { Item: items[i] };
      p.push(new Promise((pResolve, pReject) => {
        let args = {
          filter: [
            {
              Field: "Item_No",
              Criteria: items[i].Item.No
            }
          ]
        }

        if (key) {
          args.bookmarkKey = key;
        }

        if (!items[i].Item_Variants) {
          items[i].Item_Variants = [];
        }

        client.ReadMultiple(args, (function(error, body, envelope, soapHeader) {
          if (!body.ReadMultiple_Result) {
            pResolve();
          } else {
            if (Array.isArray(body.ReadMultiple_Result[this.itemVariantsServiceName])) {

              // Join existing Item_Variants with those pulled
              items[i].Item_Variants = items[i].Item_Variants.concat(body.ReadMultiple_Result[this.itemVariantsServiceName]);
              let n = body.ReadMultiple_Result[this.itemVariantsServiceName].length - 1;
              // Recursively call processVariants to determine if there are more variants using the key from the last variant pulled
              processVariants(client, items[i], body.ReadMultiple_Result[this.itemVariantsServiceName][n].Key).then((result) => {
                docs.push({
                  doc: items[i],
                  productQuantityRemoteID: items[i].Item.No,
                  productQuantityBusinessReference: this.nc.extractBusinessReference(this.channelProfile.productBusinessReferences, items[i])
                });
                pResolve(result);
              }).catch((err) => {
                pReject(err);
              });
            } else if (typeof body.ReadMultiple_Result[this.itemVariantsServiceName] === 'object') {
              items[i].Item_Variants.push(body.ReadMultiple_Result[this.itemVariantsServiceName]);

              // Recursively call processVariants to determine if there are more variants using the key from the last variant pulled
              processVariants(client, items[i], body.ReadMultiple_Result[this.itemVariantsServiceName].Key).then((result) => {
                docs.push({
                  doc: items[i],
                  productQuantityRemoteID: items[i].Item.No,
                  productQuantityBusinessReference: this.nc.extractBusinessReference(this.channelProfile.productBusinessReferences, items[i])
                });
                pResolve(result);
              }).catch((err) => {
                pReject(err);
              });
            } else {
              pResolve();
            }
          }
        }).bind(this));
      }));
    }

    Promise.all(p).then(() => {
      resolve(docs);
    }).catch((err) => {
      reject(err);
    });
  });
}
