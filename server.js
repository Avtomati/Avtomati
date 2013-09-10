var express = require('express'),
    http = require('http'),
    _ = require('underscore'),
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
/*----------------------*/
/*-----Data Api------*/
app.get('/api/facet',function(req,res){
    session.facets("refebi","facets/refs","",function(err,results){
        var r = _.map(results,function(value,key){

            return {
                key:key,
                name:key,
                isMulti:key == 'Brendi',
                values:value.Values
            };
        });
        res.json(r);
    });
});
/*-------------------*/

//app.get('*', routes.index);
http.createServer(app).listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
});