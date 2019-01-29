'use strict';

module.exports = function(flowContext, payload) {
    let query = JSON.parse(JSON.stringify(payload));
    query.modifiedDateRange = query.createdDateRange;
    return this.getProductMatrixByModifiedTimeRange(flowContext, query);
};
