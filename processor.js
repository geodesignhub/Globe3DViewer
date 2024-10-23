// processor.js
// var redisclient = require('redis').createClient(process.env.REDIS_URL || {
//     host: '127.0.0.1',
//     port: 6379
// });
const redisclient = require('./redis-client');

// redisclient.on('ready', function() {
//     console.log("Redis is ready");
// });

// redisclient.on('error', function() {
//     console.log("Error in Redis");
// });
var tools = require('./3Dprocessor/tools');
module.exports = async function (job) {
    // Do some heavy work
    const synthesisid = job.data.synthesisid;
    // var existingroads = job.data.rfc;

    var constraintedDesigns = job.data.gj;

    const systems = job.data.sys;


    // if (existingroads.features.length > 0) {
    //     existingroads = tools.bufferExistingRoads(existingroads);
    // }

    var curFeats = constraintedDesigns.features;
    var flen = curFeats.length;
    var fullproc = flen;
    var counter = 0;
    var finalGJFeats = [];


    for (var h = 0; h < flen; h++) {
        var cur3DGeom = [];
        // for every feature , create a point grid.
        var curFeat = curFeats[h];
        try {
        cur3DGeom = tools.generateFinal3DGeoms(curFeat, 0);
        } catch (error){
            
        }
        if (cur3DGeom) {
            finalGJFeats.push.apply(finalGJFeats, cur3DGeom);
        }
        counter += 1;
        job.progress({
            'percent': parseInt((100 * counter) / fullproc),
            'synthesisid': synthesisid
        });

    }

    var final3DGeoms = {
        "type": "FeatureCollection",
        "features": finalGJFeats
    };
    // const final3DGeoms = tools.generateFinal3DGeoms(constraintedDesigns, 1, existingroads);


    // job.progress(50);

    var center = tools.generateCenter(constraintedDesigns);

    // console.log(center, unitCounts);
    // job.progress(100);
    console.log('Computation Complete..');
    redisclient.set(synthesisid, JSON.stringify({
        "finalGeoms": final3DGeoms,
        "center": center
    }));

    return Promise.resolve(synthesisid);
}