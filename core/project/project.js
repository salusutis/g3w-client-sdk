var inherit = require('core/utils/utils').inherit;
var base = require('core/utils//utils').base;
var G3WObject = require('core/g3wobject');
var LayerFactory = require('core/layers/layerfactory');
var LayersStore = require('core/layers/layersstore');
var Projections = require('g3w-ol3/src/projection/projections');

function Project(projectConfig) {
  /* struttura oggetto 'project'
  {
    id,
    type,
    gid,
    name,
    crs,
    proj4,
    extent,
    initextent,
    layers,
    layerstree,
    overviewprojectgid,
    baselayers,
    initbaselayer
  }
  */
  this.state = projectConfig;
  this._processLayers();
  // recupero o setta la proiezione se non standard
  this._projection = Projections.get(this.state.crs,this.state.proj4);
  this._layersStore = this._buildLayersStore();

  this.setters = {
    setBaseLayer: function(id) {
      var self = this;
      _.forEach(self.state.baselayers, function(baseLayer) {
        self._layersStore.getLayerById(baseLayer.id).setVisible(baseLayer.id == id);
      })
    }
  };

  base(this);
}

inherit(Project, G3WObject);

var proto = Project.prototype;

proto.getRelations = function() {
  return this.state.relations;
};

// funzione che processa i layers di progetto
proto._processLayers = function() {
  var self = this;
  // attraverso il tree dei layers (layerstree)
  // e aggiungo informazioni utili ad esempio al catalogo
  function traverse(obj) {
    _.forIn(obj, function (layer, key) {
      var layer_name_originale;
      //verifica che il nodo sia un layer e non un folder
      if (!_.isNil(layer.id)) {
        var fulllayer;
        _.forEach(self.state.layers, function(lyr) {
          layer_name_originale = lyr.name;
          if (layer.id == lyr.id) {
            lyr.wmsUrl = self.getWmsUrl();
            lyr.project = self;
            fulllayer = _.merge(lyr, layer);
            fulllayer.name = layer_name_originale;
            return false
          }
        });
        obj[parseInt(key)] = fulllayer;
      }
      if (!_.isNil(layer.nodes)){
        // aggiungo proprietà title per l'albero
        layer.title = layer.name;
        traverse(layer.nodes);
      }
    });
  }
  traverse(this.state.layerstree);

  _.forEach(this.state.baselayers, function(layerConfig) {
    var visible = false;

    if (self.state.initbaselayer) {
      visible = (layerConfig.id == (self.state.initbaselayer));
    }

    if (layerConfig.fixed) {
      visible = layerConfig.fixed;
    }

    layerConfig.visible = visible;
    layerConfig.baselayer = true;
  });
};

// funzione che fa il build del layers store
// lo istanzia  crea il layersstree
proto._buildLayersStore = function() {
  var self = this;
  // creo il layersStore
  var layersStore = new LayersStore();
  var overviewprojectgid = this.state.overviewprojectgid ? this.state.overviewprojectgid.gid : null;
  layersStore.setOptions({
    id: this.state.gid,
    projection: this._projection,
    extent: this.state.extent,
    initextent: this.state.initextent,
    wmsUrl: this.state.WMSUrl,
    catalog: this.state.gid != overviewprojectgid
  });

  // vado a ciclare su tutti i layers per poterli istanziare
  // e aggiungere al layersstore
  _.forEach(this.getLayers(), function(layerConfig) {
    // aggiungo la proiezione: nel caso esista il codice crs del layer lo prnedo altrimenti prondo la proiezione del progetto
    layerConfig.projection = self._projection;
    var layer = LayerFactory.build(layerConfig, {
      project: self
    });
    layersStore.addLayer(layer);
  });

  // funzione che crea il layerstree del layersstore
  layersStore.createLayersTree(this.state.name, {
    layerstree: this.state.layerstree
  });

  return layersStore;
};

proto.getLayers = function() {
  return _.concat(this.state.layers,this.state.baselayers);
};

proto.getState = function() {
  return this.state;
};

// funzione che ritorna id
proto.getId = function() {
  return this.state.id;
};

//funzione che ritorna il tipo
proto.getType = function() {
  return this.state.type;
};

proto.getGid = function() {
  return this.state.gid;
};

proto.getName = function() {
  return this.state.name;
};

proto.getOverviewProjectGid = function() {
  return this.state.overviewprojectgid ? this.state.overviewprojectgid.gid : null;
};

proto.getCrs = function() {
  return this._projection.getCode();
};

proto.getProjection = function() {
  return this._projection;
};

proto.getWmsUrl = function() {
  return this.state.WMSUrl;
};

proto.getInfoFormat = function() {
  return 'application/vnd.ogc.gml';
};

proto.getLayersStore = function() {
  return this._layersStore;
};

module.exports = Project;
