var express = require('express'),
    http = require('http'),
    _ = require('underscore'),
    Enumerable = require('linq'),
    request = require('request'),
    rhost = "http://office.anvol.ge:8080/",
    rdb = "Anvol",
    path = require('path');
var app = module.exports = express();
app.set('port', 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.static(path.join(__dirname, 'public')));
app.use(app.router);
if (app.get('env') === 'development') {
    app.use(express.errorHandler());
}
if (app.get('env') === 'production') {
    // TODO
}
/*--------Views---------*/
app.get('/', function index(req, res){
    res.render('index');
});
app.get('/partials/:name', function(req,res){
    var name = req.params.name;
    res.render('partials/' + name);
});
app.get('/templates/:name', function(req,res){
    var name = req.params.name;
    res.render('templates/' + name);
});
/*----------------------*/
/*-----Data Api------*/
app.post('/api/indexes/:indexName/facets/:facetName',function(req,res){
    var query = req.body.query;
    var indexName = req.route.params.indexName;
    var facetName = req.route.params.facetName;
    var whereWithoutMulties = query
            .filter(function(f){
                return !f.isMulti;
            })
            .map(function(f){
                return f.values.map(function(v){
                    return f.name + ":" + (v.indexOf('[') === 0 ? v : '"' + v + '"');
                }).join(" OR ");
            }).join(" AND ");
    var whereWithMulties = query
            .map(function(f){
                return f.values.map(function(v){
                    return f.name + ":" + (v.indexOf('[') === 0 ? v : '"' + v + '"');
                }).join(" OR ");
            }).join(" AND ");
    getFacetData(indexName,facetName,whereWithMulties,function(err,resultsWithMulties){
        resultsWithMulties.forEach(function(r){
            return r.values = r.values.filter(function(v){
                return v.Hits > 0;
            });
        });
        resultsWithMulties = resultsWithMulties.filter(function(r){
            return r.values.length > 0;
        });
        getFacetData(indexName,facetName,whereWithoutMulties,function(err,resultsWithoutMulties){
            resultsWithoutMulties.forEach(function(r){
                return r.values = r.values.filter(function(v){
                    return v.Hits > 0;
                });
            });
            resultsWithoutMulties = resultsWithoutMulties.filter(function(r){
                return r.values.length > 0;
            });
            var r1 = Enumerable.From(resultsWithMulties)
                            .Where(function(f){
                                return !f.isMulti;
                            });
            var r2 = Enumerable.From(resultsWithoutMulties)
                           .Where(function(f){
                                return f.isMulti;
                            });
            var results = r2.Concat(r1).ToArray();
            res.json(results);
        });
    });
});
app.post('/api/indexes/:indexName',function(req,res){
    var query = req.body.query;
    var indexName = req.route.params.indexName;
    var currentPage = parseInt(req.body.currentPage,10) - 1;
    var pageSize = parseInt(req.body.pageSize);
    var whereClause = query.map(function(f){
                return f.values.map(function(v){
                    return f.name + ":" + (v.indexOf('[') === 0 ? v : '"' + v + '"');
                }).join(" OR ");
            }).join(" AND ");
    queryIndex(rhost,rdb,indexName,whereClause,currentPage*pageSize,pageSize,
        function(err,result){
            var data = {};
            data.columns = _.map(result.Results[0],function(v,k){
                return {header:k,name:k};
            });
            data.rows = result.Results;
            data.total = result.TotalResults;
            res.json(data);
    });
});
/*-------------------*/
http.createServer(app).listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
});
function getFacetData(indexName,facetName,where,cb){
    where = encodeURIComponent(where);
    getFacets(rhost,rdb,indexName,"facets/"+facetName,where,function(err,results){
        console.log(results);
        var r = _.map(results,function(value,key){
            return {
                key:key,
                name:key,
                isMulti:key == 'Brendi',
                values:value.Values
            };
        });
        if(err){
            cb(err);
        }else{
            cb(null,r);
        }
    });
};
function getFacets(host,db,index, facetDoc, query, cb) {
    var url = host + "databases/" + db + "/facets/" + index + "?facetDoc=" + facetDoc + "&query=" + query + "&pageSize=128";
    request(url, function (error, response, body) {
        if (!error && response.statusCode === 200) {
            var result = JSON.parse(body);
            cb(null,result.Results)
        } else {
            cb(error || response.statusCode, null);
        }
    });
};
function queryIndex(host,db,index,where,skip,take,cb){
    where = encodeURIComponent(where);
    var url = host + "databases/" + db + "/indexes/" + index + "?query=" +
                        where + "&pageSize=" + take + "&start="+skip;
    console.log(url);
    request(url, function (error, response, body) {
        if (!error && response.statusCode === 200) {
            var result = JSON.parse(body);
            cb(null,result)
        } else {
            cb(error || response.statusCode, null);
        }
    });
};

