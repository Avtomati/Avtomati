var request = require('request');
function bulkPost(host, db, operations, cb) {
    request.post({
        url: host + 'databases/' + db + '/bulk_docs',
        body: JSON.stringify(operations)
    }, function (error, response, resBody) {
        if (!error && response.statusCode === 200) {
            var result = JSON.parse(resBody);
            cb(null, result);
        } else {
            cb(error || response.statusCode, null);
        }
    });
}
module.exports = function(){
    return {
        store: function(host,db,id,doc,meta,cb){
            var operations = [
                {
                    Method: "PUT",
                    Document:doc,
                    Metadata:meta,
                    Key: id
                }
            ];
            bulkPost(host,db,operations,cb);
        }
    };
};