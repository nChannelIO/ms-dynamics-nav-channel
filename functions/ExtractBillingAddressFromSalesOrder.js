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

        // Check Payload
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
