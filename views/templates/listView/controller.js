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
        var id = $scope.idField === "@id" ? row["@metadata"]["@id"] : row[$scope.idField];
        console.log(id);
        $location.path(url + "/" + encodeURIComponent(id));
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
            $http({
                    method:'POST',
                    url:templateUrl,
                    data:{model:model}
                }).success(function(){
                    alert('თქვენი ბრძანება შესრულებულია.');
                }).error(function(){
                    alert('მოხდა შეცდომა.კიდევ ერთხელ სცადეთ');
                });
        });
    };
}

function DetailController($scope,$rootScope,$http,$modal,$routeParams,$location){
    var segments = $location.path().split('/');
    $scope.title = segments[segments.length-2] + " (" + decodeURIComponent(segments[segments.length-1])+")";
    $http({method:'GET', url: $location.path()})
        .success(function(data){
            $scope.obj = data;
        });
}