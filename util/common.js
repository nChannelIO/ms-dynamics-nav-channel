'use strict';

const jsonata = require('jsonata');

function formatDate(date) {
    let d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    let year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [month, day, year].join('/');
}

function extractBusinessReference(businessReferences, doc) {
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

module.exports = { formatDate, extractBusinessReference };
