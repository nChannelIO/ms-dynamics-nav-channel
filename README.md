# nc-template-channel

Template channel for SDK development


# Modifying the doc `docs.json` file

## Required Parameters

 `unitTestPackage` - Name of the testing package used with the stub functions. Valid values are `nock` and `soap`.

`packageName` - (Required if `unitTestPackage` is `soap`) Name of the `soap` package used with the stub functions. Package used should derive from the base repository here at https://www.npmjs.com/package/soap.

`ncUtil` - Passed into the stub function with any utility objects or packages.

`channelProfile` - Passed into the stub function. Contains the `channelAuthValues` object with any authorization values that are used by the stub function.

`doc` - An array of objects used by the unit tests. Each of the objects should contain the following:
 - `functionName` - Name of the stub function this object is for. (i.e. `CheckForCustomer`)
 - `tests` - An array of documents used to test the stub function. At least one document must be present for each ncStatusCode expected to be returned within the `gateway-service` flow.
	 - Example: `CheckForCustomer` must have at least one document each for ncStatusCodes `200`, `204`, `400`, `409`, `429`, and `500`.


## Required Parameters for `tests` array

Each test object in the array must contain the following:

`ncStatusCode` - The status code that the test will return.

`payload` - Payload used for the stub function in the unit tests. Can contain a `doc` object holding the document data to be sent to the endpoint system.

When `unitTestingPackage` is `soap`:

 - `wsdlUri` - `wsdl` URI used with the endpoint system.
 - `security` - (Optional) Security model used within the soap client (i.e. `BasicAuthSecurity`)
 - `service` - (Optional) `wsdl` service name used for the unit test.
 - `servicePort` -  (Optional) `wsdl` port name used for the unit test.

When `unitTestingPackage` is `nock`:

 - `baseUri` - Base URI of the endpoint system
 - `defaultHeaders` - Default headers used with `baseUri` to be passed with the document

`links` - An array of objects containing each of the calls to the endpoint system. Each link should contain the following:

 - When `unitTestingPackage` is `soap`:   
	 - `function` - Function that is invoked when communicating with the endpoint system.

 - When `unitTestingPackage` is `nock`:
	 - `uri` - Endpoint of the API.
	 - `method` - HTTP Method used. Valid values are `GET`, `POST`, `PUT`, and `DELETE`.
	 - `replyHeaders` - Reply headers used with the response of the request.
	 - `statusCode` - Status code to be returned from the API

- All testing packages:
	- `responsePayload` - Expected payload returned from the endpoint system

`channelProfile` - Object that will contain parameters to be used by the stub function. (i.e. `customerBusinessReferences`)
