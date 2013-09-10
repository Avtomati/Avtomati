function HomeController($scope,$http){
    $scope.oneAtATime = true;
    $http({method:'GET',url:'/api/facet'})
        .success(function(data){
            $scope.facets = data;
        });
    $scope.apply = function(key,range){
        var results = $scope.facets.map(function(f){
            return f.values.filter(function(v){
                return v.isSelected || (f.key == key && v.Range == range);
            }).map(function(v){
                return {r: f.key, l: v.Range};
            });
        }).filter(function(a){
                return a.length > 0;
            });
        $scope.$emit('filterRequest',results);
    };
};