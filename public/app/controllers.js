function MenuController($scope,$http){
    $http({
        method:'GET',
        url:'/api/getMenu'
    }).success(function(data){
        $scope.menuItems = data;
    });
}