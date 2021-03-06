var express = require('express'),
    http = require('http'),
    _ = require('underscore'),
    Enumerable = require('linq'),
    request = require('request'),
    ui = require('./ui'),
    fs = require('fs'),
    rhost = "http://office.anvol.ge:8080/",
    path = require('path');
var app = module.exports = express();
app.set('port', 3001);
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


/*---Client Management----*/
//app.get('/client')
/*-------*/
var commandHandlers = function(){
    function tryParseToDate(str) {
        var segments = str.split(/\.|\-|\//gi);
        if(segments.length!=3){
            return false;
        }
        var day = parseInt(segments[0]);
        var month = parseInt(segments[1]);
        var year = parseInt(segments[2]);
        if(!day || !month || !year){
            return false;
        }
        var strDate = year.toString()+'-'+month.toString()+'-'+day.toString();
        var parsed = Date.parse(strDate);
        if(!parsed){
            return false;
        }
        return new Date(parsed);
    };
return  {
        DaamateAnketa:function(cmd, cb){
            var procenti = parseFloat(cmd.fasdaklebisProcenti, 10);
            if(!cmd.baratisNomeri){
                cb(new Error("baratisNomeri"));
                return;
            }
            if(isNaN(procenti) || !procenti){
                cmd.fasdaklebisProcenti = null;
            }else{
                cmd.fasdaklebisProcenti = procenti < 1 ? procenti : procenti / 100.0;
            }
            cmd.shetanisTarigi = new Date();
            cmd.bavshvebisDabTarigebi = (cmd.bavshvebisDabTarigebi || "")
                .split(',')
                .map(function(x){ return tryParseToDate(x.trim()) })
                .filter(function(x){ return x });
            var sackisiTankha = parseFloat(cmd.sackisiTankha);
            cmd.sackisiTankha = isNaN(sackisiTankha) ? 0.0 : sackisiTankha;
            require('./raven')().store(rhost,"Anketebi", "anketa/", cmd, {"Raven-Entity-Name": "Anketebi"}, cb);
        },
        Brdzaneba2:function(cmd, cb){
            console.log(cmd);
            cb();
        },
        Brdzaneba3:function(cmd, cb){
            console.log(cmd);
            cb();
        }
    }
};
ui(  JSON.parse(fs.readFileSync('funkcionali.json'))
    ,  app
    , function(db, index, where, skip, take, cb){
        queryIndex(rhost, db, index, where, skip, take, cb);
    }
    , function(db, requests, cb){
        multiGet(rhost, db, requests, cb);
    },
    commandHandlers()
);

app.get('/', function index(req, res){
    res.render('index');
});
app.get('/controllers.js',function(req,res){
    var files = '';
    walk(path.join(__dirname, 'views')
        ,function(file){
            var segments = file.split('.');
            if(segments[segments.length - 1] === "js"){
                files += '\n' + fs.readFileSync(file).toString();
            }
        }
        ,function(){
            res.setHeader('Content-Type','application/javascript');
            res.send(files);
        }
    );
});

app.get('/templates/:name', function(req,res){
    var name = req.params.name;
    res.render('templates/' + name);
});
/*-----Data Api------*/
app.post('/api/:databaseName/indexes/:indexName/facets/:facetName',function(req,res){
    var query = req.body.query;
    var indexName = req.route.params.indexName;
    var databaseName = req.route.params.databaseName;
    var facetName = 'facets/' + req.route.params.facetName;
    var withoutMlties = buildWhereClause(query.filter(function(f){
                                                    return !f.isMulti;
                                                }));
    var withMlties = buildWhereClause(query);
    var requests = [
        getFacetRequest(indexName,facetName,withMlties)
    ];
    console.log(requests[0]);
    multiGet(rhost,databaseName,requests,function(err,results){
        if(!err){
            var r1 = enrichFacetFromMetadata(results[0].Result.Results);
            var response = r1
                .map(function(r){
                    r.values = r.values.filter(function(v){
                        return v.Hits > 0;
                    });
                    return r;
                }).filter(function(r){
                    return r.values.length > 0;
                });
            res.json(response);
        }
    });
});
app.post('/api/:databaseName/indexes/:indexName',function(req,res){
    var query = req.body.query;
    var indexName = req.route.params.indexName;
    var databaseName = req.route.params.databaseName;
    var currentPage = parseInt(req.body.currentPage,10) - 1;
    var pageSize = parseInt(req.body.pageSize);
    var whereClause = buildWhereClause(query);
    queryIndex(rhost,databaseName,indexName,whereClause,currentPage*pageSize,pageSize,
        function(err,result){
            var data = {};
            data.columns = _.map(result.Results[0],function(v,k){
                return {header: k,name: k};
            }).filter(function(c){
                    return c.header.indexOf('_') != 0 && c.header.indexOf('@') != 0;;
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
function enrichFacetFromMetadata(facets){
    return _.map(facets,function(value,key){
        return {
            key:key,
            name:key,
            values:value.Values
        };
    });
};
function getFacetRequest(index, facetDoc, where) {
    return {
        path: "/facets/" + index,
        queryString: "facetDoc=" + facetDoc + "&query=" + encodeURIComponent(where) + "&pageSize=128",
        headers:{}
    };
};
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
function multiGet(host,db,requests,cb){
    var body = requests.map(function(r){
        return {
            Url: r.path,
            Query: r.queryString,
            Headers: r.headers
        };
    });
    body = JSON.stringify(body);
    var url = host + 'databases/' + db + '/multi_get';
    request.post({
        url: url,
        body: body
    },
    function(error, response, resBody){
        if (!error && response.statusCode === 200) {
            var result = JSON.parse(resBody);
            cb(null,result)
        } else {
            cb(error || response.statusCode, null);
        }
    });
};
function buildWhereClause(facets){
    return facets.map(function(f){
        return f.values.map(function(v){
            return f.name + ":" + (v.indexOf('[') === 0 ? v : '"' + v + '"');
        }).join(" OR ");
    }).join(" AND ");
};


















/**
 * dir: path to the directory to explore
 * action(file, stat): called on each file or until an error occurs. 
 * file: path to the file. stat: stat of the file (retrived by fs.stat)
 * done(err): called one time when the process is complete. 
 * err is undifined is everything was ok. the error that stopped the process otherwise
 */
var walk = function(dir, action, done) {

    // this flag will indicate if an error occured (in this case we don't want to go on walking the tree)
    var dead = false;

    // this flag will store the number of pending async operations
    var pending = 0;

    var fail = function(err) {
        if(!dead) {
            dead = true;
            done(err);
        }
    };

    var checkSuccess = function() {
        if(!dead && pending == 0) {
            done();
        }
    };

    var performAction = function(file, stat) {
        if(!dead) {
            try {
                action(file, stat);
            }
            catch(error) {
                fail(error);
            }
        }
    };

    // this function will recursively explore one directory in the context defined by the variables above
    var dive = function(dir) {
        pending++; // async operation starting after this line
        fs.readdir(dir, function(err, list) {
            if(!dead) { // if we are already dead, we don't do anything
                if (err) {
                    fail(err); // if an error occured, let's fail
                }
                else { // iterate over the files
                    list.forEach(function(file) {
                        if(!dead) { // if we are already dead, we don't do anything
                            var path = dir + "/" + file;
                            pending++; // async operation starting after this line
                            fs.stat(path, function(err, stat) {
                                if(!dead) { // if we are already dead, we don't do anything
                                    if (err) {
                                        fail(err); // if an error occured, let's fail
                                    }
                                    else {
                                        if (stat && stat.isDirectory()) {
                                            dive(path); // it's a directory, let's explore recursively
                                        }
                                        else {
                                            performAction(path, stat); // it's not a directory, just perform the action
                                        }
                                        pending--; checkSuccess(); // async operation complete
                                    }
                                }
                            });
                        }
                    });
                    pending--; checkSuccess(); // async operation complete
                }
            }
        });
    };

    // start exploration
    dive(dir);
};