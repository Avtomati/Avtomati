var request = require("request");

function queryIndex(host,db,index,where,skip,take,cb){
    where = encodeURIComponent(where);
    var url = host + "databases/" + db + "/indexes/" + index + "?query=" +
                        where + "&pageSize=" + take + "&start="+skip;
    request(url, function (error, response, body) {
        if (!error && response.statusCode === 200) {
            var result = JSON.parse(body);
            cb(null,result)
        } else {
            cb(error || response.statusCode, null);
        }
    });
};

var test = { 
    a:1,
    object: { c:2, d:"3", e:new Date()},
    emptyArray:[],
    stringArray:["a","b","c"],
    dateArray:[new Date(), new Date(Date.parse("2013-01-01"))],
    objectArray:[{a:"1",b:1},{a:"2",b:2},{a:"3",b:3}],
    nullArray:[null],
    nullValue:null,
    boolValue:false
};
var meta = getSchema(test);
console.log(require('util').inspect(meta, true, 10));
console.log(require('util').inspect( getSchema(1), true, 10));

function getSchema(o){
    var type = typeof o;
    if(type === "object" && !o) return {type: 'null'};
    if(type === "object" && o.constructor.name !== "Date"){
        if(o.constructor.name === "Array"){
            var rez = []
            for(var key in o){
                if(!o[key]) {
                    continue;
                }
                var json = JSON.stringify(getSchema(o[key]));
                if(rez.indexOf(json) === -1){
                    rez.push(json);
                }
            }

            for(var i in rez.sort(function(l,r){ return r.length - l.length; })){
                rez[i] = JSON.parse(rez[i])
                break;
            }
            return {type:'array', schema: rez[0]};    
        }
        var rez = {}
        for(var key in o){
            rez[key] = getSchema(o[key]);
        }
        return {type:'object', schema:  rez};
    }
    return {type: type === 'object' ? o.constructor.name.toLowerCase() : type};
}