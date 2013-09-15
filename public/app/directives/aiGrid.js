angular
    .module('app')
    .directive('aiGrid',function(){
    return {
        restrict:'E',
        templateUrl:'templates/aiGrid',
        scope:{},
        controller:function($scope,$rootScope,$http){
            $scope.q=[];
            $scope.subscribe = function(){
                $rootScope.$on($scope.indexName+'FacetChanged',function(e,args){
                    $scope.message = JSON.stringify(args);
                    $scope.q = args;
                    if($scope.currentPage===1){
                        $scope.updateGridData();
                    }else{
                        $scope.currentPage = 1;
                    }
                });
            };
            $scope.$watch('currentPage',function(){
                $scope.updateGridData();
            });
            $scope.updateGridData = function(){
                $http({
                    method:'POST',
                    url:$scope.aiUrl,
                    data:{
                        query:$scope.q,
                        currentPage: $scope.currentPage,
                        pageSize: $scope.pageSize
                    }
                }).success(function(data){
                        $scope.data = data;
                    });
            };
        },
        link: function(scope, iElement, iAttrs){
            scope.aiUrl = iAttrs.aiUrl;
            scope.pageSize = iAttrs.aiPageSize;
            scope.indexName = iAttrs.aiUrl.split('/')[3];
            scope.currentPage = 1;
            scope.subscribe();
        }
    };
});