var express = require('express'),
    http = require('http'),
    _ = require('underscore'),
    Enumerable = require('linq'),
    request = require('request'),
    session = require('ravendb').openSession("http://office.anvol.ge:8080/", "Anvol"),
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
function getFacetData(where,cb){
    getFacets("http://office.anvol.ge:8080/","Anvol","refebi","facets/refs",where,function(err,results){
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
}
app.post('/api/facet',function(req,res){
    var whereClause = "";
    var query = req.body.query;
    if(query){
        whereClause = query
            .filter(function(f){
                return !f.isMulti;
            })
            .map(function(f){
                return f.values.map(function(v){
                    return f.name + ":" + v;
                }).join(" OR ");
            }).join(" AND ");
        console.log(whereClause);
    }
    getFacetData(whereClause,function(err,results){
        results = results.filter(function(r){
            return r.values.length > 1;
        });
        res.json(results);
    });
});
/*-------------------*/
http.createServer(app).listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
});

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