(async function () {
    'use strict';
    /*jshint node:true*/
    require("dotenv").config();
    const redisclient = require('./redis-client');

    let express = require('express');
    let bodyParser = require('body-parser');
    let compression = require('compression');

    const socket = require("socket.io");
    let Queue = require('bull');
    let url = require('url');
    // Set the Redis server instance either local or the Heroku one since this is deployed mostly on Heroku.
    const redis_queue_url = process.env.REDIS_URL || "redis://localhost:6379/0";

    let ThreeDQueue = new Queue('3D-proc', redis_queue_url);
    // Once a job is completed, then send a message via a socket. 
    ThreeDQueue.on('global:completed', function (job, synthesisid) {
        // A job successfully completed with a `result`.
        sendStdMsg(synthesisid, synthesisid);
    }).on('progress', function (job, progress_data) {
        console.log(progress_data.percent, progress_data.synthesisid);
        sendProgressMsg(progress_data.percent);
        // Job progress updated!
    });

    // Report Progress  suing
    // ThreeDQueue.on('completed', function(job, synthesisid) {
    //     // A job successfully completed with a `result`.

    //     sendStdMsg(synthesisid, synthesisid);
    // });

    let req = require('request');
    let async = require('async');
    let tools = require('./3Dprocessor/tools');
    let yargs = require('yargs').options({
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
    let argv = yargs.argv;

    if (argv.help) {
        return yargs.showHelp();
    }

    // eventually this mime type configuration will need to change
    // https://github.com/visionmedia/send/commit/d2cb54658ce65948b0ed6e5fb5de69d022bef941
    // *NOTE* Any changes you make here must be mirrored in web.config.
    let mime = express.static.mime;
    mime.define({
        'application/json': ['czml', 'json', 'geojson', 'topojson'],
        'model/vnd.gltf+json': ['gltf'],
        'model/vnd.gltf.binary': ['bgltf', 'glb'],
        'text/plain': ['glsl']
    });

    let app = express();
    app.use(compression());

    let ejs = require('ejs');
    app.set('view engine', 'ejs');

    app.use(express.static(__dirname + '/views'));
    app.use('/assets', express.static('static'));
    app.use(bodyParser.urlencoded({
        extended: false
    }));
    app.use(bodyParser.json());

    let dontProxyHeaderRegex = /^(?:Host|Proxy-Connection|Connection|Keep-Alive|Transfer-Encoding|TE|Trailer|Proxy-Authorization|Proxy-Authenticate|Upgrade)$/i;

    function filterHeaders(req, headers) {
        let result = {};
        // filter out headers that are listed in the regex above
        Object.keys(headers).forEach(function (name) {
            if (!dontProxyHeaderRegex.test(name)) {
                result[name] = headers[name];
            }
        });
        return result;
    }


    let bypassUpstreamProxyHosts = {};
    if (argv['bypass-upstream-proxy-hosts']) {
        argv['bypass-upstream-proxy-hosts'].split(',').forEach(function (host) {
            bypassUpstreamProxyHosts[host.toLowerCase()] = true;
        });
    }

    ThreeDQueue.process(5, __dirname + '/processor.js');



    app.post('/getthreeddata', async function (request, response) {
        try {
            const { synthesisid } = request.body;

            if (!synthesisid) {
                return response.status(400).json({ status: 0, message: "Missing synthesisid in request body." });
            }

            const storedSynthesisDetails = await redisclient.get(synthesisid);

            if (storedSynthesisDetails) {
                const parsedDetails = JSON.parse(storedSynthesisDetails);
                return response.json({
                    status: 1,
                    final3DGeoms: parsedDetails.finalGeoms,
                    center: parsedDetails.center,
                });
            }

            response.json({
                status: 0,
                final3DGeoms: "",
                center: "",
            });
        } catch (error) {
            console.error('Error in /getthreeddata:', error);
            response.status(500).json({ status: 0, message: "Internal server error." });
        }
    });
    app.get('/', async function (request, response) {
        try {
            const { apitoken, projectid, synthesisid, cteamid } = request.query;

            if (!apitoken || !projectid || !synthesisid || !cteamid) {
                return response.status(400).send('Please pass all the valid parameters.');
            }

            const options = {
                apitoken,
                projectid,
                synthesisid,
                cteamid,
                final3DGeoms: JSON.stringify({ type: "FeatureCollection", features: [] }),
                center: "0",
                bing_key: process.env.BING_KEY || 'bing-key'
            };

            const baseurl = process.env.PORT
                ? 'https://www.geodesignhub.com/api/v1/projects/'
                : 'http://local.test:8000/api/v1/projects/';

            const cred = `Token ${apitoken}`;
            const synprojectsurl = `${baseurl}${projectid}/cteams/${cteamid}/${synthesisid}/`;
            const systemsurl = `${baseurl}${projectid}/systems/`;
            const boundsurl = `${baseurl}${projectid}/bounds/`;
            const URLS = [synprojectsurl, boundsurl, systemsurl];

            async.map(
                URLS,
                (url, done) => {
                    req(
                        {
                            url,
                            headers: {
                                Authorization: cred,
                                "Content-Type": "application/json"
                            }
                        },
                        (err, res, body) => {
                            if (err || res.statusCode !== 200) {
                                return done(err || new Error());
                            }
                            return done(null, JSON.parse(body));
                        }
                    );
                },
                async (err, results) => {
                    if (err) {
                        console.error('Error fetching data:', err);
                        return response.sendStatus(500);
                    }

                    const [synthesisData, bounds, systems] = results;
                    options.result = JSON.stringify(synthesisData);
                    options.systems = JSON.stringify(systems);
                    options.roads = JSON.stringify({ type: "FeatureCollection", features: [] });

                    const storedSynthesisDetails = await redisclient.get(synthesisid);

                    if (storedSynthesisDetails) {
                        const parsedDetails = JSON.parse(storedSynthesisDetails);
                        options.final3DGeoms = JSON.stringify(parsedDetails.finalGeoms);
                        options.center = parsedDetails.center;
                    } else {
                        console.log('Adding synthesis data to queue...');
                        ThreeDQueue.add({
                            gj: synthesisData,
                            sys: systems,
                            synthesisid
                        });
                    }

                    response.render('index', options);
                }
            );
        } catch (error) {
            console.error('Unexpected error:', error);
            response.sendStatus(500);
        }
    });


    let server = app.listen(process.env.PORT || 3000); // for Heroku

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
    let isFirstSig = true;
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