var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var schema = new Schema({
    product: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        index: true
    },
    timeFrom: Date,
    timeTo: Date,
    status: String
});
module.exports = mongoose.model('ProductTime', schema);
var models = {
    sort: function (data, callback) {
        function callSave(num) {
            ProductTime.saveData({
                _id: data[num],
                order: num + 1
            }, function (err, respo) {
                if (err) {
                    console.log(err);
                    callback(err, null);
                } else {
                    num++;
                    if (num == data.length) {
                        callback(null, {
                            comment: "Data sorted"
                        });
                    } else {
                        callSave(num);
                    }
                }
            });
        }
        if (data && data.length > 0) {
            callSave(0);
        } else {
            callback(null, {});
        }
    },
    saveData: function (data, callback) {
        var producttime = this(data);
        if (data._id) {
            this.findOneAndUpdate({
                _id: data._id
            }, data).exec(function (err, updated) {
                if (err) {
                    console.log(err);
                    callback(err, null);
                } else if (updated) {
                    callback(null, updated);
                } else {
                    callback(null, {});
                }
            });
        } else {

            producttime.save(function (err, created) {
                if (err) {
                    callback(err, null);
                } else if (created) {
                    callback(null, created);
                } else {
                    callback(null, {});
                }
            });
        }
    },
    deleteData: function (data, callback) {
        this.findOneAndRemove({
            _id: data._id
        }, function (err, deleted) {
            if (err) {
                callback(err, null);
            } else if (deleted) {
                callback(null, deleted);
            } else {
                callback(null, {});
            }
        });
    },
    getAll: function (data, callback) {
        this.find({}, {
            password: 0
        }).exec(function (err, found) {
            if (err) {
                console.log(err);
                callback(err, null);
            } else if (found && found.length > 0) {
                callback(null, found);
            } else {
                callback(null, []);
            }
        });
    },
    getOne: function (data, callback) {
        this.findOne({
            "_id": data._id
        }, {
            password: 0
        }).exec(function (err, found) {
            if (err) {
                console.log(err);
                callback(err, null);
            } else if (found && Object.keys(found).length > 0) {
                callback(null, found);
            } else {
                callback(null, {});
            }
        });
    },
      generateExcel: function (res) {
        ProductTime.find().populate("product", "name", null, {
                    sort: {
                        "name": 1
                    }
                }).exec(function (err, data) {
            var excelData = [];
            _.each(data, function (n) {
                var obj = {};
                if(n.product){
                obj.product=n.product.name;
                }
                obj.timeFrom = n.timeFrom;
                obj.timeTo = n.timeTo;
                obj.status = n.status;
                excelData.push(obj);
            });
            Config.generateExcel("ProductTime", excelData, res);
        });
    },
    getLimited: function (data, callback) {
        data.pagenumber = parseInt(data.pagenumber);
        data.pagesize = parseInt(data.pagesize);
        var checkfor = new RegExp(data.search, "i");
        var newreturns = {};
        newreturns.data = [];
        async.parallel([
            function (callback1) {
                ProductTime.count({
                    // name: {
                    //     "$regex": checkfor
                    // }
                }).exec(function (err, number) {
                    if (err) {
                        console.log(err);
                        callback1(err, null);
                    } else if (number) {
                        newreturns.totalpages = Math.ceil(number / data.pagesize);
                        callback1(null, newreturns);
                    } else {
                        newreturns.totalpages = 0;
                        callback1(null, newreturns);
                    }
                });
            },
            function (callback1) {
                ProductTime.find({
                    // delivery: {
                    //     "$regex": checkfor
                    // }
                }, {}).sort({
                    _id: -1
                }).populate("product", "name").skip((data.pagenumber - 1) * data.pagesize).limit(data.pagesize).lean().exec(function (err, data2) {
                    if (err) {
                        console.log(err);
                        callback1(err, null);
                    } else {
                        if (data2 && data2.length > 0) {
                            newreturns.data = data2;
                            newreturns.pagenumber = data.pagenumber;
                            callback1(null, newreturns);
                        } else {
                            callback1({
                                message: "No data found"
                            }, null);
                        }
                    }
                });
            }
        ], function (err, respo) {
            if (err) {
                console.log(err);
                callback(err, null);
            } else {
                callback(null, newreturns);
            }
        });
    },

    getBookedProductOffline: function (data, callback) {
        var productarr = [];
        if (data !== undefined) {
            _.each(data, function (pro) {
                productarr.push(pro.product);
            });
            var matchobj = {
                product: {
                    $in: productarr
                },
                timeTo: {
                    $gte: new Date()
                }
            };
        } else {
            var matchobj = {};
        }
        ProductTime.find(matchobj).exec(function (err, found) {
            if (err) {
                console.log(err);
                callback(err, null);
            } else {
                callback(null, found);
            }
        });
    },

    getBookedProductOnline: function (data, callback) {
        Cart.findOne({
            user: data.user
        }).exec(function (err, found) {
            if (err) {
                console.log(err);
                callback(err, null);
            } else {
                // callback(null, found.cartproduct);
                var productarr = [];
                if (found && found.cartproduct.length > 0) {
                    _.each(found.cartproduct, function (pro) {
                        productarr.push(pro.product);
                    });
                }
                var matchobj = {
                    product: {
                        $in: productarr
                    },
                    timeTo: {
                        $gte: new Date()
                    }
                };
                ProductTime.find(matchobj).exec(function (err, prodata) {
                    if (err) {
                        console.log(err);
                        callback(err, null);
                    } else {
                        callback(null, prodata);
                    }
                });
            }
        });
    },


    getOneProduct: function (data, callback) {
            data.pagenumber = parseInt(data.pagenumber);
        data.pagesize = parseInt(data.pagesize);
        var checkfor = new RegExp(data.search, "i");
        var newreturns = {};
        newreturns.data = [];
        async.parallel([
            function (callback1) {
                ProductTime.count({
                    product: data._id
                }).exec(function (err, number) {
                    if (err) {
                        console.log(err);
                        callback1(err, null);
                    } else if (number) {
                        newreturns.totalpages = Math.ceil(number / data.pagesize);
                        callback1(null, newreturns);
                    } else {
                        newreturns.totalpages = 0;
                        callback1(null, newreturns);
                    }
                });
            },
            function (callback1) {
                ProductTime.find({
                    product: data._id
                }, {}).sort({
                    _id: -1
                }).populate("product", "name").skip((data.pagenumber - 1) * data.pagesize).limit(data.pagesize).lean().exec(function (err, data2) {
                    if (err) {
                        console.log(err);
                        callback1(err, null);
                    } else {
                        if (data2 && data2.length > 0) {
                            newreturns.data = data2;
                            newreturns.pagenumber = data.pagenumber;
                            callback1(null, newreturns);
                        } else {
                            callback1({
                                message: "No data found"
                            }, null);
                        }
                    }
                });
            }
        ], function (err, respo) {
            if (err) {
                console.log(err);
                callback(err, null);
            } else {
                callback(null, newreturns);
            }
        });
    }
};

module.exports = _.assign(module.exports, models);