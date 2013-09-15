angular
    .module('app')
    .directive('aiFacet',function(){
    return {
        restrict:'E',
        templateUrl:'templates/aiFacet',
        scope:{},
        controller:function($scope,$http){
            $scope.selectedFacets = [];
            $scope.facets = [];
            function unionFacetArrays(arr1,arr2){
                return Enumerable.From(arr1)
                    .Concat(Enumerable.From(arr2))
                    .GroupBy(function(x){
                        return JSON.stringify({key: x.key,name: x.name,isMulti: x.isMulti});
                    })
                    .Select(function(g){
                        var groupKey = JSON.parse(g.Key());
                        return {
                            key: groupKey.key,
                            name: groupKey.name,
                            isMulti: groupKey.isMulti,
                            values: g.SelectMany("x=> x.values")
                                .Distinct()
                                .ToArray()
                        };
                    })
                    .ToArray()
            };
            $scope.updateFacetData = function(){
                $http({
                    method:'POST',
                    url:$scope.aiUrl,
                    data:{query:$scope.selectedFacets}
                }).success(function(data){
                        var toRemoveKeys = [];
                        var oldFacets = Enumerable.From($scope.facets);
                        var newFacets = Enumerable.From(data);
                        //shecvlili facetebis valuebis update
                        $scope.facets.forEach(function(f){
                            var newFacet = newFacets.Where(function(nf){
                                return nf.key === f.key;
                            }).FirstOrDefault();
                            if(newFacet){
                                f.values = newFacet.values;
                            }
                            else{
                                toRemoveKeys.push(f.key);
                            }
                        });
                        //zedmeti facetebis cashla
                        toRemoveKeys.forEach(function(key){
                            var oldFacet = oldFacets.Where(function(of){
                                return of.key == key;
                            }).FirstOrDefault();
                            var oldFacetIndex = oldFacets.indexOf(oldFacet);
                            $scope.facets.splice(oldFacetIndex,1);
                        });
                        //axali facetebis damateba
                        newFacets.ForEach(function(f){
                            var existingFacet = oldFacets.Where(function(of){
                                return of.key == f.key;
                            }).FirstOrDefault();
                            if(!existingFacet){
                                $scope.facets.push(f);
                            }
                        });
                        $scope.$emit($scope.indexName+'FacetChanged', $scope.selectedFacets);
                    });
            };
            $scope.apply = function(key,range){
                var facets = Enumerable.From($scope.facets).ToArray();
                var results = facets
                    .map(function(f){
                        f.values = f.values
                            .filter(function(v){
                                return v.isSelected || (f.key == key && v.Range == range);
                            }).map(function(v){
                                return v.Range;
                            });
                        return f;
                    }).filter(function(f){
                        return f.values.length > 0;
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
            scope.aiUrl = iAttrs.aiUrl;
            scope.indexName = iAttrs.aiUrl.split('/')[3];
            scope.updateFacetData();
        }
    };
});