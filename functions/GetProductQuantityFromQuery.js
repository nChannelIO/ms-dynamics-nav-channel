'use strict'

let GetProductQuantityFromQuery = function (ncUtil, channelProfile, flowContext, payload, callback) {

  log("Building response object...", ncUtil);
  let out = {
    ncStatusCode: null,
    response: {},
    payload: {}
  };

  let invalid = false;
  let invalidMsg = "";

  if (!ncUtil) {
    invalid = true;
    invalidMsg = "ncUtil was not provided"
  }

  // Sanity Checking
  if (!channelProfile) {
    invalid = true;
    invalidMsg = "channelProfile was not provided"
  } else if (!channelProfile.channelSettingsValues) {
    invalid = true;
    invalidMsg = "channelProfile.channelSettingsValues was not provided"
  } else if (!channelProfile.channelSettingsValues.protocol) {
    invalid = true;
    invalidMsg = "channelProfile.channelSettingsValues.protocol was not provided"
  } else if (!channelProfile.channelAuthValues) {
    invalid = true;
    invalidMsg = "channelProfile.channelAuthValues was not provided"
  } else if (!channelProfile.channelAuthValues.username) {
    invalid = true;
    invalidMsg = "channelProfile.channelAuthValues.username was not provided"
  } else if (!channelProfile.channelAuthValues.password) {
    invalid = true;
    invalidMsg = "channelProfile.channelAuthValues.password was not provided"
  } else if (!channelProfile.channelAuthValues.variantInventoryUrl) {
    invalid = true;
    invalidMsg = "channelProfile.channelAuthValues.variantInventoryUrl was not provided"
  } else if (!channelProfile.productQuantityBusinessReferences) {
    invalid = true;
    invalidMsg = "channelProfile.productQuantityBusinessReferences was not provided"
  } else if (!Array.isArray(channelProfile.productQuantityBusinessReferences)) {
    invalid = true;
    invalidMsg = "channelProfile.productQuantityBusinessReferences is not an array"
  } else if (channelProfile.productQuantityBusinessReferences.length === 0) {
    invalid = true;
    invalidMsg = "channelProfile.productQuantityBusinessReferences is empty"
  }

  // Payload Checking
  if (!payload) {
    invalid = true;
    invalidMsg = "payload was not provided"
  } else if (!payload.doc) {
    invalid = true;
    invalidMsg = "payload.doc was not provided";
  } else if (!payload.doc.remoteIDs && !payload.doc.searchFields && !payload.doc.modifiedDateRange) {
    invalid = true;
    invalidMsg = "either payload.doc.remoteIDs or payload.doc.searchFields or payload.doc.modifiedDateRange must be provided"
  } else if (payload.doc.remoteIDs && (payload.doc.searchFields || payload.doc.modifiedDateRange)) {
    invalid = true;
    invalidMsg = "only one of payload.doc.remoteIDs or payload.doc.searchFields or payload.doc.modifiedDateRange may be provided"
  } else if (payload.doc.remoteIDs && (!Array.isArray(payload.doc.remoteIDs) || payload.doc.remoteIDs.length === 0)) {
    invalid = true;
    invalidMsg = "payload.doc.remoteIDs must be an Array with at least 1 remoteID"
  } else if (payload.doc.searchFields && (!Array.isArray(payload.doc.searchFields) || payload.doc.searchFields.length === 0)) {
    invalid = true;
    invalidMsg = "payload.doc.searchFields must be an Array with at least 1 key value pair: {searchField: 'key', searchValues: ['value_1']}"
  } else if (payload.doc.searchFields) {
    for (let i = 0; i < payload.doc.searchFields.length; i++) {
      if (!payload.doc.searchFields[i].searchField || !Array.isArray(payload.doc.searchFields[i].searchValues) || payload.doc.searchFields[i].searchValues.length === 0) {
        invalid = true;
        invalidMsg = "payload.doc.searchFields[" + i + "] must be a key value pair: {searchField: 'key', searchValues: ['value_1']}";
        break;
      }
    }
  } else if (payload.doc.modifiedDateRange && !(payload.doc.modifiedDateRange.startDateGMT || payload.doc.modifiedDateRange.endDateGMT)) {
    invalid = true;
    invalidMsg = "at least one of payload.doc.modifiedDateRange.startDateGMT or payload.doc.modifiedDateRange.endDateGMT must be provided"
  } else if (payload.doc.modifiedDateRange && payload.doc.modifiedDateRange.startDateGMT && payload.doc.modifiedDateRange.endDateGMT && (payload.doc.modifiedDateRange.startDateGMT > payload.doc.modifiedDateRange.endDateGMT)) {
    invalid = true;
    invalidMsg = "startDateGMT must have a date before endDateGMT";
  }

  // Callback Checking
  if (!callback) {
    throw new Error("A callback function was not provided");
  } else if (typeof callback !== 'function') {
    throw new TypeError("callback is not a function")
  }

  if (!invalid) {

    // Require SOAP
    const soap = require('strong-soap/src/soap');
    const NTLMSecurity = require('strong-soap').NTLMSecurity;
    const nc = require('../util/common');

    // Setup Request Arguments
    let args = {
      filter: []
    };

    if (payload.doc.searchFields) {

      payload.doc.searchFields.forEach(function (searchField) {
        let obj = {};
        obj["Field"] = searchField.searchField;
        obj["Criteria"] = searchField.searchValues.join('|'); // The pipe '|' symbol is a NAV filter for 'OR'
        args.filter.push(obj);
      });

    } else if (payload.doc.remoteIDs) {

      let obj = {};
      obj["Field"] = "No";
      obj["Criteria"] = payload.doc.remoteIDs.join('|'); // The pipe '|' symbol is a NAV filter for 'OR'
      args.filter.push(obj);

    } else if (payload.doc.modifiedDateRange) {

      let obj = {};
      obj["Field"] = "Posting_Date";

      if (payload.doc.modifiedDateRange.startDateGMT && !payload.doc.modifiedDateRange.endDateGMT) {
        // '..' is a NAV filter for interval. Using as a suffix pulls records after the startDate
        obj["Criteria"] = nc.formatDate(new Date(Date.parse(payload.doc.modifiedDateRange.startDateGMT) - 1).toISOString()) + "..";
      } else if (payload.doc.modifiedDateRange.endDateGMT && !payload.doc.modifiedDateRange.startDateGMT) {
        // '..' is a NAV filter for interval. Using as a prefix pulls records before the endDate
        obj["Criteria"] = ".." + nc.formatDate(new Date(Date.parse(payload.doc.modifiedDateRange.endDateGMT) + 1).toISOString());
      } else if (payload.doc.modifiedDateRange.startDateGMT && payload.doc.modifiedDateRange.endDateGMT) {
        // '..' is a NAV filter for interval. Using between two dates as part of the string pulls records between startDate and endDate
        obj["Criteria"] = nc.formatDate(new Date(Date.parse(payload.doc.modifiedDateRange.startDateGMT) - 1).toISOString()) + ".." + nc.formatDate(new Date(Date.parse(payload.doc.modifiedDateRange.endDateGMT) + 1).toISOString());
      }

      args.filter.push(obj);
    }

    // Additional Criteria Filter
    if (flowContext && flowContext.field && flowContext.criteria) {
      let obj = {};
      obj["Field"] = flowContext.field;
      obj["Criteria"] = flowContext.criteria;
      args.filter.push(obj);
    }

    // Paging Context
    if (payload.doc.pagingContext) {
      args.bookmarkKey = payload.doc.pagingContext.key;
    }

    // Page Size
    if (payload.doc.pageSize) {
      args.setSize = payload.doc.pageSize;
    }

    // https://<baseUrl>:<port>/<serverInstance>/WS/<companyName>/Page/Item
    let username = channelProfile.channelAuthValues.username;
    let password = channelProfile.channelAuthValues.password;
    let domain = channelProfile.channelAuthValues.domain;
    let workstation = channelProfile.channelAuthValues.workstation;
    let itemLedgerUrl = channelProfile.channelAuthValues.itemLedgerUrl;
    let inventoryUrl = channelProfile.channelAuthValues.variantInventoryUrl;
    let itemVariantsUrl = channelProfile.channelAuthValues.itemVariantsUrl;
    let itemUrl = channelProfile.channelAuthValues.itemUrl;
    let itemServiceName = channelProfile.channelAuthValues.itemServiceName;
    let itemLedgerServiceName = channelProfile.channelAuthValues.itemLedgerServiceName;
    let inventoryServiceName = channelProfile.channelAuthValues.inventoryServiceName;
    let itemVariantsServiceName = channelProfile.channelAuthValues.itemVariantsServiceName;

    let wsdlAuthRequired = true;
    let ntlmSecurity = new NTLMSecurity(username, password, domain, workstation, wsdlAuthRequired);

    // Log Service Names
    log(`Item Service Name: ${itemServiceName}`);
    log(`Item Ledger Service Name: ${itemLedgerServiceName}`);
    log(`Inventory Name: ${inventoryServiceName}`);
    log(`Item Variants Name: ${itemVariantsServiceName}`);

    let options = {
      NTLMSecurity: ntlmSecurity
    };

    let pagingContext = {};
    let totalRecords = 0;

    try {
      // If we are querying by remoteIDs, use the Item endpoint as the first call
      // Otherwise, query the Item_Ledger endpoint
      if (payload.doc.remoteIDs) {
        log("Connecting to URL [" + itemUrl + "]", ncUtil);

        // Create the soap client for Items and query the items specified by the remoteIDs
        soap.createClient(itemUrl, options, function(itemErr, itemClient) {
          if (!itemErr) {
            itemClient.ReadMultiple(args, function(error, result, envelope, soapHeader) {

              let docs = [];
              let data = result;

              if (!error) {
                // If ReadMultiple_Result is undefined, no results were returned
                if (!result.ReadMultiple_Result) {
                  out.ncStatusCode = 204;
                  out.payload = data;
                  callback(out);
                } else {

                  // Query Variants for the Item
                  function queryVariants(itemDoc, client) {
                    return new Promise((resolve, reject) => {
                      // Query arguments will only include the "Item_No" to return only the variants associated with the item
                      let args = {
                        filter: [
                          {
                            Field: "Item_No",
                            Criteria: itemDoc.Item.No
                          }
                        ],
                        setSize: 250
                      };

                      // Additional Criteria Filter
                      if (flowContext && flowContext.variantField && flowContext.variantCriteria) {
                        let obj = {};
                        obj["Field"] = flowContext.variantField;
                        obj["Criteria"] = flowContext.variantCriteria;
                        args.filter.push(obj);
                      }

                      client.ReadMultiple(args, function(error, body, envelope, soapHeader) {
                        // Sanity checks against result to ensure that we have a result back
                        // Return an error if the call fails
                        if (!error) {
                          if (typeof body === 'undefined' || body == null) {
                            resolve();
                          } else {
                            if (typeof body.ReadMultiple_Result !== 'undefined' || body.ReadMultiple_Result != null) {
                              itemDoc.Item.Variant_Inventory = body.ReadMultiple_Result[itemVariantsServiceName];
                              resolve();
                            } else {
                              resolve();
                            }
                          }
                        } else {
                          reject(`Error querying variants: ${error}`);
                        }
                      });
                    });
                  }

                  // Query Inventory
                  function queryInventory(itemDoc, client) {
                    return new Promise((resolve, reject) => {
                      let p = [];
                      if (itemDoc.Item.Variant_Inventory) {
                        // Check if an Array or Object was passed in and ensure that we are processing an Array
                        if (!Array.isArray(itemDoc.Item.Variant_Inventory) && typeof itemDoc.Item.Variant_Inventory === 'object') {
                          itemDoc.Item.Variant_Inventory = [itemDoc.Item.Variant_Inventory];
                        }

                        // Check if using an endpoint where strict arguments are needed when querying inventory
                        if (flowContext && flowContext.useInventoryCalculation) {

                          // Process each Variant
                          for (let i = 0; i < itemDoc.Item.Variant_Inventory.length; i++) {
                            p.push(new Promise((pResolve, pReject) => {
                              let args = {
                                itemNo: itemDoc.Item.Variant_Inventory[i].Item_No,
                                itemVariantCode: itemDoc.Item.Variant_Inventory[i].Code,
                                locationCode: flowContext.locationCode,
                                asOfDate: nc.formatDate(new Date().toISOString(), '-', true)
                              }

                              client.GetAvailableToday(args, function(error, body, envelope, soapHeader) {
                                if (error) {
                                  log(`Variant Not Found: ${error}`);
                                  pReject(`Variant Not Found: ${error}`);
                                } else {

                                  // Format response doc
                                  let doc = {
                                    No: itemDoc.Item.Variant_Inventory[i].Item_No,
                                    LocationCode: flowContext.locationCode,
                                    Variant_Inventory: {
                                      Code: itemDoc.Item.Variant_Inventory[i].Code,
                                      body: body
                                    }
                                  }

                                  pResolve({ Item: doc });
                                }
                              });
                            }));
                          };

                          // Return all docs processed from the variants
                          Promise.all(p).then((doc) => {
                            resolve(doc);
                          }).catch((err) => {
                            reject(err);
                          });
                        } else {
                          // Process each Variant
                          for (let i = 0; i < itemDoc.Item.Variant_Inventory.length; i++) {
                            p.push(new Promise((pResolve, pReject) => {

                              // Query arguments will only include the "Code" to return only the associated variant's inventory
                              let args = {
                                filter: [
                                  {
                                    Field: "Code",
                                    Criteria: itemDoc.Item.Variant_Inventory[i].Code
                                  }
                                ],
                                setSize: 250
                              };

                              // Additional Criteria Filter
                              if (flowContext && flowContext.variantField && flowContext.variantCriteria) {
                                let obj = {};
                                obj["Field"] = flowContext.variantField;
                                obj["Criteria"] = flowContext.variantCriteria;
                                args.filter.push(obj);
                              }

                              client.ReadMultiple(args, function(error, body, envelope, soapHeader) {
                                // Sanity checks against result to ensure that we have a result back
                                // Return an error if the call fails
                                if (!error) {
                                  if (!body.ReadMultiple_Result) {
                                    log(`Variant Not Found: ${error}`);
                                    pReject(`Variant Not Found: ${error}`);
                                  } else {

                                    // Format response doc
                                    let doc = {
                                      No: itemDoc.Item.No,
                                      Variant_Inventory: {
                                        Code: itemDoc.Item.Variant_Inventory[i].Code,
                                        body: body.ReadMultiple_Result[inventoryServiceName]
                                      }
                                    }

                                    pResolve({ Item: doc });
                                  }
                                } else {
                                  reject(`Error querying variant inventory: ${error}`);
                                }
                              });
                            }));
                          };

                          // Return all docs processed from the variants
                          Promise.all(p).then((doc) => {
                            resolve(doc);
                          }).catch((err) => {
                            reject(err);
                          });
                        }
                      } else {
                        // Return the doc inside an array if there are no variants to process
                        resolve([itemDoc]);
                      }
                    });
                  }

                  // Begin processing Items
                  function processItems(body, itemVariantsClient, inventoryClient) {
                    return new Promise((resolve, reject) => {
                      let p = [];
                      let items = [];

                      // Check if multiple record were returned - Array if greater than 1, Object if equal to 1
                      // Push item records into an array
                      if (Array.isArray(body.ReadMultiple_Result[itemServiceName])) {
                        totalRecords = body.ReadMultiple_Result[itemServiceName].length;
                        for (let i = 0; i < body.ReadMultiple_Result[itemServiceName].length; i++) {
                          let product = {
                            Item: body.ReadMultiple_Result[itemServiceName][i]
                          };
                          pagingContext.key = body.ReadMultiple_Result[itemServiceName][i].Key;
                          items.push(product);
                        }
                      } else if (typeof body.ReadMultiple_Result[itemServiceName] === 'object') {
                        totalRecords = 1;
                        let product = {
                          Item: body.ReadMultiple_Result[itemServiceName]
                        };
                        pagingContext.key = body.ReadMultiple_Result[itemServiceName].Key;
                        items.push(product);
                      }

                      // Process each item record
                      items.forEach(x => {
                        p.push(new Promise((pResolve, pReject) => {
                          /* Order of calls:
                             queryVariants - Query for any variants the Item may have
                             queryInventory - Query inventory for the Item's variants if any were retruned in the previous call
                          */
                          queryVariants(x, itemVariantsClient).then(() => queryInventory(x, inventoryClient)).then((result) =>{
                            // Create result docs with the remoteID and businessReference
                            for (let i = 0; i < result.length; i++) {
                              docs.push({
                                doc: result[i],
                                productQuantityRemoteID: result[i].Item.No,
                                productQuantityBusinessReference: nc.extractBusinessReference(channelProfile.productQuantityBusinessReferences, result[i])
                              });
                            }
                            pResolve();
                          }).catch((err) => {
                            pReject(err);
                          });
                        }));
                      });

                      // Return from stub function when all items have been processed from current set
                      Promise.all(p).then(() => {
                        resolve();
                      }).catch((err) => {
                        reject(err);
                      });
                    });
                  }

                  // Create the soap clients for querying variants and inventory and pass them as arguments to the processItems function
                  // They are then passed into the queryVariants and queryInventory functions respectively
                  log("Connecting to URL [" + itemVariantsUrl + "]", ncUtil);
                  soap.createClient(itemVariantsUrl, options, function(itemVariantsErr, itemVariantsClient) {
                    if (!itemVariantsErr) {
                      log("Connecting to URL [" + inventoryUrl + "]", ncUtil);
                      soap.createClient(inventoryUrl, options, function(inventoryErr, inventoryClient) {
                        if (!inventoryErr) {

                          // Begin processing Item Records
                          processItems(result, itemVariantsClient, inventoryClient).then(() => {
                            if (totalRecords === payload.doc.pageSize) {
                              out.ncStatusCode = 206;
                              out.pagingContext = pagingContext;
                            } else {
                              out.ncStatusCode = 200;
                            }
                            out.payload = docs;
                            callback(out);
                          }).catch((err) => {
                            logError("Error - Returning Response as 400 - " + err, ncUtil);
                            out.ncStatusCode = 400;
                            out.payload.error = err;
                            callback(out);
                          });
                        } else {
                          let errStr = String(inventoryErr);

                          if (errStr.indexOf("Code: 401") !== -1) {
                            logError("401 Unauthorized (Invalid Credentials) " + errStr);
                            out.ncStatusCode = 400;
                            out.response.endpointStatusCode = 401;
                            out.response.endpointStatusMessage = "Unauthorized";
                            out.payload.error = itemErr;
                          } else {
                            logError("GetProductQuantityFromQuery Callback error - " + inventoryErr, ncUtil);
                            out.ncStatusCode = 500;
                            out.payload.error = itemErr;
                          }
                          reject(out);
                        }
                      });
                    } else {
                      let errStr = String(itemVariantsErr);

                      if (errStr.indexOf("Code: 401") !== -1) {
                        logError("401 Unauthorized (Invalid Credentials) " + errStr);
                        out.ncStatusCode = 400;
                        out.response.endpointStatusCode = 401;
                        out.response.endpointStatusMessage = "Unauthorized";
                        out.payload.error = itemErr;
                      } else {
                        logError("GetProductQuantityFromQuery Callback error - " + itemVariantsErr, ncUtil);
                        out.ncStatusCode = 500;
                        out.payload.error = itemErr;
                      }
                      reject(out);
                    }
                  });
                }
              } else {
                if (error.response) {
                  logError("Error - Returning Response as 400 - " + error, ncUtil);
                  out.ncStatusCode = 400;
                  out.payload.error = error;
                  callback(out);
                } else {
                  logError("GetProductQuantityFromQuery Callback error - " + error, ncUtil);
                  out.ncStatusCode = 500;
                  out.payload.error = error;
                  callback(out);
                }
              }
            });
          } else {
            let errStr = String(itemErr);

            if (errStr.indexOf("Code: 401") !== -1) {
              logError("401 Unauthorized (Invalid Credentials) " + errStr);
              out.ncStatusCode = 400;
              out.response.endpointStatusCode = 401;
              out.response.endpointStatusMessage = "Unauthorized";
              out.payload.error = itemErr;
            } else {
              logError("GetProductQuantityFromQuery Callback error - " + itemErr, ncUtil);
              out.ncStatusCode = 500;
              out.payload.error = itemErr;
            }
            reject(out);
          }
        });
      } else {
        log("Connecting to URL [" + itemLedgerUrl + "]", ncUtil);
        soap.createClient(itemLedgerUrl, options, function(itemLedgerErr, itemLedgerClient) {
          if (!itemLedgerErr) {
            itemLedgerClient.ReadMultiple(args, function(error, result, envelope, soapHeader) {

              let docs = [];
              let data = result;

              if (!error) {
                if (!result.ReadMultiple_Result) {
                  // If ReadMultiple_Result is undefined, no results were returned
                  out.ncStatusCode = 204;
                  out.payload = data;
                  callback(out);
                } else {

                  // Process Items
                  function processLedger(body) {
                    return new Promise((resolve, reject) => {
                      if (Array.isArray(body.ReadMultiple_Result[itemLedgerServiceName])) {
                        let p = [];
                        let items = [];
                        totalRecords = result.ReadMultiple_Result[itemLedgerServiceName].length;

                        // Process Each Item and their Variants if any
                        for (let i = 0; i < body.ReadMultiple_Result[itemLedgerServiceName].length; i++) {
                          let product = {
                            Item_Ledger: body.ReadMultiple_Result[itemLedgerServiceName][i]
                          };

                          let code = product.Item_Ledger.Variant_Code;
                          let itemNo = product.Item_Ledger.Item_No;

                          // Set Key to resume from if an error occurs or when getting the next set of items
                          pagingContext.key = body.ReadMultiple_Result[itemLedgerServiceName][i].Key;

                          items.push({ itemNo: itemNo, code: code });
                        }

                        // Remove Duplicates
                        items = items.reduce((arr, x) => {
                          if(!arr.some(obj => obj.itemNo === x.itemNo && obj.code === x.code)) {
                            arr.push(x);
                          }
                          return arr;
                        }, []);

                        items.forEach(x => {
                          p.push(new Promise((pResolve, pReject) => {
                            if (flowContext && flowContext.useInventoryCalculation) {
                              queryItem(x.itemNo, x.code).then((doc) =>{
                                docs.push({
                                  doc: doc,
                                  productQuantityRemoteID: doc.Item.No,
                                  productQuantityBusinessReference: nc.extractBusinessReference(channelProfile.productQuantityBusinessReferences, doc)
                                });
                                pResolve();
                              }).catch((err) => {
                                pReject(err);
                              });
                            } else if (x.code != null) {
                              queryItem(x.itemNo).then(itemDoc => queryVariant(itemDoc, x.code)).then((doc) => {
                                let item = {
                                  Item: doc
                                }
                                docs.push({
                                  doc: item,
                                  productQuantityRemoteID: item.Item.No,
                                  productQuantityBusinessReference: nc.extractBusinessReference(channelProfile.productQuantityBusinessReferences, item)
                                });
                                pResolve();
                              }).catch((err) => {
                                pReject(err);
                              });
                            } else {
                              queryItem(x.itemNo).then((doc) =>{
                                let item = {
                                  Item: doc
                                }
                                docs.push({
                                  doc: item,
                                  productQuantityRemoteID: item.Item.No,
                                  productQuantityBusinessReference: nc.extractBusinessReference(channelProfile.productQuantityBusinessReferences, item)
                                });
                                pResolve();
                              }).catch((err) => {
                                pReject(err);
                              });
                            }
                          }));
                        });

                        // Return from stub function when all items have been processed from current set
                        Promise.all(p).then(() => {
                          resolve();
                        }).catch((err) => {
                          reject(err);
                        });
                      } else if (typeof body.ReadMultiple_Result[itemLedgerServiceName] === 'object') {
                        totalRecords = 1;

                        let product = {
                          Item_Ledger: body.ReadMultiple_Result[itemLedgerServiceName]
                        };

                        let code = product.Item_Ledger.Variant_Code;
                        let itemNo = product.Item_Ledger.Item_No;

                        // Set Key to resume from if an error occurs or when getting the next set of items
                        pagingContext.key = body.ReadMultiple_Result[itemLedgerServiceName].Key;

                        // Process Item_Variant Records for Item
                        if (flowContext && flowContext.useInventoryCalculation) {
                          queryItem(itemNo, code).then((doc) =>{
                            docs.push({
                              doc: doc,
                              productQuantityRemoteID: doc.Item.No,
                              productQuantityBusinessReference: nc.extractBusinessReference(channelProfile.productQuantityBusinessReferences, doc)
                            });
                            resolve();
                          }).catch((err) => {
                            reject(err);
                          });
                        } else if (code != null) {
                          queryItem(itemNo).then(itemDoc => queryVariant(itemDoc, code)).then((doc) => {
                            let item = {
                              Item: doc
                            }
                            docs.push({
                              doc: item,
                              productQuantityRemoteID: item.Item.No,
                              productQuantityBusinessReference: nc.extractBusinessReference(channelProfile.productQuantityBusinessReferences, item)
                            });
                            resolve();
                          }).catch((err) => {
                            reject(err);
                          });
                        } else {
                          queryItem(itemNo).then((doc) =>{
                            let item = {
                              Item: doc
                            }
                            docs.push({
                              doc: item,
                              productQuantityRemoteID: item.Item.No,
                              productQuantityBusinessReference: nc.extractBusinessReference(channelProfile.productQuantityBusinessReferences, item)
                            });
                            resolve();
                          }).catch((err) => {
                            reject(err);
                          });
                        }
                      } else {
                        resolve();
                      }
                    });
                  }

                  // Process Variants
                  function queryVariant(itemDoc, code) {
                    return new Promise((resolve, reject) => {

                      // Variant_Inventory Endpoint Client
                      log("Connecting to URL [" + inventoryUrl + "]", ncUtil);
                      soap.createClient(inventoryUrl, options, function(variantInventoryErr, variantInventoryClient) {
                        if (!variantInventoryErr) {
                          let args = {
                            filter: [
                              {
                                Field: "Code",
                                Criteria: code
                              }
                            ],
                            setSize: 250
                          };

                          if (flowContext && flowContext.variantField && flowContext.variantCriteria) {
                            let obj = {};
                            obj["Field"] = flowContext.variantField;
                            obj["Criteria"] = flowContext.variantCriteria;
                            args.filter.push(obj);
                          }

                          variantInventoryClient.ReadMultiple(args, function(error, body, envelope, soapHeader) {
                            if (!body.ReadMultiple_Result) {
                              log("Variant Not Found");
                              reject("Variant Not Found");
                            } else {
                              itemDoc.Variant_Inventory = body.ReadMultiple_Result[inventoryServiceName];
                              resolve(itemDoc);
                            }
                          });

                        } else {
                          let errStr = String(variantInventoryErr);

                          if (errStr.indexOf("Code: 401") !== -1) {
                            logError("401 Unauthorized (Invalid Credentials) " + errStr);
                            out.ncStatusCode = 400;
                            out.response.endpointStatusCode = 401;
                            out.response.endpointStatusMessage = "Unauthorized";
                            out.payload.error = variantInventoryErr;
                          } else {
                            logError("GetProductQuantityFromQuery Callback error - " + variantInventoryErr);
                            out.ncStatusCode = 500;
                            out.payload.error = variantInventoryErr;
                          }
                          reject(out);
                        }
                      });
                    });
                  }

                  // Process Item
                  function queryItem(itemNo, code) {
                    return new Promise((resolve, reject) => {

                      // Item Endpoint Client
                      let url = flowContext.useInventoryCalculation ? inventoryUrl : itemUrl;
                      log("Connecting to URL [" + url + "]", ncUtil);
                      soap.createClient(url, options, function(itemErr, itemClient) {
                        if (!itemErr) {
                          if (flowContext && flowContext.useInventoryCalculation) {
                            let args = {
                              itemNo: itemNo,
                              itemVariantCode: code,
                              locationCode: flowContext.locationCode,
                              asOfDate: nc.formatDate(new Date().toISOString(), '-', true)
                            }

                            itemClient.GetAvailableToday(args, function(error, body, envelope, soapHeader) {
                              if (error) {
                                log("Item Not Found");
                                reject("Item Not Found");
                              } else {
                                let doc = {
                                  No: itemNo,
                                  LocationCode: flowContext.locationCode,
                                  Variant_Inventory: {
                                    Code: code,
                                    body: body
                                  }
                                };
                                resolve({ Item: doc });
                              }
                            });
                          } else {
                            let args = {
                              filter: [
                                {
                                  Field: "No",
                                  Criteria: itemNo
                                }
                              ],
                              setSize: 250
                            };

                            if (flowContext && flowContext.itemField && flowContext.itemCriteria) {
                              let obj = {};
                              obj["Field"] = flowContext.itemField;
                              obj["Criteria"] = flowContext.itemCriteria;
                              args.filter.push(obj);
                            }

                            itemClient.ReadMultiple(args, function(error, body, envelope, soapHeader) {
                              if (!body.ReadMultiple_Result) {
                                log("Item Not Found");
                                reject("Item Not Found");
                              } else {
                                resolve(body.ReadMultiple_Result[itemServiceName]);
                              }
                            });
                          }
                        } else {
                          let errStr = String(itemErr);

                          if (errStr.indexOf("Code: 401") !== -1) {
                            logError("401 Unauthorized (Invalid Credentials) " + errStr);
                            out.ncStatusCode = 400;
                            out.response.endpointStatusCode = 401;
                            out.response.endpointStatusMessage = "Unauthorized";
                            out.payload.error = itemErr;
                          } else {
                            logError("GetProductQuantityFromQuery Callback error - " + itemErr, ncUtil);
                            out.ncStatusCode = 500;
                            out.payload.error = itemErr;
                          }
                          reject(out);
                        }
                      });
                    });
                  }

                  // Begin processing Item_Ledger Records
                  processLedger(result).then(() => {
                    if (totalRecords === payload.doc.pageSize) {
                      out.ncStatusCode = 206;
                      out.pagingContext = pagingContext;
                    } else {
                      out.ncStatusCode = 200;
                    }
                    out.payload = docs;
                    callback(out);
                  }).catch((err) => {
                    logError("Error - Returning Response as 400 - " + err, ncUtil);
                    out.ncStatusCode = 400;
                    out.payload.error = err;
                    callback(out);
                  });
                }
              } else {
                if (error.response) {
                  logError("Error - Returning Response as 400 - " + error, ncUtil);
                  out.ncStatusCode = 400;
                  out.payload.error = error;
                  callback(out);
                } else {
                  logError("GetProductQuantityFromQuery Callback error - " + error, ncUtil);
                  out.ncStatusCode = 500;
                  out.payload.error = error;
                  callback(out);
                }
              }
            });
          } else {
            let errStr = String(itemLedgerErr);

            if (errStr.indexOf("Code: 401") !== -1) {
              logError("401 Unauthorized (Invalid Credentials) " + errStr);
              out.ncStatusCode = 400;
              out.response.endpointStatusCode = 401;
              out.response.endpointStatusMessage = "Unauthorized";
              out.payload.error = itemLedgerErr;
            } else {
              logError("GetProductQuantityFromQuery Callback error - " + itemLedgerErr, ncUtil);
              out.ncStatusCode = 500;
              out.payload.error = itemLedgerErr;
            }
            callback(out);
          }
        });
      }
    } catch (err) {
      // Exception Handling
      logError("Exception occurred in GetProductQuantityFromQuery - " + err, ncUtil);
      out.ncStatusCode = 500;
      out.payload.error = err;
      callback(out);
    }
  } else {
    // Invalid Request
    log("Callback with an invalid request - " + invalidMsg, ncUtil);
    out.ncStatusCode = 400;
    out.payload.error = invalidMsg;
    callback(out);
  }
};

function logError(msg, ncUtil) {
  console.log("[error] " + msg);
}

function log(msg, ncUtil) {
  console.log("[info] " + msg);
}

module.exports.GetProductQuantityFromQuery = GetProductQuantityFromQuery;
