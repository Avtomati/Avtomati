var _ = require('underscore');
var request = require("request");

function start(funcionalebi, app, queryIndex, multiGet, commandHandlers){

    function funkcionali(fun) {
        var funId = toId(fun.menuId);
        var baseUrl = '/'+ funId.toLowerCase();
        fun.commands = fun.commands || [];

        return function(meniusRegistratori, ngRoutebisRegistratori,  nodesRoutebisRegistratori) {
            meniusRegistratori({menuPath: fun.menuId, href: toHref(fun.menuId)});
            if(fun.index) {
                ngRoutebisRegistratori({url: baseUrl, templateUrl: "'" + baseUrl + "'", controller: 'ListViewController'});
                nodesRoutebisRegistratori({
                    method:'get',
                    url:baseUrl, 
                    handler: function(req,res) {
                        res.render("templates/listview/index.jade", {
                            url: baseUrl, facet: fun.facet, index: fun.index,
                            commands: fun.commands, idField: fun.idField
                        });
                    }
                });
                fun.commands.forEach(function(cmd) {
                    var commandUrl = baseUrl + "/" + cmd.name;
                    ngRoutebisRegistratori({ url: commandUrl });
                    nodesRoutebisRegistratori({
                        method:'get',
                        url: commandUrl, 
                        handler: function(req,res){
                            res.render("templates/commands/default.jade", {
                                name:cmd.name, fields:cmd.fields
                            });
                        }
                    });
                    nodesRoutebisRegistratori({
                        method: 'post',
                        url: commandUrl, 
                        handler: function(req,res){
                            //TODO: Validate, if error: 400
                            var model = req.body.model;
                            //validate();
                            if(commandHandlers[cmd.name])
                            
                            commandHandlers[cmd.name](model, function(err){
                                if(!err){
                                    res.status(201)
                                } else{
                                    res.status(409);
                                }
                                res.end();
                            });
                        }
                    });
                });
                if(fun.idField){
                    var detailViewUrl = baseUrl + "/:id";
                    ngRoutebisRegistratori({ 
                        url: detailViewUrl, 
                        templateUrl: "function(route,path){ return '" + "templates" + baseUrl + "' + '/' + route.id; }", controller:'DetailController' 
                    });
                    var indexSegments = fun.index.split('/');
                    
                    nodesRoutebisRegistratori({
                        method:'get',
                        url:detailViewUrl, 
                        handler: function(req, res) {
                            var id = req.route.params.id;
                            var cb = function(err,rez){
                                res.json(rez);
                            };
                            if(fun.idField === "@id"){
                                multiGet(indexSegments[2], [{path: "/docs/" + id, headers:{}}], function(err,rez){cb(err, rez[0].Result )});
                            } else {
                                queryIndex(indexSegments[2], indexSegments[4], encodeURIComponent(fun.idField + ":" + id), 0 , 1, function(err,rez){cb(err,rez.Results[0])});
                            }
                        }
                    });
                    nodesRoutebisRegistratori({
                        method: 'get',
                        url: '/templates' + detailViewUrl, 
                        handler: function(req, res) {
                            var id = req.route.params.id;
                            var cb = function(err,rez){
                                var schema = getSchema(rez);
                                res.render("templates/listview/detail.jade", {schema: schema});
                            };
                            if(fun.idField === "@id"){
                                multiGet(indexSegments[2], [{path: "/docs/" + id, headers:{}}], function(err,rez){cb(err, rez[0].Result )});
                            } else {
                                queryIndex(indexSegments[2], indexSegments[4], encodeURIComponent(fun.idField + ":" + id), 0 , 1, function(err,rez){cb(err,rez.Results[0])});
                            }
                        }
                    });
                };
            }
        }
    }

    function eventStream(fun){
        return function(meniusRegistratori, ngRoutebisRegistratori,  nodesRoutebisRegistratori){
            meniusRegistratori({ 
                menuPath: "Streams", 
                href: toHref("streams/$streams") 
            });

            ngRoutebisRegistratori({
                url: "/streams/:streamid", 
                templateUrl: "function(route){ return '/templates/streams/' + route.streamid; }", 
                controller: 'DetailController'
            });
            nodesRoutebisRegistratori({
                method:'get',
                url: "/templates/streams/:streamid", 
                handler: function(req, res) {

                    request('http://127.0.0.1:2113/streams/' + req.route.params.streamid + '?format=json', function (error, response, body) {
                        if (!error && response.statusCode == 200) {
                            var schema = getSchema(JSON.parse(body));
                            res.render("templates/listview/detail.jade", {schema: schema});
                        } else {

                        }
                        
                    }).auth('admin', 'changeit', false)
                }
            });
            nodesRoutebisRegistratori({
                method:'get',
                url: "/streams/:streamid", 
                handler: function(req, res) {
                    request('http://127.0.0.1:2113/streams/' + req.route.params.streamid + '?format=json', function (error, response, body) {
                        if (!error && response.statusCode == 200) {
                            res.json(JSON.parse(body));
                        } else {
                            res.json(response);
                        }
                    }).auth('admin', 'changeit', false)
                }
            });
        } 
    }

    var menusRegistraciebi = []
    function meniusRegistratori(r) {
        menusRegistraciebi.push(r);       
    }

    var ngRoutebisRegistraciebi = []
    function ngRoutebisRegistratori(r) {
        ngRoutebisRegistraciebi.push(r)
    }

    function nodesRoutebisRegistratori(r) {
        app[r.method](r.url,r.handler)
    }
    
    eventStream()(meniusRegistratori, ngRoutebisRegistratori, nodesRoutebisRegistratori);
    
    funcionalebi.forEach(function(r){
        funkcionali(r)(meniusRegistratori, ngRoutebisRegistratori, nodesRoutebisRegistratori)
    });

    app.get('/api/getMenu',function(req,res) {
        var trees = menusRegistraciebi.map(function(fun){
            return toTree(fun.menuPath, fun.href);
        });
        var items = trees.reduce(function(memo,tree){
            iterateTree(memo, tree);
            return memo;
        },{});
        function A(item){
            return _.map(item, function(value,name){
                return {
                    name:name,
                    href:value.href,
                    subItems: A(value.subItems)
                }
            });
        };
        res.json(A(items));
    });

    app.get('/app.js',function(req,res){
        var whens = ngRoutebisRegistraciebi
                        .map(function(r){
            return "when("+
                "'" + r.url + "'," +
                "{" +
                    "templateUrl:" + r.templateUrl + ", " +
                    "controller:" + r.controller + 
                "})";
        }).join('.');
        var appjs = "angular.module('app', ['ui.bootstrap','LocalStorageModule'], function($routeProvider,$locationProvider){"+
            "$routeProvider."+
            whens +
            ".otherwise({"+
            "redirectTo: '/'"+
                "});"+
            //"$locationProvider.html5Mode(false).hashPrefix('#');" +
            "});";
        res.setHeader('Content-Type','application/javascript');
        res.send(appjs);
    });
};

module.exports = start;


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

//menu generation functions
function toHref(s){
    return '/#/'+toId(s).toLowerCase();
};
function toTree(str, href){
    var index = str.indexOf('/');
    if(index == -1){
        return {
            name:str,
            href: href,
            subItems:[]
        };
    }
    return {
        name:str.slice(0,index),
        subItems:[toTree(str.slice(index+1), href)]
    };
};
function iterateTree(memo,tree){
    if(memo[tree.name]){
        if(tree.href){
            memo[tree.name].href = tree.href;
        }
    }else{
        memo[tree.name] = {href:tree.href,subItems:{}};
    }
    tree.subItems.forEach(function(si){
        iterateTree(memo[tree.name].subItems,si);
    });
};
function hasSpecificView(funId){
    var p = path.join(__dirname, 'views','dynamic',funId);
    return  fs.existsSync(p) && fs.statSync(p).isDirectory();
};
function getSpecificViewUrl(funId){
    return 'dynamic/'+ funId;
};
function getGenericView(){
    return {url:'dynamic/generics/default',controller:"''"};
};
function toControllerName(s){
    var segments = s.replace(/\//gi,' ').split(' ');
    return segments.map(function(seg){
        return seg[0].toUpperCase() + seg.slice(1);
    }).join('');
};
function toId(s){
    return s.replace(/ /gi,'');
};


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