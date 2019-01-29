'use strict';

function formatDate(date, delimiter = '/', yearFirst = false) {
    let d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    let year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return yearFirst == true ? [year, month, day].join(delimiter) : [month, day, year].join(delimiter);
}

function checkMethod(client, name) {
    return isFunction(client[name]);
}

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
  checkMethod,
  isFunction,
  isNonEmptyString,
  isString,
  isObject,
  isNonEmptyObject,
  isNonEmptyArray,
  isNumber,
  isInteger
};
