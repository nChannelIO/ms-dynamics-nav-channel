'use strict'

let UpdateCustomer = function (ncUtil, channelProfile, flowContext, payload, callback) {

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
  } else if (!channelProfile.channelAuthValues.customerUrl) {
    invalid = true;
    invalidMsg = "channelProfile.channelAuthValues.customerUrl was not provided"
  } else if (!channelProfile.customerBusinessReferences) {
    invalid = true;
    invalidMsg = "channelProfile.customerBusinessReferences was not provided"
  } else if (!Array.isArray(channelProfile.customerBusinessReferences)) {
    invalid = true;
    invalidMsg = "channelProfile.customerBusinessReferences is not an array"
  } else if (channelProfile.customerBusinessReferences.length === 0) {
    invalid = true;
    invalidMsg = "channelProfile.customerBusinessReferences is empty"
  }

  // Payload Checking
  if (!payload) {
    invalid = true;
    invalidMsg = "payload was not provided"
  } else if (!payload.doc) {
    invalid = true;
    invalidMsg = "payload.doc was not provided";
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
      No: payload.doc.Customer.No
    }

    // https://<baseUrl>:<port>/<serverInstance>/WS/<companyName>/Page/Customer
    let username = channelProfile.channelAuthValues.username;
    let password = channelProfile.channelAuthValues.password;
    let domain = channelProfile.channelAuthValues.domain;
    let workstation = channelProfile.channelAuthValues.workstation;
    let url = channelProfile.channelAuthValues.customerUrl;
    let customerServiceName = channelProfile.channelAuthValues.customerServiceName;

    let wsdlAuthRequired = true;
    let ntlmSecurity = new NTLMSecurity(username, password, domain, workstation, wsdlAuthRequired);

    // Log URL
    log("Using URL [" + url + "]", ncUtil);

    let options = {
      NTLMSecurity: ntlmSecurity
    };

    console.log(args);

    try {
      soap.createClient(url, options, function(err, client) {
        if (!err) {
          client.Read(args, function(error, body, envelope, soapHeader) {
            if (!error) {
              if (body[customerServiceName]) {
                payload.doc[customerServiceName].Key = body[customerServiceName].Key;
                args = payload.doc;

                client.Update(args, function(error, body, envelope, soapHeader) {
                  if (!error) {
                    if (body[customerServiceName]) {
                      out.ncStatusCode = 200;
                      out.payload = {
                        doc: body,
                        customerBusinessReference: nc.extractBusinessReference(channelProfile.customerBusinessReferences, body)
                      };
                      callback(out);
                    } else {
                      out.ncStatusCode = 400;
                      out.payload.error = body;
                      callback(out);
                    }
                  } else {
                    if (error.response) {
                      logError("Error - Returning Response as 400 - " + error, ncUtil);
                      out.ncStatusCode = 400;
                      out.payload.error = error;
                      callback(out);
                    } else {
                      logError("UpdateCustomer Callback error - " + error, ncUtil);
                      out.ncStatusCode = 500;
                      out.payload.error = error;
                      callback(out);
                    }
                  }
                });
              } else {
                out.ncStatusCode = 400;
                out.payload.error = body;
                callback(out);
              }
            } else {
              if (error.response) {
                logError("UpdateCustomer Returning Response as 400 - " + error, ncUtil);
                out.ncStatusCode = 400;
                out.payload.error = error;
                callback(out);
              } else {
                logError("UpdateCustomer Callback error - " + error, ncUtil);
                out.ncStatusCode = 500;
                out.payload.error = error;
                callback(out);
              }
            }
          });
        } else {
          let errStr = String(err);

          if (errStr.indexOf("Code: 401") !== -1) {
            logError("401 Unauthorized (Invalid Credentials) " + errStr);
            out.ncStatusCode = 400;
            out.response.endpointStatusCode = 401;
            out.response.endpointStatusMessage = "Unauthorized";
            out.payload.error = err;
          } else {
            logError("CheckForCustomer Callback error - " + err, ncUtil);
            out.ncStatusCode = 500;
            out.payload.error = err;
          }
          callback(out);
        }
      });
    } catch (err) {
      // Exception Handling
      logError("Exception occurred in UpdateCustomer - " + err, ncUtil);
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

module.exports.UpdateCustomer = UpdateCustomer;
