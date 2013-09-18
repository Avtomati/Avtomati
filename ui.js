var path = require('path'),
    _ = require('underscore'),
    fs = require('fs');
    
var db = [
        {
            index: "/api/Anvol/indexes/DocumentsByTags",
            facet: "/api/Anvol/indexes/DocumentsByTags/facets/documents",
            idField: "ClientId",
            menuId: "MonacemtaBazebi/Anvol/Dokumentebi",
            commands:[]
        },
        {
            index: "/api/Anketebi/indexes/Raven%2FDocumentsByEntityName",
            facet: "/api/Anketebi/indexes/Raven%2FDocumentsByEntityName/facets/documents",
            idField: "ClientId",
            menuId: "MonacemtaBazebi/Anketebi/Dokumentebi",
            commands:[]
        },
    {
        database:'Anketebi',
        index: "/api/Anketebi/indexes/Klientebi",
        facet: "/api/Anketebi/indexes/Klientebi/facets/klientebi",
        idField: "klientisId",
        menuId: "Client Management",
        commands:[
            {
                name:'DaamateAnketa',
                fields:[
                    {name:'pid',label:'პირადი ნომერი'},
                    {name:'firstName',label:'სახელი'},
                    {name:'lastName',label:'გვარი'},
                    {name:'birthDate',label:'დაბ. თარიღი',type:'date'},
                    {name:'vip',label:'VIP',type:'check'},
                    {name:'phone',label:'ტელეფონი'},
                    {name:'mail',label:'e-Mail'},
                    {name:'childrenBirthDates',label:'ბავშვების დაბ. თარიღები'},
                    {name:'cardNumber',label:'ბარათის ნომერი'}
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

//app.js generation functions
function getAppFunctions(){
    var ngRoutes = [];
    db.forEach(function(fun){
        var funId = toId(fun.menuId);
        var baseUrl = '/'+ funId.toLowerCase();
        fun.commands = fun.commands || [];
        if(fun.index){
            ngRoutes.push({
                url: baseUrl, nodeTemplatePath: "templates/listview/index.jade",
                facet: fun.facet, index: fun.index,
                commands: fun.commands, idField: fun.idField,
                templateUrl: baseUrl, controller: 'ListViewController'
            });
            fun.commands.forEach(function(cmd){
                ngRoutes.push({
                    url: baseUrl+"/"+cmd.name, nodeTemplatePath: "templates/commands/default.jade",
                    name:cmd.name,
                    fields:cmd.fields 
                });
            });
            if(fun.idField){
                ngRoutes.push({
                    url: baseUrl + "/:id", nodeTemplatePath:"templates/listview/detail.jade",
                    templateUrl: baseUrl + "/:id", controller:'DetailController'
                });    
            }
        }else{
          ngRoutes.push({
                url:baseUrl, nodeTemplatePath:"templates/listview/index.jade",
                facet:fun.facet, index:fun.index,
                commands:fun.commands, idField:fun.idField,
                templateUrl:getSpecificViewUrl(funId), controller:"'" + toControllerName(fun.menuId) + 'Controller' + "'"
            });    
        }
    });
    return ngRoutes;
};


function start(app){
    var ngRoutes = getAppFunctions();
    //console.log(JSON.stringify(ngRoutes,null,4));
    ngRoutes.forEach(function(r){
        console.log(r);
        app.get(r.url, function(req,res) {
            res.render(r.nodeTemplatePath, r);
        });
    });
    app.get('/app.js',function(req,res){
        var whens = ngRoutes
                        .map(function(r){
            return  "when('"+ r.url + "',{templateUrl:'"+
                r.templateUrl + "',controller:"+
                r.controller + "})";
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