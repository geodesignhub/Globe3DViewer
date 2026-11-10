// processor.js

const redisclient = require('./redis-client');

let tools = require('./3Dprocessor/tools');
module.exports = async function (job) {
    // Do some heavy work
    const synthesisid = job.data.synthesisid;
    // let existingroads = job.data.rfc;
    let constraintedDesigns = job.data.gj;
    const systems = job.data.sys;
    // if (existingroads.features.length > 0) {
    //     existingroads = tools.bufferExistingRoads(existingroads);
    // }

    let curFeats = constraintedDesigns.features;
    let flen = curFeats.length;
    let fullproc = flen;
    let counter = 0;
    let finalGJFeats = [];


    for (let h = 0; h < flen; h++) {
        let cur3DGeom = [];
        // for every feature , create a point grid.
        let curFeat = curFeats[h];
        try {
            cur3DGeom = tools.generateFinal3DGeoms(curFeat, 0);
        } catch (error) {

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

    let final3DGeoms = {
        "type": "FeatureCollection",
        "features": finalGJFeats
    };
    // const final3DGeoms = tools.generateFinal3DGeoms(constraintedDesigns, 1, existingroads);


    // job.progress(50);

    let center = tools.generateCenter(constraintedDesigns);

    // console.log(center, unitCounts);
    // job.progress(100);
    console.log('Computation Complete..');
    redisclient.set(synthesisid, JSON.stringify({
        "finalGeoms": final3DGeoms,
        "center": center
    }));
    return Promise.resolve(synthesisid);
}