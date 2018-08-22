'use strict'

let InsertSalesOrder = function (ncUtil, channelProfile, flowContext, payload, callback) {

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
  } else if (!channelProfile.channelAuthValues.orderUrl) {
    invalid = true;
    invalidMsg = "channelProfile.channelAuthValues.orderUrl was not provided"
  } else if (!channelProfile.channelAuthValues.orderServiceName) {
    invalid = true;
    invalidMsg = "channelProfile.channelAuthValues.orderServiceName was not provided"
  } else if (!channelProfile.salesOrderBusinessReferences) {
    invalid = true;
    invalidMsg = "channelProfile.salesOrderBusinessReferences was not provided"
  } else if (!Array.isArray(channelProfile.salesOrderBusinessReferences)) {
    invalid = true;
    invalidMsg = "channelProfile.salesOrderBusinessReferences is not an array"
  } else if (channelProfile.salesOrderBusinessReferences.length === 0) {
    invalid = true;
    invalidMsg = "channelProfile.salesOrderBusinessReferences is empty"
  }

  // https://<baseUrl>:<port>/<serverInstance>/WS/<companyName>/Page/Order
  let username = channelProfile.channelAuthValues.username;
  let password = channelProfile.channelAuthValues.password;
  let domain = channelProfile.channelAuthValues.domain;
  let workstation = channelProfile.channelAuthValues.workstation;
  let url = channelProfile.channelAuthValues.orderUrl;
  let orderServiceName = channelProfile.channelAuthValues.orderServiceName;

  // Payload Checking
  if (!payload) {
    invalid = true;
    invalidMsg = "payload was not provided"
  } else if (!payload.doc) {
    invalid = true;
    invalidMsg = "payload.doc was not provided";
  } else if (!payload.doc[orderServiceName]) {
    invalid = true;
    invalidMsg = `payload.doc.${orderServiceName} was not provided`;
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
    if (Array.isArray(payload.doc[orderServiceName])) {
      payload.doc[orderServiceName].forEach(x => {
        x.Sell_to_Customer_No = payload.customerRemoteID;
        x.Header_BillToCustNo = payload.customerRemoteID;
      });
    } else {
      payload.doc[orderServiceName].Sell_to_Customer_No = payload.customerRemoteID;
    }

    let args = {};
    args[orderServiceName] = payload.doc[orderServiceName];

    let wsdlAuthRequired = true;
    let ntlmSecurity = new NTLMSecurity(username, password, domain, workstation, wsdlAuthRequired);

    // Log Service Names
    log(`Order Service Name: ${orderServiceName}`);

    // Log URL
    log("Using URL [" + url + "]", ncUtil);

    let options = {
      NTLMSecurity: ntlmSecurity
    };

    try {
      soap.createClient(url, options, function(err, client) {
        if (!err) {
          client.Create(args, function(error, body, envelope, soapHeader) {
            if (!error) {
              if (body[orderServiceName]) {
                out.ncStatusCode = 201;
                out.payload = {
                  doc: body,
                  salesOrderRemoteID: body[orderServiceName].No,
                  salesOrderBusinessReference: nc.extractBusinessReference(channelProfile.salesOrderBusinessReferences, body)
                };
              } else {
                out.ncStatusCode = 400;
                out.payload.error = body;
              }
              callback(out);
            } else {
              if (error.response) {
                logError("Error - Returning Response as 400 - " + error, ncUtil);
                out.ncStatusCode = 400;
                out.payload.error = error;
                callback(out);
              } else {
                logError("InsertSalesOrder Callback error - " + error, ncUtil);
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
            logError("InsertSalesOrder Callback error - " + err, ncUtil);
            out.ncStatusCode = 500;
            out.payload.error = err;
          }
          callback(out);
        }
      });
    } catch (err) {
      logError("Exception occurred in InsertSalesOrder - " + err, ncUtil);
      out.ncStatusCode = 500;
      out.payload.error = err;
      callback(out);
    }
  } else {
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

module.exports.InsertSalesOrder = InsertSalesOrder;
