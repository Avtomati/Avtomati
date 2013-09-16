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



var l = ["1","2"]
var r = ["3"]//,{key:3,values:32},{key:4,values:44}]


mergeLeft(l, r, function(x) { return x; }, function(l,r){ });

console.log(l);


