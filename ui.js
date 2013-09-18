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
        fields: {
            "pid": { lable:'პირადი ნომერი'},
            "firstName": { lable:'სახელი'},
            "lastName": { lable:'გვარი'},
            "birthDate": { lable:'დაბ. დღე'},
            "phone": { lable:'ტელეფონი'},
            "address": { lable:'მისამართი'},
            "email": { lable:'ელ. ფოსტა'},
            "discount": { lable:'დისქოუნთ პროცენტი'}
        },
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
        menuId: "Reportebi/Produktebi",
        fields: {
            Ref: { lable:'Ref კოდი'},
            Eans: { lable: 'ეან კოდები'},
            Brendi: { lable: 'ბრენდი'},
            Kvebrendi: { lable: 'ქვებრენდი'},
            Dasakheleba: { lable: 'დასახელება'},
            Fasi: { lable:'ფასი' },
            Partiebi: {
                    lable:'Partiebi',
                    fields : {
                        MomcodeblisRefi: { lable:'MomcodeblisRefi' },
                        Dasakheleba: { lable:'Dasakheleba' },
                        Eans: { lable:'Eans' },
                        Raodenoba: { lable:'Raodenoba' },
                        ErtFasi: { lable:'ErtFasi' },
                        Shenishvna: { lable:'Shenishvna' }
                    }
                }
            
        }

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
function getAppFunctions(queryIndex){
    var ngRoutes = [];
    db.forEach(function(fun){
        var funId = toId(fun.menuId);
        var baseUrl = '/'+ funId.toLowerCase();
        fun.commands = fun.commands || [];
        if(fun.index){
            ngRoutes.push({
                url: baseUrl, templateUrl: baseUrl, controller: 'ListViewController',
                requestHandler:(
                    function(){
                        return function(req, res) {
                            res.render("templates/listview/index.jade", {
                                url: baseUrl, facet: fun.facet, index: fun.index,
                                commands: fun.commands, idField: fun.idField
                            });
                        }
                    }())
            });
            fun.commands.forEach(function(cmd){
                ngRoutes.push({
                    url: baseUrl + "/" + cmd.name, 
                    requestHandler:(
                        function(){
                            return function(req, res) {
                                res.render("templates/commands/default.jade", {
                                   name:cmd.name, fields:cmd.fields
                                });
                            }
                        }()) 
                });
            });
            if(fun.idField){
                ngRoutes.push({
                    url: baseUrl + "/:id",
                    templateUrl: baseUrl + "/:id", controller:'DetailController',
                    requestHandler:(
                        function(){
                            var indexSegments = fun.index.split('/');
                            return function(req, res) {
                                var id = req.route.params.id;
                                if(id && id != ':id'){
                                    queryIndex(
                                          indexSegments[2]
                                        , indexSegments[4]
                                        , encodeURIComponent(fun.idField + ":" + id)
                                        , 0 , 1
                                        , function(err,rez){
                                            res.json(rez.Results[0]);
                                        }
                                    );
                                    
                                }else{
                                    res.render("templates/listview/detail.jade", {fields: fun.fields});
                                }
                            }
                        }())
                });    
            }
        }else{
          ngRoutes.push({
                url:baseUrl,
                templateUrl:getSpecificViewUrl(funId), 
                controller:"'" + toControllerName(fun.menuId) + 'Controller' + "'",
                requestHandler:(
                    function(){
                        return function(req, res) {
                            res.render("templates/listview/index.jade");
                        }
                    }())

            });    
        }
    });
    return ngRoutes;
};


function start(app, queryIndex){
    var ngRoutes = getAppFunctions(queryIndex);
    //console.log(JSON.stringify(ngRoutes,null,4));
    ngRoutes.forEach(function(r){
        console.log(r);
        app.get(r.url, r.requestHandler);
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