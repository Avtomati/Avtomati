var path = require('path'),
    _ = require('underscore'),
    raven = require('./raven')(),
    domain = require('./domain')(
        {
            store:function(id,doc,meta,cb) {
                raven.store('http://office.anvol.ge:8080/','Anketebi', id, doc, meta, cb);
            }
        }),
    fs = require('fs');
    
var db = [
    {
        index: "/api/Anvol/indexes/refebi",
        facet: "/api/Anvol/indexes/refebi/facets/refs",
        idField: "Ref",
        menuId: "Produktebi",
    }, {
        database:'Anketebi',
        index: "/api/Anketebi/indexes/Klientebi",
        facet: "/api/Anketebi/indexes/Klientebi/facets/klientebi",
        idField: "klientisId",
        menuId: "Client Management",
        commands:[
            {
                name:'DaamateAnketa',
                fields:{
                    'pid':{label:'პირადი ნომერი'},
                    'firstName':{label:'სახელი'},
                    'lastName':{label:'გვარი'},
                    'birthDate':{label:'დაბ. თარიღი',type:'date'},
                    'vip':{label:'VIP',type:'check'},
                    'phone':{label:'ტელეფონი'},
                    'mail':{label:'e-Mail'},
                    'childrenBirthDates':{label:'ბავშვების დაბ. თარიღები'},
                    'cardNumber':{label:'ბარათის ნომერი'},
                    'discount':{label:'დისქოუნთ პროცენტი'}
                },
                handler:domain.daamateAnketa
            }
        ]
    }, {
        index: "/api/Anvol/indexes/DocumentsByTags",
        facet: "/api/Anvol/indexes/DocumentsByTags/facets/documents",
        idField: "@id",
        menuId: "MonacemtaBazebi/Anvol/Dokumentebi",
        commands:[]
    }, {
        index: "/api/Anketebi/indexes/Raven%2FDocumentsByEntityName",
        facet: "/api/Anketebi/indexes/Raven%2FDocumentsByEntityName/facets/documents",
        idField: "@id",
        menuId: "MonacemtaBazebi/Anketebi/Dokumentebi",
        commands:[]
    }, {
        menuId:'Home'
    }, {
        menuId:'Ai Directives'
    }, {
        menuId:'examples/ylinji/minji'
    }
];

//app.js generation functions
function getAppFunctions(queryIndex, multiGet){
    var ngRoutes = [];
    db.forEach(function(fun){
        var funId = toId(fun.menuId);
        var baseUrl = '/'+ funId.toLowerCase();
        fun.commands = fun.commands || [];
        if(fun.index){
            ngRoutes.push({
                url: baseUrl, templateUrl: "'" + baseUrl + "'", controller: 'ListViewController',
                registerRoute:(
                    function(){
                        return function(app) {
                            app.get(baseUrl, function(req,res){
                                res.render("templates/listview/index.jade", {
                                    url: baseUrl, facet: fun.facet, index: fun.index,
                                    commands: fun.commands, idField: fun.idField
                                });
                            });
                        }
                    }())
            });
            fun.commands.forEach(function(cmd){
                var commandUrl = baseUrl + "/" + cmd.name;
                ngRoutes.push({
                    url: commandUrl,
                    registerRoute:(
                        function(){
                            return function(app) {
                                app.get(commandUrl, function(req,res){
                                    res.render("templates/commands/default.jade", {
                                        name:cmd.name, fields:cmd.fields
                                    });
                                });
                                app.post(commandUrl,function(req,res){
                                    //TODO: Validate, if error: 400
                                    var model = req.body.model;
                                    //validate();
                                    cmd.handler(model,function(err){
                                       if(!err){
                                           res.status(201)
                                       } else{
                                            res.status(409);
                                       }
                                       res.end();
                                    });
                                });
                            }
                        }())
                });
            });

            if(fun.idField){
                var detailViewUrl = baseUrl + "/:id";
                ngRoutes.push({
                    url: detailViewUrl,
                    templateUrl: "function(route,path){ return '" + "templates" + baseUrl + "' + '/' + route.id; }", controller:'DetailController',
                    registerRoute:(
                        function(){
                            var indexSegments = fun.index.split('/');
                            return function(app){
                                app.get(detailViewUrl, function(req, res) {
                                    var id = req.route.params.id;
                                    var cb = function(err,rez){
                                                res.json(rez);
                                            };

                                    if(fun.idField === "@id"){
                                        multiGet(
                                              indexSegments[2]
                                            , [{path: "/docs/" + id, headers:{}}]
                                            , function(err,rez){cb(err, rez[0].Result )});
                                    }else{
                                        queryIndex(
                                              indexSegments[2]
                                            , indexSegments[4]
                                            , encodeURIComponent(fun.idField + ":" + id)
                                            , 0 , 1
                                            , function(err,rez){cb(err,rez.Results[0])});
                                    }
                                });
                                app.get("/templates" + detailViewUrl, function(req, res) {
                                    var id = req.route.params.id;
                                    var cb = function(err,rez){
                                                var schema = getSchema(rez);
                                                res.render("templates/listview/detail.jade", {schema: schema});
                                            };

                                    if(fun.idField === "@id"){
                                        multiGet(
                                              indexSegments[2]
                                            , [{path: "/docs/" + id, headers:{}}]
                                            , function(err,rez){cb(err, rez[0].Result )});
                                    }else{
                                        queryIndex(
                                              indexSegments[2]
                                            , indexSegments[4]
                                            , encodeURIComponent(fun.idField + ":" + id)
                                            , 0 , 1
                                            , function(err,rez){cb(err,rez.Results[0])});
                                    }
                                });
                            }
                        }())
                });    
            }
        }else{
          ngRoutes.push({
                url:baseUrl,
                templateUrl:"'"+getSpecificViewUrl(funId)+"'", 
                controller:"'" + toControllerName(fun.menuId) + 'Controller' + "'",
                registerRoute:(
                    function(){
                        return function(app){
                            app.get(baseUrl,function(req, res) {
                                res.render("templates/listview/index.jade");
                            });
                        };
                    }())

            });    
        }
    });
    return ngRoutes;
};

function tryParseToDate(str){
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
function start(app, queryIndex, multiGet){
    var ngRoutes = getAppFunctions(queryIndex, multiGet);
    ngRoutes.forEach(function(r){
        if(r.registerRoute){
            r.registerRoute(app);
        }
    });
    app.get('/app.js',function(req,res){
        var whens = ngRoutes
                        .map(function(r){
            return  "when("+
                "'" + r.url + "'," +
                "{"+
                    "templateUrl: " + r.templateUrl + ", " +
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
    app.get('/api/getMenu',function(req,res){
        var trees = db.map(function(fun){
            return toTree(fun.menuId, toHref(fun.menuId));
        });
        var items = trees.reduce(function(memo,tree){
            iterateTree(memo,tree);
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
    app.get('/dynamic/*', function(req,res){
        var p = req.url.slice(1);
        if(fs.existsSync(path.join(app.get('views'), p) + '.jade')){
            res.render(p);
        }else{
            res.render(p + '/index');
        }
    });
};
module.exports = {start:start};
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