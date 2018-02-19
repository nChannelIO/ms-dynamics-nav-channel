let InsertFulfillment = function (ncUtil,
                                 channelProfile,
                                 flowContext,
                                 payload,
                                 callback) {

  log("Building response object...", ncUtil);
  let out = {
    ncStatusCode: null,
    response: {},
    payload: {}
  };

  let invalid = false;
  let invalidMsg = "";

  //If ncUtil does not contain a request object, the request can't be sent
  if (!ncUtil) {
    invalid = true;
    invalidMsg = "ncUtil was not provided"
  }

  //If channelProfile does not contain channelSettingsValues, channelAuthValues or fulfillmentBusinessReferences, the request can't be sent
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
  } else if (!channelProfile.fulfillmentBusinessReferences) {
    invalid = true;
    invalidMsg = "channelProfile.fulfillmentBusinessReferences was not provided"
  } else if (!Array.isArray(channelProfile.fulfillmentBusinessReferences)) {
    invalid = true;
    invalidMsg = "channelProfile.fulfillmentBusinessReferences is not an array"
  } else if (channelProfile.fulfillmentBusinessReferences.length === 0) {
    invalid = true;
    invalidMsg = "channelProfile.fulfillmentBusinessReferences is empty"
  }

  //If a sales order document was not passed in, the request is invalid
  if (!payload) {
    invalid = true;
    invalidMsg = "payload was not provided"
  } else if (!payload.doc) {
    invalid = true;
    invalidMsg = "payload.doc was not provided";
  }

  //If callback is not a function
  if (!callback) {
    throw new Error("A callback function was not provided");
  } else if (typeof callback !== 'function') {
    throw new TypeError("callback is not a function")
  }

  if (!invalid) {
    // Using request for example - A different npm module may be needed depending on the API communication is being made to
    // The `soap` module can be used in place of `request` but the logic and data being sent will be different
    let request = require('request');

    let endPoint = "";
    let url = "";

    // Add any headers for the request
    let headers = {

    };

    // Log URL
    log("Using URL [" + url + "]", ncUtil);

    // Set options
    let options = {
      url: url,
      method: "POST",
      headers: headers,
      body: payload.doc,
      json: true
    };

    try {
      // Pass in our URL and headers
      request(options, function (error, response, body) {
        if (!error) {
          // If no errors, process results here
        } else {
          // If an error occurs, log the error here
        }
      });
    } catch (err) {
      // Exception Handling
      logError("Exception occurred in InsertFulfillment - " + err, ncUtil);
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

module.exports.InsertFulfillment = InsertFulfillment;
