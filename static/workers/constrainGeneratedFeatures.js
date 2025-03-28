function constrainFeatures(allFeaturesList, selectedSystems, showStreets) {
    const constrainedFeatures = { type: "FeatureCollection", features: [] };
    const allFeatures = JSON.parse(allFeaturesList);
    const selectedSystemsParsed = JSON.parse(selectedSystems);
    const showStreetsParsed = JSON.parse(showStreets);
    const features = allFeatures.features;
    const totalFeatures = features.length;

    features.forEach((feature, index) => {
        const { sysname: currentSystem, isStreet } = feature.properties;

        if (isStreet && showStreetsParsed) {
            constrainedFeatures.features.push(feature);
        } else if (selectedSystemsParsed.includes(currentSystem)) {
            constrainedFeatures.features.push(feature);
        }

        self.postMessage({
            percentcomplete: Math.floor((100 * (index + 1)) / totalFeatures),
            mode: "status",
        });
    });

    self.postMessage({
        polygons: JSON.stringify(constrainedFeatures),
    });
}

self.onmessage = function(e) {
    constrainFeatures(e.data.allFeaturesList, e.data.selectedsystems, e.data.showstreets);
}