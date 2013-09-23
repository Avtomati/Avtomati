function ListViewController($scope, $rootScope, $http, $modal, $location) {
    $scope.currentPage = 1;
    $scope.queue = [];
    $scope.grid = {}
    console.log('ListViewController:', $scope.indexUrl);
    $scope.$watch(function(){
        return $location.path();
    }, function(nv,ov){
        console.log(nv, ov);
    });
    $scope.$watch('indexUrl', function(nv, ov) {
        var indexName = nv.split('/')[4];
        $scope.$watch('currentPage', function(nv, ov) {
            console.log('currentPage:', nv, ov);
            if(nv != ov ){
                $scope.updateGridData();
            }
        });
        $rootScope.$on(indexName + 'FacetChanged', function(e, args) {
            console.log('$on(indexName + FacetChanged');
            $scope.q = args;
            if ($scope.currentPage === 1) {
                if($scope.currentPage){
                    $scope.updateGridData();
                }
            } else {
                $scope.currentPage = 1;
            }
        });
    });

    $scope.updateGridData = function() {
         console.log('updateGridData:');
         $http({
            method: 'POST',
            url: $scope.indexUrl,
            data: {
                query: $scope.q,
                currentPage: $scope.currentPage,
                pageSize: 5
            }
        }).success(function(data) {
            $scope.grid.columns = data.columns;
            $scope.grid.rows = data.rows;
            $scope.grid.total = data.total;

            //console.log(JSON.stringify($scope.grid,null,2));
        });
    };
    $scope.showDetailView = function(url, row) {
        console.log('showDetailView:');
        var id = $scope.idField === "@id" ? row["@metadata"]["@id"] : row[$scope.idField];
        $location.path(url + "/" + encodeURIComponent(id));
    }
    $scope.showCommand = function(templateUrl) {
        var modalInstance = $modal.open({
            templateUrl: templateUrl,
            controller: function($scope, $modalInstance) {
                $scope.model = {};
                $scope.execute = function() {
                    $modalInstance.close($scope.model);
                };
            }
        });
        modalInstance.result.then(function(model) {
            $http({
                method: 'POST',
                url: templateUrl,
                data: {
                    model: model
                }
            }).success(function() {
                alert('თქვენი ბრძანება შესრულებულია.');
            }).error(function() {
                alert('მოხდა შეცდომა.კიდევ ერთხელ სცადეთ');
            });
        });
    };
}

function DetailController($scope, $rootScope, $http, $modal, $routeParams, $location) {
    var segments = $location.path().split('/');
    $scope.title = segments[segments.length - 2] + " (" + decodeURIComponent(segments[segments.length - 1]) + ")";
    $http({
        method: 'GET',
        url: $location.path()
    })
        .success(function(data) {
            $scope.obj = data;
        });
}