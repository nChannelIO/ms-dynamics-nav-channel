let ExtractProductFromProductGroup = function (ncUtil,
                                                 channelProfile,
                                                 flowContext,
                                                 payload,
                                                 callback) {
  // Default response object
  let out = {
    ncStatusCode: 400,
    payload: {}
  };

  // Sanity Check the inputs
  if (!payload) { // Check Payload
    out.payload.error = "ExtractProductFromProductGroup - Invalid Request: payload was not provided";

  } else if (!payload.doc) {
    out.payload.error = "ExtractProductFromProductGroup - Invalid Request: payload.doc was not provided";

  } else if (!payload.doc.product) {
    out.payload.error = "ExtractProductFromProductGroup - Invalid Request: payload.doc is not a product group";

  } else if (!callback) { // Check callback
    throw new Error("A callback function was not provided");

  } else if (typeof callback !== 'function') {
    throw new TypeError("callback is not a function")

  } else {
    out.payload.doc = [];
    //Extract product groups here
  }

  log("Calling callback from ExtractProductFromProductGroup: Status " + out.ncStatusCode);
  callback(out);
};

function log(msg) {
  console.log("[info] " + msg);
}

module.exports.ExtractProductFromProductGroup = ExtractProductFromProductGroup;
