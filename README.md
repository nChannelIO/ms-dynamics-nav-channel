# ms-dynamics-nav-channel
nChannel SDK channel for Microsoft Dynamics NAV

* [Configuration](#configuration)
* [Current Function Support](#current-function-support)
* [Channel Action Configuration](#channel-action-configuration)

## Configuration
### Authentication Details
* `Username` - Username used when querying Dynamics NAV
* `Password` - Password used when querying Dynamics NAV
* `Domain` - (Optional) Domain used when querying Dynamics NAV
* `Workstation` - (Optional) Workstation used when querying Dynamics NAV
### Endpoint URLs
List of endpoints for use with the NAV instance.

_Example URL: `https://<baseUrl>:<port>/<serverInstance>/WS/<companyName>/Page/Customer`_

Each endpoint is used with the following functions:
* `Customer SOAP URL` - `Get Customer`/`Put Customer`
* `Item SOAP URL` - `Get Product`/`Get Product Quantity`
* `Item Ledger SOAP URL` - `Get Product Quantity`
* `Item Variants SOAP URL` - `Get Product`
* `Order SOAP URL` - `Put Order`
* `Order Lines SOAP URL` - `Put Order`
* `Sales Shipment SOAP URL` - `Get Fulfillment`
* `Variant Inventory SOAP URL` - `Get Product Quantity`

### Service Names
List of service names for use with the NAV instance - each service name is used to identify the object of the record from NAV.

_Example Values: `Item`, `Customer`_

* `Customer Service Name` - Service name used under the WSDL from the `Customer SOAP URL`
* `Item Service Name` - Service name used with the `Item SOAP URL`
* `Item Ledger Service Name` - Service name used with the `Item Ledger SOAP URL`
* `Item Variants Service Name` - Service name used with the `Item Variants SOAP URL`
* `Order Service Name` - Service name used with the `Order SOAP URL`
* `Order Lines Service Name` - Service name used with the `Order Lines SOAP URL`
* `Sales Shipment Service Name` - Service name used with the `Sales Shipment SOAP URL`
* `Variant Inventory Service Name` - Service name used with the `Variant Inventory SOAP URL`

## Current Function Support
### GET
* `Get Product`
* `Get Product Quantity`
* `Get Fulfillment`
### PUT
* `Put Sales Order`
* `Put Customer`
### REFRESH Action Support
* `Customer`

## Channel Action Configuration
### Get Product
* **DateTime Filter Field** - Specifies a `DateTime` field to use instead of the default field when querying products by date.
* **Filter Field** - Specifies a field by which to filter products.
* **Filter Criteria** - A conditional value to match against products when querying products.
* **Product Code Unit Fields**:
    * Method Name
    * Key Field
    * Start Date Field
    * End Date Field
    * ID Field
    * Page Field
    * Page Size Field
    
* **Product Variant Code Unit Fields**:
    * Method Name
    * Key Field
    * Start Date Field
    * End Date Field
    * ID Field
    * Page Field
    * Page Size Field
    
### Get Product Quantity
* **DateTime Filter Field** - Specifies a `DateTime` field to use instead of the default field when querying product quantities by date.
* **Item Ledger Filter Field** - Specifies a field by which to filter the item ledger.
* **Item Ledger Filter Criteria** - The conditional value to match against item ledger records when querying the item ledger.
* **Item Field** - Specifies a field by which to filter products.
* **Item Filter Criteria** - The conditional value to match against products when querying products.
* **Variant Inventory Filter Field** - Specifies a field by which to filter variant inventory.
* **Variant Inventory Filter Criteria** - The conditional value to match against variant inventory when querying the variant inventory.
* **Variant Inventory Code Unit Fields**:
    * Item Field
    * Variant Code
    * Location Field
    * Method Name
    * Location Code
    
* **Item Ledger Code Unit Fields**:
    * Method Name
    * Key Field
    * Start Date Field
    * End Date Field
    * Page Field
    * Page Size Field
    
### Get Fulfillment
* **DateTime Filter Field** - Specifies a `DateTime` field to use instead of the default field when querying fulfillments by date.
* **Filter Field** - Specifies a field by which to filter fulfillments.
* **Filter Criteria** - The conditional value to match against fulfillments when querying fulfillments.
* **Fulfillment Code Unit Fields**:
    * Method Name
    * Key Field
    * Start Date Field
    * End Date Field
    * Remote ID
    * Page Field
    * Page Size Field
    
### Put Order
* **Customer Field**
* **Order Code Unit Fields**:
    * Method Name

### Put Customer
* **Customer Code Unit Fields**:
    * Insert Method Name
    * Query Method Name
    * Update Method Name
    * ID Field