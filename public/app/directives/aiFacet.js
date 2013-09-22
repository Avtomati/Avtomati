function mergeLeft(l, r, getkey, actEq, del){
    var delKeys = {}
    function reducer(m, x) {
        var k = getkey(x);
        m[k] = x;
        return m;
    }
    var xl = l.reduce(reducer ,{});
    var xr = r.reduce(reducer ,{});
    for(var key in xl){
        if(xr[key]){
            actEq(xl[key], xr[key]);
        }else{
            delKeys[key] = true;
        }
    }
    for(var key in xr){
        if(!xl[key]){
            l.push(xr[key]);
        }
    }
    if(del){
        for (var i = 0; i < l.length; i++) {
            if (delKeys[getkey(l[i])]) {
                l.splice(i, 1);
                i--;
            }
        }
    }
}

angular
    .module('app')
    .directive('aiFacet', function(localStorageService, $location){
    return {
        restrict:'E',
        templateUrl:'templates/aiFacet',
        scope:{},
        controller: function($scope,$http){
            $scope.selectedFacets = [];
            $scope.facets = [];
            $scope.updateFacetData = function(){
                localStorageService.set('facet' + $location.path(), $scope.selectedFacets);
                $scope.$emit($scope.indexName+'FacetChanged', $scope.selectedFacets);                        

                $http({
                    method:'POST',
                    url:$scope.aiUrl,
                    data:{query:$scope.selectedFacets}
                }).success(function(data){
                        mergeLeft($scope.facets, data
                            ,function(x){return x.key;}
                            ,function(lf,rf){
                                lf.isMulti = rf.isMulti;
                                mergeLeft(lf.values, rf.values
                                    ,function(x){return x.Range;}
                                    ,function(lr,rr){
                                        if(lr.Hits != rr.Hits){
                                            lr.Hits = rr.Hits;
                                        }
                                    }
                                    , true
                                )
                            }
                            ,true
                        );
                    });
            };
            $scope.apply = function(key, range){
                var selctedRanges = $scope.facets
                    .map(function(f) {
                        var values = f.values.filter(function(v){
                            return v.isSelected || (f.key == key && v.Range == range);
                        }).map(function(v){
                                return v.Range;
                            });
                        return {key: f.key, name: f.name, isMulti: f.isMulti, values:values};
                    }).filter(function(f){
                        return f.values.length > 0;
                    });
                mergeLeft($scope.selectedFacets, selctedRanges
                    ,function(x){return x.key;}
                    ,function(lf,rf){
                        mergeLeft(lf.values, rf.values
                            ,function(x){return x;}
                            ,function(lr, rr){
                            }
                        )
                    }
                );
                $scope.updateFacetData();
            };
            $scope.removeSelected = function(selectedFacet, selectedValue){
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
            scope.indexName = iAttrs.aiUrl.split('/')[4];

            var data = localStorageService.get('facet' + $location.path());

            if(data){
                scope.selectedFacets = data
            }
            scope.updateFacetData();
        }
    };
});