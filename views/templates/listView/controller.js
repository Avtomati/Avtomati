function ListViewController($scope,$rootScope,$http,$modal,$location){
    $scope.q=[];
    $scope.currentPage = 1;
    $scope.$watch('indexUrl',function(v){
        var indexName = v.split('/')[4];
        $rootScope.$on(indexName + 'FacetChanged',function(e,args){
            $scope.message = JSON.stringify(args);
            $scope.q = args;
            if($scope.currentPage===1){
                $scope.updateGridData();
            }else{
                $scope.currentPage = 1;
            }
        });
    });
    $scope.$watch('currentPage',function(){
        $scope.updateGridData();
    });
    $scope.updateGridData = function(){
        $http({
            method:'POST',
            url:$scope.indexUrl,
            data:{
                query:$scope.q,
                currentPage: $scope.currentPage,
                pageSize: 5
            }
        }).success(function(data){
                $scope.grid = data;
            });
    };
    $scope.showDetailView = function(url, row){
        console.log($location.path());
        $location.path(url + "/" + encodeURIComponent(row[$scope.idField]));
        console.log($location.path());
    }
    $scope.showCommand = function(templateUrl){
        var modalInstance = $modal.open({
            templateUrl: templateUrl,
            controller: function($scope,$modalInstance){
                $scope.model = {};
                $scope.execute = function(){
                    $modalInstance.close($scope.model);
                };
            }
        });
        modalInstance.result.then(function (model) {
            console.log(model);
        });
    };
}

function DetailController($scope,$rootScope,$http,$modal,$routeParams,$location){
    $http({method:'GET', url: $location.path()})
        .success(function(data){
            $scope.obj = data;
        });
}