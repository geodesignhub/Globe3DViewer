const turf = require('@turf/turf');

class COMBuilding {
    constructor() {
        this.gridsize = 0.03;
        this.elevationOffset = 1;
        this.footprintSize = 0.015;
        this.comHeights = [14, 25, 30, 22, 28];
        this.units = { units: 'kilometers' };
        this.bufferWidth = this.gridsize - 0.01; // 30-meter buffer
        this.nearestSearch = [0, 1, 2];
        this.floorHeight = 5;
        this.avgUnitSize = 50;
        this.featProps = null;
        this.featExtent = null;
    }

    genGrid(curFeat) {
        this.featProps = curFeat.properties;
        this.featExtent = turf.bbox(curFeat);
        const grid = turf.pointGrid(this.featExtent, this.gridsize, this.units);
        const ptsWithin = turf.within(grid, { type: "FeatureCollection", features: [curFeat] });
        return [ptsWithin, this.featExtent];
    }

    generateBuildingFootprints(ptsWithin) {
        const allGeneratedFeats = [];
        const alreadyAdded = { type: "FeatureCollection", features: [] };
        const availablePts = this._initializeAvailablePoints(ptsWithin);

        const ptsLen = Math.min(ptsWithin.features.length, 7500);
        for (let i = 0; i < ptsLen; i++) {
            const curPt = ptsWithin.features[i];
            delete availablePts[curPt.properties.id];

            const allPts = [curPt.geometry.coordinates];
            const nearest = this.nearestSearch[Math.floor(Math.random() * this.nearestSearch.length)];

            if (nearest) {
                this._addNearestPoints(curPt, nearest, availablePts, allPts);
                const building = this._createBuildingFromLine(allPts, alreadyAdded);
                if (building) allGeneratedFeats.push(building);
            } else {
                const building = this._createBuildingFromPoint(curPt, alreadyAdded);
                if (building) allGeneratedFeats.push(building);
            }
        }

        return allGeneratedFeats;
    }

    _initializeAvailablePoints(ptsWithin) {
        const availablePts = {};
        ptsWithin.features.forEach((feature) => {
            const id = makeid();
            feature.properties.id = id;
            availablePts[id] = feature;
        });
        return availablePts;
    }

    _addNearestPoints(curPt, nearest, availablePts, allPts) {
        for (let i = 0; i < nearest; i++) {
            const availPts = { type: "FeatureCollection", features: Object.values(availablePts) };
            const nearestPt = availPts.features.length > 0 ? turf.nearestPoint(curPt, availPts) : null;
            if (nearestPt) {
                delete availablePts[nearestPt.properties.id];
                allPts.push(nearestPt.geometry.coordinates);
            }
        }
    }

    _createBuildingFromLine(allPts, alreadyAdded) {
        const lineString = turf.lineString(allPts);
        const buffer = turf.buffer(lineString, 0.0075, this.units);
        const bbox = turf.bbox(buffer);
        const building = turf.bboxPolygon(bbox);

        if (!this._hasIntersection(building, alreadyAdded)) {
            return this._finalizeBuilding(building, alreadyAdded);
        }
        return null;
    }

    _createBuildingFromPoint(curPt, alreadyAdded) {
        const buffered = turf.buffer(curPt, this.bufferWidth, this.units);
        const bbox = turf.bbox(buffered);
        const building = turf.bboxPolygon(bbox);

        if (!this._hasIntersection(building, alreadyAdded)) {
            return this._finalizeBuilding(building, alreadyAdded);
        }
        return null;
    }

    _hasIntersection(building, alreadyAdded) {
        return alreadyAdded.features.some((addedFeat) => {
            try {
                return turf.intersect(addedFeat, building);
            } catch {
                return false;
            }
        });
    }

    _finalizeBuilding(building, alreadyAdded) {
        const area = turf.area(building);
        const height = this.elevationOffset + this.comHeights[Math.floor(Math.random() * this.comHeights.length)];
        const numFloors = Math.round(height / this.floorHeight);
        const numUnitsPerFloor = Math.round(area / this.avgUnitSize);
        const totalUnits = numUnitsPerFloor * numFloors;

        building.properties = {
            totalunits: totalUnits,
            height: height,
            color: "#d0d0d0",
            roofColor: this.featProps.color,
            isStreet: 0,
            isBuilding: 1,
            sysname: this.featProps.sysname,
        };

        alreadyAdded.features.push(building);
        return building;
    }
}
class LDHousing {
    constructor() {
        this.density = 30; // dwellings / hectare
        this.buildingsPerHectare = 20;
        this.gridSize = 0.04;
        this.footprintSize = 0.012;
        this.ldhHeights = [1, 2, 3]; // in meters
        this.units = { units: 'kilometers' };
        this.elevationOffset = 1;
        this.floorHeight = 5;
        this.avgUnitSize = 100;
    }

    genGrid(curFeat) {
        this.featProps = curFeat.properties;
        this.featExtent = turf.bbox(curFeat);
        const diagJSON = {
            type: "FeatureCollection",
            features: [curFeat]
        };
        const grid = turf.pointGrid(this.featExtent, this.gridSize, this.units);
        const ptsWithin = turf.within(grid, diagJSON);
        return [ptsWithin, this.featExtent];
    }

    generateBuildingFootprints(ptsWithin) {
        const allGeneratedFeats = [];
        const { color, sysname } = this.featProps;
        const bufferWidth = this.gridSize - 0.01; // 30-meter buffer
        const ptsLen = Math.min(ptsWithin.features.length, 7500);

        for (let k = 0; k < ptsLen; k++) {
            const curPt = ptsWithin.features[k];
            const buffered = turf.buffer(curPt, bufferWidth, this.units);
            const bds = turf.bbox(buffered);
            const bfrdExtPlgn = turf.bboxPolygon(bds);
            const centrePoint = turf.centroid(bfrdExtPlgn);
            const bldg = turf.buffer(centrePoint, this.footprintSize, this.units);
            const bpoly = turf.bboxPolygon(turf.bbox(bldg));
            const area = turf.area(bpoly);
            const height = this.elevationOffset + this.ldhHeights[Math.floor(Math.random() * this.ldhHeights.length)];
            const numFloors = Math.round(height / this.floorHeight);
            const numUnitsPerFloor = Math.round(area / this.avgUnitSize);
            const totalUnits = numUnitsPerFloor * numFloors;

            bpoly.properties = {
                totalunits: totalUnits,
                height: height,
                color: "#d0d0d0",
                roofColor: color,
                isStreet: 0,
                isBuilding: 1,
                sysname: sysname
            };

            allGeneratedFeats.push(bpoly);
        }

        return allGeneratedFeats;
    }
}
class HDHousing {
    constructor() {
        this.density = 80; // dwellings / hectare
        this.buildingsPerHectare = 2;
        this.gridSize = 0.05; // changes the maximum area
        this.footprintSize = 0.015;
        this.heights = [36, 60, 90]; // in meters
        this.units = { units: 'kilometers' };
        this.elevationOffset = 1;
        this.floorHeight = 5;
        this.avgUnitSize = 50;
    }

    generateSquareGridAndConstrain(featureGeometry) {
        const featureArea = turf.area(featureGeometry);
        const numberOfExtrusions = Math.round((featureArea * 0.0001) * this.buildingsPerHectare);
        this.featProps = featureGeometry.properties;
        const featureExtent = turf.bbox(featureGeometry);
        const squareGrid = turf.squareGrid(featureExtent, this.gridSize, this.units);

        const constrainedGrid = {
            type: "FeatureCollection",
            features: []
        };

        const gridFeatures = squareGrid.features;
        const extrusionRatio = numberOfExtrusions / gridFeatures.length;

        if (extrusionRatio < 0.20 || numberOfExtrusions < 15) {
            constrainedGrid.features = gridFeatures.slice(0, numberOfExtrusions).map((gridFeature) => {
                try {
                    return turf.intersect(gridFeature, featureGeometry) || gridFeature;
                } catch {
                    return gridFeature;
                }
            });
        } else {
            const gridStore = Object.fromEntries(gridFeatures.map((grid, index) => [index, grid]));
            let extrudedFeaturesCount = 0;

            while (extrudedFeaturesCount < numberOfExtrusions) {
                const randomGridId = Math.floor(Math.random() * gridFeatures.length);
                const gridFeature = gridStore[randomGridId];

                try {
                    const intersectedFeature = turf.intersect(gridFeature, featureGeometry);
                    constrainedGrid.features.push(intersectedFeature || gridFeature);
                } catch {
                    constrainedGrid.features.push(gridFeature);
                }

                extrudedFeaturesCount++;
            }
        }

        return constrainedGrid;
    }

    generateBuildings(constrainedGrid) {
        const maxFeatures = Math.min(constrainedGrid.features.length, 7500);
        const generatedGeoJSON = {
            type: "FeatureCollection",
            features: []
        };

        constrainedGrid.features.slice(0, maxFeatures).forEach((gridFeature) => {
            const area = turf.area(gridFeature);

            if (area > 2000 && Math.random() > 0.6) {
                const building = this._createBuilding(gridFeature, area);
                if (building) {
                    generatedGeoJSON.features.push(building);
                }
            }
        });

        return generatedGeoJSON;
    }

    _createBuilding(gridFeature, area) {
        try {
            const centroid = turf.centroid(gridFeature);
            const bufferedCentroid = turf.buffer(centroid, this.footprintSize, this.units);
            const bboxPolygon = turf.bboxPolygon(turf.bbox(bufferedCentroid));
            const height = this.elevationOffset + this.heights[Math.floor(Math.random() * this.heights.length)];
            const numFloors = Math.round(height / this.floorHeight);
            const numUnitsPerFloor = Math.round(area / this.avgUnitSize);
            const totalUnits = numUnitsPerFloor * numFloors;

            bboxPolygon.properties = {
                totalunits: totalUnits,
                height: height,
                color: "#d0d0d0",
                roofColor: this.featProps.color,
                sysname: this.featProps.sysname,
                isStreet: 0,
                isBuilding: 1
            };

            return bboxPolygon;
        } catch (err) {
            console.error("Error creating building:", err);
            return null;
        }
    }
}

class MXDBuildings {
    constructor() {
        this.density = 40; // dwellings per hectare
        this.outerRingRadius = 0.04;
        this.middleRingRadius = 0.02;
        this.innerRingRadius = 0.01;
        this.gridSize = 0.08;
        this.elevationOffset = 1;
        this.heights = [9, 12, 8, 11]; // in meters
        this.units = { units: 'kilometers' };
        this.floorHeight = 5;
        this.avgUnitSize = 75;
    }

    generateSquareGridAndConstrain(featureGeometry) {
        this.featProps = featureGeometry.properties;
        const featExtent = turf.bbox(featureGeometry);
        const squareGrid = turf.squareGrid(featExtent, this.gridSize, this.units);

        const constrainedGrid = {
            type: "FeatureCollection",
            features: squareGrid.features.filter((gridFeature) => {
                try {
                    return turf.intersect(gridFeature, featureGeometry);
                } catch {
                    return false;
                }
            })
        };

        return constrainedGrid;
    }

    generateBuildings(constrainedGrid) {
        const generatedGeoJSON = {
            type: "FeatureCollection",
            features: []
        };

        const maxFeatures = Math.min(constrainedGrid.features.length, 7500);

        constrainedGrid.features.slice(0, maxFeatures).forEach((gridFeature) => {
            const area = turf.area(gridFeature);
            const center = turf.centroid(gridFeature);

            if (area > 6300 && Math.random() < 0.5) {
                const buildingPolygon = this._createBuildingPolygon(center, area);
                if (buildingPolygon) {
                    generatedGeoJSON.features.push(buildingPolygon);
                }
            }
        });

        return generatedGeoJSON;
    }

    _createBuildingPolygon(center, area) {
        try {
            const outerRing = turf.buffer(center, this.outerRingRadius, this.units);
            const middleRing = turf.buffer(center, this.middleRingRadius, this.units);
            const innerRing = turf.buffer(center, this.innerRingRadius, this.units);

            const hybridHole = turf.difference(turf.bboxPolygon(turf.bbox(outerRing)), turf.bboxPolygon(turf.bbox(innerRing)));
            const buildingPolygon = turf.difference(hybridHole, turf.bboxPolygon(turf.bbox(middleRing)));

            if (buildingPolygon) {
                const height = this.elevationOffset + this.heights[Math.floor(Math.random() * this.heights.length)];
                const numFloors = Math.round(height / this.floorHeight);
                const numUnitsPerFloor = Math.round(area / this.avgUnitSize);
                const totalUnits = numUnitsPerFloor * numFloors;

                buildingPolygon.properties = {
                    totalunits: totalUnits,
                    height: height,
                    color: "#d0d0d0",
                    roofColor: this.featProps.color,
                    isStreet: 0,
                    isBuilding: 1,
                    sysname: this.featProps.sysname
                };

                return buildingPolygon;
            }
        } catch (err) {
            console.error("Error creating building polygon:", err);
        }

        return null;
    }
}
class LABBuildings {
    constructor() {
        this.labHeights = [10, 15];
        this.nearestSearch = [0, 1, 2];
        this.units = { units: 'kilometers' };
        this.cellWidth = 0.03;
        this.elevationOffset = 1;
        this.floorHeight = 5;
        this.avgUnitSize = 100;
    }

    genGrid(curFeat) {
        this.featProps = curFeat.properties;
        this.featExtent = turf.bbox(curFeat);
        const diagJSON = {
            type: "FeatureCollection",
            features: [curFeat]
        };
        const grid = turf.pointGrid(this.featExtent, this.cellWidth, this.units);
        const ptsWithin = turf.within(grid, diagJSON);
        return [ptsWithin, this.featExtent];
    }

    generateBuildingFootprints(ptsWithin) {
        const allGeneratedFeats = [];
        const { color, systag, sysname } = this.featProps;
        const alreadyAdded = {
            type: "FeatureCollection",
            features: []
        };
        const availablePts = {};
        const ptsLen = Math.min(ptsWithin.features.length, 7500);

        ptsWithin.features.forEach((feature, index) => {
            const id = makeid();
            feature.properties.id = id;
            availablePts[id] = feature;
        });

        for (let k = 0; k < ptsLen; k++) {
            const curPt = ptsWithin.features[k];
            const allPts = [curPt.geometry.coordinates];
            delete availablePts[curPt.properties.id];

            const nearest = this.nearestSearch[Math.floor(Math.random() * this.nearestSearch.length)];
            if (nearest) {
                const availPts = this._getAvailablePoints(availablePts);
                for (let i = 0; i < nearest; i++) {
                    const nearestPt = availPts.features.length > 0 ? turf.nearestPoint(curPt, availPts) : null;
                    if (nearestPt) {
                        delete availablePts[nearestPt.properties.id];
                        allPts.push(nearestPt.geometry.coordinates);
                    }
                }
            }

            if (allPts.length > 1) {
                const bldg = this._createBuilding(allPts, alreadyAdded);
                if (bldg) allGeneratedFeats.push(bldg);
            }
        }

        return allGeneratedFeats;
    }

    _getAvailablePoints(availablePts) {
        return {
            type: "FeatureCollection",
            features: Object.values(availablePts)
        };
    }

    _createBuilding(allPts, alreadyAdded) {
        try {
            const lineString = turf.lineString(allPts);
            const buffer = turf.buffer(lineString, 0.0075, this.units);
            const bbox = turf.bbox(buffer);
            const bldg = turf.bboxPolygon(bbox);
            const area = turf.area(bldg);

            if (!this._hasIntersection(bldg, alreadyAdded)) {
                const height = this.elevationOffset + this.labHeights[Math.floor(Math.random() * this.labHeights.length)];
                const numFloors = Math.round(height / this.floorHeight);
                const numUnitsPerFloor = Math.round(area / this.avgUnitSize);
                const totalUnits = numUnitsPerFloor * numFloors;

                bldg.properties = {
                    totalunits: totalUnits,
                    height: height,
                    color: "#d0d0d0",
                    roofColor: this.featProps.color,
                    isStreet: 0,
                    isBuilding: 1,
                    sysname: this.featProps.sysname
                };

                alreadyAdded.features.push(bldg);
                return bldg;
            }
        } catch (err) {
            console.error("Error creating building:", err);
        }
        return null;
    }

    _hasIntersection(bldg, alreadyAdded) {
        return alreadyAdded.features.some((addedFeat) => {
            try {
                return turf.intersect(addedFeat, bldg);
            } catch {
                return false;
            }
        });
    }
}
class SMBBuildings {
    constructor() {
        this.smbHeights = [3, 5, 6, 7, 10];
        this.gridsize = 0.04;
        this.footprintsize = 0.012;
        this.units = { units: 'kilometers' };
        this.nearestSearch = [0, 1, 2];
        this.elevationOffset = 1;
        this.bufferWidth = this.gridsize - 0.015;
        this.bldgFootprint = 0.015;
        this.floorHeight = 5;
        this.avgUnitSize = 75;
    }

    genGrid(curFeat) {
        this.featProps = curFeat.properties;
        this.featExtent = turf.bbox(curFeat);
        const diagJSON = {
            type: "FeatureCollection",
            features: [curFeat]
        };
        const grid = turf.pointGrid(this.featExtent, this.gridsize, this.units);
        const ptsWithin = turf.within(grid, diagJSON);
        return [ptsWithin, this.featExtent];
    }

    generateUnits(area) {
        const height = this.elevationOffset + this.smbHeights[Math.floor(Math.random() * this.smbHeights.length)];
        const numFloors = Math.round(height / this.floorHeight);
        const numUnitsPerFloor = Math.round(area / this.avgUnitSize);
        return numUnitsPerFloor * numFloors;
    }

    generateBuildingFootprints(ptsWithin) {
        const allGeneratedFeats = [];
        const { color, systag, sysname } = this.featProps;
        const alreadyAdded = {
            type: "FeatureCollection",
            features: []
        };
        const ptsLen = Math.min(ptsWithin.features.length, 7500);

        for (let k = 0; k < ptsLen; k++) {
            if (Math.random() < 0.5) {
                const curPt = ptsWithin.features[k];
                const buffered = turf.buffer(curPt, this.bufferWidth, this.units);
                const bds = turf.bbox(buffered);
                const bfrdExtPlgn = turf.bboxPolygon(bds);
                const centrePoint = turf.centroid(bfrdExtPlgn);
                const bldg = turf.buffer(centrePoint, this.bldgFootprint, this.units);
                const bdgPly = turf.bbox(bldg);
                const bpoly = turf.bboxPolygon(bdgPly);
                const area = turf.area(bpoly);
                const totalUnits = this.generateUnits(area);
                const height = this.elevationOffset + this.smbHeights[Math.floor(Math.random() * this.smbHeights.length)];

                bpoly.properties = {
                    totalunits: totalUnits,
                    height: height,
                    color: "#d0d0d0",
                    roofColor: color,
                    isStreet: 0,
                    isBuilding: 1,
                    sysname: sysname
                };

                allGeneratedFeats.push(bpoly);
            }
        }

        return allGeneratedFeats;
    }
}
class StreetsHelper {
    constructor() {
        this.elevationOffset = 1;
    }

    genStreetsGrid(pointsWithin, extent) {
        const rows = {};
        const columns = {};
        const roadPoints = [];
        const roadPointsVert = [];
        const buildingPoints = [];
        const buildingPointsVert = [];
        let distance = 0;

        pointsWithin.features.forEach((curPt) => {
            const [curLng, curLat] = curPt.geometry.coordinates;
            rows[curLng] = rows[curLng] || [];
            columns[curLat] = columns[curLat] || [];
            rows[curLng].push(curPt);
            columns[curLat].push(curPt);
        });

        const sortedCols = Object.entries(columns)
            .map(([key, points]) => ({ key: parseFloat(key), points }))
            .sort((a, b) => a.key - b.key);

        const sortedRows = Object.entries(rows)
            .map(([key, points]) => ({ key: parseFloat(key), points }))
            .sort((a, b) => a.key - b.key);

        sortedCols.forEach((col, index) => {
            (index % 3 === 0 ? roadPoints : buildingPoints).push(col);
        });

        sortedRows.forEach((row, index) => {
            (index % 5 === 0 ? roadPointsVert : buildingPointsVert).push(row);
        });

        const streets = this._generateStreets(roadPoints, distance);
        if (distance >= 0.7) {
            streets.push(...this._generateStreets(roadPointsVert, distance));
        }

        return {
            type: "FeatureCollection",
            features: streets,
        };
    }

    _generateStreets(roadPoints, distance) {
        const streets = [];
        roadPoints.forEach((curRoad) => {
            const tmpPts = curRoad.points.map((pt) => pt.geometry.coordinates);
            if (tmpPts.length > 1) {
                const linestring = turf.lineString(tmpPts);
                const d = turf.length(linestring, { units: "kilometers" });
                distance = Math.max(distance, Math.round(d));
                const street = turf.buffer(linestring, 0.0075, { units: "kilometers" });
                if (street.type === "Feature") {
                    street.features = [street];
                }
                street.features[0].properties = {
                    color: "#202020",
                    roofColor: "#202020",
                    height: this.elevationOffset + 0.1,
                    isStreet: 1,
                    isBuilding: 0,
                };
                streets.push(...street.features);
            }
        });
        return streets;
    }

    filterStreets(streetGrid, inputFeats) {
        return inputFeats.filter((curF1) => {
            return !streetGrid.features.some((curStF) => {
                try {
                    return turf.intersect(curF1, curStF);
                } catch {
                    return false;
                }
            });
        });
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
    const elevationOffset = 1;

    const getCellWidth = (area) => {
        if (area > 10000000) return 1;
        if (area > 6000000) return 0.75;
        if (area > 5000000) return 0.5;
        if (area > 3000000) return 0.3;
        if (area > 2000000) return 0.15;
        if (area > 1000000) return 0.08;
        return 0.04;
    };

    const curFeatProps = curFeat.properties;
    const boundingBox = turf.bbox(curFeat);
    const area = Math.round(turf.area(curFeat));
    const cellWidth = getCellWidth(area);
    const units = { units: 'kilometers' };

    const grid = turf.pointGrid(boundingBox, cellWidth, units);
    const pointsWithin = turf.within(grid, { type: "FeatureCollection", features: [curFeat] });

    const height = elevationOffset + 0.01;
    const properties = {
        roofColor: curFeatProps.color,
        height: height,
        isStreet: 0,
        isBuilding: 0,
        sysname: curFeatProps.sysname
    };

    return pointsWithin.features.map((point) => {
        const bufferedFeature = turf.buffer(point, 0.0075, units);
        bufferedFeature.properties = properties;
        return bufferedFeature;
    });
}
function generateCenter(constraintedModelDesigns) {
    const centerPoint = turf.center(constraintedModelDesigns);
    const [lng, lat] = centerPoint.geometry.coordinates;
    return [lat, lng];
}
function generateFinal3DGeoms(currentFeature, genstreets) {
    const elevationOffset = 1;
    const generateStreets = genstreets !== 'false';
    const whiteListedSysNames = ['HIGH-H', 'LOW-H', 'HDH', 'LDH', 'COM', 'COMIND', 'HSG', 'HSNG', 'MXD', 'MIX', 'STL'];
    const curGJFeats = [];
    const curFeat = currentFeature;
    const { sysname: curFeatSys, description: diagramDesc, areatype, systag, color } = curFeat.properties;

    if (curFeat.geometry.type === "LineString") {
        return handleLineString(curFeat, elevationOffset, diagramDesc);
    }

    if (curFeat.geometry.type === "Polygon") {
        if (whiteListedSysNames.includes(curFeatSys)) {
            return handleWhitelistedPolygon(curFeat, curFeatSys, areatype, diagramDesc, generateStreets);
        }

        if (areatype === 'project') {
            if (systag === 'Large buildings, Industry, commerce') {
                return handleLABBuildings(curFeat, diagramDesc, generateStreets);
            } else if (systag === 'Small buildings, low density housing') {
                return handleSMBBuildings(curFeat, diagramDesc, generateStreets);
            } else {
                return handleNonBuildingProject(curFeat, elevationOffset, diagramDesc);
            }
        }

        if (areatype === 'policy') {
            return handlePolicyArea(curFeat, diagramDesc);
        }
    }

    return curGJFeats;
}

function handleLineString(curFeat, elevationOffset, diagramDesc) {
    const buffered = turf.buffer(curFeat, 0.001, { units: 'kilometers' });
    const features = buffered.type === "Feature" ? [buffered] : buffered.features;

    return features.map((curlineFeat) => {
        curlineFeat.properties = {
            color: curFeat.properties.color,
            description: diagramDesc,
            roofColor: curFeat.properties.color,
            isStreet: 0,
            isBuilding: 0,
            sysname: curFeat.properties.sysname,
            height: elevationOffset + 0.5,
        };
        return curlineFeat;
    });
}

function handleWhitelistedPolygon(curFeat, curFeatSys, areatype, diagramDesc, generateStreets) {
    const curGJFeats = [];
    if (areatype === 'project') {
        const buildingHandler = getBuildingHandler(curFeatSys);
        if (buildingHandler) {
            const features = buildingHandler(curFeat, diagramDesc, generateStreets);
            curGJFeats.push(...features);
        }
    } else if (areatype === 'policy') {
        const policyFeatures = generatePolicyFeatures(curFeat);
        policyFeatures.forEach((feature) => {
            feature.properties.description = diagramDesc;
            curGJFeats.push(feature);
        });
    }
    return curGJFeats;
}

function getBuildingHandler(curFeatSys) {
    const handlers = {
        'HDH': handleHDHousing,
        'HSNG': handleHDHousing,
        'HSG': handleHDHousing,
        'MIX': handleHDHousing,
        'STL': handleHDHousing,
        'MXD': handleMXDBuildings,
        'LDH': handleLDHousing,
        'LOW-H': handleLDHousing,
        'COM': handleCOMBuildings,
        'COMIND': handleCOMBuildings,
    };
    return handlers[curFeatSys];
}

function handleHDHousing(curFeat, diagramDesc, generateStreets) {
    const hdh = new HDHousing();
    const constrainedGrid = hdh.generateSquareGridAndConstrain(curFeat);
    const buildings = hdh.generateBuildings(constrainedGrid);
    return buildings.features.map((feature) => {
        feature.properties.description = diagramDesc;
        return feature;
    });
}

function handleMXDBuildings(curFeat, diagramDesc, generateStreets) {
    const mxd = new MXDBuildings();
    const constrainedGrid = mxd.generateSquareGridAndConstrain(curFeat);
    const buildings = mxd.generateBuildings(constrainedGrid);
    return buildings.features.map((feature) => {
        feature.properties.description = diagramDesc;
        return feature;
    });
}

function handleLDHousing(curFeat, diagramDesc, generateStreets) {
    const ldh = new LDHousing();
    const [ptsWithin, featExtent] = ldh.genGrid(curFeat);
    const buildings = ldh.generateBuildingFootprints(ptsWithin);
    const streetsHelper = new StreetsHelper();
    const streetFeatures = streetsHelper.genStreetsGrid(ptsWithin, featExtent);
    const finalFeatures = streetsHelper.filterStreets(streetFeatures, buildings);

    if (generateStreets) {
        finalFeatures.push(...streetFeatures.features);
    }

    return finalFeatures.map((feature) => {
        feature.properties.description = diagramDesc;
        return feature;
    });
}

function handleCOMBuildings(curFeat, diagramDesc, generateStreets) {
    const com = new COMBuilding();
    const [ptsWithin, featExtent] = com.genGrid(curFeat);
    const buildings = com.generateBuildingFootprints(ptsWithin);
    const streetsHelper = new StreetsHelper();
    const streetFeatures = streetsHelper.genStreetsGrid(ptsWithin, featExtent);
    const finalFeatures = streetsHelper.filterStreets(streetFeatures, buildings);

    if (generateStreets) {
        finalFeatures.push(...streetFeatures.features);
    }

    return finalFeatures.map((feature) => {
        feature.properties.description = diagramDesc;
        return feature;
    });
}

function handleLABBuildings(curFeat, diagramDesc, generateStreets) {
    const lab = new LABBuildings();
    const [ptsWithin, featExtent] = lab.genGrid(curFeat);
    const buildings = lab.generateBuildingFootprints(ptsWithin);
    const streetsHelper = new StreetsHelper();
    const streetFeatures = streetsHelper.genStreetsGrid(ptsWithin, featExtent);
    const finalFeatures = streetsHelper.filterStreets(streetFeatures, buildings);

    if (generateStreets) {
        finalFeatures.push(...streetFeatures.features);
    }

    return finalFeatures.map((feature) => {
        feature.properties.description = diagramDesc;
        return feature;
    });
}

function handleSMBBuildings(curFeat, diagramDesc, generateStreets) {
    const smb = new SMBBuildings();
    const [ptsWithin, featExtent] = smb.genGrid(curFeat);
    const buildings = smb.generateBuildingFootprints(ptsWithin);
    const streetsHelper = new StreetsHelper();
    const streetFeatures = streetsHelper.genStreetsGrid(ptsWithin, featExtent);
    const finalFeatures = streetsHelper.filterStreets(streetFeatures, buildings);

    if (generateStreets) {
        finalFeatures.push(...streetFeatures.features);
    }

    return finalFeatures.map((feature) => {
        feature.properties.description = diagramDesc;
        return feature;
    });
}

function handleNonBuildingProject(curFeat, elevationOffset, diagramDesc) {
    curFeat.properties = {
        description: diagramDesc,
        roofColor: curFeat.properties.color,
        isStreet: 0,
        isBuilding: 0,
        height: elevationOffset + 0.01,
        sysname: curFeat.properties.sysname,
    };
    return [curFeat];
}

function handlePolicyArea(curFeat, diagramDesc) {
    const policyFeatures = generatePolicyFeatures(curFeat);
    return policyFeatures.map((feature) => {
        feature.properties.description = diagramDesc;
        return feature;
    });
}


module.exports = {
    // constrainFeatures: constrainFeatures,
    generateCenter: generateCenter,
    generateFinal3DGeoms: generateFinal3DGeoms,
    // bufferExistingRoads: bufferExistingRoads
    // generate3DGeoms: generate3DGeoms
};