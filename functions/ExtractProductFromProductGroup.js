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
  if (!ncUtil) {
    out.payload.error = "ExtractProductFromProductGroup - Invalid Request: ncUtil was not passed into the function";
    
  } else if (!channelProfile) {
    out.payload.error = "ExtractProductFromProductGroup - Invalid Request: channelProfile was not provided"

  } else if (!channelProfile.channelSettingsValues) {
    out.payload.error = "ExtractProductFromProductGroup - Invalid Request: channelProfile.channelSettingsValues was not provided"

  } else if (!channelProfile.channelSettingsValues.protocol) {
    out.payload.error = "ExtractProductFromProductGroup - Invalid Request: channelProfile.channelSettingsValues.protocol was not provided"

  } else if (!channelProfile.channelAuthValues) {
    out.payload.error = "ExtractProductFromProductGroup - Invalid Request: channelProfile.channelAuthValues was not provided"

  } else if (!payload) { // Check Payload
    out.payload.error = "ExtractProductFromProductGroup - Invalid Request: payload was not provided";

  } else if (!payload.doc) {
    out.payload.error = "ExtractProductFromProductGroup - Invalid Request: payload.doc was not provided";

  } else if (!payload.doc.product) {
    out.payload.error = "ExtractProductFromProductGroup - Invalid Request: payload.doc is not a product group";

  } else if (!channelProfile.productGroupBusinessReferences) {
    out.payload.error = "ExtractProductFromProductGroup - Invalid Request: channelProfile.productGroupBusinessReferences was not provided"

  } else if (!Array.isArray(channelProfile.productGroupBusinessReferences)) {
    out.payload.error = "ExtractProductFromProductGroup - Invalid Request: channelProfile.productGroupBusinessReferences is not an array"

  } else if (channelProfile.productGroupBusinessReferences.length === 0) {
    out.payload.error = "ExtractProductFromProductGroup - Invalid Request: channelProfile.productGroupBusinessReferences is empty"

  } else if (!callback) { // Check callback
    throw new Error("A callback function was not provided");

  } else if (typeof callback !== 'function') {
    throw new TypeError("callback is not a function")

  } else {
    out.payload.doc = [];
    let variants = payload.doc.product.variants;
    if (variants && variants.length > 0) {
      for (let i=0; i<variants.length; i++) {
        let variant = {
          variant: variants[i]
        };
        variant.variant.group_title = payload.doc.product.title;
        variant.variant.group_vendor = payload.doc.product.vendor;

        out.payload.doc.push(variant);
      }
      out.ncStatusCode = 200;
    } else {
      log("ExtractProductFromProductGroup - Product Not Found: The product group has no product (product.variants)");
      out.ncStatusCode = 204;
    }
  }

  log("Calling callback from ExtractProductFromProductGroup: Status " + out.ncStatusCode);
  callback(out);
};

function log(msg) {
  console.log("[info] " + msg);
}

module.exports.ExtractProductFromProductGroup = ExtractProductFromProductGroup;
