function HomeController($scope,$http){
    $scope.oneAtATime = true;
    $http({method:'GET',url:'/api/facet'})
        .success(function(data){
            $scope.facets = data;
        });
    $scope.apply = function(key,range){
        var results = $scope.facets
            .map(function(f){
                f.values = f.values
                    .filter(function(v){
                        return v.isSelected || (f.key == key && v.Range == range);
                    }).map(function(v){
                        return v.Range;
                    });
                return f;
            }).filter(function(a){
                return a.values.length > 0;
            });
        $http({method:'POST',url:'/api/facet',data:{query:results}})
            .success(function(data){
                $scope.facets = data;
                $scope.$emit('filterRequest',results);
            });
    };
};