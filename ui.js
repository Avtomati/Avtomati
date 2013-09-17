var path = require('path'),
    _ = require('underscore'),
    fs = require('fs');
var db = [
        {
            index: "/api/Anvol/indexes/Raven%2FDocumentsByEntityName",
            facet: "/api/Anvol/indexes/Raven%2FDocumentsByEntityName/facets/documents",
            idField: "ClientId",
            menuId: "Databases/Anvol",
            commands:[]
        },
        {
            index: "/api/Anketebi/indexes/Raven%2FDocumentsByEntityName",
            facet: "/api/Anketebi/indexes/Raven%2FDocumentsByEntityName/facets/documents",
            idField: "ClientId",
            menuId: "Databases/Anketebi",
            commands:[]
        },
    {
        database:'Anketebi',
        index: "/api/Anketebi/indexes/Klientebi",
        facet: "/api/Anketebi/indexes/Klientebi/facets/klientebi",
        idField: "ClientId",
        menuId: "Reportebi/Client Management",
        commands:[
            {
                name:'AnketisDamateba',
                textFields:[
                    {name:'pid',label:'პირადი ნომერი'},
                    {name:'firstName',label:'სახელი'}
                ],
                checkFields:[
                    {name:'vip',label:'VIP'}
                ]
            }
        ],
        idCommands: [
            { name:"AddCardNumber" },
            { name:"AddChildBirthDate" }
        ],
        setCommands:[
            { name:"Set Discount Percent" }
        ]
    },
    {
        index: "/api/Anvol/indexes/refebi",
        facet: "/api/Anvol/indexes/refebi/facets/refs",
        idField: "Ref",
        menuId: "Reportebi/Produktebi"
    },
    {
        menuId:'Home'
    },
    {
        menuId:'Ai Directives'
    },
    {
        menuId:'examples/ylinji/minji'
    }
];
function start(app){
    var ngRoutes = getAppFunctions();
    //console.log(JSON.stringify(ngRoutes,null,4));
    ngRoutes.forEach(function(r){
        app.get(r.url,function(req,res){
            res.render('templates/listview/index',r);
        });
        r.commands = r.commands || [];
        r.commands.forEach(function(cmd){
            cmd.templateUrl = r.url + '/' + cmd.name;
            app.get(cmd.templateUrl,function(req,res){
                res.render('templates/commands/default',cmd);
            });
        });
    });
    app.get('/app.js',function(req,res){
        var whens = ngRoutes
                        .map(function(r){
            return  "when('"+ r.url + "',{templateUrl:'"+
                r.options.templateUrl + "',controller:"+
                r.options.controller + "})";
        }).join('.');
        var appjs = "angular.module('app',['ui.bootstrap'], function($routeProvider){"+
            "$routeProvider."+
            whens +
            ".otherwise({"+
            "redirectTo: '/'"+
                "})"+
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
//app.js generation functions
function getAppFunctions(){
    return db.map(function(fun){
        var funId = toId(fun.menuId);
        var baseUrl = '/'+ funId.toLowerCase();
        var templateUrl = fun.index ? baseUrl : getSpecificViewUrl(funId);
        var ctrl = fun.index ? 'ListViewController' : "'" + toControllerName(fun.menuId) + 'Controller' + "'";
        return {
            facet:fun.facet,
            index:fun.index,
            url:baseUrl,
            commands:fun.commands,
            options:{
                templateUrl: templateUrl,
                controller: ctrl
            }
        };
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