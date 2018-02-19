'use strict';

let expect = require('chai').expect;
let customer = require('./GetCustomerFromQuery.js');

let channelProfile = {
  channelSettingsValues: {
    protocol: 'https'
  },
  channelAuthValues: {
    account: 'test'
  },
  customerBusinessReferences: ['customer.email', 'customer.phone']
};

let exampleCustomer = {
  "id": 1073339459,
  "email": "test@nchannel.com",
  "accepts_marketing": false,
  "created_at": "2017-07-17T19:07:33-04:00",
  "updated_at": "2017-07-17T19:07:33-04:00",
  "first_name": "Test",
  "last_name": "Test",
  "orders_count": 0,
  "state": "disabled",
  "total_spent": "0.00",
  "last_order_id": null,
  "note": null,
  "verified_email": true,
  "multipass_identifier": null,
  "tax_exempt": false,
  "phone": "+5551234567",
  "tags": "",
  "last_order_name": null,
  "addresses": [
    {
      "id": 1053317289,
      "customer_id": 1073339459,
      "first_name": "Test",
      "last_name": "Test",
      "company": null,
      "address1": "123 Fake St",
      "address2": null,
      "city": "Columbus",
      "province": "Ohio",
      "country": "United States",
      "zip": "43235",
      "phone": "5551234567",
      "name": "Test Test",
      "province_code": "OH",
      "country_code": "US",
      "country_name": "United States",
      "default": true
    }
  ],
  "default_address": {
    "id": 1053317289,
    "customer_id": 1073339459,
    "first_name": "Test",
    "last_name": "Test",
    "company": null,
    "address1": "123 Fake St",
    "address2": null,
    "city": "Columbus",
    "province": "Ohio",
    "country": "United States",
    "zip": "43235",
    "phone": "5551234567",
    "name": "Test Test",
    "province_code": "OH",
    "country_code": "US",
    "country_name": "United States",
    "default": true
  }
};

let examplePayload = {
  doc: {
    customer: {
      email: 'test@nchannel.com'
    }
  }
};

let ncUtil = {
  request: require('request'),
  logger: null
};

describe('GetCustomerFromQuery', () => {

  describe('Get Customer From Query', () => {

    it('It should get a customer using the business reference', (done) => {
      customer.GetCustomerFromQuery(ncUtil, channelProfile, null, examplePayload, (response) => {
        expect(response.ncStatusCode).to.be.equal(400);
        expect(response.payload).to.be.a('Object');
        // expect(response.payload).to.have.property('customerRemoteID');
        // expect(response.payload.customerRemoteID).to.equal(exampleCustomer.id);
        // expect(response.payload).to.have.property('customerBusinessReference');
        // expect(response.payload.customerBusinessReference).to.equal('test@nchannel.com.+5551234567');
        done();
      });
    });

    it('It should fail with 400 when no ncUtil is passed in', (done) => {
      customer.GetCustomerFromQuery(null, channelProfile, null, examplePayload, (response) => {
        expect(response.ncStatusCode).to.be.equal(400);
        expect(response.payload).to.be.a('Object');
        expect(response.payload).to.have.property('error');
        done();
      });
    });

    it('It should fail with 400 when no ncUtil.request is passed in', (done) => {
      let errNcUtil = {};
      customer.GetCustomerFromQuery(errNcUtil, channelProfile, null, examplePayload, (response) => {
        expect(response.ncStatusCode).to.be.equal(400);
        expect(response.payload).to.be.a('Object');
        expect(response.payload).to.have.property('error');
        done();
      });
    });

    it.skip('It should fail with 400 when no channel profile is passed in', (done) => {
      customer.CheckForCustomer(ncUtil, null, null, examplePayload, (response) => {
        expect(response.ncStatusCode).to.be.equal(400);
        expect(response.payload).to.be.a('Object');
        expect(response.payload).to.have.property('error');
        done();
      });
    });

    it.skip('It should fail with 400 when no channel settings values are passed in', (done) => {
      let errChannelProfile = {
        channelAuthValues: channelProfile.channelAuthValues,
        customerBusinessReferences: channelProfile.customerBusinessReferences
      };
      customer.CheckForCustomer(ncUtil, errChannelProfile, null, examplePayload, (response) => {
        expect(response.ncStatusCode).to.be.equal(400);
        expect(response.payload).to.be.a('Object');
        expect(response.payload).to.have.property('error');
        done();
      });
    });

    it.skip('It should fail with 400 when no channel settings protocol is passed in', (done) => {
      let errChannelProfile = {
        channelSettingsValues: {},
        channelAuthValues: channelProfile.channelAuthValues,
        customerBusinessReferences: channelProfile.customerBusinessReferences
      };
      customer.CheckForCustomer(ncUtil, errChannelProfile, null, examplePayload, (response) => {
        expect(response.ncStatusCode).to.be.equal(400);
        expect(response.payload).to.be.a('Object');
        expect(response.payload).to.have.property('error');
        done();
      });
    });

    it.skip('It should fail with 400 when no channel auth values are passed in', (done) => {
      let errChannelProfile = {
        channelSettingsValues: channelProfile.channelSettingsValues,
        customerBusinessReferences: channelProfile.customerBusinessReferences
      };
      customer.CheckForCustomer(ncUtil, errChannelProfile, null, examplePayload, (response) => {
        expect(response.ncStatusCode).to.be.equal(400);
        expect(response.payload).to.be.a('Object');
        expect(response.payload).to.have.property('error');
        done();
      });
    });

    it.skip('It should fail with 400 when no channel account is passed in', (done) => {
      let errChannelProfile = {
        channelAuthValues: {},
        channelSettingsValues: channelProfile.channelSettingsValues,
        customerBusinessReferences: channelProfile.customerBusinessReferences
      };
      customer.CheckForCustomer(ncUtil, errChannelProfile, null, examplePayload, (response) => {
        expect(response.ncStatusCode).to.be.equal(400);
        expect(response.payload).to.be.a('Object');
        expect(response.payload).to.have.property('error');
        done();
      });
    });

    it.skip('It should fail with 400 when no business reference is passed in', (done) => {
      let errChannelProfile = {
        channelSettingsValues: channelProfile.channelSettingsValues,
        channelAuthValues: channelProfile.channelAuthValues
      };
      customer.CheckForCustomer(ncUtil, errChannelProfile, null, examplePayload, (response) => {
        expect(response.ncStatusCode).to.be.equal(400);
        expect(response.payload).to.be.a('Object');
        expect(response.payload).to.have.property('error');
        done();
      });
    });

    it.skip('It should fail with 400 when business references is not an array', (done) => {
      let errChannelProfile = {
        customerBusinessReferences: {},
        channelSettingsValues: channelProfile.channelSettingsValues,
        channelAuthValues: channelProfile.channelAuthValues
      };
      customer.CheckForCustomer(ncUtil, errChannelProfile, null, examplePayload, (response) => {
        expect(response.ncStatusCode).to.be.equal(400);
        expect(response.payload).to.be.a('Object');
        expect(response.payload).to.have.property('error');
        done();
      });
    });

    it.skip('It should fail with 400 when business references is empty', (done) => {
      let errChannelProfile = {
        customerBusinessReferences: [],
        channelSettingsValues: channelProfile.channelSettingsValues,
        channelAuthValues: channelProfile.channelAuthValues
      };
      customer.CheckForCustomer(ncUtil, errChannelProfile, null, examplePayload, (response) => {
        expect(response.ncStatusCode).to.be.equal(400);
        expect(response.payload).to.be.a('Object');
        expect(response.payload).to.have.property('error');
        done();
      });
    });

    it.skip('It should fail with 400 when no payload is passed in', (done) => {
      customer.CheckForCustomer(ncUtil, channelProfile, null, null, (response) => {
        expect(response.ncStatusCode).to.be.equal(400);
        expect(response.payload).to.be.a('Object');
        expect(response.payload).to.have.property('error');
        done();
      });
    });

    it.skip('It should fail with 400 because the payload does not contain a customer', (done) => {
      let payload = {};
      customer.CheckForCustomer(ncUtil, channelProfile, null, payload, (response) => {
        expect(response.ncStatusCode).to.be.equal(400);
        expect(response.payload).to.be.a('Object');
        expect(response.payload).to.have.property('error');
        done();
      });
    });

    it.skip('It should fail with 400 when the endpoint returns a status code other than 200, 204, 400, 409, 429 or 500', (done) => {
      fake.when('GET', '/admin/customers/search.json?query=email:test%40nchannel.com')
        .thenReturn(null, {statusCode: 401}, 'An unanticipated status code');

      customer.CheckForCustomer(ncUtil, channelProfile, null, examplePayload, (response) => {
        expect(response.ncStatusCode).to.be.equal(400);
        expect(response.payload).to.be.a('Object');
        expect(response.payload).to.have.property('error');
        expect(response.payload.error).to.equal('An unanticipated status code');
        done();
      });
    });

    it.skip('It should return 429 our request is denied due to throttling', (done) => {
      fake.when('GET', '/admin/customers/search.json?query=email:test%40nchannel.com')
        .thenReturn(null, {statusCode: 429}, 'Too many requests');

      customer.CheckForCustomer(ncUtil, channelProfile, null, examplePayload, (response) => {
        expect(response.ncStatusCode).to.be.equal(429);
        expect(response.payload).to.have.property('error');
        done();
      });
    });

    it.skip('It should return 500 when an internal error occurs', (done) => {
      fake.when('GET', '/admin/customers/search.json?query=email:test%40nchannel.com')
        .thenReturn(null, {statusCode: 200}, null);

      customer.CheckForCustomer(ncUtil, channelProfile, null, examplePayload, (response) => {
        expect(response.ncStatusCode).to.be.equal(500);
        expect(response.payload).to.have.property('error');
        done();
      });
    });

    it.skip('It should return 500 when the request library returns and error', (done) => {
      fake.when('GET', '/admin/customers/search.json?query=email:test%40nchannel.com')
        .thenReturn('An error occurred', null, null);

      customer.CheckForCustomer(ncUtil, channelProfile, null, examplePayload, (response) => {
        expect(response.ncStatusCode).to.be.equal(500);
        expect(response.payload).to.have.property('error');
        done();
      });
    });

    it.skip('It should return 500 when a server side error occurs', (done) => {
      fake.when('GET', '/admin/customers/search.json?query=email:test%40nchannel.com')
        .thenReturn(null, {statusCode: 500}, 'Internal server error');

      customer.CheckForCustomer(ncUtil, channelProfile, null, examplePayload, (response) => {
        expect(response.ncStatusCode).to.be.equal(500);
        expect(response.payload).to.have.property('error');
        done();
      });
    });

    it.skip('It should throw an exception when no callback is provided', (done) => {
      expect(() => customer.CheckForCustomer(ncUtil, channelProfile, null, examplePayload, null))
        .to.throw(Error, 'A callback function was not provided');
      done();
    });

    it.skip('It should throw an exception when the callback is not a function', (done) => {
      expect(() => customer.CheckForCustomer(ncUtil, channelProfile, null, examplePayload, {}))
        .to.throw(TypeError, 'callback is not a function');
      done();
    });

  });
});
