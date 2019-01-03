
import { Component, OnInit, ViewChild, ElementRef, Input, Output, EventEmitter } from '@angular/core';
import { loadModules } from 'esri-loader';
import { ReplaySubject } from 'rxjs';
import { SidebarComponent } from '../sidebar/sidebar.component';
import * as vars from './variables';
import * as fn from './utilityFunctions';
import esri = __esri;
import { IndustriesGeojson } from '../services/industries-geojson.service';
import { PrintLegendDirective } from '../directives/print-legend.directive';
import { PointincountyService } from '../services/pointincounty.service';
import { DatafiltersService } from '../services/datafilters.service';
import { WindowService } from '../services/window.service';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-esrimap',
  templateUrl: './esrimap.component.html',
  styleUrls: ['./esrimap.component.scss'],
  providers: [PrintLegendDirective]

})

export class EsrimapComponent implements OnInit {

  // map vars with default values
  public title = 'fa-chevron-left';
  public slideStatus = 'slideIn';
  public slideOpen = true;
  public displayslidebtn = 'nodisplay';
  public basemapWidgetVisible = false;
  public basemapWidgetClass = 'basemapToggleHidden';
  mapView: esri.MapView;
  map: esri.Map;
  public industriesGraphicsLayer: esri.GraphicsLayer;
  public allIndustries: any = [];
  public mapLoaded = new EventEmitter<boolean>();
  public __mapViewStatus = new ReplaySubject<boolean>();
  public __sketchStatus = new ReplaySubject<boolean>();
  public printTask: esri.PrintTask;
  public printParams: esri.PrintParameters;
  public printTemplate: esri.PrintTemplate;
  public addBufferGraphic;
  public selectFeaturesByGeom;
  public performSpatialQuery;
  public buffer;
  public addVertices;
  public action;
  public createGraphic;
  public createCircle;
  public drawLine;
  public editGraphic;
  public labelBufferDist;
  public sketchViewModel: esri.SketchViewModel;
  public setupSketchViewModel;
  public bufferLineGraphicLayer: esri.GraphicsLayer;
  public bufferLineGraphic;
  public graphicsLayer: esri.GraphicsLayer;
  public bufferGraphicsLayer: esri.GraphicsLayer;
  public tempGraphicsLayer: esri.GraphicsLayer;
  public circleGraphicsLayer: esri.GraphicsLayer;
  public addGraphic;
  public clearDrawGraphics;
  public draw: esri.Draw;
  public updateGraphic;
  public completeGraphicsForCircle;
  public updateGraphicTemp;
  public setupClickHandler;
  public touchEnabledDisplay = 'ontouchstart' in document.documentElement;
  public activatedSpatialControl = false;
  public drawToolActive = false;
  public drawInstructions = '';
  public _tempZoomPt;
  public mapBusy = false;
  public Instructions = {
    circle: 'Click on the map, hold and drag your mouse cursor. Click to complete the circle.',
    polygon: 'Click to add  points to the polygon. Double click to complete.',
    rectangle: 'Click hold and drag to draw a rectangle.',
    multipoint: 'Click to select one or more counties. Double click to complete.',
    clear: ''
  };
  public nativeWindow: any;
  // this is needed to be able to create the MapView at the DOM element in this component
  @ViewChild('mapViewNode') private mapViewEl: ElementRef;
  @ViewChild(SidebarComponent) private sideBar: SidebarComponent;

  public addGraphicsToMap;

  public toggleBasemaps(e) {
    console.log(1);
    this.basemapWidgetVisible = this.basemapWidgetVisible ? false : true;
    this.basemapWidgetClass = this.basemapWidgetVisible ? 'basemapToggleVisible' : 'basemapToggleHidden';
  }

  public onShowHideSideNav() {
    this.slideStatus = (this.slideOpen === true) ? 'slideOut' : 'slideIn';
    this.slideOpen = (this.slideOpen === true) ? false : true;
    console.log(this.slideOpen);
    this.displayslidebtn = (this.displayslidebtn === 'nodisplay') ? 'blockdisplay' : 'nodisplay';
  }
  public printMap() {
    this.__mapViewStatus.subscribe(_mapStatus => {
      if (_mapStatus) {
        this._data.printStatus = '';
        this._data.linkToPDFReport = '';
        const _legendBase64 = this._legendDirective.prepareLegend();
        console.log(_legendBase64);
        this.printParams.extraParameters = { Primary_Legend: _legendBase64.primaryLegend, Secondary_Legend: _legendBase64.secondaryLegend };
        this.printParams.set('Primary_Legend', _legendBase64.primaryLegend);
        const printTaskExecuted = this.printTask.execute(this.printParams);
        this._data.printStatus = 'running';
        printTaskExecuted.then((result) => {
          this._data.printStatus = 'completed';
          console.log(result['url']);
          this._data.linkToPDFReport = result['url'];

        }, (error) => {
          this._data.printStatus = 'error';
          console.log(error);
        });
      }
    });
  }

  public zoomIntoRowMap(evt) {
    const industryId = evt.industryId;
    const isSingleClick = evt.isSingleClick;
    // just open popup and pan if single click, otherwise zoom into it
    this.__mapViewStatus.subscribe(_mapStatus => {
      if (_mapStatus) {
        const iii = this.allIndustries.filter(__i => __i.properties.Id === industryId)[0];
        this.industriesGraphicsLayer.when(() => {
          let ind: any;
          this.industriesGraphicsLayer.graphics.forEach(_i => {
            if (_i.attributes.Id === industryId) {
              ind = _i;
            }
          });
          this._tempZoomPt.x = iii.geometry.coordinates[0];
          this._tempZoomPt.y = iii.geometry.coordinates[1];
          if (!isSingleClick) {
            this.mapView.goTo({ center: iii.geometry.coordinates, zoom: 13 });
          }
          this.mapView.popup.open({
            location: this._tempZoomPt,
            features: [ind]
          });
        },
          (err) => console.log('load failed', err));
      }
    });
  }

  public activateSpatialControl(control: any) {
    this.drawToolActive = true;
    this.mapBusy = true;
    this.__mapViewStatus.subscribe(_mapStatus => {
      if (_mapStatus) {
        if (['polygon', 'multipoint', 'rectangle', 'circle'].indexOf(control) !== -1) {
          if (control === 'multipoint') {
            // clear graphics for county selection
            this.clearDrawGraphics(true);
            this.drawInstructions = this.Instructions[control];
            this.mapBusy = false;
          } else {
            this.clearDrawGraphics(false);
            this.drawInstructions = this.Instructions[control];
            this.mapBusy = false;
          }
            this.__sketchStatus.subscribe(_sketchStatus => {
              if (_sketchStatus) {
                this.sketchViewModel.create(control);
              }
            });

        } else {
          this.clearDrawGraphics(true);
          this.drawInstructions = this.Instructions[control];
          this.mapBusy = false;
        }
      }
    });
  }
  constructor(private _data: IndustriesGeojson, private _legendDirective: PrintLegendDirective,
    private winRef: WindowService,
    private pointInCountyService: PointincountyService, private dataFilterService: DatafiltersService) {
    this.nativeWindow = winRef.getNativeWindow();
  }

  public ngOnInit() {

    this._data.activeSpatialControlObservable.subscribe(control => {
      console.log('activated this control ', control);
      this.activateSpatialControl(control);
    });

    // subscribe to perform query button click from sidebar
    this._data.performSpatialQueryObservable.subscribe(control => {
      this.drawToolActive = false;
      this.performSpatialQuery(control);
    });

    this._data.printMapObservable.subscribe(print => {
      this.printMap();
    });

    setTimeout(() => {
      return loadModules([
        'esri/Map', 'esri/views/MapView', 'esri/layers/FeatureLayer',
        'esri/geometry/geometryEngine', 'esri/views/ui/DefaultUI', 'esri/layers/TileLayer', 'esri/layers/MapImageLayer',
        'esri/layers/VectorTileLayer', 'esri/views/2d/draw/Draw', 'esri/geometry/Circle', 'esri/widgets/Home',
        'esri/widgets/Sketch/SketchViewModel', 'esri/geometry/Polyline', 'esri/geometry/SpatialReference', 'esri/geometry/Extent',
        'esri/Graphic', 'esri/layers/GraphicsLayer', 'esri/geometry/Point', 'esri/tasks/PrintTask',
        'esri/tasks/support/PrintTemplate', 'esri/tasks/support/PrintParameters', 'esri/widgets/BasemapGallery',
        'esri/widgets/BasemapToggle', 'dojo/domReady!'
      ])
        .then(([EsriMap, EsriMapView, FeatureLayer, geometryEngine, DefaultUI, TileLayer, MapImageLayer, VectorTileLayer, Draw, Circle, Home,
          SketchViewModel, Polyline, SpatialReference, Extent, Graphic, GraphicsLayer, Point, PrintTask, PrintTemplate, PrintParameters, BasemapGallery, BasemapToggle]) => {
          // create a boilerplate graphics layer for adding industries points later on
          this.industriesGraphicsLayer = new GraphicsLayer();

          this.graphicsLayer = new GraphicsLayer({ id: 'userGraphicsLayer' });
          this.circleGraphicsLayer = new GraphicsLayer({ id: 'circleGraphicsLayer' });
          this.tempGraphicsLayer = new GraphicsLayer({ id: 'tempGraphicsLayer' });

          const countyLayer = new MapImageLayer({ url: 'https://tfsgis-dfe02.tfs.tamu.edu/arcgis/rest/services/FPD/fpd2/MapServer' });
          this.map = new EsriMap({
            basemap: vars._basemap,
            layers: [countyLayer, this.industriesGraphicsLayer, this.graphicsLayer],
            spatialReference: new SpatialReference({ wkid: 4326 })
          });

          // set a empty point geometry for zoom in later
          this._tempZoomPt = new Point({
            x: 0,
            y: 0,
            spatialReference: { wkid: 4326 }
          });
          const fullExtent = new Extent({ xmin: -106.645646, ymin: 25.837377, xmax: -93.508292, ymax: 36.500704 }).expand(1.2);
          const _mapViewProperties = {
            container: this.mapViewEl.nativeElement,
            extent: fullExtent,
            // center: vars._center,
            // zoom: vars._zoom,
            map: this.map,
            constraints: {
              snapToZoom: false
            },
            popup: {
              dockEnabled: false,
              dockOptions: {
                // Disables the dock button from the popup
                buttonEnabled: true,
                // Ignore the default sizes that trigger responsive docking
                breakpoint: false,
                position: 'top-center'
              }
            },
          };
          this.addGraphicsToMap = () => {
            this._data.currentData.subscribe(d => {
              this.allIndustries = d;
              const e = new Graphic();
              this.industriesGraphicsLayer.removeAll();
              const graphicsArray: Array<any> = [];
              console.time('adding graphics intially');
              this.allIndustries.forEach(_industry => {
                const _industryPt = new Point({ longitude: _industry.geometry.coordinates[0], latitude: _industry.geometry.coordinates[1], spatialReference: { wkid: 4326 } });
                const _industryGraphic = new Graphic({
                  geometry: _industryPt,
                  symbol: fn.getSymbol(_industry.properties),
                  attributes: _industry.properties,
                  // popupTemplate: { title: '{Company}', content: 'County: {County}' }
                  popupTemplate: vars.industriesPopupTemplate
                });
                graphicsArray.push(_industryGraphic);
              });
              // add them to the map
              this.industriesGraphicsLayer.addMany(graphicsArray);
              if (typeof (this.graphicsLayer) !== 'undefined' || typeof (this.circleGraphicsLayer) !== 'undefined') {
                if (this.circleGraphicsLayer.graphics.length > 0) {
                  console.log('from cicle extent');
                  console.log(this.graphicsLayer);
                  // console.log(this.circleGraphicsLayer.fullExtent.expand(1.3));
                  const ext = this.circleGraphicsLayer.graphics.getItemAt(0).geometry.extent;
                  const cloneExt = ext.clone();
                  this.mapView.extent = cloneExt.expand(1.5);
                  // this.mapView.goTo({target: this.circleGraphicsLayer.graphics, extent: cloneExt}); // .then(() => {this.mapView.scale = this.mapView.scale * 0.5; });
                } else if (this.graphicsLayer.graphics.length > 0) {
                  const ext = this.graphicsLayer.graphics.getItemAt(0).geometry.extent;
                  const cloneExt = ext.clone();
                  this.mapView.extent = cloneExt.expand(1.5);
                } else {
                  this.mapView.goTo(graphicsArray).then(() => {
                    this.mapView.goTo({ extent: this.mapView.extent.expand(1.5) });
                  });
                }
              } else {
                this.mapView.goTo(graphicsArray).then(function () {
                  this.mapView.scale = this.mapView.scale * 0.5;
                });
              }
              console.timeEnd('adding graphics intially');
            });
          };
          this.mapView = new EsriMapView(_mapViewProperties);
          this.mapView.ui.move('zoom', 'top-right');
          this.printTask = new PrintTask({
            url: 'https://tfsgis-dfe02.tfs.tamu.edu/arcgis/rest/services/FPD/FPDPrint/GPServer/FPDPrintService'
          });

          this.printTemplate = new PrintTemplate({
            format: 'pdf',
            exportOptions: { dpi: 300 },
            layout: 'a4-portrait'
          });


          this.printParams = new PrintParameters({
            view: this.mapView,
            template: this.printTemplate
          });

          const basemapGallery = new BasemapGallery({
            view: this.mapView,
            container: 'basemapToggle'
          });
          this.mapView.ui.add(basemapGallery);

          const homeBtn = new Home({
            view: this.mapView
          });
          // Add the home button to the top left corner of the view
          this.mapView.ui.add(homeBtn, 'top-right');

          const _addBuffer = (mapView, evt, that, mouseMove) => {
            // add a line as you move your mouse
            const tempEndPt = mapView.toMap({ x: mouseMove.x, y: mouseMove.y });
            const tempEnd = new Graphic(tempEndPt, vars.ptSymbol);
            that.tempGraphicsLayer.removeAll();
            that.tempGraphicsLayer.add(tempEnd);
            const _newLine = that.bufferLineGraphic.clone();
            _newLine.geometry.paths = [[evt.mapPoint.longitude, evt.mapPoint.latitude], [tempEndPt.longitude, tempEndPt.latitude]];
            that.bufferLineGraphicLayer.removeAll();
            const length = geometryEngine.geodesicLength(_newLine.geometry, 'miles');
            const labelGraphic = new Graphic({
              geometry: tempEndPt,
              symbol: {
                type: 'text',
                color: '#003300',
                text: length.toFixed(2) + ' miles',
                xoffset: 18,
                yoffset: 3,
                font: { // autocast as Font
                  size: 14,
                  family: 'sans-serif'
                }
              }
            });
            that.buffer = geometryEngine.geodesicBuffer(evt.mapPoint, length, 'miles');
            const bufferGraphic = new Graphic(that.buffer, {
              type: 'simple-fill',  // autocasts as new SimpleMarkerSymbol()
              color: [247, 34, 101, 0.5],
              opacity: 0.5,
              outline: {
                color: '#660404',
                width: 1
              }
            }
            );
            that.tempGraphicsLayer.add(labelGraphic);
            that.tempGraphicsLayer.add(bufferGraphic);
            that.tempGraphicsLayer.add(_newLine);
            this.activatedSpatialControl = true;
          };
          this.addBufferGraphic = (that, evt, mapView) => {
            // function to add a buffer graphic to the map
            const initialPt = new Graphic(evt.mapPoint, vars.ptSymbol);
            console.log(this.bufferGraphicsLayer, that.bufferGraphicsLayer);
            if (typeof (this.bufferGraphicsLayer) !== 'undefined') {
              this.bufferGraphicsLayer.removeAll();
              this.bufferLineGraphicLayer.removeAll();
              this.tempGraphicsLayer.removeAll();
            }
            this.bufferGraphicsLayer = new GraphicsLayer();
            this.bufferLineGraphicLayer = new GraphicsLayer();
            // mapView.map.remove(this.bufferGraphicsLayer);
            // mapView.map.remove(this.tempGraphicsLayer);
            // mapView.map.remove(this.bufferLineGraphicLayer);
            this.bufferGraphicsLayer.add(initialPt);
            mapView.map.add(this.bufferGraphicsLayer);
            // add graphic for lines as well
            this.bufferLineGraphic = new Graphic({ symbol: vars.lineSymbol, geometry: { type: 'polyline', paths: [], spatialReference: 4326 } });
            mapView.map.add(this.bufferLineGraphicLayer);
            that.bufferLineGraphicLayer.add(this.bufferLineGraphic);
            mapView.map.add(this.tempGraphicsLayer);
            const _that = this;
            if (!that.touchEnabledDisplay) {
              mapView.on('pointer-move', function (mouseMove) {
                _addBuffer(mapView, evt, _that, mouseMove);
              });
            } else {
              mapView.on('drag', function (mouseMove) {
                _addBuffer(mapView, evt, _that, mouseMove);
                mouseMove.stopPropagation();
              });
            }

          };

          // set up logic to handle geometry update and reflect the update on "graphicsLayer"
          this.setupClickHandler = (that) => {
            that.mapView.on('click', function (event) {
              that.mapView.hitTest(event).then(function (response) {
                const results = response.results;
                if (results.length > 0) {
                  for (let i = 0; i < results.length; i++) {
                    // Check if we're already editing a graphic
                    that.activatedSpatialControl = (that.editGraphic === null);
                    if (!that.editGraphic && (results[i].graphic.layer.id === 'userGraphicsLayer' || results[i].graphic.layer.id === 'circleGraphicsLayer')) {
                      // Save a reference to the graphic we intend to update
                      if (results[i].graphic.layer.id === 'circleGraphicsLayer') {
                        that.editGraphic = that.graphicsLayer.graphics.getItemAt(0);
                      } else {
                        that.editGraphic = results[i].graphic;
                      }
                      that.activatedSpatialControl = (that.editGraphic === null);
                      // Save a reference to the graphic we intend to update
                      // Remove the graphic from the GraphicsLayer
                      // Sketch will handle displaying the graphic while being updated
                      that.graphicsLayer.remove(that.editGraphic);
                      that.sketchViewModel.update(that.editGraphic);
                      break;
                    }
                  }
                }
              });
            });
            this.__sketchStatus.next(true);
          };
          // draw line as cursor moves
          this.drawLine = (event) => {
            if (event.vertices.length > 2) {
              this.action.complete();
            } else {
              const _graphic = this.createGraphic(event, vars.polylineSymbol);
              if (event.vertices.length > 1) {
                // do not draw cicle before the user moves mouse or drags (until second )
                // basically listen untill at least one point is added
                this.createCircle(event.vertices[0], event.vertices[1]);
              }
              this.graphicsLayer.add(_graphic);
            }
          };
          // Label buffer with buffer distance
          this.labelBufferDist = (geom, distance) => {
            this.tempGraphicsLayer.removeAll();
            const _graphic = new Graphic({
              geometry: geom,
              symbol: {
                type: 'text',
                color: 'black',
                haloColor: 'black',
                haloSize: '1px',
                text: distance.toFixed(2) + ' miles',
                xoffset: 3,
                yoffset: 3,
                font: { // autocast as Font
                  size: 14,
                  family: 'sans-serif'
                }
              }
            });
            this.tempGraphicsLayer.add(_graphic);
          };
          // called when sketchViewModel's create-complete event is fired.
          this.addGraphic = (event, that = this) => {
            // Create a new graphic and set its geometry to
            // `create-complete` event geometry.
            const graphic = new Graphic({
              geometry: event.geometry,
            });
            that.graphicsLayer.add(graphic);
            that.editGraphic = null;
            that.activatedSpatialControl = true;
          };
          this.createCircle = (center, end) => {
            // function to create a geodesic circle using the center and end parameter as specified by the user while drawing
            this.circleGraphicsLayer.removeAll();
            const centerPt = new Point({ x: center[0], y: center[1], spatialReference: this.mapView.spatialReference });
            const endPt = new Point({ x: end[0], y: end[1], spatialReference: this.mapView.spatialReference });
            const polyline = new Polyline({
              paths: [center, end],
              spatialReference: this.mapView.spatialReference
            });
            const radius = geometryEngine.geodesicLength(polyline, 'miles');
            const _circle = new Circle({
              center: centerPt,
              radius: radius,
              radiusUnit: 'miles',
              geodesic: true,
              spatialReference: this.mapView.spatialReference
            });
            const circleGraphic = new Graphic({
              geometry: _circle,
              symbol: vars.polygonSymbol
            });
            const startPtGraphic = new Graphic({ geometry: centerPt, symbol: vars.pointSymbol });
            const endPtGraphic = new Graphic({ geometry: endPt, symbol: vars.pointSymbol });
            this.circleGraphicsLayer.add(circleGraphic);
            this.labelBufferDist(endPt, radius);
            this.tempGraphicsLayer.addMany([startPtGraphic, endPtGraphic]);
            return this.circleGraphicsLayer;
          };
          this.addVertices = (event) => {
            // function called by draw action to add vertices at user clicked location
            if (event.vertices.length < 2) {
              this.tempGraphicsLayer.removeAll();
              const gg = new Graphic({
                geometry: new Point({ x: event.vertices[0][0], y: event.vertices[0][1], spatialReference: this.mapView.spatialReference }),
                symbol: vars.pointSymbol
              });
              this.tempGraphicsLayer.add(gg);
            } else if (event.vertices.length === 2) {
              this.tempGraphicsLayer.removeAll();
              const graphic = this.createGraphic(event, vars.polylineSymbol);
              this.createCircle(event.vertices[0], event.vertices[1]);
              this.graphicsLayer.add(graphic);
              this.action.complete();
            }
          };

          this.createGraphic = (event, symbol) => {
            this.graphicsLayer.removeAll();
            const _polyline = new Polyline({
              paths: event.vertices,
              spatialReference: this.mapView.spatialReference
            });
            const _graphic = new Graphic({
              geometry: _polyline,
              symbol: vars.polylineSymbol
            });
            return _graphic;
          };

          this.completeGraphicsForCircle = (event) => {
            // function to intercept and complete drawing temporarily depending on whether it is for buffer circle or generic geometries
            if (event.geometry.type === 'polyline') {
              this.updateGraphicTemp(event);
              this.editGraphic = null;
              this.sketchViewModel.complete();
            } else {
              this.updateGraphicTemp(event);
            }
          };

          this.updateGraphicTemp = (event) => {
            // Create a new graphic and set its geometry event.geometry
            if (event.geometry.type === 'polyline') {
              // only create a circle and do these filtering if its a polyline
              this.graphicsLayer.removeAll();
              const totalVertices = event.geometry.paths[0].length;
              const _polyline = new Polyline({
                paths: [event.geometry.paths[0][0], event.geometry.paths[0][totalVertices - 1]],
                spatialReference: this.mapView.spatialReference
              });
              const _graphic = new Graphic({
                geometry: _polyline,
              });
              this.graphicsLayer.add(_graphic);
              this.createCircle(_polyline.paths[0][0], _polyline.paths[0][1]);
            } else {
              this.graphicsLayer.removeAll();
              const _graphic = new Graphic({
                geometry: event.geometry,
                symbol: this.editGraphic.symbol
              });
              this.graphicsLayer.add(_graphic);
            }
          };
          // Runs when sketchViewModel's update-complete or update-cancel
          // events are fired.
          this.updateGraphic = (event) => {
            // Create a new graphic and set its geometry event.geometry
            this.updateGraphicTemp(event);
            // set the editGraphic to null update is complete or cancelled.
            this.editGraphic = null;
            this.activatedSpatialControl = (this.editGraphic === null);
          };
          // select features
          this.selectFeaturesByGeom = (inputgeom, graphics) => {
            const gras = graphics.graphics;
            const _selected = [];
            gras.map(function (_g) {
              if (inputgeom.contains(_g.geometry)) {
                _selected.push({
                  'type': 'Feature', 'id': _g.uid, 'geometry': {
                    'type': 'Point',
                    'coordinates': [_g.geometry.toJSON().x, _g.geometry.toJSON().y]
                  }, 'properties': _g.attributes
                });
              }
            });
            console.log(_selected);
            console.log(this._data);
            this._data.allDataService.next(_selected);
          };
          this.setupSketchViewModel = (mapView, _that = this) => {
            // setup sketch view model for drawing geometries
            this.sketchViewModel = new SketchViewModel({
              view: mapView,
              layer: this.graphicsLayer,
              pointSymbol: vars.pointSymbol,
              polylineSymbol: vars.polylineSymbol,
              polygonSymbol: vars.polygonSymbol
            });
            mapView.map.addMany([this.graphicsLayer, this.circleGraphicsLayer, this.tempGraphicsLayer]);
            this.sketchViewModel.on('create', function (event) {
              if (event.state === 'complete') {
                console.log(event);
                _that.addGraphic(event.graphic.geometry, _that);
                console.log(event);
              }
            });
            this.__sketchStatus.next(true);
          };

          this.clearDrawGraphics = (isResetData) => {
            // function to clear all active graphics in the map along with the view and graphcis layer
            // also resets the sketchviewmodel is that is active so that next drawing could be initialized properly
            console.time('clear');
            if (isResetData) {
              this.dataFilterService.resetDataSpatial();
            }
            this.__sketchStatus.subscribe(_sketchStatus => {
              if (_sketchStatus) {
                this.sketchViewModel.reset();
                this.graphicsLayer.removeAll();
                this.circleGraphicsLayer.removeAll();
                this.tempGraphicsLayer.removeAll();
                this.editGraphic = null;
                this.sketchViewModel.complete();
                this.sketchViewModel.reset();
                this.mapView.goTo({ extent: fullExtent });
                console.timeEnd('clear');
              }
            });
          };

          this.performSpatialQuery = (control) => {
            console.log('received this control in esir map', control);
            if (this.sketchViewModel) {
              if (this.sketchViewModel.state === 'creating' || this.sketchViewModel.state === 'updating') {
                this.sketchViewModel.complete();
              }
              if (control === 'buffer') {
                this.selectFeaturesByGeom(this.circleGraphicsLayer.graphics.getItemAt(0).geometry, this.industriesGraphicsLayer);
              } else if (control === 'multipoint') {
                const totalPt = (this.graphicsLayer.graphics.length);
                console.log(totalPt);
                if (totalPt > 0) {
                  const geoj = JSON.stringify(this.graphicsLayer.graphics.getItemAt(0).geometry.toJSON());
                  this.pointInCountyService.getCountyNameFromPoint(geoj);
                  this.pointInCountyService.pointInCountyDataService.subscribe(d => {
                    this.dataFilterService.applyFilterArray('County', d);
                  });
                  // .subscribe(d => console.log(d));
                }
              } else if (control === 'rectangle' || control === 'polygon' || control === 'circle') {
                this.selectFeaturesByGeom(this.graphicsLayer.graphics.getItemAt(0).geometry, this.industriesGraphicsLayer);
              }
            }
          };

          this.mapView.when(() => {
            this.__mapViewStatus.next(true);
            this.addGraphicsToMap();
            this.setupSketchViewModel(this.mapView);
            // initialize a draw action for creating a buffer polygon
            this.draw = new Draw({
              view: this.mapView
            });
          }, (err) => {
            this.__mapViewStatus.next(false);
            console.log(err);
          });

        })
        .catch(err => {
          console.error(err);
        });
    }, 200);
  } // ngOnInit

}
