let ExtractBillingAddressFromSalesOrder = function(
    ncUtil,
    channelProfile,
    flowContext,
    payload,
    callback)
{

    log("Building callback object...", ncUtil);
    let out = {
        ncStatusCode: null,
        payload: {}
    };

    // Check callback
    if (!callback) {
        throw new Error("A callback function was not provided");
    } else if (typeof callback !== 'function') {
        throw new TypeError("callback is not a function")
    }

    try {
        let notFound = false;
        let invalid = false;
        let invalidMsg = "";
        let data = {};

        // Check ncUtil
        if (!ncUtil) {
            invalid = true;
            invalidMsg = "ExtractBillingAddressFromSalesOrder - Invalid Request: ncUtil was not passed into the function";
        }

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

        // Check Payload
        if (!invalid) {
          if (payload) {
              if (!payload.doc) {
                  invalidMsg = "Extract Billing Address From Sales Order - Invalid Request: payload.doc was not provided";
                  invalid = true;
              } else if (!payload.doc.BillingAddress) {
                  notFound = true;
                  invalidMsg = "Extract Billing Address From Sales Order - Address Not Found: The order has no billing address (payload.doc.BillingAddress)";
              } else {
                  data = payload.doc.BillingAddress;
              }
          } else {
              invalidMsg = "Extract Billing Address From Sales Order - Invalid Request: payload was not provided";
              invalid = true;
          }
        }

        if (!invalid && !notFound) {
          // Billing Address Found
          out.payload.doc = data;
          out.ncStatusCode = 200;

          callback(out);
        } else if (!invalid && notFound){
          // Billing Address Not Found
          log(invalidMsg, ncUtil);
          out.ncStatusCode = 204;

          callback(out);
        } else {
          // Invalid Request (payload or payload.doc was not passed in)
          log(invalidMsg, ncUtil);
          out.ncStatusCode = 400;
          out.payload.error = { err: invalidMsg };

          callback(out);
        }
    }
    catch (err){
        logError("Exception occurred in ExtractBillingAddressFromSalesOrder - " + err, ncUtil);
        out.ncStatusCode = 500;
        out.payload.error = { err: err.message, stackTrace: err.stackTrace };
        callback(out);
    }

}

function logError(msg, ncUtil) {
    console.log("[error] " + msg);
}

function log(msg, ncUtil) {
    console.log("[info] " + msg);
}
module.exports.ExtractBillingAddressFromSalesOrder = ExtractBillingAddressFromSalesOrder;
