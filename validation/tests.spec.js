'use strict';

let expect = require('chai').expect;
let _ = require('lodash');
let fs = require('fs');
let nock = require('nock');
let sinon = require('sinon');
let proxyquire = require('proxyquire');
let soapStub = require('soap/soap-stub');
let functionCodes = require('./functions.json');

if (fs.existsSync('config/channel-settings.json')) {
  let channel_settings = require('../config/channel-settings.json');
  let docsFile = require('../config/docs.json');
  let docs = docsFile.docs;

  let baseChannelProfile = {
    channelSettingsValues: channel_settings.channelSettingsSchema.configDef.configValues,
  };

  let ncUtil = docs.ncUtil;

  // Check if functions exist
  if (fs.existsSync('functions')) {

    // Get the functions for the current channel
    function getFunctions(path) {
      return fs.readdirSync(path).filter(function (file) {
        return fs.statSync(path+'/'+file);
      });
    }

    let untestedFunction = false;
    let functions = getFunctions('functions');

    // Itereate through each function in the channel
    for (let j = 0; j < functions.length; j++) {

      // Remove file extension
      let tested = false;
      let stubFunction = functions[j].slice(0, -3);

      // Require function
      let file = require('../functions/' + stubFunction);

      for (let i = 0; i < docs.length; i++) {

        if (stubFunction == docs[i].functionName && docs[i].tests && functionCodes[stubFunction]) {
          tested = true;
          let functionName = docs[i].functionName;

          // Validate the function exists from the docs.json file. Error if it does not find the function.
          before((done) => {
            console.log(`Validating Function: ${functionName}`);
            expect(file[functionName]).to.be.a('function');
            done();
          })

          // Merge channelProfile in docs.json with channelSettingsSchema values in channel-settings.json
          let topChannelProfile = _.merge(docsFile.channelProfile, baseChannelProfile);

          // Evaluate status codes
          let statusCodes = functionCodes[functionName].statusCodes;
          let missingCodes = [];

          // Check for at least one document for each status code
          for (let s = 0; s < statusCodes.length; s++) {
            let found = false;
            for (let t = 0; t < docs[i].tests.length; t++) {
              if (docs[i].tests[t].ncStatusCode == statusCodes[s]) {
                found = true;
              }
            }

            if (!found) {
              missingCodes.push(statusCodes[s]);
              console.log(`${functionName}: Missing document to cover ncStatusCode: ${statusCodes[s]}`);
            }
          }

          // If a required document is missing for a stats code, fail the tests
          if (missingCodes.length > 0) {
            throw new Error(`${functionName} does not contain enough documents to cover all ncStatusCodes`);
          }

          for (let t = 0; t < docs[i].tests.length; t++) {
            let channelProfile = _.merge(docs[i].tests[t].channelProfile, topChannelProfile);

            describe(functionName, () => {

              afterEach((done) => {
                if (docsFile.unitTestPackage === 'nock') {
                  nock.cleanAll();
                } else if (docsFile.unitTestPackage === 'soap') {
                  soapStub.reset();
                }
                done();
              });

              if (docs[i].tests[t].ncStatusCode == 200) {
                it('It should run a test successfully', (done) => {

                  let scope = executeTest(docsFile.unitTestPackage, docs[i].tests[t]);

                  file[functionName](docsFile.ncUtil, channelProfile, null, docs[i].tests[t].payload, (response) => {
                    if (scope != null) {
                      assertPackage(scope);
                    }
                    expect(response.ncStatusCode).to.be.equal(200);
                    done();
                  });
                });
              }

              if (docs[i].tests[t].ncStatusCode == 201) {
                it('It should run a test successfully', (done) => {

                  let scope = executeTest(docsFile.unitTestPackage, docs[i].tests[t]);

                  file[functionName](docsFile.ncUtil, channelProfile, null, docs[i].tests[t].payload, (response) => {
                    if (scope != null) {
                      assertPackage(scope);
                    }
                    expect(response.ncStatusCode).to.be.equal(201);
                    done();
                  });
                });
              }

              // 204 ncStatusCode test
              if (docs[i].tests[t].ncStatusCode == 204) {
                it('It should run a test and return a 204 status code', (done) => {

                  let scope = executeTest(docsFile.unitTestPackage, docs[i].tests[t]);

                  file[functionName](docsFile.ncUtil, channelProfile, null, docs[i].tests[t].payload, (response) => {
                    if (scope != null) {
                      assertPackage(scope);
                    }
                    expect(response.ncStatusCode).to.be.equal(204);
                    done();
                  });
                });
              }

              // 409 ncStatusCode test
              if (docs[i].tests[t].ncStatusCode == 409) {
                it('It should run a test and return a 409 status code', (done) => {

                  let scope = executeTest(docsFile.unitTestPackage, docs[i].tests[t]);

                  file[functionName](docsFile.ncUtil, channelProfile, null, docs[i].tests[t].payload, (response) => {
                    if (scope != null) {
                      assertPackage(scope);
                    }
                    expect(response.ncStatusCode).to.be.equal(409);
                    done();
                  });
                });
              }

              // 206 ncStatusCode test
              if (docs[i].tests[t].ncStatusCode == 206) {
                it('It should run a test and return a 206 status code', (done) => {

                  let scope = executeTest(docsFile.unitTestPackage, docs[i].tests[t]);

                  file[functionName](docsFile.ncUtil, channelProfile, null, docs[i].tests[t].payload, (response) => {
                    if (scope != null) {
                      assertPackage(scope);
                    }
                    expect(response.ncStatusCode).to.be.equal(206);
                    done();
                  });
                });
              }

              if (docs[i].tests[t].ncStatusCode == 400) {
                it('It should fail with 400 when the endpoint returns a status code other than 200, 204, 400, 409, 429 or 500', (done) => {

                  let scope = executeTest(docsFile.unitTestPackage, docs[i].tests[t], 401);

                  file[functionName](docsFile.ncUtil, channelProfile, null, docs[i].tests[t].payload, (response) => {
                    if (scope != null) {
                      assertPackage(scope);
                    }
                    expect(response.ncStatusCode).to.be.equal(400);
                    done();
                  });
                });
              }

              if (docs[i].tests[t].ncStatusCode == 429) {
                it('It should return 429 our request is denied due to throttling', (done) => {
                  let scope = executeTest(docsFile.unitTestPackage, docs[i].tests[t], 429);

                  file[functionName](docsFile.ncUtil, channelProfile, null, docs[i].tests[t].payload, (response) => {
                    if (scope != null) {
                      assertPackage(scope);
                    }
                    expect(response.ncStatusCode).to.be.equal(429);
                    done();
                  });
                });
              }

              if (docs[i].tests[t].ncStatusCode == 500) {
                it('It should return 500 when the test library returns and error', (done) => {
                  let scope = executeTest(docsFile.unitTestPackage, docs[i].tests[t], 500, true);

                  file[functionName](docsFile.ncUtil, channelProfile, null, docs[i].tests[t].payload, (response) => {
                    if (scope != null) {
                      assertPackage(scope);
                    }
                    expect(response.ncStatusCode).to.be.equal(500);
                    done();
                  });
                });
              }

              if (docs[i].tests[t].ncStatusCode == 500) {
                it('It should return 500 when a server side error occurs', (done) => {
                  let scope = executeTest(docsFile.unitTestPackage, docs[i].tests[t], 500);

                  file[functionName](docsFile.ncUtil, channelProfile, null, docs[i].tests[t].payload, (response) => {
                    if (scope != null) {
                      assertPackage(scope);
                    }
                    expect(response.ncStatusCode).to.be.equal(500);
                    done();
                  });
                });
              }

              it('It should fail with 400 when no docsFile.ncUtil is passed in', (done) => {
                file[functionName](null, channelProfile, null, docs[i].tests[t].payload, (response) => {
                  expect(response.ncStatusCode).to.be.equal(400);
                  expect(response.payload).to.be.a('Object');
                  expect(response.payload).to.have.property('error');
                  done();
                });
              });

              it('It should fail with 400 when no channel profile is passed in', (done) => {
                file[functionName](docsFile.ncUtil, null, null, docs[i].tests[t].payload, (response) => {
                  expect(response.ncStatusCode).to.be.equal(400);
                  expect(response.payload).to.be.a('Object');
                  expect(response.payload).to.have.property('error');
                  done();
                });
              });

              it('It should fail with 400 when no channel settings values are passed in', (done) => {
                let errChannelProfile = {
                  channelAuthValues: channelProfile.channelAuthValues,
                  customerBusinessReferences: channelProfile.customerBusinessReferences
                };
                file[functionName](docsFile.ncUtil, errChannelProfile, null, docs[i].tests[t].payload, (response) => {
                  expect(response.ncStatusCode).to.be.equal(400);
                  expect(response.payload).to.be.a('Object');
                  expect(response.payload).to.have.property('error');
                  done();
                });
              });

              it('It should fail with 400 when no channel settings protocol is passed in', (done) => {
                let errChannelProfile = {
                  channelSettingsValues: {},
                  channelAuthValues: channelProfile.channelAuthValues,
                  customerBusinessReferences: channelProfile.customerBusinessReferences
                };
                file[functionName](docsFile.ncUtil, errChannelProfile, null, docs[i].tests[t].payload, (response) => {
                  expect(response.ncStatusCode).to.be.equal(400);
                  expect(response.payload).to.be.a('Object');
                  expect(response.payload).to.have.property('error');
                  done();
                });
              });

              it('It should fail with 400 when no channel auth values are passed in', (done) => {
                let errChannelProfile = {
                  channelSettingsValues: channelProfile.channelSettingsValues,
                  customerBusinessReferences: channelProfile.customerBusinessReferences
                };
                file[functionName](docsFile.ncUtil, errChannelProfile, null, docs[i].tests[t].payload, (response) => {
                  expect(response.ncStatusCode).to.be.equal(400);
                  expect(response.payload).to.be.a('Object');
                  expect(response.payload).to.have.property('error');
                  done();
                });
              });

              it('It should fail with 400 when no business reference is passed in', (done) => {
                let errChannelProfile = {
                  channelSettingsValues: channelProfile.channelSettingsValues,
                  channelAuthValues: channelProfile.channelAuthValues
                };
                file[functionName](docsFile.ncUtil, errChannelProfile, null, docs[i].tests[t].payload, (response) => {
                  expect(response.ncStatusCode).to.be.equal(400);
                  expect(response.payload).to.be.a('Object');
                  expect(response.payload).to.have.property('error');
                  done();
                });
              });

              it('It should fail with 400 when business references is not an array', (done) => {
                let errChannelProfile = {
                  customerBusinessReferences: {},
                  channelSettingsValues: channelProfile.channelSettingsValues,
                  channelAuthValues: channelProfile.channelAuthValues
                };
                file[functionName](docsFile.ncUtil, errChannelProfile, null, docs[i].tests[t].payload, (response) => {
                  expect(response.ncStatusCode).to.be.equal(400);
                  expect(response.payload).to.be.a('Object');
                  expect(response.payload).to.have.property('error');
                  done();
                });
              });

              it('It should fail with 400 when business references is empty', (done) => {
                let errChannelProfile = {
                  customerBusinessReferences: [],
                  channelSettingsValues: channelProfile.channelSettingsValues,
                  channelAuthValues: channelProfile.channelAuthValues
                };
                file[functionName](docsFile.ncUtil, errChannelProfile, null, docs[i].tests[t].payload, (response) => {
                  expect(response.ncStatusCode).to.be.equal(400);
                  expect(response.payload).to.be.a('Object');
                  expect(response.payload).to.have.property('error');
                  done();
                });
              });

              it('It should fail with 400 when no payload is passed in', (done) => {
                file[functionName](docsFile.ncUtil, channelProfile, null, null, (response) => {
                  expect(response.ncStatusCode).to.be.equal(400);
                  expect(response.payload).to.be.a('Object');
                  expect(response.payload).to.have.property('error');
                  done();
                });
              });

              it('It should fail with 400 because the payload does not contain a customer', (done) => {
                let payload = {};
                file[functionName](docsFile.ncUtil, channelProfile, null, payload, (response) => {
                  expect(response.ncStatusCode).to.be.equal(400);
                  expect(response.payload).to.be.a('Object');
                  expect(response.payload).to.have.property('error');
                  done();
                });
              });

              it('It should throw an exception when no callback is provided', (done) => {
                expect(() => file[functionName](docsFile.ncUtil, channelProfile, null, docs[i].tests[t].payload, null))
                  .to.throw(Error, 'A callback function was not provided');
                done();
              });

              it('It should throw an exception when the callback is not a function', (done) => {
                expect(() => file[functionName](docsFile.ncUtil, channelProfile, null, docs[i].tests[t].payload, {}))
                  .to.throw(TypeError, 'callback is not a function');
                done();
              });
            });
          }

          function executeTest (unitTest, test, statusCode, errorTest = false) {
            errorTest = (typeof errorTest === 'boolean') ? errorTest : false;
            if (unitTest === 'nock') {
              let fake = nock(test.baseUri);
              for (let i = 0; i < test.links.length; i++) {
                switch (test.links[i].method.toUpperCase()) {
                  case 'GET':
                    errorTest === false ?
                    fake.get(test.links[i].uri).reply(statusCode != null ? statusCode : test.links[i].statusCode, test.links[i].responsePayload) :
                    fake.get(test.links[i].uri).replyWithError({ message: "Internal Error" });
                    break;
                  case 'POST':
                    errorTest === false ?
                    fake.post(test.links[i].uri, test.payload.doc).reply(statusCode != null ? statusCode : test.links[i].statusCode, test.links[i].responsePayload) :
                    fake.post(test.links[i].uri, test.payload.doc).replyWithError({ message: "Internal Error" });
                    break;
                  case 'PUT':
                    errorTest === false ?
                    fake.put(test.links[i].uri, test.payload.doc).reply(statusCode != null ? statusCode : test.links[i].statusCode, test.links[i].responsePayload) :
                    fake.put(test.links[i].uri, test.payload.doc).replyWithError({ message: "Internal Error" });
                    break;
                  case 'DELETE':
                    errorTest === false ?
                    fake.delete(test.links[i].uri).reply(statusCode != null ? statusCode : test.links[i].statusCode, test.links[i].responsePayload) :
                    fake.delete(test.links[i].uri).replyWithError({ message: "Internal Error" });
                    break;
                }
              }
              return fake;
            } else if (unitTest === 'soap') {
              let soap = require('soap');
              let wsdlUri = test.wsdlUri;

              let clientStub = {
                wsdl: {
                  options: {
                    attributesKey: 'attributes',
                    envelopeKey: 'soap'
                  },
                  definitions: {
                    types: {},
                    services: {},
                    xmlns: {}
                  },
                  xmlnsInEnvelope: {},
                  describeServices: sinon.stub(),
                  _xmlnsMap: sinon.stub()
                },
                options: {},
                security: {},
                SOAPAction: {},
                endpoint: {},
                bodyAttributes: {},
                httpHeaders: {},
                soapHeaders: {},
                addSoapHeader: sinon.stub(),
                changeSoapHeader: sinon.stub(),
                getSoapHeaders: sinon.stub(),
                clearSoapHeaders: sinon.stub(),
                addHttpHeader: sinon.stub(),
                getHttpHeaders: sinon.stub(),
                clearHttpsHeaders: sinon.stub(),
                addBodyAttribute: sinon.stub(),
                getBodyAttributes: sinon.stub(),
                clearBodyAttributes: sinon.stub(),
                setSecurity: sinon.stub(),
                setEndpoint: sinon.stub(),
                describe: sinon.stub(),
                setSOAPAction: sinon.stub()
              };

              for (let i = 0; i < test.links.length; i++) {
                // Setup stub based on service options
                if (test.service) {
                  clientStub[test.service] = {};
                  if (test.service && test.servicePort) {
                    clientStub[test.service][test.servicePort] = {};
                    clientStub[test.service][test.servicePort][test.links[i].function] = sinon.stub();
                    clientStub[test.service][test.servicePort][test.links[i].function].respondWithError = soapStub.createErroringStub({ message: "Internal Error" });
                    clientStub[test.service][test.servicePort][test.links[i].function].respondWithSuccess = soapStub.createRespondingStub(test.links[i].responsePayload);

                    errorTest === false ?
                    clientStub[test.service][test.servicePort][test.links[i].function].respondWithSuccess() :
                    clientStub[test.service][test.servicePort][test.links[i].function].respondWithError();
                  } else {
                    clientStub[test.service][test.links[i].function] = sinon.stub();
                    clientStub[test.service][test.links[i].function].respondWithError = soapStub.createErroringStub({ message: "Internal Error" });
                    clientStub[test.service][test.links[i].function].respondWithSuccess = soapStub.createRespondingStub(test.links[i].responsePayload);

                    errorTest === false ?
                    clientStub[test.service][test.links[i].function].respondWithSuccess() :
                    clientStub[test.service][test.links[i].function].respondWithError();
                  }
                } else {
                  clientStub[test.links[i].function] = sinon.stub();
                  clientStub[test.links[i].function].respondWithError = soapStub.createErroringStub({ message: "Internal Error" });
                  clientStub[test.links[i].function].respondWithSuccess = soapStub.createRespondingStub(test.links[i].responsePayload);

                  errorTest === false ?
                  clientStub[test.links[i].function].respondWithSuccess() :
                  clientStub[test.links[i].function].respondWithError();
                }
              }

              soapStub.registerClient('fakeClient', wsdlUri, clientStub);
              let fakeClient = soapStub.getStub('fakeClient');

              // Replace only the function in soap and any properties a stub
              soap.createClient = function(wsdl_uri, options, callback, endpoint) {
                if (typeof options === 'function') {
                  endpoint = callback;
                  callback = options;
                  options = {};
                }
                endpoint = options.endpoint || endpoint;
                callback(null, fakeClient);
              };

              let mod = {};
              mod[docsFile.packageName] = soap;

              file = proxyquire('../functions/' + functionName, mod);

              return clientStub;
            } else {
              return null;
            }
          }

          function assertPackage(scope) {
            switch (docsFile.unitTestPackage.toLowerCase()) {
              case 'nock':
                expect(scope.isDone()).to.be.true;
                break;
              default:
                break;
            }
          }
        }
      }

      if (!tested) {
        console.log(`Function ${stubFunction} does not have a test document and could not tested.`);
        untestedFunction = true;
      }
    }
  }
}
