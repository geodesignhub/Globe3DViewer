# Globe 3D viewer
This is a 3D viewer plugin to view designs generated in Geodesign Hub on a [CesiumJS](https://cesiumjs.org/) Globe. It takes diagrammatic designs from a geodesign project using the [Geodesign Hub API](https://www.geodesignhub.com/api) and generates building footprints, roads and renders them. In addition, you can download the building footprints generated as GeoJSON and use in GIS and other software and further processing and visualization. It is particularly useful if the study area is large and you want to see various features over a large study area and landscape.


### Building Generation
This plugin comes with a library that builds a footprint pattern. This library generates different building types have different typologies and depending on the system type: High Density Housing, Low Density Housing, etc. The building meta data is captured from Geodesign Hub and the heights are generated randomly in real time. In addition, existing streets are downloaded from the [gROADS](http://sedac.ciesin.columbia.edu/data/set/groads-global-roads-open-access-v1/data-download)  database to ensure that the footprint pattern generated not not overlap existing roads. 
### Adding your project
This plugin can be added to your project in the Administration interface. 

## Screenshots
Some screenhots from the tool are below.

### Viewing development of a small block
![logo1](https://i.imgur.com/ess78v2.jpg)

### Generation of roads
![roadgenerated](https://i.imgur.com/eLlcoZ9.jpg)

### Showing more features
![morefeats](https://i.imgur.com/Kll7fmC.jpg)

### User Interface and Download
![download](https://i.imgur.com/BXRSHxc.png)
