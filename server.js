(async function () {
    'use strict';
    /*jshint node:true*/
    const redisclient = require('./redis-client');


    var express = require('express');
    const socket = require("socket.io");
    var bodyParser = require('body-parser');
    var compression = require('compression');
    var Queue = require('bull');
    // Set the Redis server instance either local or the Heroku one since this is deployed mostly on Heroku.
    var ThreeDQueue = new Queue('3D-proc', { redis: redisclient.redisConfig });
    require("dotenv").config();
    // Once a job is completed, then send a message via a socket. 
    ThreeDQueue.on('completed', function (job, synthesisid) {
        // A job successfully completed with a `result`.
        sendStdMsg(synthesisid, synthesisid);
    }).on('progress', function (job, progressdata) {
        console.log(progressdata.percent, progressdata.synthesisid);
        sendProgressMsg(progressdata.synthesisid, progressdata.percent);
        // Job progress updated!
    });

    // Report Progress  suing
    // ThreeDQueue.on('completed', function(job, synthesisid) {
    //     // A job successfully completed with a `result`.

    //     sendStdMsg(synthesisid, synthesisid);
    // });

    var url = require('url');
    var req = require('request');
    var async = require('async');
    var tools = require('./3Dprocessor/tools');
    var yargs = require('yargs').options({
        'port': {
            'default': 5000,
            'description': 'Port to listen on.'
        },
        'public': {
            'type': 'boolean',
            'description': 'Run a public server that listens on all interfaces.'
        },
        'upstream-proxy': {
            'description': 'A standard proxy server that will be used to retrieve data.  Specify a URL including port, e.g. "http://proxy:8000".'
        },
        'bypass-upstream-proxy-hosts': {
            'description': 'A comma separated list of hosts that will bypass the specified upstream_proxy, e.g. "lanhost1,lanhost2"'
        },
        'help': {
            'alias': 'h',
            'type': 'boolean',
            'description': 'Show this help.'
        }
    });
    var argv = yargs.argv;

    if (argv.help) {
        return yargs.showHelp();
    }

    // eventually this mime type configuration will need to change
    // https://github.com/visionmedia/send/commit/d2cb54658ce65948b0ed6e5fb5de69d022bef941
    // *NOTE* Any changes you make here must be mirrored in web.config.
    var mime = express.static.mime;
    mime.define({
        'application/json': ['czml', 'json', 'geojson', 'topojson'],
        'model/vnd.gltf+json': ['gltf'],
        'model/vnd.gltf.binary': ['bgltf', 'glb'],
        'text/plain': ['glsl']
    });

    var app = express();
    app.use(compression());

    var ejs = require('ejs');
    app.set('view engine', 'ejs');

    app.use(express.static(__dirname + '/views'));
    app.use('/assets', express.static('static'));
    app.use(bodyParser.urlencoded({
        extended: false
    }));
    app.use(bodyParser.json());

    function getRemoteUrlFromParam(req) {
        var remoteUrl = req.params[0];
        if (remoteUrl) {
            // add http:// to the URL if no protocol is present
            if (!/^https?:\/\//.test(remoteUrl)) {
                remoteUrl = 'http://' + remoteUrl;
            }
            remoteUrl = url.parse(remoteUrl);
            // copy query string
            remoteUrl.search = url.parse(req.url).search;
        }
        return remoteUrl;
    }

    var dontProxyHeaderRegex = /^(?:Host|Proxy-Connection|Connection|Keep-Alive|Transfer-Encoding|TE|Trailer|Proxy-Authorization|Proxy-Authenticate|Upgrade)$/i;

    function filterHeaders(req, headers) {
        var result = {};
        // filter out headers that are listed in the regex above
        Object.keys(headers).forEach(function (name) {
            if (!dontProxyHeaderRegex.test(name)) {
                result[name] = headers[name];
            }
        });
        return result;
    }

    var upstreamProxy = argv['upstream-proxy'];
    var bypassUpstreamProxyHosts = {};
    if (argv['bypass-upstream-proxy-hosts']) {
        argv['bypass-upstream-proxy-hosts'].split(',').forEach(function (host) {
            bypassUpstreamProxyHosts[host.toLowerCase()] = true;
        });
    }

    ThreeDQueue.process(5, __dirname + '/processor.js')
    app.post('/getthreeddata', function (request, response) {

        var synthesisid = request.body.synthesisid;

        async.map([synthesisid], function (sid, done) {

            redisclient.get(sid, function (err, results) {
                if (err || results == null) {
                    return done(null, JSON.stringify({
                        "finalGeoms": "",
                        "center": ""
                    }));
                } else {
                    return done(null, results);
                }
            });
        },
            function (error, op) {
                //only OK once set
                op = JSON.parse(op);
                response.contentType('application/json');
                response.send({
                    "status": 1,
                    "final3DGeoms": op.finalGeoms,
                    "center": op.center,
                });
            });
    });
    app.get('/', function (request, response) {
        var opts = {};
        if (request.query.apitoken && request.query.projectid && request.query.synthesisid && request.query.cteamid) {
            // synthesis ID is given
            opts = {
                'apitoken': request.query.apitoken,
                'projectid': request.query.projectid,
                'synthesisid': request.query.synthesisid,
                'cteamid': request.query.cteamid,
                "final3DGeoms": JSON.stringify({ "type": "FeatureCollection", "features": [] }),
                "center": "0",
                "bing_key": process.env.BING_KEY || 'bing-key'
            };

            var baseurl = (process.env.PORT) ? 'https://www.geodesignhub.com/api/v1/projects/' : 'http://local.test:8000/api/v1/projects/';

            var apikey = request.query.apitoken;
            var cred = "Token " + apikey;
            var projectid = request.query.projectid;
            var cteamid = request.query.cteamid;
            var synthesisid = request.query.synthesisid;
            var synprojectsurl = baseurl + projectid + '/cteams/' + cteamid + '/' + synthesisid + '/';
            var systemsurl = baseurl + projectid + '/systems/';
            var boundsurl = baseurl + projectid + '/bounds/';
            var URLS = [synprojectsurl, boundsurl, systemsurl];
            async.map(URLS, function (url, done) {
                req({
                    url: url,
                    headers: {
                        "Authorization": cred,
                        "Content-Type": "application/json"
                    }
                }, function (err, response, body) {
                    if (err || response.statusCode !== 200) {
                        return done(err || new Error());
                    }
                    return done(null, JSON.parse(body));
                });
            }, function (err, results) {

                if (err) return response.sendStatus(500);
                var gj = JSON.stringify(results[0]);
                var bounds = results[1];
                var sys = results[2];
                opts['result'] = gj;
                opts['systems'] = JSON.stringify(sys);
                var rfc = {
                    "type": "FeatureCollection",
                    "features": []
                };
                opts['roads'] = JSON.stringify(rfc);
                async.map([synthesisid], async function (sid, done) {

                    let stored_synthesis_details = await redisclient.get(sid);

                    if (stored_synthesis_details) {
                        let r_op = JSON.parse(stored_synthesis_details);

                        opts['final3DGeoms'] = JSON.stringify(r_op.finalGeoms);
                        opts['center'] = r_op.center;

                    }

                    else {
                        console.log('sending to q...');
                        ThreeDQueue.add({
                            "gj": results[0],
                            // "rfc": rfc,
                            "sys": sys,
                            "synthesisid": synthesisid
                        });
                    }
                    response.render('index', opts);

                    //     await redisclient.get(sid, function (err, results) {
                    //         if (err || results == null) {
                    //             return done(null, JSON.stringify({
                    //                 "finalGeoms": "",
                    //                 "center": "0"
                    //             }));
                    //         } else {
                    //             console.log('getting');
                    //             return done(null, results);
                    //         }
                    //     });
                    // },
                    // function (redis_error, redis_op) {
                    //     //only OK once set

                    //     if (redis_error) return response.sendStatus(500);

                    // });

                    // opts['final3DGeoms'] = JSON.stringify(final3DGeoms);

                    // opts['center'] = JSON.stringify(center);


                });

            });

        } else {
            response.status(400);
            response.send('Please pass all the valid parameters.');
        }

    });


    var server = app.listen(process.env.PORT || 5001); // for Heroku

    const io = socket(server);

    io.on('connection', function (socket) {
        socket.on('room', function (room) {
            socket.join(room);
            sendWelcomeMsg(room);
        });
        socket.on('message', function (msg) {
            var room = msg.room;
            var data = msg.data;
            sendStdMsg(room, data);
        });
    });

    function sendWelcomeMsg(room) {
        io.sockets.in(room).emit('welcome', 'Joined ' + room);
    }

    function sendStdMsg(room, synthesisid) {
        io.sockets.in(room).emit('message', {
            'type': 'message',
            'synthesisid': synthesisid
        });
    }

    function sendProgressMsg(room, percentcomplete) {

        io.sockets.in(room).emit('message', {
            'type': 'progress',
            'percentcomplete': percentcomplete
        });
    }


    server.on('error', function (e) {
        if (e.code === 'EADDRINUSE') {
            console.log('Error: Port %d is already in use, select a different port.', argv.port);
            console.log('Example: node server.js --port %d', argv.port + 1);
        } else if (e.code === 'EACCES') {
            console.log('Error: This process does not have permission to listen on port %d.', argv.port);
            if (argv.port < 1024) {
                console.log('Try a port number higher than 1024.');
            }
        }
        console.log(e);
        process.exit(1);
    });

    server.on('close', function () {
        console.log('Cesium development server stopped.');
    });
    var isFirstSig = true;
    process.on('SIGINT', function () {
        if (isFirstSig) {
            console.log('Cesium development server shutting down.');
            server.close(function () {
                process.exit(0);
            });
            isFirstSig = false;
        } else {
            console.log('Cesium development server force kill.');
            process.exit(1);
        }
    });
})();