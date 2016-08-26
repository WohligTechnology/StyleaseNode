var request = require('request');
var lodash = require('lodash');
module.exports = {

    save: function(req, res) {
        if (req.body) {
            if (req.session.user) {
                var sendcart = {};
                sendcart.fromsession = true;
                sendcart.user = req.session.user._id;
                sendcart.cartproduct = req.body;
                Cart.saveData(sendcart, res.callback);
            } else {
                // console.log("Not logged");
                if (req.session.cart && req.session.cart.length > 0) {
                    var abc = _.findIndex(req.session.cart, function(o) {
                        return o.product == req.body.product;
                    });
                    if (abc === -1) {
                        req.session.cart.push(req.body);
                    } else {
                        // console.log("already in cart");
                        res.json({
                            value: false,
                            data: req.session.cart,
                            message: "already in cart"
                        });
                    }
                } else {
                    req.session.cart = [];
                    req.session.cart.push(req.body);
                }
                // console.log(req.session.cart);
                res.json({
                    value: true,
                    data: req.session.cart,
                    message: "Offline cart"
                });
            }
        } else {
            res.json({
                value: false,
                data: "Invalid Request"
            });
        }
    },

    getOne: function(req, res) {

        if (req.body) {
            Cart.getOne(req.body, res.callback);
        } else {
            res.json({
                value: false,
                data: "Invalid Request"
            });
        }
    },

    delete: function(req, res) {
        if (req.body) {
            console.log(req.body);
            Cart.deleteData(req.body, res.callback);
        } else {
            res.json({
                value: false,
                data: "Invalid Request"
            });
        }
    },

    removeCart: function(req, res) {
        if (req.body) {
            if (req.session.user) {
                // Remove product from online cart
                if (req.body.product) {
                    req.body.user = req.session.user._id;
                    Cart.removeCart(req.body, res.callback);
                } else {
                    res.json({
                        value: false,
                        data: "Please Enter Product ID to Remove"
                    });
                }
            } else {
                // Remove product from offline cart
                console.log('before', req.session.cart);
                var id = req.body.product;
                if (req.session.cart.length > 0) {
                    _.remove(req.session.cart, function(n) {
                        return n.product === id;
                    });
                    res.json({
                        value: true,
                        message: "Product Removed",
                        data: req.session.cart
                    });
                } else {
                    res.json({
                        value: false,
                        data: "Cart is Empty"
                    });
                }
            }
        } else {
            res.json({
                value: false,
                data: "Invalid Request"
            });
        }
    },

    getAll: function(req, res) {
        function callback(err, data) {
            Global.response(err, data, res);
        }
        if (req.query) {
            Cart.getAll(req.query, res.callback);
        } else {
            res.json({
                value: false,
                data: "Invalid Request"
            });
        }
    },
    getLimited: function(req, res) {
        function callback(err, data) {
            Global.response(err, data, res);
        }
        if (req.body) {
            if (req.body.pagesize && req.body.pagenumber) {
                Cart.getLimited(req.body, res.callback);
            } else {
                res.json({
                    value: false,
                    data: "Invalid Params"
                });
            }
        } else {
            res.json({
                value: false,
                data: "Invalid Request"
            });
        }
    },
    getCart: function(req, res) {
        function callback(err, data) {
            Global.response(err, data, res);
        }
        if (req.body) {
            if (req.session.user) {
                req.body.user= req.session.user._id;
                if (req.body.pagesize && req.body.pagenumber) {
                    Cart.getCart(req.body, res.callback);
                } else {
                    res.json({
                        value: false,
                        data: "Invalid Params"
                    });
                }
            } else {
                console.log("not logged in");
                res.json({
                    value: true,
                    data: req.session.cart,
                    message: "Offline cart"
                });
            }
        } else {
            res.json({
                value: false,
                data: "Invalid Request"
            });
        }
    },




};
