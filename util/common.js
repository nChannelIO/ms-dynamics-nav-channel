'use strict';

const jsonata = require('jsonata');

function formatDate(date, delimiter = '/', yearFirst = false) {
    let d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    let year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return yearFirst == true ? [year, month, day].join(delimiter) : [month, day, year].join(delimiter);
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

function isFunction(func) {
    return typeof func === "function";
}

function isNonEmptyString(str) {
    return isString(str) && str.trim().length > 0;
}

function isString(str) {
    return typeof str === "string";
}

function isObject(obj) {
    return typeof obj === "object" && obj != null && !isArray(obj) && !isFunction(obj);
}

function isNonEmptyObject(obj) {
    return isObject(obj) && Object.keys(obj).length > 0;
}

function isArray(arr) {
    return Array.isArray(arr);
}

function isNonEmptyArray(arr) {
    return isArray(arr) && arr.length > 0;
}

function isNumber(num) {
    return typeof num === "number" && !isNaN(num);
}

function isInteger(int) {
    return isNumber(int) && int % 1 === 0;
}

module.exports = {
  formatDate,
  extractBusinessReference,
  isFunction,
  isNonEmptyString,
  isString,
  isObject,
  isNonEmptyObject,
  isNonEmptyArray,
  isNumber,
  isInteger
};
