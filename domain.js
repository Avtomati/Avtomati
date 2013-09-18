module.exports = function(store){
    return {
        daamateAnketa:function(cmd,cb){
            store.store(
                 'Anketa/'
                ,cmd
                ,{'Raven-Entity-Name':'Anketebi'}
                ,function(err,result){
                    if(err){
                        cb(err);
                    }else{
                        cb(null);
                    }
                });
        }
    };
};