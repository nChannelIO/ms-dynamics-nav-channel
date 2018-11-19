'use strict'

let GetProductMatrixFromQuery = function (ncUtil, channelProfile, flowContext, payload, callback) {

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
  } else if (!channelProfile.channelAuthValues.itemUrl) {
    invalid = true;
    invalidMsg = "channelProfile.channelAuthValues.itemUrl was not provided"
  } else if (!channelProfile.productBusinessReferences) {
    invalid = true;
    invalidMsg = "channelProfile.productBusinessReferences was not provided"
  } else if (!Array.isArray(channelProfile.productBusinessReferences)) {
    invalid = true;
    invalidMsg = "channelProfile.productBusinessReferences is not an array"
  } else if (channelProfile.productBusinessReferences.length === 0) {
    invalid = true;
    invalidMsg = "channelProfile.productBusinessReferences is empty"
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
      obj["Field"] = "Last_Date_Modified";

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

      // DateTime Field
      let fc = {};
      fc["Field"] = flowContext.dateTimeField || "LastModified";

      if (payload.doc.modifiedDateRange.startDateGMT && !payload.doc.modifiedDateRange.endDateGMT) {
        // '..' is a NAV filter for interval. Using as a suffix pulls records after the startDate
        fc["Criteria"] = new Date(Date.parse(payload.doc.modifiedDateRange.startDateGMT) - 1).toISOString() + "..";
      } else if (payload.doc.modifiedDateRange.endDateGMT && !payload.doc.modifiedDateRange.startDateGMT) {
        // '..' is a NAV filter for interval. Using as a prefix pulls records before the endDate
        fc["Criteria"] = ".." + new Date(Date.parse(payload.doc.modifiedDateRange.endDateGMT) + 1).toISOString();
      } else if (payload.doc.modifiedDateRange.startDateGMT && payload.doc.modifiedDateRange.endDateGMT) {
        // '..' is a NAV filter for interval. Using between two dates as part of the string pulls records between startDate and endDate
        fc["Criteria"] = new Date(Date.parse(payload.doc.modifiedDateRange.startDateGMT) - 1).toISOString() + ".." + new Date(Date.parse(payload.doc.modifiedDateRange.endDateGMT) + 1).toISOString();
      }

      args.filter.push(fc);
    }

    if (flowContext && flowContext.field && flowContext.criteria) {
      let obj = {};
      obj["Field"] = flowContext.field;
      obj["Criteria"] = flowContext.criteria; // The pipe '|' symbol is a NAV filter for 'OR'
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
    let itemUrl = channelProfile.channelAuthValues.itemUrl;
    let itemVariantsUrl = channelProfile.channelAuthValues.itemVariantsUrl;
    let itemServiceName = channelProfile.channelAuthValues.itemServiceName;
    let itemVariantsServiceName = channelProfile.channelAuthValues.itemVariantsServiceName;

    let wsdlAuthRequired = true;
    let ntlmSecurity = new NTLMSecurity(username, password, domain, workstation, wsdlAuthRequired);

    // Log URL
    log("Connecting to URL [" + itemUrl + "]", ncUtil);

    let options = {
      NTLMSecurity: ntlmSecurity
    };

    let pagingContext = {};

    try {
      // Item Endpoint Client
      soap.createClient(itemUrl, options, function(itemErr, itemClient) {
        if (!itemErr) {
          log("Connecting to URL [" + itemVariantsUrl + "]", ncUtil);

          // Item_Variants Endpoint Client
          soap.createClient(itemVariantsUrl, options, function(itemVariantsErr, variantClient) {
            if (!itemVariantsErr) {
              itemClient.ReadMultiple(args, function(error, result, envelope, soapHeader) {
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
                    function processItems(body) {
                      return new Promise((resolve, reject) => {
                        if (Array.isArray(body.ReadMultiple_Result[itemServiceName])) {

                          let p = [];

                          // Process Each Item and their Variants if any
                          for (let i = 0; i < body.ReadMultiple_Result[itemServiceName].length; i++) {
                            let product = {
                              Item: body.ReadMultiple_Result[itemServiceName][i]
                            };

                            // Set Key to resume from if an error occurs or when getting the next set of items
                            pagingContext.key = body.ReadMultiple_Result[itemServiceName][i].Key;

                            // Process all Item_Variant Records for current Item
                            p.push(processVariants(variantClient, product).then((doc) =>{
                              docs.push({
                                doc: doc,
                                productRemoteID: doc.Item.No,
                                productBusinessReference: nc.extractBusinessReference(channelProfile.productBusinessReferences, doc)
                              });
                            }).catch((err) => {
                              reject(err);
                            }));
                          }

                          // Return from stub function when all items have been processed from current set
                          Promise.all(p).then(() => {
                            resolve();
                          }).catch((err) => {
                            reject(err);
                          });
                        } else if (typeof body.ReadMultiple_Result[itemServiceName] === 'object') {
                          let product = {
                            Item: body.ReadMultiple_Result[itemServiceName]
                          };

                          // Set Key to resume from if an error occurs or when getting the next set of items
                          pagingContext.key = body.ReadMultiple_Result[itemServiceName].Key;

                          // Process Item_Variant Records for Item
                          processVariants(variantClient, product).then((doc) =>{
                            docs.push({
                              doc: doc,
                              productRemoteID: doc.Item.No,
                              productBusinessReference: nc.extractBusinessReference(channelProfile.productBusinessReferences, doc)
                            });
                            resolve();
                          }).catch((err) => {
                            reject(err);
                          });
                        } else {
                          resolve();
                        }
                      });
                    }

                    // Process Variants
                    function processVariants(client, doc, key) {
                      return new Promise((resolve, reject) => {
                        args = {
                          filter: [
                            {
                              Field: "Item_No",
                              Criteria: doc.Item.No
                            }
                          ]
                        }

                        // Set key when provided in a recursive call
                        if (key) {
                          args.bookmarkKey = key;
                        }

                        if (!doc.Item.Item_Variants) {
                          doc.Item.Item_Variants = [];
                        }

                        client.ReadMultiple(args, function(error, body, envelope, soapHeader) {
                          if (!error) {
                            if (!body.ReadMultiple_Result) {
                              // Return if there are no more variants to process
                              resolve(doc);
                            } else {
                              if (Array.isArray(body.ReadMultiple_Result[itemVariantsServiceName])) {

                                // Join existing Item_Variants with those pulled
                                doc.Item.Item_Variants = doc.Item.Item_Variants.concat(body.ReadMultiple_Result[itemVariantsServiceName]);
                                let n = body.ReadMultiple_Result[itemVariantsServiceName].length - 1;

                                // Recursively call processVariants to determine if there are more variants using the key from the last variant pulled
                                processVariants(client, doc, body.ReadMultiple_Result[itemVariantsServiceName][n].Key).then((result) => {
                                  resolve(result);
                                }).catch((err) => {
                                  reject(err);
                                });
                              } else if (typeof body.ReadMultiple_Result[itemVariantsServiceName] === 'object') {
                                doc.Item.Item_Variants.push(body.ReadMultiple_Result[itemVariantsServiceName]);

                                // Recursively call processVariants to determine if there are more variants using the key from the last variant pulled
                                processVariants(client, doc, body.ReadMultiple_Result[itemVariantsServiceName].Key).then((result) => {
                                  resolve(result);
                                }).catch((err) => {
                                  reject(err);
                                });
                              } else {
                                resolve(doc);
                              }
                            }
                          } else {
                            reject(error);
                          }
                        });
                      });
                    }

                    // Begin processing Items
                    processItems(result).then(() => {
                      if (docs.length === payload.doc.pageSize) {
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
                    logError("GetProductMatrixFromQuery Callback error - " + error, ncUtil);
                    out.ncStatusCode = 500;
                    out.payload.error = error;
                    callback(out);
                  }
                }
              });
            } else {
              let errStr = String(itemVariantsErr);

              if (errStr.indexOf("Code: 401") !== -1) {
                logError("401 Unauthorized (Invalid Credentials) " + errStr);
                out.ncStatusCode = 400;
                out.response.endpointStatusCode = 401;
                out.response.endpointStatusMessage = "Unauthorized";
                out.payload.error = itemVariantsErr;
              } else {
                logError("GetProductMatrixFromQuery Callback error - " + itemVariantsErr, ncUtil);
                out.ncStatusCode = 500;
                out.payload.error = itemVariantsErr;
              }
              callback(out);
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
            logError("GetProductMatrixFromQuery Callback error - " + itemErr, ncUtil);
            out.ncStatusCode = 500;
            out.payload.error = itemErr;
          }
          callback(out);
        }
      });
    } catch (err) {
      // Exception Handling
      logError("Exception occurred in GetProductMatrixFromQuery - " + err, ncUtil);
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

module.exports.GetProductMatrixFromQuery = GetProductMatrixFromQuery;
