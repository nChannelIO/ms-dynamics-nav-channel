'use strict'

let CheckForCustomer = function (ncUtil, channelProfile, flowContext, payload, callback) {

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
    const jsonata = require('jsonata');

    // Setup Request Arguments
    let args = {
      filter: []
    };

    // https://<baseUrl>:<port>/<serverInstance>/WS/<companyName>/Page/Customer
    let username = channelProfile.channelAuthValues.username;
    let password = channelProfile.channelAuthValues.password;
    let domain = channelProfile.channelAuthValues.domain;
    let workstation = channelProfile.channelAuthValues.workstation;
    let url = channelProfile.channelAuthValues.customerUrl;
    let customerServiceName = channelProfile.channelAuthValues.customerServiceName;

    let wsdlAuthRequired = true;
    let ntlmSecurity = new NTLMSecurity(username, password, domain, workstation, wsdlAuthRequired);

    // Extract businessReferences
    channelProfile.customerBusinessReferences.forEach(function (businessReference) {
      let expression = jsonata(businessReference);
      let value = expression.evaluate(payload.doc);
      if (value) {
        let obj = {};
        let lookup = businessReference.split('.').pop();
        obj["Field"] = lookup;
        obj["Criteria"] = value;
        args.filter.push(obj);
      }
    });

    // Log URL
    log("Using URL [" + url + "]", ncUtil);

    let options = {
      NTLMSecurity: ntlmSecurity
    };

    try {
      soap.createClient(url, options, function(err, client) {
        if (!err) {
          client[`${customerServiceName}_Service`][`${customerServiceName}_Port`].ReadMultiple(args, function(error, body, envelope, soapHeader) {
            if (!error) {
              if (!body.ReadMultiple_Result) {
                // If ReadMultiple_Result is undefined, no results were returned
                out.ncStatusCode = 204;
              } else if (Array.isArray(body.ReadMultiple_Result[customerServiceName])) {
                // If an array is returned, multiple customers were found
                out.ncStatusCode = 409;
                out.payload.error = { err: body };
              } else if (typeof body.ReadMultiple_Result[customerServiceName] === 'object') {
                // If an object is returned, one customer was found
                out.ncStatusCode = 200;
                out.payload = {
                  customerRemoteID: body.ReadMultiple_Result[customerServiceName].No,
                  customerBusinessReference: nc.extractBusinessReference(channelProfile.customerBusinessReferences, body.ReadMultiple_Result)
                };
              } else {
                // Unexpected case
                out.ncStatusCode = 400;
                out.payload.error = { err: body };
              }
              callback(out);
            } else {
              if (error.response) {
                logError("Error - Returning Response as 400 - " + error, ncUtil);
                out.ncStatusCode = 400;
                out.payload.error = { err: error };
                callback(out);
              } else {
                logError("CheckForCustomer Callback error - " + error, ncUtil);
                out.ncStatusCode = 500;
                out.payload.error = { err: error };
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
          } else {
            logError("CheckForCustomer Callback error - " + err, ncUtil);
            out.ncStatusCode = 500;
            out.payload.error = { err: err };
          }
          callback(out);
        }
      });
    } catch (err) {
      // Exception Handling
      logError("Exception occurred in CheckForCustomer - " + err, ncUtil);
      out.ncStatusCode = 500;
      out.payload.error = {err: err, stack: err.stackTrace};
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

module.exports.CheckForCustomer = CheckForCustomer;
