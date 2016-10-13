/**
 * Plan.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

var mongoose = require('mongoose');
var Grid = require('gridfs-stream');
var fs = require("fs");
var lwip = require("lwip");
var process = require('child_process');
var lodash = require('lodash');
var moment = require('moment');
var MaxImageSize = 1200;
var request = require("request");
var requrl = "http://localhost:81/";
// var requrl = "http://130.211.245.224/:81/";
var gfs = Grid(mongoose.connections[0].db, mongoose);
gfs.mongo = mongoose.mongo;

module.exports = {
    GlobalCallback: function (err, data, res) {
        if (err) {
            res.json({
                error: err,
                value: false
            });
        } else {
            res.json({
                data: data,
                value: true
            });
        }
    },
    uploadFile: function (filename, callback) {

        var id = mongoose.Types.ObjectId();
        var extension = filename.split(".").pop();
        extension = extension.toLowerCase();
        if (extension == "jpeg") {
            extension = "jpg";
        }
        var newFilename = id + "." + extension;

        var writestream = gfs.createWriteStream({
            filename: newFilename
        });
        var imageStream = fs.createReadStream(filename);

        function writer2(metaValue) {
            var writestream2 = gfs.createWriteStream({
                filename: newFilename,
                metadata: metaValue
            });
            writestream2.on('finish', function () {
                callback(null, {
                    name: newFilename
                });
                fs.unlink(filename);
            });
            fs.createReadStream(filename).pipe(writestream2);
        }

        if (extension == "png" || extension == "jpg" || extension == "gif") {
            lwip.open(filename, extension, function (err, image) {
                var upImage = {
                    width: image.width(),
                    height: image.height(),
                    ratio: image.width() / image.height()
                };

                if (upImage.width > upImage.height) {
                    if (upImage.width > MaxImageSize) {
                        image.resize(MaxImageSize, MaxImageSize / (upImage.width / upImage.height), function (err, image2) {
                            upImage = {
                                width: image2.width(),
                                height: image2.height(),
                                ratio: image2.width() / image2.height()
                            };
                            image2.writeFile(filename, function (err) {
                                writer2(upImage);
                            });
                        });
                    } else {
                        writer2(upImage);
                    }
                } else {
                    if (upImage.height > MaxImageSize) {
                        image.resize((upImage.width / upImage.height) * MaxImageSize, MaxImageSize, function (err, image2) {
                            upImage = {
                                width: image2.width(),
                                height: image2.height(),
                                ratio: image2.width() / image2.height()
                            };
                            image2.writeFile(filename, function (err) {
                                writer2(upImage);
                            });
                        });
                    } else {
                        writer2(upImage);
                    }
                }
            });
        } else {
            imageStream.pipe(writestream);
        }

        writestream.on('finish', function () {
            callback(null, {
                name: newFilename
            });
            fs.unlink(filename);
        });
    },
    email: function (data, callback) {
        Password.find().exec(function (err, userdata) {
            if (err) {
                console.log(err);
                callback(err, null);
            } else if (userdata && userdata.length > 0) {
                if (data.filename && data.filename !== "") {
                    request.post({
                        url: requrl + "config/emailReader/",
                        json: data
                    }, function (err, http, body) {
                        if (err) {
                            console.log(err);
                            callback(err, null);
                        } else {
                            if (body && body.value !== false) {
                                var sendgrid = require("sendgrid")(userdata[0].name);
                                sendgrid.send({
                                    to: data.email,
                                    from: "orders@thestylease.com",
                                    subject: data.subject,
                                    fromname: 'TheStylease.com',
                                    html: body
                                }, function (err, json) {
                                    if (err) {
                                        callback(err, null);
                                    } else {
                                        callback(null, json);
                                    }
                                });
                            } else {
                                callback({
                                    message: "Some error in html"
                                }, null);
                            }
                        }
                    });
                } else {
                    callback({
                        message: "Please provide params"
                    }, null);
                }
            } else {
                callback({
                    message: "No api keys found"
                }, null);
            }
        });
    },
    readUploaded: function (filename, width, height, style, res) {
        var readstream = gfs.createReadStream({
            filename: filename
        });
        readstream.on('error', function (err) {
            res.json({
                value: false,
                error: err
            });
        });

        function writer2(filename, gridFSFilename, metaValue) {
            var writestream2 = gfs.createWriteStream({
                filename: gridFSFilename,
                metadata: metaValue
            });
            writestream2.on('finish', function () {
                fs.unlink(filename);
            });
            fs.createReadStream(filename).pipe(res);
            fs.createReadStream(filename).pipe(writestream2);
        }

        function read2(filename2) {
            var readstream2 = gfs.createReadStream({
                filename: filename2
            });
            readstream2.on('error', function (err) {
                res.json({
                    value: false,
                    error: err
                });
            });
            readstream2.pipe(res);
        }
        var onlyName = filename.split(".")[0];
        var extension = filename.split(".").pop();
        if ((extension == "jpg" || extension == "png" || extension == "gif") && ((width && width > 0) || (height && height > 0))) {
            //attempt to get same size image and serve
            var newName = onlyName;
            if (width > 0) {
                newName += "-" + width;
            } else {
                newName += "-" + 0;
            }
            if (height) {
                newName += "-" + height;
            } else {
                newName += "-" + 0;
            }
            if (style && (style == "fill" || style == "cover")) {
                newName += "-" + style;
            } else {
                newName += "-" + 0;
            }
            var newNameExtire = newName + "." + extension;
            gfs.exist({
                filename: newNameExtire
            }, function (err, found) {
                if (err) {
                    res.json({
                        value: false,
                        error: err
                    });
                }
                if (found) {
                    read2(newNameExtire);
                } else {
                    var imageStream = fs.createWriteStream('./.tmp/uploads/' + filename);
                    readstream.pipe(imageStream);
                    imageStream.on("finish", function () {
                        lwip.open('./.tmp/uploads/' + filename, function (err, image) {
                            ImageWidth = image.width();
                            ImageHeight = image.height();
                            var newWidth = 0;
                            var newHeight = 0;
                            var pRatio = width / height;
                            var iRatio = ImageWidth / ImageHeight;
                            if (width && height) {
                                newWidth = width;
                                newHeight = height;
                                switch (style) {
                                    case "fill":
                                        if (pRatio > iRatio) {
                                            newHeight = height;
                                            newWidth = height * (ImageWidth / ImageHeight);
                                        } else {
                                            newWidth = width;
                                            newHeight = width / (ImageWidth / ImageHeight);
                                        }
                                        break;
                                    case "cover":
                                        if (pRatio < iRatio) {
                                            newHeight = height;
                                            newWidth = height * (ImageWidth / ImageHeight);
                                        } else {
                                            newWidth = width;
                                            newHeight = width / (ImageWidth / ImageHeight);
                                        }
                                        break;
                                }
                            } else if (width) {
                                newWidth = width;
                                newHeight = width / (ImageWidth / ImageHeight);
                            } else if (height) {
                                newWidth = height * (ImageWidth / ImageHeight);
                                newHeight = height;
                            }
                            image.resize(parseInt(newWidth), parseInt(newHeight), function (err, image2) {
                                image2.writeFile('./.tmp/uploads/' + filename, function (err) {
                                    writer2('./.tmp/uploads/' + filename, newNameExtire, {
                                        width: newWidth,
                                        height: newHeight
                                    });
                                });
                            });
                        });
                    });
                }
            });
            //else create a resized image and serve
        } else {
            readstream.pipe(res);
        }
        //error handling, e.g. file does not exist
    },
    sendSMS: function (data, callback) {
        if (data.mobile) {
            request.get({
                url: "http://api-alerts.solutionsinfini.com/v3/?method=sms&api_key=Ab239cf5d62a8e6d2c531663f289d0f5d&to=" + data.mobile + "&sender=Stylse&message=" + data.content + "&format=json"
            }, function (err, http, body) {
                if (err) {
                    console.log(err);
                    callback(err, null);
                } else {
                    console.log(body);
                    callback(null, {
                        message: "SMS Sent"
                    });
                }
            });
        } else {
            callback({
                message: "Mobile number not found"
            }, null);
        }
    },
};