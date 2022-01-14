# Globe 3D viewer

This is a 3D viewer plugin to view designs generated in Geodesignhub on a [3D Globe](https://cesiumjs.org/). It takes diagrammatic designs from a geodesign project using and generates building footprints, roads and renders them. You can download these generated building footprints generated as GeoJSON and use in GIS and other software and further processing and visualization in other software e.g. ESRI CityEngine. It is particularly useful if the study area is large and you want to see various features over a large study area and landscape.

## Building Generation

This plugin comes with a library that builds a footprint pattern. This library generates different building types have different typologies and depending on the system type: High Density Housing, Low Density Housing, etc. The building meta data is captured from Geodesign Hub and the heights are generated randomly in real time.

### Background

Geodesign is successful when a diverse group of experts and non-experts participate. However, given this, they do not have the skills and time to learn a 3D visualization system and need fast visualization system for their ideas to move forward. The polygons are drawn by participants in a workshop and capture aspirational ideas for the place. When used to generate footprints, the system simple polygons and generates building footprints of different typologies depending on the metadata attached to the polygon.  

![transform](https://i.imgur.com/5QaWikf.png)

In practice, this means that when a polygon is drawn on the map by the user the intent of the user is captured and transformed to closely match his intention by generating footprints of buildings and street within that polygon which can then be extruded and shown in 3D.

![visualize](https://i.imgur.com/yiRhTIW.png)
The figure above shows the same concept in 3D: a user draws a polygon to show new housing and the system builds streets and housing to “realistically” visualize their idea.

## Adding your project

This plugin can be added to your project in the Administration interface.

## Screenshots

Some screen shots from the tool are below.

### Generation of roads

![roadgenerated](https://i.imgur.com/eLlcoZ9.jpg)

### Showing features

![morefeats](https://i.imgur.com/Kll7fmC.jpg)

### More buildings

![morebuildings](https://i.imgur.com/O9OOABI.jpg)

### Change Camera Angle

![cameraangle](https://i.imgur.com/RhTEa1C.jpg)

### User Interface and Download

![download](https://i.imgur.com/RGJwqdr.png)
