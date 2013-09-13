app.directive('ngFacetUrl',function(){
    return {
        controller: function($scope) {}
    }
});
app.directive('ngFacet',function(){
    return {
        restrict:'E',
        templateUrl:'templates/ngFacet',
        require:'^ngFacetUrl',
        scope:{
            ngFacetUrl:'@'
        },
        controller:function($scope,$http){
            $scope.selectedFacets = [];
            function unionFacetArrays(arr1,arr2){
                return Enumerable.From(arr1)
                    .Concat(Enumerable.From(arr2))
                    .GroupBy("x=> {key:x.key,name:x.name,isMulti:x.isMulti}")
                    .Select(function(g){
                        return {
                            key: g.Key().key,
                            name: g.Key().name,
                            isMulti: g.Key().isMulti,
                            values: g.SelectMany("x=> x.values")
                                .Distinct()
                                .ToArray()
                        };
                    })
                    .ToArray()
            };
            $scope.updateFacetData = function(facetUrl){
                $http({
                    method:'POST',
                    url:facetUrl,
                    data:{query:$scope.selectedFacets}
                }).success(function(data){
                        $scope.facets = data;
                        $scope.$emit('filterRequest', $scope.selectedFacets);
                    });
            };
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
                $scope.selectedFacets = unionFacetArrays($scope.selectedFacets,results);
                $scope.updateFacetData();
            };
            $scope.removeSelected = function(selectedFacet,selectedValue){
                var valueIndex = selectedFacet.values.indexOf(selectedValue);
                selectedFacet.values.splice(valueIndex, 1);
                if(selectedFacet.values.length == 0){
                    var facetIndex = $scope.selectedFacets.indexOf(selectedFacet);
                    $scope.selectedFacets.splice(facetIndex, 1);
                }
                $scope.updateFacetData();
            };
        },
        link: function(scope, iElement, iAttrs){
            scope.updateFacetData(iAttrs.ngFacetUrl);
        }
    };
});