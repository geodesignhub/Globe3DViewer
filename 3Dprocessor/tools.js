let turf = require('@turf/turf');

let COMBuilding = function () {
    // this.name = name;
    const gridsize = 0.03;
    const elevationoffset = 1;
    const footprintsize = 0.015;
    const comHeights = [14, 25, 30, 22, 28];
    const units = {
        units: 'kilometers'
    };
    const bufferWidth = gridsize - 0.01; //30 meter buffer
    const nearestSearch = [0, 1, 2];
    const floorHeight = 5;
    const avgUnitsize = 50;

    let featProps;
    let featExtent;
    this.genGrid = function (curFeat) {
        featProps = curFeat.properties;
        featExtent = turf.bbox(curFeat);
        let diagJSON = {
            "type": "FeatureCollection",
            "features": [curFeat]
        };
        let grid = turf.pointGrid(featExtent, gridsize, units);
        let ptsWithin = turf.within(grid, diagJSON);
        return [ptsWithin, featExtent];
    };


    this.generateBuildingFootprints = function (ptsWithin) {
        let allGeneratedFeats = [];
        let color = featProps.color;
        let systag = featProps.systag;
        let sysname = featProps.sysname;
        let ptslen = ptsWithin.features.length;
        let alreadyAdded = {
            "type": "FeatureCollection",
            "features": []
        };
        // create a unique ID for each feature.
        let availablePts = {};
        ptslen = ptsWithin.features.length;
        for (let k = 0; k < ptslen; k++) {
            let id = makeid();

            ptsWithin.features[k].properties.id = id;
            availablePts[id] = ptsWithin.features[k];
        }

        ptslen = (ptslen > 7500) ? 7500 : ptslen;
        // console.log(ptslen);
        // every point is avaiable 
        for (let k1 = 0; k1 < ptslen; k1++) {
            // console.log(k1);
            let ifeat;
            let curalreadyadded;
            let alreadyaddedlen;
            // how many nearest to find? 
            let nearest = nearestSearch[Math.floor(Math.random() * nearestSearch.length)];
            // initialize all poitns
            let allPts = [];
            // get current POint. 
            let curPt = ptsWithin.features[k1];
            delete availablePts[curPt.properties.id];
            allPts.push(curPt.geometry.coordinates);
            if (nearest) {
                for (let k6 = 0; k6 < nearest; k6++) {
                    // already added
                    let availPts = {
                        "type": "FeatureCollection",
                        "features": []
                    };
                    for (key in availablePts) {
                        let cpt = availablePts[key];
                        availPts.features.push(cpt);
                    }
                    let nearestpt = false;
                    if (availPts.features.length > 0) {
                        nearestpt = turf.nearestPoint(curPt, availPts);
                    } 
                   
                    if (nearestpt) {
                        delete availablePts[nearestpt.properties.id];
                        allPts.push(nearestpt.geometry.coordinates);
                    }
                }
                if (allPts.length > 1) {
                    let ls = turf.lineString(allPts);
                    let buf = turf.buffer(ls, 0.0075, {
                        units: 'kilometers'
                    });
                    // console.log(JSON.stringify(bldg));
                    let bb = turf.bbox(buf);
                    let bldg = turf.bboxPolygon(bb);
                    let area = turf.area(bldg);
                    let hasIntersect = false;
                    let alreadyaddedlen = alreadyAdded.features.length;
                    for (let x1 = 0; x1 < alreadyaddedlen; x1++) {
                        curalreadyadded = alreadyAdded.features[x1];
                        try {
                            ifeat = turf.intersect(curalreadyadded, bldg);
                        } catch (err) {
                            // console.log(JSON.stringify(err));
                        }
                        if (ifeat) {
                            hasIntersect = true;
                            break;
                        }
                    }
                    if (hasIntersect === false) {
                        let height = elevationoffset + comHeights[Math.floor(Math.random() * comHeights.length)];
                        let numFloors = Math.round(height / floorHeight); // 5 meter per floor
                        let numUnitsperFloor = Math.round(area / avgUnitsize);
                        let totalUnits = numUnitsperFloor * numFloors;
                        let p = {
                            'totalunits': totalUnits,
                            'height': height,
                            'color': "#d0d0d0",
                            'roofColor': color,
                            'isStreet': 0,
                            'isBuilding': 1,
                            'sysname': sysname,
                        };
                        bldg.properties = p;
                        alreadyAdded.features.push(bldg);
                        allGeneratedFeats.push(bldg);
                    }
                }
                // put the list in the seen one 
                // build a bbounds polygon
            } else {
                let buffered = turf.buffer(curPt, bufferWidth, units); // buffer 48 meters
                let bds = turf.bbox(buffered); // get the extent of the buffered features
                let bfrdextPlgn = turf.bboxPolygon(bds);
                let bldgfootprint = 0.015;
                let centrepoint = turf.centroid(bfrdextPlgn);
                let bldg = turf.buffer(centrepoint, bldgfootprint, units);
                let bdgply = turf.bbox(bldg); // get the extent of the buffered features
                let bpoly = turf.bboxPolygon(bdgply);
                let area = turf.area(bpoly);
                alreadyaddedlen = alreadyAdded.features.length;
                let hasIntersect = false;

                for (let x2 = 0; x2 < alreadyaddedlen; x2++) {
                    curalreadyadded = alreadyAdded.features[x2];
                    try {
                        ifeat = turf.intersect(curalreadyadded, bldg);
                    } catch (err) {
                        // console.log(JSON.stringify(err));
                    }
                    if (ifeat) {
                        hasIntersect = true;
                        break;
                    }
                }
                if (hasIntersect === false) {
                    let height = elevationoffset + comHeights[Math.floor(Math.random() * comHeights.length)];
                    let numFloors = Math.round(height / floorHeight); // 5 meter per floor
                    let numUnitsperFloor = Math.round(area / avgUnitsize);
                    let totalUnits = numUnitsperFloor * numFloors;
                    let chosenValue = Math.random() < 0.5 ? true : false;
                    chosenValue = true;
                    if (chosenValue) {
                        let p = {
                            'totalunits': totalUnits,
                            'height': height,
                            'color': "#d0d0d0",
                            'roofColor': color,
                            'isStreet': 0,
                            'isBuilding': 1,
                            'sysname': sysname
                        };
                        bpoly.properties = p;
                        alreadyAdded.features.push(bpoly);
                        allGeneratedFeats.push(bpoly);

                    }
                }
            }
        }
        return allGeneratedFeats;
    }
};

let LDHousing = function () {
    // this.name = name;
    const density = 30; // dwellings / hectare
    const buildingsperhectare = 20;
    const gridsize = 0.04;
    const footprintsize = 0.012;
    const ldhheights = [1, 2, 3]; // in meters 
    const units = {
        units: 'kilometers'
    };
    const elevationoffset = 1;

    const floorHeight = 5;
    const avgUnitsize = 100;

    let featProps;
    let featExtent;

    this.genGrid = function (curFeat) {
        featProps = curFeat.properties;
        featExtent = turf.bbox(curFeat);
        let diagJSON = {
            "type": "FeatureCollection",
            "features": [curFeat]
        };
        let grid = turf.pointGrid(featExtent, gridsize, units);
        let ptsWithin = turf.within(grid, diagJSON);
        return [ptsWithin, featExtent];
    };

    this.generateBuildingFootprints = function (ptsWithin) {

        let allGeneratedFeats = [];
        let color = featProps.color;
        let systag = featProps.systag;
        let sysname = featProps.sysname;
        let ptslen = ptsWithin.features.length;
        let bufferWidth = gridsize - 0.01; //30 meter buffer

        ptslen = (ptslen > 7500) ? 7500 : ptslen;
        // console.log(ptslen);
        // if it is HDH type feature
        for (let k = 0; k < ptslen; k++) {
            // console.log(k)
            let curPt = ptsWithin.features[k];
            let buffered = turf.buffer(curPt, bufferWidth, units); // buffer 48 meters
            let bds = turf.bbox(buffered); // get the extent of the buffered features
            let bfrdextPlgn = turf.bboxPolygon(bds);
            let bldgfootprint = 0.015;
            let centrepoint = turf.centroid(bfrdextPlgn);
            let bldg = turf.buffer(centrepoint, bldgfootprint, units);
            let bdgply = turf.bbox(bldg); // get the extent of the buffered features
            let bpoly = turf.bboxPolygon(bdgply);
            let area = turf.area(bpoly);
            let height = elevationoffset + ldhheights[Math.floor(Math.random() * ldhheights.length)];

            let numFloors = Math.round(height / floorHeight); // 5 meter per floor
            let numUnitsperFloor = Math.round(area / avgUnitsize);
            let totalUnits = numUnitsperFloor * numFloors;
            let p = {
                'totalunits': totalUnits,
                'height': height,
                'color': "#d0d0d0",
                'roofColor': color,
                'isStreet': 0,
                'isBuilding': 1,
                'sysname': sysname
            };
            bpoly.properties = p;
            allGeneratedFeats.push(bpoly);

        }
        return allGeneratedFeats;
    }
};

let HDHousing = function () {
    // this.name = name;
    const density = 80; // dwellings / hectare
    const buildingsperhectare = 2;
    const gridsize = 0.05; // changes the maximum area
    const footprintsize = 0.015;
    const heights = [36, 60, 90]; // in meters 
    const units = {
        units: 'kilometers'
    };
    const elevationoffset = 1;
    let featProps;
    const floorHeight = 5;
    const avgUnitsize = 50;


    this.generateSquareGridandConstrain = function (featureGeometry) {
        let featarea = turf.area(featureGeometry);
        let numberofextrusions = Math.round((featarea * 0.0001) * buildingsperhectare);
        featProps = featureGeometry.properties;
        let featExtent = turf.bbox(featureGeometry);
        let sqgrid = turf.squareGrid(featExtent, gridsize, units);
        // constrain grid.
        let constrainedgrid = {
            "type": "FeatureCollection",
            "features": []
        };
        let sqfeatslen = sqgrid.features.length;
        // number of extrusions is counted. 
        
        let ratio = (numberofextrusions / sqfeatslen);
        let extrudedfeaturescount = 0;
        if (ratio < 0.20 || numberofextrusions < 15) {
            for (let x = 0; x < sqfeatslen; x++) {
                if (extrudedfeaturescount < numberofextrusions) {
                    let cursqfeat = sqgrid.features[x];
                    try {
                        let ifeat = turf.intersect(cursqfeat, featureGeometry);
                    } catch (err) {
                        // console.log(JSON.stringify(err));
                    }
                    if (ifeat) {
                        constrainedgrid.features.push(ifeat);
                    } else {
                        constrainedgrid.features.push(cursqfeat);
                    }
                    extrudedfeaturescount += 1;
                }
            }
        } else {
            let gridStore = {};
            let gridid = 0;
            for (let x1 = 0; x1 < sqfeatslen; x1++) {
                let cursqgrid = sqgrid.features[x1];
                gridStore[gridid] = cursqgrid;
                gridid += 1;
            }

            while (extrudedfeaturescount < numberofextrusions + 1) {
                let randomgridid = Math.floor(Math.random() * (sqfeatslen - 0 + 1)) + 0;
                // get the id from gridStore
                let cursqfeat = gridStore[randomgridid];
                // have the feature
                try {
                    let ifeat = turf.intersect(cursqfeat, featureGeometry);
                } catch (err) {
                    // console.log(JSON.stringify(err));
                }

                if (ifeat) {
                    constrainedgrid.features.push(ifeat);
                } else {
                    constrainedgrid.features.push(cursqfeat);
                }
                extrudedfeaturescount += 1;
            }
        }
        return constrainedgrid;
    };

    this.generateBuildings = function (constrainedgrid) {
        let consgridlen = constrainedgrid.features.length;
        let generatedGeoJSON = {
            "type": "FeatureCollection",
            "features": []
        };
        // find centroid

        consgridlen = (consgridlen > 7500) ? 7500 : consgridlen;
        // console.log(consgridlen);
        let extrusionconter = 0;
        for (let k1 = 0; k1 < consgridlen; k1++) {
            // console.log(k1)
            let curconsfeat = constrainedgrid.features[k1];
            let curarea;
            try {
                curarea = turf.area(curconsfeat);
            } catch (err) {
                curarea = 0;
            }
            if (curarea > 2000) { //max area is 2500 gridsize squared
                let chosenValue = Math.random() > 0.6 ? true : false;
                if (chosenValue) {
                    let centroid = turf.centroid(curconsfeat);
                    let bufferedCentroid = turf.buffer(centroid, footprintsize, {
                        units: 'kilometers'
                    });
                    let bbox = turf.bbox(bufferedCentroid);
                    let bboxpoly = turf.bboxPolygon(bbox);
                    let height = elevationoffset + heights[Math.floor(Math.random() * heights.length)];
                    let area = turf.area(bboxpoly);
                    let numFloors = Math.round(height / floorHeight); // 5 meter per floor
                    let numUnitsperFloor = Math.round(area / avgUnitsize);
                    let totalUnits = numUnitsperFloor * numFloors;

                    let props = {
                        "totalunits": totalUnits,
                        "height": height,
                        "color": "#d0d0d0",
                        "roofColor": featProps.color,
                        "sysname": featProps.sysname,
                        "isStreet": 0,
                        'isBuilding': 1,
                    };
                    bboxpoly.properties = props;
                    generatedGeoJSON.features.push(bboxpoly);
                }
            }
        }
        return generatedGeoJSON;
    }
};

let MXDBuildings = function () {
    const density = 40; // dwellings per hectare.
    const outerringradius = 0.04;
    const middleringradius = 0.02;
    const innerringradius = 0.01;
    // this.name = name;
    const gridsize = 0.08;
    const elevationoffset = 1;
    const innergridsize = 0.02;

    const heights = [9, 12, 8, 11]; // in meters 
    const units = {
        units: 'kilometers'
    }

    const floorHeight = 5;
    const avgUnitsize = 75;

    let featProps;
    this.generateSquareGridandConstrain = function (featureGeometry) {
        featProps = featureGeometry.properties;
        let featExtent = turf.bbox(featureGeometry);
        let sqgrid = turf.squareGrid(featExtent, gridsize, units);

        // constrain grid.
        let constrainedgrid = {
            "type": "FeatureCollection",
            "features": []
        };
        let sqfeatslen = sqgrid.features.length;

        for (let x = 0; x < sqfeatslen; x++) {
            let cursqfeat = sqgrid.features[x];
            try {
                let ifeat = turf.intersect(cursqfeat, featureGeometry);
            } catch (err) {
                // console.log(JSON.stringify(err));
            }
            if (ifeat) {
                constrainedgrid.features.push(ifeat);
            } else {
                constrainedgrid.features.push(cursqfeat);
            }
        }

        return constrainedgrid;
    };

    this.generateBuildings = function (constrainedgrid) {
        let consgridlen = constrainedgrid.features.length;
        let generatedGeoJSON = {
            "type": "FeatureCollection",
            "features": []
        };
        consgridlen = (consgridlen > 7500) ? 7500 : consgridlen;
        // console.log(consgridlen);
        // find centroid
        for (let k1 = 0; k1 < consgridlen; k1++) {
            // console.log(k1);
            let curconsfeat = constrainedgrid.features[k1];
            let curarea;
            try {
                curarea = turf.area(curconsfeat);
            } catch (err) {
                curarea = 0;
            }
            let center = turf.centroid(curconsfeat);

            if (curarea > 6300) { //max area is 3600 need entire parcel. 
                let cv = Math.random() < 0.5 ? true : false;
                if (cv) {
                    let outerring = turf.buffer(center, outerringradius, units);
                    let innerring = turf.buffer(center, innerringradius, units);
                    let middlering = turf.buffer(center, middleringradius, units);
                    // get bbox
                    let outerringbbox = turf.bbox(outerring);
                    let innerringbbox = turf.bbox(innerring);
                    let middleringbbox = turf.bbox(middlering);
                    //get bbox polygon
                    let outerringpoly = turf.bboxPolygon(outerringbbox);
                    let innerringpoly = turf.bboxPolygon(innerringbbox);
                    let middleringpoly = turf.bboxPolygon(middleringbbox);

                    //erase inner from outerring to get hybrid hole
                    let hybridhole = turf.difference(outerringpoly, innerringpoly);

                    // erease middle from hybrid hole
                    let buildingpoly = turf.difference(hybridhole, middleringpoly);
                    let height = elevationoffset + heights[Math.floor(Math.random() * heights.length)];

                    let numFloors = Math.round(height / floorHeight); // 5 meter per floor
                    let numUnitsperFloor = Math.round(curarea / avgUnitsize);
                    let totalUnits = numUnitsperFloor * numFloors;
                    let props = {
                        "totalunits": totalUnits,
                        "height": height,
                        "color": "#d0d0d0",
                        "roofColor": featProps.color,
                        "isStreet": 0,
                        'isBuilding': 1,
                        "sysname": featProps.sysname
                    };
                    buildingpoly.properties = props;

                    generatedGeoJSON.features.push(buildingpoly);
                }
                // generate square grid
                // let sqrgrid = turf.squareGrid(outerringbbox, innergridsize, units);
                // // interserct squre grid with hole. 
                // console.log(JSON.stringify(buildingpoly));
                // // for each feature in the hole. 
                // for (let j1 = 0; j1 < sqrgrid.features.length; j1++) {
                //     let cursqgrid = sqrgrid.features[j1];


                //     let blgdfeat = turf.intersect(buildingpoly, cursqgrid);
                //     if (blgdfeat) {
                //         let area = turf.area(blgdfeat); // max area is 400
                //         // let cv = Math.random() < 0.5 ? true : false;
                //         if (area > 300) {
                //             let props = {
                //                 "height": heights[Math.floor(Math.random() * heights.length)],
                //                 "color": "#d0d0d0",
                //                 "roofColor": featProps.color
                //             };
                //             blgdfeat.properties = props;
                //             generatedGeoJSON.features.push(blgdfeat);

                //         }
                //     }
                // }
            }
        }
        return generatedGeoJSON;
    }

}

let LABBuildings = function () {
    let reqtype;
    let labHeights = [10, 15];
    const nearestSearch = [0, 1, 2];
    const units = {
        units: 'kilometers'
    }
    const cellWidth = 0.03;
    const elevationoffset = 1;
    let availablePts = {};
    let featProps;
    let featExtent;

    const floorHeight = 5;
    const avgUnitsize = 100;

    this.genGrid = function (curFeat) {
        featProps = curFeat.properties;
        featExtent = turf.bbox(curFeat);
        let diagJSON = {
            "type": "FeatureCollection",
            "features": [curFeat]
        };
        let grid = turf.pointGrid(featExtent, cellWidth, units);
        let ptsWithin = turf.within(grid, diagJSON);
        return [ptsWithin, featExtent];
    };

    this.generateBuildingFootprints = function (ptsWithin) {
        let allGeneratedFeats = [];
        let color = featProps.color;
        let roofColor = color;
        let systag = featProps.systag;
        let sysname = featProps.sysname;
        let alreadyAdded = {
            "type": "FeatureCollection",
            "features": []
        };
        // if it is HDH type feature
        // create a unique ID for each feature.

        let availablePts = {};
        let ptslen = ptsWithin.features.length;
        
        ptslen = (ptslen > 7500) ? 7500 : ptslen;
        // console.log(ptslen);
        for (let k = 0; k < ptslen; k++) {
            let id = makeid();
            ptsWithin.features[k].properties.id = id;
            availablePts[id] = ptsWithin.features[k];
        }
        // every point is avaiaable 
        for (let k1 = 0; k1 < ptslen; k1++) {
            
            let ifeat;
            let curalreadyadded;
            let alreadyaddedlen;
            // how many nearest to find? 
            let nearest = nearestSearch[Math.floor(Math.random() * nearestSearch.length)];
            // initialize all poitns
            let allPts = [];
            // get current POint. 
            let curPt = ptsWithin.features[k1];
            delete availablePts[curPt.properties.id];
            allPts.push(curPt.geometry.coordinates);
            if (nearest) {
                for (let k6 = 0; k6 < nearest; k6++) {
                    // already added
                    let availPts = {
                        "type": "FeatureCollection",
                        "features": []
                    };
                    for (key in availablePts) {
                        let cpt = availablePts[key];
                        availPts.features.push(cpt);
                    }
                    let nearestpt = false;
                    if (availPts.features.length > 0) {
                        nearestpt = turf.nearestPoint(curPt, availPts);
                    } 
                    if (nearestpt) {
                        delete availablePts[nearestpt.properties.id];
                        allPts.push(nearestpt.geometry.coordinates);
                    }
                }
                if (allPts.length > 1) {
                    try {
                        let ls = turf.lineString(allPts);
                        let buf = turf.buffer(ls, 0.0075, {
                            units: 'kilometers'
                        });
                    } catch (err) {
                        // console.log("Test" + JSON.stringify(err));
                    }
                    try {
                        let bb = turf.bbox(buf);
                        let bldg = turf.bboxPolygon(bb);
                        let area = turf.area(bldg);
                    } catch (err) {
                        // console.log("Test" + JSON.stringify(err));
                    }
                    let hasIntersect = false;
                    let alreadyaddedlen = alreadyAdded.features.length;
                    for (let x1 = 0; x1 < alreadyaddedlen; x1++) {
                        curalreadyadded = alreadyAdded.features[x1];
                        try {
                            ifeat = turf.intersect(curalreadyadded, bldg);
                        } catch (err) {
                            console.log(JSON.stringify(err));
                        }
                        if (ifeat) {
                            hasIntersect = true;
                            break;
                        }
                    }
                    if (hasIntersect === false) {

                        let height = elevationoffset + labHeights[Math.floor(Math.random() * labHeights.length)];
                        let numFloors = Math.round(height / floorHeight); // 5 meter per floor
                        let numUnitsperFloor = Math.round(area / avgUnitsize);
                        let totalUnits = numUnitsperFloor * numFloors;

                        let p = {
                            'totalunits': totalUnits,
                            'height': height,
                            'color': "#d0d0d0",
                            'roofColor': featProps.color,
                            'isStreet': 0,
                            'isBuilding': 1,
                            'sysname': featProps.sysname
                        };
                        bldg.properties = p;
                        alreadyAdded.features.push(bldg);
                        allGeneratedFeats.push(bldg);
                    }
                }
            }

        }
        return allGeneratedFeats;
    }
};

let SMBBuildings = function () {
    let reqtype;
    let smbHeights = [3, 5, 6, 7, 10];
    const gridsize = 0.04;
    const footprintsize = 0.012;

    const units = {
        units: 'kilometers'
    }
    const nearestSearch = [0, 1, 2];
    let featProps;
    const elevationoffset = 1;
    let featExtent;
    const bufferWidth = gridsize - 0.015;
    const bldgfootprint = 0.015;
    this.genGrid = function (curFeat) {
        featProps = curFeat.properties;
        featExtent = turf.bbox(curFeat);
        let diagJSON = {
            "type": "FeatureCollection",
            "features": [curFeat]
        };
        let grid = turf.pointGrid(featExtent, gridsize, units);
        let ptsWithin = turf.within(grid, diagJSON);
        return [ptsWithin, featExtent];
    };

    const floorHeight = 5;
    const avgUnitsize = 75;

    this.generateUnits = function (area) {
        let height = elevationoffset + smbHeights[Math.floor(Math.random() * smbHeights.length)];
        let numFloors = Math.round(height / floorHeight); // 5 meter per floor
        let numUnitsperFloor = Math.round(area / avgUnitsize);
        let totalUnits = numUnitsperFloor * numFloors;
        return totalUnits;
    };
    this.generateBuildingFootprints = function (ptsWithin) {
        let allGeneratedFeats = [];
        let color = featProps.color;
        let roofColor = color;
        let systag = featProps.systag;
        let sysname = featProps.sysname;
        let alreadyAdded = {
            "type": "FeatureCollection",
            "features": []
        };
        let ptslen = ptsWithin.features.length;
        ptslen = (ptslen > 7500) ? 7500 : ptslen;
        for (let k = 0; k < ptslen; k++) {
            // console.log(k);
            let chosenValue = Math.random() < 0.5 ? true : false;
            if (chosenValue) {
                let curPt = ptsWithin.features[k];
                let buffered = turf.buffer(curPt, bufferWidth, units); // buffer 48 meters
                let bds = turf.bbox(buffered); // get the extent of the buffered features
                let bfrdextPlgn = turf.bboxPolygon(bds);
                let centrepoint = turf.centroid(bfrdextPlgn);
                let bldg = turf.buffer(centrepoint, bldgfootprint, units);
                let bdgply = turf.bbox(bldg); // get the extent of the buffered features
                let bpoly = turf.bboxPolygon(bdgply);
                let area = turf.area(bpoly);
                let height = elevationoffset + smbHeights[Math.floor(Math.random() * smbHeights.length)];
                let numFloors = Math.round(height / floorHeight); // 5 meter per floor
                let numUnitsperFloor = Math.round(area / avgUnitsize);
                let totalUnits = numUnitsperFloor * numFloors;
                let p = {
                    "totalunits": totalUnits,
                    "height": height,
                    "color": "#d0d0d0",
                    "roofColor": color,
                    "isStreet": 0,
                    'isBuilding': 1,
                    "sysname": featProps.sysname
                };
                bpoly.properties = p;
                allGeneratedFeats.push(bpoly);
            }
        }
        return allGeneratedFeats;
    }
};
let StreetsHelper = function () {

    this.genStreetsGrid = function (pointsWithin, extent) {
        // This module generates streets. given a grid of points. 
        let rows = [];
        let elevationoffset = 1;
        let columns = [];
        let buildingPoints = [];
        let roadPoints = [];
        let buildingPointsVert = [];
        let roadPointsVert = [];
        for (let k = 0, ptslen = pointsWithin.features.length; k < ptslen; k++) {
            let curPt = pointsWithin.features[k];
            let curLng = curPt.geometry.coordinates[0];
            let curLat = curPt.geometry.coordinates[1];
            if (rows[curLng]) {} else {
                rows[curLng] = [];
            }
            if (columns[curLat]) {} else {
                columns[curLat] = [];
            }
            rows[curLng].push(curPt);
            columns[curLat].push(curPt);
        }

        let allCols = [];
        let allRows = [];
        for (key in columns) {
            allCols.push({
                'key': key,
                'points': columns[key]
            });
        }
        for (key in rows) {
            allRows.push({
                'key': key,
                'points': rows[key]
            });
        }

        let rCounter = 0;
        let cCounter = 0;
        let sortedCols = allCols.sort(function (a, b) {
            return parseFloat(a.key) - parseFloat(b.key);
        });
        let sortedRows = allRows.sort(function (a, b) {
            return parseFloat(a.key) - parseFloat(b.key);
        });
        for (let x2 = 0, collen = sortedCols.length; x2 < collen; x2++) {
            let feattype = (rCounter % 3 === 0) ? "road" : "building";
            // let pts = sortedCols[x2].points;
            (feattype === 'road') ? roadPoints.push(sortedCols[x2]): buildingPoints.push(sortedCols[x2]);
            rCounter += 1;
        }
        for (let x3 = 0, rowlen = sortedRows.length; x3 < rowlen; x3++) {
            let feattype = (cCounter % 5 === 0) ? "road" : "building";
            // let pts = sortedCols[x2].points;
            (feattype === 'road') ? roadPointsVert.push(sortedRows[x3]): buildingPointsVert.push(sortedRows[x3]);
            cCounter += 1;
        }
        // let allLines = [];
        let streets = [];
        let distance = 0;

        for (let k1 = 0, numRoads = roadPoints.length; k1 < numRoads; k1++) {
            let curRoad = roadPoints[k1];
            let tmpPts = [];
            for (let p1 = 0, ptsLen = curRoad.points.length; p1 < ptsLen; p1++) {
                tmpPts.push(curRoad.points[p1].geometry.coordinates);
            }
            if (tmpPts.length > 1) {
                let linestring = turf.lineString(tmpPts);
                // allLines.push(linestring);

                let d = turf.length(linestring, {
                    units: 'kilometers'
                });
                distance = (distance > Math.round(d)) ? distance : Math.round(d);
                let street = turf.buffer(linestring, 0.0075, {
                    units: 'kilometers'
                });
                if (street['type'] === "Feature") {
                    street = {
                        "type": "FeatureCollection",
                        "features": [street]
                    }
                }
                let height = elevationoffset + 0.1;
                street.features[0].properties = {
                    "color": "#202020",
                    "roofColor": "#202020",
                    "height": height,
                    "isStreet": 1,
                    'isBuilding': 0,

                };
                streets.push.apply(streets, street.features);
            }
        }
        if (distance >= 0.7) { // there is a road that is greater than 1KM, so we need vertical streets.

            for (let k2 = 0, numRoads = roadPointsVert.length; k2 < numRoads; k2++) {
                let curRoad = roadPointsVert[k2];
                let tmpPts = [];
                for (let p2 = 0, ptsLen = curRoad.points.length; p2 < ptsLen; p2++) {
                    tmpPts.push(curRoad.points[p2].geometry.coordinates);
                }

                if (tmpPts.length > 1) { // valid line
                    let linestring = turf.lineString(tmpPts);
                    let street = turf.buffer(linestring, 0.0075, {
                        units: 'kilometers'
                    });
                    if (street['type'] === "Feature") {
                        street = {
                            "type": "FeatureCollection",
                            "features": [street]
                        }
                    }
                    let height = elevationoffset + 0.1;
                    street.features[0].properties = {
                        "color": "#202020",
                        "roofColor": "#202020",
                        "height": height,
                        "isStreet": 1,
                        'isBuilding': 0,
                    };
                    streets.push.apply(streets, street.features);
                }
            }
        }
        let s = {
            "type": "FeatureCollection",
            "features": streets
        };
        return s;
    }
    this.filterStreets = function (streetgrid, inputFeats) {
        let filteredFeatures = [];
        for (let l = 0; l < inputFeats.length; l++) {
            let curF1 = inputFeats[l];
            let intersects = false;
            for (let p = 0, stLen = streetgrid.features.length; p < stLen; p++) {
                let curStF = streetgrid.features[p];
                try {
                    let intersect = turf.intersect(curF1, curStF);
                } catch (err) {
                    // console.log(JSON.stringify(err));
                }
                // chop road
                if (intersect) {
                    intersects = true;
                }
            }
            if (intersects) {} else {

                filteredFeatures.push(curF1);
            }
        }
        return filteredFeatures;
    }
}

// TODO: Refactor Building generator
class BuildingsFactory {

}

function makeid() {
    let text = "";
    let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 5; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
}


// function bufferExistingRoads(inputroads) {
//     let streets = [];
//     for (let x = 0; x < inputroads.features.length; x++) {
//         let linestring = inputroads.features[x];
//         let street = turf.buffer(linestring, 0.0075, 'kilometers');
//         if (street['type'] === "Feature") {
//             streets.push(street);
//         }
//     }
//     return {
//         "type": "FeatureCollection",
//         "features": streets
//     }
// }

function generatePolicyFeatures(curFeat) {
    let curFeatprops = curFeat.properties;
    const elevationoffset = 1;

    function getCW(d) {
        return d > 10000000 ? 1 :
            d > 6000000 ? 0.75 :
            d > 5000000 ? 0.5 :
            d > 3000000 ? 0.3 :
            d > 2000000 ? 0.15 :
            d > 1000000 ? 0.08 :
            0.04;
    }
    let policyFeats = [];
    let fe = turf.bbox(curFeat);
    let area = Math.round(turf.area(curFeat));
    let cw = getCW(area);
    // let cw = 0.05;
    const units = {
        units: 'kilometers'
    }
    let dJSON = {
        "type": "FeatureCollection",
        "features": [curFeat]
    };
    // make the grid of 50 meter points
    let grd = turf.pointGrid(fe, cw, units);
    let pW = turf.within(grd, dJSON);
    let pwLen = pW.features.length;
    let height = elevationoffset + 0.01;
    let prop = {
        "roofColor": curFeatprops.color,
        "height": height,
        "isStreet": 0,
        'isBuilding': 0,
        "sysname": curFeatprops.sysname
    }
    for (let l1 = 0; l1 < pwLen; l1++) {
        let curptwithin = pW.features[l1];
        let bufFeat = turf.buffer(curptwithin, 0.0075, {
            units: 'kilometers'
        });
        bufFeat.properties = prop;
        policyFeats.push(bufFeat);
    }
    return policyFeats;
}

function generateCenter(constraintedModelDesigns) {
    let centerPt = turf.center(constraintedModelDesigns);
    let lat = centerPt.geometry.coordinates[1];
    let lng = centerPt.geometry.coordinates[0];
    return [lat, lng];
}

function generateFinal3DGeoms(currentFeature, genstreets) {
    
    const elevationoffset = 1;
    genstreets = (genstreets === 'false') ? false : true;
    let whiteListedSysName = ['HIGH-H', 'LOW-H', 'HDH', 'LDH', 'COM', 'COMIND', 'HSG', 'HSNG', 'MXD', 'MIX','STL'];
    let curGJFeats = [];
    let curFeat = currentFeature

    let curFeatSys = curFeat.properties.sysname;
    // add desctiption
    const diagramdesc = curFeat.properties.description;

    // if it is a line then simply buffer it and paint it black with a small height
    if (curFeat.geometry.type === "LineString") {
        f = turf.buffer(curFeat, 0.001, {
            units: 'kilometers'
        });
        if (f['type'] === "Feature") {
            f = {
                "type": "FeatureCollection",
                "features": [f]
            }
        }
        let linefeats = f.features;
        let linefeatlen = linefeats.length;
        for (let x1 = 0; x1 < linefeatlen; x1++) {
            curlineFeat = linefeats[x1];
            let height = elevationoffset + 0.5;
            curlineFeat.properties = {
                "color": curFeat.properties.color,
                "description": curFeat.properties.description,
                "roofColor": curFeat.properties.color,
                "isStreet": 0,
                'isBuilding': 0,
                "sysname": curFeat.properties.sysname,
                "height": height,
                "description": diagramdesc
            };

            curGJFeats.push(curlineFeat);
        }
    } else if (curFeat.geometry.type === "Polygon") {

        let featProps = curFeat.properties;

        if (whiteListedSysName.indexOf(curFeatSys) >= 0) { // system is whitelisted
            if (curFeat.properties.areatype === 'project') {
                //100 meter cell width
                if ((featProps.sysname === 'HDH') || (featProps.sysname === 'HSNG') || (featProps.sysname === 'HSG') || (featProps.sysname === 'MIX') || (featProps.sysname === 'STL')) {
                    let hdh = new HDHousing();
                    let constrainedgrid = hdh.generateSquareGridandConstrain(curFeat);
                    let bldgs = hdh.generateBuildings(constrainedgrid);
                    for (let k2 = 0; k2 < bldgs.features.length; k2++) {
                        bldgs.features[k2].properties.description = diagramdesc;
                        curGJFeats.push(bldgs.features[k2]);
                    }
                } else if ((featProps.sysname === 'MXD')) {
                    let mxd = new MXDBuildings();
                    let mxdgrid = mxd.generateSquareGridandConstrain(curFeat);
                    let mxdbld = mxd.generateBuildings(mxdgrid);

                    for (let k3 = 0; k3 < mxdbld.features.length; k3++) {
                        mxdbld.features[k3].properties.description = diagramdesc;
                        curGJFeats.push(mxdbld.features[k3]);
                    }
                } else if ((featProps.sysname === 'LDH') || (featProps.sysname === 'LOW-H')) {

                    let ldh = new LDHousing();
                    let p = ldh.genGrid(curFeat);
                    let ptsWithin = p[0];
                    let featExtent = p[1];
                    let bldgs = ldh.generateBuildingFootprints(ptsWithin);
                    let ldhstreets = new StreetsHelper();
                    let ldhstreetFeatureCollection = ldhstreets.genStreetsGrid(ptsWithin, featExtent);
                    let ldhfinalFeatures = ldhstreets.filterStreets(ldhstreetFeatureCollection, bldgs);

                    if (genstreets) {
                        ldhfinalFeatures.push.apply(ldhfinalFeatures, ldhstreetFeatureCollection.features);
                    }
                    for (let k1 = 0; k1 < ldhfinalFeatures.length; k1++) {
                        ldhfinalFeatures[k1].properties.description = diagramdesc;
                        curGJFeats.push(ldhfinalFeatures[k1]);
                    }
                } else if ((featProps.sysname === 'COM') || (featProps.sysname === 'COMIND')) {
                    let com = new COMBuilding();
                    let comp = com.genGrid(curFeat);
                    let comptsWithin = comp[0];
                    let comfeatExtent = comp[1];
                    let combldgs = com.generateBuildingFootprints(comptsWithin);
                    let comstreets = new StreetsHelper();
                    let comstreetFeatureCollection = comstreets.genStreetsGrid(comptsWithin, comfeatExtent);
                    let comfinalFeatures = comstreets.filterStreets(comstreetFeatureCollection, combldgs);

                    if (genstreets) {
                        comfinalFeatures.push.apply(comfinalFeatures, comstreetFeatureCollection.features);
                    }
                    for (let k1 = 0; k1 < comfinalFeatures.length; k1++) {
                        comfinalFeatures[k1].properties.description = diagramdesc;
                        curGJFeats.push(comfinalFeatures[k1]);
                    }
                }
            } else if (curFeat.properties.areatype === 'policy') { // whitelisted policy
                let policyF = generatePolicyFeatures(curFeat);
                for (let pf = 0; pf < policyF.length; pf++) {
                    policyF[pf].properties.description = diagramdesc;
                    curGJFeats.push(policyF[pf]);
                }
            }

        }
        // for non white listed systems that are buildings
        else if ((featProps.systag === 'Large buildings, Industry, commerce') && (featProps.areatype === 'project')) { // 

            let lab = new LABBuildings();
            let labgrid = lab.genGrid(curFeat);
            let labptsWithin = labgrid[0];
            let labfeatExtent = labgrid[1];
            let labbldgs = lab.generateBuildingFootprints(labptsWithin);

            let labstreets = new StreetsHelper();
            let labStreetsFC = labstreets.genStreetsGrid(labptsWithin, labfeatExtent);
            let labFinalFeatures = labstreets.filterStreets(labStreetsFC, labbldgs);

            if (genstreets) {
                labFinalFeatures.push.apply(labFinalFeatures, labStreetsFC.features);
            }
            for (let k6 = 0; k6 < labFinalFeatures.length; k6++) {
                labFinalFeatures[k6].properties.description = diagramdesc;
                curGJFeats.push(labFinalFeatures[k6]);
            }

        } else if ((featProps.systag === 'Small buildings, low density housing') && (featProps.areatype === 'project')) {

            let smb = new SMBBuildings();
            let smbgrid = smb.genGrid(curFeat);
            let smbptsWithin = smbgrid[0];
            let smbfeatExtent = smbgrid[1];
            let smbbldgs = smb.generateBuildingFootprints(smbptsWithin);
            let smbStreets = new StreetsHelper();
            let smbStreetFeat = smbStreets.genStreetsGrid(smbptsWithin, smbfeatExtent);
            let smbFinalFeatures = smbStreets.filterStreets(smbStreetFeat, smbbldgs);

            if (genstreets) {
                smbFinalFeatures.push.apply(smbFinalFeatures, smbStreetFeat.features);
            }
            for (let k1 = 0; k1 < smbFinalFeatures.length; k1++) {
                smbFinalFeatures[k1].properties.description = diagramdesc;
                curGJFeats.push(smbFinalFeatures[k1]);
            }


        } else { // all systems that not buildings
            if (curFeat.properties.areatype === 'project') {
                let height = elevationoffset + 0.01;
                let prop = {
                    "description": curFeat.properties.description,
                    "roofColor": curFeat.properties.color,
                    "isStreet": 0,
                    'isBuilding': 0,
                    "height": height,
                    "sysname": curFeat.properties.sysname,
                    "description": curFeat.properties.description
                }
                curFeat.properties = prop;
                curGJFeats.push.apply(curGJFeats, [curFeat]);
            }
            else if (curFeat.properties.areatype === 'policy') {
                let policyF = generatePolicyFeatures(curFeat);
                for (let pf = 0; pf < policyF.length; pf++) {
                    curGJFeats.push(policyF[pf]);
                }
            }
        }

    }

    return curGJFeats;

}


module.exports = {
    // constrainFeatures: constrainFeatures,
    generateCenter: generateCenter,
    generateFinal3DGeoms: generateFinal3DGeoms,
    // bufferExistingRoads: bufferExistingRoads
    // generate3DGeoms: generate3DGeoms
};