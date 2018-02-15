const inherit = require('core/utils/utils').inherit;
const base = require('core/utils/utils').base;
const geo = require('core/utils/geo');
const MapLayer = require('./maplayer');
const RasterLayers = require('g3w-ol3/src/layers/rasters');

function WMSLayer(options, extraParams) {
  this.LAYERTYPE = {
    LAYER: 'layer',
    MULTILAYER: 'multilayer'
  };
  this.extraParams = extraParams;
  this.layers = [];

  base(this,options);
}

inherit(WMSLayer, MapLayer);

const proto = WMSLayer.prototype;

proto.getOLLayer = function(withLayers) {
  let olLayer = this._olLayer;
  if (!olLayer){
    olLayer = this._olLayer = this._makeOlLayer(withLayers);
  }
  return olLayer;
};

proto.getSource = function() {
  return this.getOLLayer().getSource();
};

proto.getInfoFormat = function() {
  return 'application/vnd.ogc.gml';
};

proto.getGetFeatureInfoUrl = function(coordinate,resolution,epsg,params) {
  return this.getOLLayer().getSource().getGetFeatureInfoUrl(coordinate,resolution,epsg,params);
};

proto.getLayerConfigs = function(){
  return this.layers;
};

proto.addLayer = function(layer) {
  this.layers.push(layer);
};

proto.toggleLayer = function(layer) {
  this.layers.forEach((_layer) => {
    if (_layer.id == layer.id){
      _layer.visible = layer.visible;
    }
  });
  this._updateLayers();
};

proto.update = function(mapState, extraParams) {
  this._updateLayers(mapState, extraParams);
};

proto.isVisible = function(){
  return this._getVisibleLayers().length > 0;
};

proto.getQueryUrl = function() {
  const layer = this.layers[0];
  if (layer.infourl && layer.infourl != '') {
    return layer.infourl;
  }
  return this.config.url;
};

proto.getQueryableLayers = function() {
  return _.filter(this.layers,function(layer){
    return layer.isQueryable();
  });
};

proto._getVisibleLayers = function(mapState) {
  const scale = geo.resToScale(mapState.resolution);
  const visibleLayers = [];
  let visible;
  this.layers.forEach((layer) => {
    visible = true;
    if (layer.config.minscale) {
      visible = visible && (layer.config.minscale > scale);
    }
    if (layer.config.maxscale) {
      visible = visible && (layer.config.maxscale < scale);
    }
    // var resolutionBasedVisibility = layer.state.maxresolution ? (layer.state.maxresolution && layer.state.maxresolution > mapState.resolution) : true;
    if (layer.state.visible && visible) {
      visibleLayers.push(layer);
    }
  });
  return visibleLayers;
};

proto._makeOlLayer = function(withLayers) {
  const wmsConfig = {
    url: this.config.url,
    id: this.config.id,
    projection: this.config.projection
  };

  if (withLayers) {
    wmsConfig.layers = this.layers.map((layer) => {
      return layer.getWMSLayerName();
    });
  }

  const representativeLayer = this.layers[0]; 

  if (representativeLayer.state.source && representativeLayer.state.source.type == 'wms' && representativeLayer.state.source.url){
    wmsConfig.url = representativeLayer.state.source.url;
  }
  const olLayer = new RasterLayers.WMSLayer(wmsConfig,this.extraParams);

  olLayer.getSource().on('imageloadstart', () => {
        this.emit("loadstart");
      });
  olLayer.getSource().on('imageloadend', () => {
      this.emit("loadend");
  });

  return olLayer
};

proto.checkLayerDisabled = function(layer,resolution) {
  let enabled = true;
  if (layer.config.scalebasedvisibility) {
    const scale = geo.resToScale(resolution);
    if (layer.config.minscale) {
      enabled = enabled && (layer.config.minscale > scale);
    }
    if (layer.config.maxscale) {
      enabled = enabled && (layer.config.maxscale < scale);
    }
  }
  layer.state.disabled = !enabled;
};

proto.checkLayersDisabled = function(resolution){
  this.layers.forEach((layer) => {
    this.checkLayerDisabled(layer, resolution);
  });
};

proto._updateLayers = function(mapState,extraParams){
  this.checkLayersDisabled(mapState.resolution);
  const visibleLayers = this._getVisibleLayers(mapState);
  if (visibleLayers.length > 0) {
    let params = {
      LAYERS: _.join(_.map(visibleLayers, function(layer) {
        return layer.getWMSLayerName();
      }),',')
    };
    if (extraParams) {
      params = _.assign(params,extraParams);
    }
    this._olLayer.setVisible(true);
    this._olLayer.getSource().updateParams(params);
  }
  else {
    this._olLayer.setVisible(false);
  }
};

module.exports = WMSLayer;