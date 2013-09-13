function log(o){
    console.log(o);
};
var app = angular.module('app',['ui.bootstrap']);
app.config(function ($routeProvider, $locationProvider) {
    $routeProvider.
        when('/', {
            templateUrl: 'partials/home',
            controller: 'HomeController'
        }).
        otherwise({
            redirectTo: '/'
        });
    $locationProvider.html5Mode(true);
});
app.run(function($rootScope){
    $rootScope.$on('filterRequest',function(e,args){
        //log(args);
    });
});