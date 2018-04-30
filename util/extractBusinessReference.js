'use strict';

const jsonata = require('jsonata');

module.exports = (businessReferences, doc) => {
    if (!businessReferences || !Array.isArray(businessReferences)) {
    throw new Error('Error: businessReferences must be an Array');
  } else if (!doc || typeof doc !== 'object') {
    throw new Error('Error: doc must be an object');
  }
  
  let values = [];
  
  // Get the businessReference
  businessReferences.forEach(function (businessReference) {
    let expression = jsonata(businessReference);
    let value = expression.evaluate(doc);
    values.push(value);
  });
  
  return values.join(".");
};
