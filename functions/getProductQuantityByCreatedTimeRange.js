'use strict';

module.exports = function(flowContext, payload) {
  let out = {
    statusCode: 400,
    query: [],
    errors: [
      'NAV does not support retrieving quantity by created date.'
    ]
  };

  return Promise.reject(out);
};