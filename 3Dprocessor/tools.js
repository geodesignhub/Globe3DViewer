var turf = require('@turf/turf');

var COMBuilding = function () {
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

    var featProps;
    var featExtent;
    this.genGrid = function (curFeat) {
        featProps = curFeat.properties;
        featExtent = turf.bbox(curFeat);
        var diagJSON = {
            "type": "FeatureCollection",
            "features": [curFeat]
        };
        var grid = turf.pointGrid(featExtent, gridsize, units);
        var ptsWithin = turf.within(grid, diagJSON);
        return [ptsWithin, featExtent];
    };


    this.generateBuildingFootprints = function (ptsWithin) {
        var allGeneratedFeats = [];
        var color = featProps.color;
        var systag = featProps.systag;
        var sysname = featProps.sysname;
        var ptslen = ptsWithin.features.length;
        var alreadyAdded = {
            "type": "FeatureCollection",
            "features": []
        };
        // create a unique ID for each feature.
        var availablePts = {};
        var ptslen = ptsWithin.features.length;
        for (var k = 0; k < ptslen; k++) {
            var id = makeid();

            ptsWithin.features[k].properties.id = id;
            availablePts[id] = ptsWithin.features[k];
        }

        ptslen = (ptslen > 7500) ? 7500 : ptslen;
        // console.log(ptslen);
        // every point is avaiable 
        for (var k1 = 0; k1 < ptslen; k1++) {
            // console.log(k1);
            var ifeat;
            var curalreadyadded;
            var alreadyaddedlen;
            // how many nearest to find? 
            var nearest = nearestSearch[Math.floor(Math.random() * nearestSearch.length)];
            // initialize all poitns
            var allPts = [];
            // get current POint. 
            var curPt = ptsWithin.features[k1];
            delete availablePts[curPt.properties.id];
            allPts.push(curPt.geometry.coordinates);
            if (nearest) {
                for (var k6 = 0; k6 < nearest; k6++) {
                    // already added
                    var availPts = {
                        "type": "FeatureCollection",
                        "features": []
                    };
                    for (key in availablePts) {
                        var cpt = availablePts[key];
                        availPts.features.push(cpt);
                    }
                    var nearestpt = false;
                    if (availPts.features.length > 0) {
                        nearestpt = turf.nearestPoint(curPt, availPts);
                    } 
                   
                    if (nearestpt) {
                        delete availablePts[nearestpt.properties.id];
                        allPts.push(nearestpt.geometry.coordinates);
                    }
                }
                if (allPts.length > 1) {
                    var ls = turf.lineString(allPts);
                    var buf = turf.buffer(ls, 0.0075, {
                        units: 'kilometers'
                    });
                    // console.log(JSON.stringify(bldg));
                    var bb = turf.bbox(buf);
                    var bldg = turf.bboxPolygon(bb);
                    var area = turf.area(bldg);
                    var hasIntersect = false;
                    var alreadyaddedlen = alreadyAdded.features.length;
                    for (var x1 = 0; x1 < alreadyaddedlen; x1++) {
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
                        var height = elevationoffset + comHeights[Math.floor(Math.random() * comHeights.length)];
                        var numFloors = Math.round(height / floorHeight); // 5 meter per floor
                        var numUnitsperFloor = Math.round(area / avgUnitsize);
                        var totalUnits = numUnitsperFloor * numFloors;
                        var p = {
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
                var buffered = turf.buffer(curPt, bufferWidth, units); // buffer 48 meters
                var bds = turf.bbox(buffered); // get the extent of the buffered features
                var bfrdextPlgn = turf.bboxPolygon(bds);
                var bldgfootprint = 0.015;
                var centrepoint = turf.centroid(bfrdextPlgn);
                var bldg = turf.buffer(centrepoint, bldgfootprint, units);
                var bdgply = turf.bbox(bldg); // get the extent of the buffered features
                var bpoly = turf.bboxPolygon(bdgply);
                var area = turf.area(bpoly);
                alreadyaddedlen = alreadyAdded.features.length;
                var hasIntersect = false;

                for (var x2 = 0; x2 < alreadyaddedlen; x2++) {
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
                    var height = elevationoffset + comHeights[Math.floor(Math.random() * comHeights.length)];
                    var numFloors = Math.round(height / floorHeight); // 5 meter per floor
                    var numUnitsperFloor = Math.round(area / avgUnitsize);
                    var totalUnits = numUnitsperFloor * numFloors;
                    var chosenValue = Math.random() < 0.5 ? true : false;
                    var chosenValue = true;
                    if (chosenValue) {
                        var p = {
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

var LDHousing = function () {
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

    var featProps;
    var featExtent;

    this.genGrid = function (curFeat) {
        featProps = curFeat.properties;
        featExtent = turf.bbox(curFeat);
        var diagJSON = {
            "type": "FeatureCollection",
            "features": [curFeat]
        };
        var grid = turf.pointGrid(featExtent, gridsize, units);
        var ptsWithin = turf.within(grid, diagJSON);
        return [ptsWithin, featExtent];
    };

    this.generateBuildingFootprints = function (ptsWithin) {

        var allGeneratedFeats = [];
        var color = featProps.color;
        var systag = featProps.systag;
        var sysname = featProps.sysname;
        var ptslen = ptsWithin.features.length;
        var bufferWidth = gridsize - 0.01; //30 meter buffer

        ptslen = (ptslen > 7500) ? 7500 : ptslen;
        // console.log(ptslen);
        // if it is HDH type feature
        for (var k = 0; k < ptslen; k++) {
            // console.log(k)
            var curPt = ptsWithin.features[k];
            var buffered = turf.buffer(curPt, bufferWidth, units); // buffer 48 meters
            var bds = turf.bbox(buffered); // get the extent of the buffered features
            var bfrdextPlgn = turf.bboxPolygon(bds);
            var bldgfootprint = 0.015;
            var centrepoint = turf.centroid(bfrdextPlgn);
            var bldg = turf.buffer(centrepoint, bldgfootprint, units);
            var bdgply = turf.bbox(bldg); // get the extent of the buffered features
            var bpoly = turf.bboxPolygon(bdgply);
            var area = turf.area(bpoly);
            var height = elevationoffset + ldhheights[Math.floor(Math.random() * ldhheights.length)];

            var numFloors = Math.round(height / floorHeight); // 5 meter per floor
            var numUnitsperFloor = Math.round(area / avgUnitsize);
            var totalUnits = numUnitsperFloor * numFloors;
            var p = {
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

var HDHousing = function () {
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
    var featProps;
    const floorHeight = 5;
    const avgUnitsize = 50;


    this.generateSquareGridandConstrain = function (featureGeometry) {
        var featarea = turf.area(featureGeometry);
        var numberofextrusions = Math.round((featarea * 0.0001) * buildingsperhectare);
        featProps = featureGeometry.properties;
        var featExtent = turf.bbox(featureGeometry);
        var sqgrid = turf.squareGrid(featExtent, gridsize, units);
        // constrain grid.
        var constrainedgrid = {
            "type": "FeatureCollection",
            "features": []
        };
        var sqfeatslen = sqgrid.features.length;
        // number of extrusions is counted. 
        // console.log(numberofextrusions, sqfeatslen);
        var ratio = (numberofextrusions / sqfeatslen);
        var extrudedfeaturescount = 0;
        if (ratio < 0.20 || numberofextrusions < 15) {
            for (var x = 0; x < sqfeatslen; x++) {
                if (extrudedfeaturescount < numberofextrusions) {
                    var cursqfeat = sqgrid.features[x];
                    try {
                        var ifeat = turf.intersect(cursqfeat, featureGeometry);
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
            var gridStore = {};
            var gridid = 0;
            for (var x1 = 0; x1 < sqfeatslen; x1++) {
                var cursqgrid = sqgrid.features[x1];
                gridStore[gridid] = cursqgrid;
                gridid += 1;
            }

            while (extrudedfeaturescount < numberofextrusions + 1) {
                var randomgridid = Math.floor(Math.random() * (sqfeatslen - 0 + 1)) + 0;
                // get the id from gridStore
                var cursqfeat = gridStore[randomgridid];
                // have the feature
                try {
                    var ifeat = turf.intersect(cursqfeat, featureGeometry);
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
        var consgridlen = constrainedgrid.features.length;
        var generatedGeoJSON = {
            "type": "FeatureCollection",
            "features": []
        };
        // find centroid

        consgridlen = (consgridlen > 7500) ? 7500 : consgridlen;
        // console.log(consgridlen);
        var extrusionconter = 0;
        for (var k1 = 0; k1 < consgridlen; k1++) {
            // console.log(k1)
            var curconsfeat = constrainedgrid.features[k1];
            var curarea;
            try {
                curarea = turf.area(curconsfeat);
            } catch (err) {
                curarea = 0;
            }
            if (curarea > 2000) { //max area is 2500 gridsize squared
                var chosenValue = Math.random() > 0.6 ? true : false;
                if (chosenValue) {
                    var centroid = turf.centroid(curconsfeat);
                    var bufferedCentroid = turf.buffer(centroid, footprintsize, {
                        units: 'kilometers'
                    });
                    var bbox = turf.bbox(bufferedCentroid);
                    var bboxpoly = turf.bboxPolygon(bbox);
                    var height = elevationoffset + heights[Math.floor(Math.random() * heights.length)];
                    var area = turf.area(bboxpoly);
                    var numFloors = Math.round(height / floorHeight); // 5 meter per floor
                    var numUnitsperFloor = Math.round(area / avgUnitsize);
                    var totalUnits = numUnitsperFloor * numFloors;

                    var props = {
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

var MXDBuildings = function () {
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

    var featProps;
    this.generateSquareGridandConstrain = function (featureGeometry) {
        featProps = featureGeometry.properties;
        var featExtent = turf.bbox(featureGeometry);
        var sqgrid = turf.squareGrid(featExtent, gridsize, units);

        // constrain grid.
        var constrainedgrid = {
            "type": "FeatureCollection",
            "features": []
        };
        var sqfeatslen = sqgrid.features.length;

        for (var x = 0; x < sqfeatslen; x++) {
            var cursqfeat = sqgrid.features[x];
            try {
                var ifeat = turf.intersect(cursqfeat, featureGeometry);
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
        var consgridlen = constrainedgrid.features.length;
        var generatedGeoJSON = {
            "type": "FeatureCollection",
            "features": []
        };
        consgridlen = (consgridlen > 7500) ? 7500 : consgridlen;
        // console.log(consgridlen);
        // find centroid
        for (var k1 = 0; k1 < consgridlen; k1++) {
            // console.log(k1);
            var curconsfeat = constrainedgrid.features[k1];
            var curarea;
            try {
                curarea = turf.area(curconsfeat);
            } catch (err) {
                curarea = 0;
            }
            var center = turf.centroid(curconsfeat);

            if (curarea > 6300) { //max area is 3600 need entire parcel. 
                var cv = Math.random() < 0.5 ? true : false;
                if (cv) {
                    var outerring = turf.buffer(center, outerringradius, units);
                    var innerring = turf.buffer(center, innerringradius, units);
                    var middlering = turf.buffer(center, middleringradius, units);
                    // get bbox
                    var outerringbbox = turf.bbox(outerring);
                    var innerringbbox = turf.bbox(innerring);
                    var middleringbbox = turf.bbox(middlering);
                    //get bbox polygon
                    var outerringpoly = turf.bboxPolygon(outerringbbox);
                    var innerringpoly = turf.bboxPolygon(innerringbbox);
                    var middleringpoly = turf.bboxPolygon(middleringbbox);

                    //erase inner from outerring to get hybrid hole
                    var hybridhole = turf.difference(outerringpoly, innerringpoly);

                    // erease middle from hybrid hole
                    var buildingpoly = turf.difference(hybridhole, middleringpoly);
                    var height = elevationoffset + heights[Math.floor(Math.random() * heights.length)];

                    var numFloors = Math.round(height / floorHeight); // 5 meter per floor
                    var numUnitsperFloor = Math.round(curarea / avgUnitsize);
                    var totalUnits = numUnitsperFloor * numFloors;
                    var props = {
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
                // var sqrgrid = turf.squareGrid(outerringbbox, innergridsize, units);
                // // interserct squre grid with hole. 
                // console.log(JSON.stringify(buildingpoly));
                // // for each feature in the hole. 
                // for (var j1 = 0; j1 < sqrgrid.features.length; j1++) {
                //     var cursqgrid = sqrgrid.features[j1];


                //     var blgdfeat = turf.intersect(buildingpoly, cursqgrid);
                //     if (blgdfeat) {
                //         var area = turf.area(blgdfeat); // max area is 400
                //         // var cv = Math.random() < 0.5 ? true : false;
                //         if (area > 300) {
                //             var props = {
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

var LABBuildings = function () {
    var reqtype;
    var labHeights = [10, 15];
    const nearestSearch = [0, 1, 2];
    const units = {
        units: 'kilometers'
    }
    const cellWidth = 0.03;
    const elevationoffset = 1;
    var availablePts = {};
    var featProps;
    var featExtent;

    const floorHeight = 5;
    const avgUnitsize = 100;

    this.genGrid = function (curFeat) {
        featProps = curFeat.properties;
        featExtent = turf.bbox(curFeat);
        var diagJSON = {
            "type": "FeatureCollection",
            "features": [curFeat]
        };
        var grid = turf.pointGrid(featExtent, cellWidth, units);
        var ptsWithin = turf.within(grid, diagJSON);
        return [ptsWithin, featExtent];
    };

    this.generateBuildingFootprints = function (ptsWithin) {
        var allGeneratedFeats = [];
        var color = featProps.color;
        var roofColor = color;
        var systag = featProps.systag;
        var sysname = featProps.sysname;
        var alreadyAdded = {
            "type": "FeatureCollection",
            "features": []
        };
        // if it is HDH type feature
        // create a unique ID for each feature.

        var availablePts = {};
        var ptslen = ptsWithin.features.length;
        
        ptslen = (ptslen > 7500) ? 7500 : ptslen;
        // console.log(ptslen);
        for (var k = 0; k < ptslen; k++) {
            var id = makeid();
            ptsWithin.features[k].properties.id = id;
            availablePts[id] = ptsWithin.features[k];
        }
        // every point is avaiaable 
        for (var k1 = 0; k1 < ptslen; k1++) {
            
            var ifeat;
            var curalreadyadded;
            var alreadyaddedlen;
            // how many nearest to find? 
            var nearest = nearestSearch[Math.floor(Math.random() * nearestSearch.length)];
            // initialize all poitns
            var allPts = [];
            // get current POint. 
            var curPt = ptsWithin.features[k1];
            delete availablePts[curPt.properties.id];
            allPts.push(curPt.geometry.coordinates);
            if (nearest) {
                for (var k6 = 0; k6 < nearest; k6++) {
                    // already added
                    var availPts = {
                        "type": "FeatureCollection",
                        "features": []
                    };
                    for (key in availablePts) {
                        var cpt = availablePts[key];
                        availPts.features.push(cpt);
                    }
                    var nearestpt = false;
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
                        var ls = turf.lineString(allPts);
                        var buf = turf.buffer(ls, 0.0075, {
                            units: 'kilometers'
                        });
                    } catch (err) {
                        // console.log("Test" + JSON.stringify(err));
                    }
                    try {
                        var bb = turf.bbox(buf);
                        var bldg = turf.bboxPolygon(bb);
                        var area = turf.area(bldg);
                    } catch (err) {
                        // console.log("Test" + JSON.stringify(err));
                    }
                    var hasIntersect = false;
                    var alreadyaddedlen = alreadyAdded.features.length;
                    for (var x1 = 0; x1 < alreadyaddedlen; x1++) {
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

                        var height = elevationoffset + labHeights[Math.floor(Math.random() * labHeights.length)];
                        var numFloors = Math.round(height / floorHeight); // 5 meter per floor
                        var numUnitsperFloor = Math.round(area / avgUnitsize);
                        var totalUnits = numUnitsperFloor * numFloors;

                        var p = {
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

var SMBBuildings = function () {
    var reqtype;
    var smbHeights = [3, 5, 6, 7, 10];
    const gridsize = 0.04;
    const footprintsize = 0.012;

    const units = {
        units: 'kilometers'
    }
    const nearestSearch = [0, 1, 2];
    var featProps;
    const elevationoffset = 1;
    var featExtent;
    const bufferWidth = gridsize - 0.015;
    const bldgfootprint = 0.015;
    this.genGrid = function (curFeat) {
        featProps = curFeat.properties;
        featExtent = turf.bbox(curFeat);
        var diagJSON = {
            "type": "FeatureCollection",
            "features": [curFeat]
        };
        var grid = turf.pointGrid(featExtent, gridsize, units);
        var ptsWithin = turf.within(grid, diagJSON);
        return [ptsWithin, featExtent];
    };

    const floorHeight = 5;
    const avgUnitsize = 75;

    this.generateUnits = function (area) {
        var height = elevationoffset + smbHeights[Math.floor(Math.random() * smbHeights.length)];
        var numFloors = Math.round(height / floorHeight); // 5 meter per floor
        var numUnitsperFloor = Math.round(area / avgUnitsize);
        var totalUnits = numUnitsperFloor * numFloors;
        return totalUnits;
    };
    this.generateBuildingFootprints = function (ptsWithin) {
        var allGeneratedFeats = [];
        var color = featProps.color;
        var roofColor = color;
        var systag = featProps.systag;
        var sysname = featProps.sysname;
        var alreadyAdded = {
            "type": "FeatureCollection",
            "features": []
        };
        var ptslen = ptsWithin.features.length;
        ptslen = (ptslen > 7500) ? 7500 : ptslen;
        for (var k = 0; k < ptslen; k++) {
            // console.log(k);
            var chosenValue = Math.random() < 0.5 ? true : false;
            if (chosenValue) {
                var curPt = ptsWithin.features[k];
                var buffered = turf.buffer(curPt, bufferWidth, units); // buffer 48 meters
                var bds = turf.bbox(buffered); // get the extent of the buffered features
                var bfrdextPlgn = turf.bboxPolygon(bds);
                var centrepoint = turf.centroid(bfrdextPlgn);
                var bldg = turf.buffer(centrepoint, bldgfootprint, units);
                var bdgply = turf.bbox(bldg); // get the extent of the buffered features
                var bpoly = turf.bboxPolygon(bdgply);
                var area = turf.area(bpoly);
                var height = elevationoffset + smbHeights[Math.floor(Math.random() * smbHeights.length)];
                var numFloors = Math.round(height / floorHeight); // 5 meter per floor
                var numUnitsperFloor = Math.round(area / avgUnitsize);
                var totalUnits = numUnitsperFloor * numFloors;
                var p = {
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
var StreetsHelper = function () {

    this.genStreetsGrid = function (pointsWithin, extent) {
        // This module generates streets. given a grid of points. 
        var rows = [];
        var elevationoffset = 1;
        var columns = [];
        var buildingPoints = [];
        var roadPoints = [];
        var buildingPointsVert = [];
        var roadPointsVert = [];
        for (var k = 0, ptslen = pointsWithin.features.length; k < ptslen; k++) {
            var curPt = pointsWithin.features[k];
            var curLng = curPt.geometry.coordinates[0];
            var curLat = curPt.geometry.coordinates[1];
            if (rows[curLng]) {} else {
                rows[curLng] = [];
            }
            if (columns[curLat]) {} else {
                columns[curLat] = [];
            }
            rows[curLng].push(curPt);
            columns[curLat].push(curPt);
        }

        var allCols = [];
        var allRows = [];
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

        var rCounter = 0;
        var cCounter = 0;
        var sortedCols = allCols.sort(function (a, b) {
            return parseFloat(a.key) - parseFloat(b.key);
        });
        var sortedRows = allRows.sort(function (a, b) {
            return parseFloat(a.key) - parseFloat(b.key);
        });
        for (var x2 = 0, collen = sortedCols.length; x2 < collen; x2++) {
            var feattype = (rCounter % 3 === 0) ? "road" : "building";
            // var pts = sortedCols[x2].points;
            (feattype === 'road') ? roadPoints.push(sortedCols[x2]): buildingPoints.push(sortedCols[x2]);
            rCounter += 1;
        }
        for (var x3 = 0, rowlen = sortedRows.length; x3 < rowlen; x3++) {
            var feattype = (cCounter % 5 === 0) ? "road" : "building";
            // var pts = sortedCols[x2].points;
            (feattype === 'road') ? roadPointsVert.push(sortedRows[x3]): buildingPointsVert.push(sortedRows[x3]);
            cCounter += 1;
        }
        // var allLines = [];
        var streets = [];
        var distance = 0;

        for (var k1 = 0, numRoads = roadPoints.length; k1 < numRoads; k1++) {
            var curRoad = roadPoints[k1];
            var tmpPts = [];
            for (var p1 = 0, ptsLen = curRoad.points.length; p1 < ptsLen; p1++) {
                tmpPts.push(curRoad.points[p1].geometry.coordinates);
            }
            if (tmpPts.length > 1) {
                var linestring = turf.lineString(tmpPts);
                // allLines.push(linestring);

                var d = turf.length(linestring, {
                    units: 'kilometers'
                });
                distance = (distance > Math.round(d)) ? distance : Math.round(d);
                var street = turf.buffer(linestring, 0.0075, {
                    units: 'kilometers'
                });
                if (street['type'] === "Feature") {
                    street = {
                        "type": "FeatureCollection",
                        "features": [street]
                    }
                }
                var height = elevationoffset + 0.1;
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

            for (var k2 = 0, numRoads = roadPointsVert.length; k2 < numRoads; k2++) {
                var curRoad = roadPointsVert[k2];
                var tmpPts = [];
                for (var p2 = 0, ptsLen = curRoad.points.length; p2 < ptsLen; p2++) {
                    tmpPts.push(curRoad.points[p2].geometry.coordinates);
                }

                if (tmpPts.length > 1) { // valid line
                    var linestring = turf.lineString(tmpPts);
                    var street = turf.buffer(linestring, 0.0075, {
                        units: 'kilometers'
                    });
                    if (street['type'] === "Feature") {
                        street = {
                            "type": "FeatureCollection",
                            "features": [street]
                        }
                    }
                    var height = elevationoffset + 0.1;
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
        var s = {
            "type": "FeatureCollection",
            "features": streets
        };
        return s;
    }
    this.filterStreets = function (streetgrid, inputFeats) {
        var filteredFeatures = [];
        for (var l = 0; l < inputFeats.length; l++) {
            var curF1 = inputFeats[l];
            var intersects = false;
            for (var p = 0, stLen = streetgrid.features.length; p < stLen; p++) {
                var curStF = streetgrid.features[p];
                try {
                    var intersect = turf.intersect(curF1, curStF);
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
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (var i = 0; i < 5; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
}


// function bufferExistingRoads(inputroads) {
//     var streets = [];
//     for (var x = 0; x < inputroads.features.length; x++) {
//         var linestring = inputroads.features[x];
//         var street = turf.buffer(linestring, 0.0075, 'kilometers');
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
    var curFeatprops = curFeat.properties;
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
    var policyFeats = [];
    var fe = turf.bbox(curFeat);
    var area = Math.round(turf.area(curFeat));
    var cw = getCW(area);
    // var cw = 0.05;
    const units = {
        units: 'kilometers'
    }
    var dJSON = {
        "type": "FeatureCollection",
        "features": [curFeat]
    };
    // make the grid of 50 meter points
    var grd = turf.pointGrid(fe, cw, units);
    var pW = turf.within(grd, dJSON);
    var pwLen = pW.features.length;
    var height = elevationoffset + 0.01;
    var prop = {
        "roofColor": curFeatprops.color,
        "height": height,
        "isStreet": 0,
        'isBuilding': 0,
        "sysname": curFeatprops.sysname
    }
    for (var l1 = 0; l1 < pwLen; l1++) {
        var curptwithin = pW.features[l1];
        var bufFeat = turf.buffer(curptwithin, 0.0075, {
            units: 'kilometers'
        });
        bufFeat.properties = prop;
        policyFeats.push(bufFeat);
    }
    return policyFeats;
}

function generateCenter(constraintedModelDesigns) {
    var centerPt = turf.center(constraintedModelDesigns);
    var lat = centerPt.geometry.coordinates[1];
    var lng = centerPt.geometry.coordinates[0];
    return [lat, lng];
}

function generateFinal3DGeoms(currentFeature, genstreets) {
    
    const elevationoffset = 1;
    var genstreets = (genstreets === 'false') ? false : true;
    var whiteListedSysName = ['HIGH-H', 'LOW-H', 'HDH', 'LDH', 'COM', 'COMIND', 'HSG', 'HSNG', 'MXD', 'MIX'];
    var curGJFeats = [];
    var curFeat = currentFeature

    var curFeatSys = curFeat.properties.sysname;
    // add desctiption
    const diagramdesc = curFeat.properties.description;

    // if it is a line then simply buffer it and paint it black with a small height
    if (curFeat.geometry.type === "LineString") {
        f = turf.buffer(curFeat, 0.05, {
            units: 'kilometers'
        });
        if (f['type'] === "Feature") {
            f = {
                "type": "FeatureCollection",
                "features": [f]
            }
        }
        var linefeats = f.features;
        var linefeatlen = linefeats.length;
        for (var x1 = 0; x1 < linefeatlen; x1++) {
            curlineFeat = linefeats[x1];
            var height = elevationoffset + 0.5;
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

        var featProps = curFeat.properties;

        if (whiteListedSysName.indexOf(curFeatSys) >= 0) { // system is whitelisted
            if (curFeat.properties.areatype === 'project') {
                //100 meter cell width
                if ((featProps.sysname === 'HDH') || (featProps.sysname === 'HSNG') || (featProps.sysname === 'HSG') || (featProps.sysname === 'MIX')) {
                    var hdh = new HDHousing();
                    var constrainedgrid = hdh.generateSquareGridandConstrain(curFeat);
                    var bldgs = hdh.generateBuildings(constrainedgrid);
                    for (var k2 = 0; k2 < bldgs.features.length; k2++) {
                        bldgs.features[k2].properties.description = diagramdesc;
                        curGJFeats.push(bldgs.features[k2]);
                    }
                } else if ((featProps.sysname === 'MXD')) {
                    var mxd = new MXDBuildings();
                    var mxdgrid = mxd.generateSquareGridandConstrain(curFeat);
                    var mxdbld = mxd.generateBuildings(mxdgrid);

                    for (var k3 = 0; k3 < mxdbld.features.length; k3++) {
                        mxdbld.features[k3].properties.description = diagramdesc;
                        curGJFeats.push(mxdbld.features[k3]);
                    }
                } else if ((featProps.sysname === 'LDH') || (featProps.sysname === 'LOW-H')) {

                    var ldh = new LDHousing();
                    var p = ldh.genGrid(curFeat);
                    var ptsWithin = p[0];
                    var featExtent = p[1];
                    var bldgs = ldh.generateBuildingFootprints(ptsWithin);
                    var ldhstreets = new StreetsHelper();
                    var ldhstreetFeatureCollection = ldhstreets.genStreetsGrid(ptsWithin, featExtent);
                    var ldhfinalFeatures = ldhstreets.filterStreets(ldhstreetFeatureCollection, bldgs);

                    if (genstreets) {
                        ldhfinalFeatures.push.apply(ldhfinalFeatures, ldhstreetFeatureCollection.features);
                    }
                    for (var k1 = 0; k1 < ldhfinalFeatures.length; k1++) {
                        ldhfinalFeatures[k1].properties.description = diagramdesc;
                        curGJFeats.push(ldhfinalFeatures[k1]);
                    }
                } else if ((featProps.sysname === 'COM') || (featProps.sysname === 'COMIND')) {
                    var com = new COMBuilding();
                    var comp = com.genGrid(curFeat);
                    var comptsWithin = comp[0];
                    var comfeatExtent = comp[1];
                    var combldgs = com.generateBuildingFootprints(comptsWithin);
                    var comstreets = new StreetsHelper();
                    var comstreetFeatureCollection = comstreets.genStreetsGrid(comptsWithin, comfeatExtent);
                    var comfinalFeatures = comstreets.filterStreets(comstreetFeatureCollection, combldgs);

                    if (genstreets) {
                        comfinalFeatures.push.apply(comfinalFeatures, comstreetFeatureCollection.features);
                    }
                    for (var k1 = 0; k1 < comfinalFeatures.length; k1++) {
                        comfinalFeatures[k1].properties.description = diagramdesc;
                        curGJFeats.push(comfinalFeatures[k1]);
                    }
                }
            } else if (curFeat.properties.areatype === 'policy') { // whitelisted policy
                var policyF = generatePolicyFeatures(curFeat);
                for (var pf = 0; pf < policyF.length; pf++) {
                    policyF[pf].properties.description = diagramdesc;
                    curGJFeats.push(policyF[pf]);
                }
            }

        }
        // for non white listed systems that are buildings
        else if ((featProps.systag === 'Large buildings, Industry, commerce') && (featProps.areatype === 'project')) { // 

            var lab = new LABBuildings();
            var labgrid = lab.genGrid(curFeat);
            var labptsWithin = labgrid[0];
            var labfeatExtent = labgrid[1];
            var labbldgs = lab.generateBuildingFootprints(labptsWithin);

            var labstreets = new StreetsHelper();
            var labStreetsFC = labstreets.genStreetsGrid(labptsWithin, labfeatExtent);
            var labFinalFeatures = labstreets.filterStreets(labStreetsFC, labbldgs);

            if (genstreets) {
                labFinalFeatures.push.apply(labFinalFeatures, labStreetsFC.features);
            }
            for (var k6 = 0; k6 < labFinalFeatures.length; k6++) {
                labFinalFeatures[k6].properties.description = diagramdesc;
                curGJFeats.push(labFinalFeatures[k6]);
            }

        } else if ((featProps.systag === 'Small buildings, low density housing') && (featProps.areatype === 'project')) {

            var smb = new SMBBuildings();
            var smbgrid = smb.genGrid(curFeat);
            var smbptsWithin = smbgrid[0];
            var smbfeatExtent = smbgrid[1];
            var smbbldgs = smb.generateBuildingFootprints(smbptsWithin);
            var smbStreets = new StreetsHelper();
            var smbStreetFeat = smbStreets.genStreetsGrid(smbptsWithin, smbfeatExtent);
            var smbFinalFeatures = smbStreets.filterStreets(smbStreetFeat, smbbldgs);

            if (genstreets) {
                smbFinalFeatures.push.apply(smbFinalFeatures, smbStreetFeat.features);
            }
            for (var k1 = 0; k1 < smbFinalFeatures.length; k1++) {
                smbFinalFeatures[k1].properties.description = diagramdesc;
                curGJFeats.push(smbFinalFeatures[k1]);
            }


        } else { // all systems that not buildings
            if (curFeat.properties.areatype === 'project') {
                var height = elevationoffset + 0.01;
                var prop = {
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
            // else if (curFeat.properties.areatype === 'policy') {
            //     var policyF = generatePolicyFeatures(curFeat);
            //     for (var pf = 0; pf < policyF.length; pf++) {
            //         curGJFeats.push(policyF[pf]);
            //     }
            // }
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