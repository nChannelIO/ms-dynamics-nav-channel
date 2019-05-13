'use strict';

let Channel = require('@nchannel/endpoint-sdk').PromiseChannel;
let nc = require('./util/common');

class ms_dynamics_nav_channel extends Channel {
  constructor(...args) {
    super(...args);

    this.validateChannelProfile();

    this.username = this.channelProfile.channelAuthValues.username;
    this.password = this.channelProfile.channelAuthValues.password;
    this.domain = this.channelProfile.channelAuthValues.domain || "";
    this.workstation = this.channelProfile.channelAuthValues.workstation || "";
    this.nc = nc;

    this.customerUrl = this.channelProfile.channelAuthValues.customerUrl;
    this.itemUrl = this.channelProfile.channelAuthValues.itemUrl;
    this.itemLedgerUrl = this.channelProfile.channelAuthValues.itemLedgerUrl;
    this.itemVariantsUrl = this.channelProfile.channelAuthValues.itemVariantsUrl;
    this.variantInventoryUrl = this.channelProfile.channelAuthValues.variantInventoryUrl;
    this.orderUrl = this.channelProfile.channelAuthValues.orderUrl;
    this.orderLinesUrl = this.channelProfile.channelAuthValues.orderLinesUrl;
    this.salesShipmentUrl = this.channelProfile.channelAuthValues.salesShipmentUrl;

    this.customerServiceName = this.channelProfile.channelAuthValues.customerServiceName;
    this.itemServiceName = this.channelProfile.channelAuthValues.itemServiceName;
    this.itemLedgerServiceName = this.channelProfile.channelAuthValues.itemLedgerServiceName;
    this.itemVariantsServiceName = this.channelProfile.channelAuthValues.itemVariantsServiceName;
    this.variantInventoryServiceName = this.channelProfile.channelAuthValues.variantInventoryServiceName;
    this.orderServiceName = this.channelProfile.channelAuthValues.orderServiceName;
    this.orderLinesServiceName = this.channelProfile.channelAuthValues.orderLinesServiceName;
    this.salesShipmentServiceName = this.channelProfile.channelAuthValues.salesShipmentServiceName;

    this.options = {
      prettyPrint: false
    };
  }

  async extractCustomerFromSalesOrder(...args) {
    return require('./functions/extractCustomerFromSalesOrder').bind(this)(...args);
  }

  async insertCustomer(...args) {
    return require('./functions/insertCustomer').bind(this)(...args);
  }

  async updateCustomer(...args) {
    return require('./functions/updateCustomer').bind(this)(...args);
  }

  async getProductMatrixById(...args) {
    return require('./functions/getProductMatrixById').bind(this)(...args);
  }

  async getProductMatrixByCreatedTimeRange(...args) {
    return require('./functions/getProductMatrixByCreatedTimeRange').bind(this)(...args);
  }

  async getProductMatrixByModifiedTimeRange(...args) {
    return require('./functions/getProductMatrixByModifiedTimeRange').bind(this)(...args);
  }

  async getProductQuantityById(...args) {
    return require('./functions/getProductQuantityById').bind(this)(...args);
  }

  async getProductQuantityByCreatedTimeRange(...args) {
    return require('./functions/getProductQuantityByCreatedTimeRange').bind(this)(...args);
  }

  async getProductQuantityByModifiedTimeRange(...args) {
    return require('./functions/getProductQuantityByModifiedTimeRange').bind(this)(...args);
  }

  async insertSalesOrder(...args) {
    return require('./functions/insertSalesOrder').bind(this)(...args);
  }

  async getFulfillmentById(...args) {
    return require('./functions/getFulfillmentById').bind(this)(...args);
  }

  async getFulfillmentByCreatedTimeRange(...args) {
    return require('./functions/getFulfillmentByCreatedTimeRange').bind(this)(...args);
  }

  async getFulfillmentByModifiedTimeRange(...args) {
    return require('./functions/getFulfillmentByModifiedTimeRange').bind(this)(...args);
  }

  async getCustomerById(...args) {
    return require('./functions/getCustomerById').bind(this)(...args);
  }

  async getCustomerByCreatedTimeRange(...args) {
    return require('./functions/getCustomerByCreatedTimeRange').bind(this)(...args);
  }

  async getCustomerByModifiedTimeRange(...args) {
    return require('./functions/getCustomerByModifiedTimeRange').bind(this)(...args);
  }

  processItems(...args) {
    return require('./functions/getProductMatrixHelpers').processItems.bind(this)(...args);
  }

  processVariants(...args) {
    return require('./functions/getProductMatrixHelpers').processVariants.bind(this)(...args);
  }

  processLedger(...args) {
    return require('./functions/getProductQuantityHelpers').processLedger.bind(this)(...args);
  }

  queryItems(...args) {
    return require('./functions/getProductQuantityHelpers').queryItems.bind(this)(...args);
  }

  queryVariants(...args) {
    return require('./functions/getProductQuantityHelpers').queryVariants.bind(this)(...args);
  }

  queryInventory(...args) {
    return require('./functions/getProductQuantityHelpers').queryInventory.bind(this)(...args);
  }

  validateChannelProfile() {
    let errors = [];
    if (!this.channelProfile)
        errors.push("channelProfile was not provided");
    if (!this.channelProfile.channelSettingsValues)
        errors.push("channelProfile.channelSettingsValues was not provided");
    if (!this.channelProfile.channelAuthValues)
        errors.push("channelProfile.channelAuthValues was not provided");
    if (!this.channelProfile.channelAuthValues.username)
        errors.push("channelProfile.channelAuthValues.username was not provided");
    if (!this.channelProfile.channelAuthValues.password)
        errors.push("channelProfile.channelAuthValues.password was not provided");
    if (errors.length > 0)
        throw new Error(`Channel profile validation failed: ${errors}`);
  }

  handleOperationError(error) {
    let out = {
      errors: []
    }

    if (error.response) {
      out.statusCode = 400;
      out.errors.push(error);
    } else {
      out.statusCode = 500;
      out.errors.push(error);
    }

    return out;
  }

  handleClientError(error) {
    let out = {
      errors: []
    }

    let errStr = String(error);

    if (errStr.indexOf("Code: 401") !== -1) {
      out.statusCode = 400;
      out.errors.push(error);
    } else {
      out.statusCode = 500;
      out.errors.push(error);
    }

    return out;
  }
}

module.exports = ms_dynamics_nav_channel;
