var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var QGISProvider = require('./qgisprovider');

function QGISDataProvider() {
  options = options || {};
  base(this);
}

inherit(QGISDataProvider, QGISProvider);

var proto = QGISDataProvider.prototype;

// funzione principale, starting point, chiamata dal plugin per
// il recupero dei vettoriali (chiamata verso il server)
proto.loadLayers = function(mode, customUrlParameters) {
  // il parametro mode mi di è in scrittura, lettura etc ..
  var self = this;
  var deferred = $.Deferred();
  // tiene conto dei codici dei layer che non sono stati
  // i dati vettoriali
  var noVectorlayerCodes = [];
  // setto il mode (r/w)
  this.setMode(mode);
  //verifico che ci siano parametri custom (caso di alcuni plugin) da aggiungere alla base url
  // per fare le chiamate al server
  if (customUrlParameters) {
    this._setCustomUrlParameters(customUrlParameters)
  }
  //verifica se sono stati caricati i vettoriali dei layer
  // attraverso la proprietà vector del layer passato dal plugin
  _.forEach(this._layers, function(layer, layerCode) {
    // verifico se l'attributo vector è nullo
    if (_.isNull(layer.vector)) {
      noVectorlayerCodes.push(layerCode);
    }
  });
  // eseguo le richieste delle configurazioni e mi tengo le promesse
  var vectorLayersSetup = _.map(noVectorlayerCodes, function(layerCode) {
    return self._setupVectorLayer(layerCode);
  });
  // emetto l'evento loadingvectorlayersstart (il pluginservice è in ascolto)
  self.emit('loadingvectorlayersstart');
  // aspetto tutte le promesse del setup vector
  $.when.apply(this, vectorLayersSetup)
  // una volta che tutte le configurazioni dei layer vecor
  // sono state prese dal server e dopo aver assegnato all'attributo vector
  // del layer plugin il layer vettoriale costruito con le configurazioni
  // di sopra
    .then(function() {
      // le promesse ritornano il layerCode del layer vettoriale appena costuito
      var vectorLayersCodes = Array.prototype.slice.call(arguments);
      // emtto evento che inzia il recupero dei dati dei layer vettoriali (geojson)
      self.emit('loadingvectolayersdatastart');
      // inizio a caricare tutti i vettoriali dopo aver caricato le configurazioni
      self.loadAllVectorsData(vectorLayersCodes)
        .then(function() {
          self._vectorLayersCodes = vectorLayersCodes;
          deferred.resolve(vectorLayersCodes);
          // emtto evento che ho ricevuto i layers
          self.emit('loadingvectorlayersend');
          // ora il loader è pronto
          self.setReady(true);

        })
        .fail(function() {
          // risetto tutti i layer veetotiali a null
          _.forEach(self._layers, function(layer) {
            layer.vector = null;
          });
          deferred.reject();
          // emttto che c'è stato un errore nel loading dei dati che vengono dal server
          self.emit('errorloadingvectorlayersend');
          self.setReady(false);
        })
    })
    .fail(function() {
      self.setReady(false);
      self.emit('errorloadingvectorlayersend');
      deferred.reject();
    });
  return deferred.promise();
};

proto.setVectorLayersCodes = function(vectorLayersCodes) {
  this._vectorLayersCodes = vectorLayersCodes;
};

proto.getVectorLayersCodes = function() {
  return this._vectorLayersCodes;
};

proto.getLayers = function() {
  return this._layers;
};

// funzione che fa il reload che rihiede di nuovo il dati del vetor layer
// caso in cui si lavora con un layer vettoriale e non si usa un wms per fare la query
proto.reloadVectorData = function(layerCode) {
  var self = this;
  var deferred = $.Deferred();
  var bbox = this._mapService.state.bbox;
  self._createVectorLayerFromConfig(layerCode)
    .then(function(vectorLayer) {
      self._getVectorLayerData(vectorLayer, bbox)
        .then(function(vectorDataResponse) {
          self.setVectorLayerData(vectorLayer[self._editingApiField], vectorDataResponse);
          vectorLayer.setData(vectorDataResponse.vector.data);
          deferred.resolve(vectorLayer);
        });
    });
  return deferred.promise();
};

//funzione che permette di ottenere tutti i dati relativi ai layer vettoriali caricati
//prima si è ottenuta la coinfigurazione, ora si ottengono i dati veri e propri
proto.loadAllVectorsData = function(layerCodes) {
  var self = this;
  var deferred = $.Deferred();
  var layers = this._layers;
  // verifico che il BBOX attuale non sia stato già  caricato
  // prondo il bbox
  var bbox = this._mapService.state.bbox;
  var loadedExtent = this._loadedExtent;
  if (loadedExtent && ol.extent.containsExtent(loadedExtent, bbox)) {
    return resolvedValue();
  }
  if (!loadedExtent) {
    this._loadedExtent = bbox;
  } else {
    this._loadedExtent = ol.extent.extend(loadedExtent, bbox);
  }
  if (layerCodes) {
    layers = [];
    _.forEach(layerCodes, function(layerCode) {
      layers.push(self._layers[layerCode]);
    });
  }
  //per ogni layer del plugin che non ha il layer vado a caricare i dati del layer vettoriale
  var vectorDataRequests = _.map(layers, function(Layer) {
    return self._loadVectorData(Layer.vector, bbox);
  });

  $.when.apply(this, vectorDataRequests)
    .then(function() {
      deferred.resolve(layerCodes);
    })
    .fail(function(){
      deferred.reject();
    });

  return deferred.promise();
};

proto._setCustomUrlParameters = function(customUrlParameters) {
  this._customUrlParameters = customUrlParameters;
};

proto._checkVectorGeometryTypeFromConfig = function(vectorConfig) {
  switch (vectorConfig.geometrytype) {
    case 'Line':
      vectorConfig.geometrytype = 'LineString';
      break;
    case 'MultiLine':
      vectorConfig.geometrytype = 'MultiLineString';
      break;
  }
  return vectorConfig;
};


proto._createVectorLayerFromConfig = function(layerCode) {
  var self = this;
  // recupero la configurazione del layer settata da plugin service
  var layerConfig = this._layers[layerCode];
  var deferred = $.Deferred();
  // eseguo le richieste delle configurazioni
  this._getVectorLayerConfig(layerConfig[this._editingApiField])
    .then(function(vectorConfigResponse) {
      var vectorConfig = vectorConfigResponse.vector;
      // vado a verificare la correttezza del geometryType (caso di editing generico)
      vectorConfig = self._checkVectorGeometryTypeFromConfig(vectorConfig);
      // una volta ottenuta dal server la configurazione vettoriale,
      // provvedo alla creazione del layer vettoriale
      var crsLayer = layerConfig.crs || self._mapService.getProjection().getCode();
      var vectorLayer = self._createVectorLayer({
        geometrytype: vectorConfig.geometrytype,
        format: vectorConfig.format,
        crs: self._mapService.getProjection().getCode(),
        crsLayer : crsLayer,
        id: layerConfig.id,
        name: layerConfig.name,
        pk: vectorConfig.pk,
        editing: self._editingMode
      });
      // setto i campi del layer
      vectorLayer.setFields(vectorConfig.fields);
      vectorLayer.setCrs(crsLayer);
      // questo è la proprietà della configurazione del config layer
      // che specifica se esistono relazioni con altri layer
      // sono array di oggetti che specificano una serie di
      // informazioni su come i layer sono relazionati (nome della relazione == nome layer)
      // foreign key etc ..
      var relations = vectorConfig.relations;
      // nel caso il layer abbia relazioni (array non vuoto)
      if (relations) {
        // per dire a vectorLayer che i dati
        // delle relazioni verranno caricati solo quando
        // richiesti (es. aperture form di editing)
        vectorLayer.lazyRelations = true;
        //vado a settare le relazioni del vector layer
        vectorLayer.setRelations(relations);
      }
      // setto lo stile del layer OL
      if (layerConfig.style) {
        vectorLayer.setStyle(layerConfig.style);
      }
      // risolve con il nome del vectorLayer
      deferred.resolve(vectorLayer);
    })
    .fail(function(){
      deferred.reject();
    });
  return deferred.promise();
};

// funzione che dato la configurazione del layer fornito dal plugin (style, editor, vctor etc..)
// esegue richieste al server al fine di ottenere configurazione vettoriale del layer
proto._setupVectorLayer = function(layerCode) {
  var self = this;
  var deferred = $.Deferred();
  // eseguo le richieste delle configurazioni
  this._createVectorLayerFromConfig(layerCode)
    .then(function(vectorLayer) {
      var layerConfig = self._layers[layerCode];
      // assegno il vetorLayer appena creato all'attributo vector del layer
      layerConfig.vector = vectorLayer;
      // risolve con il nome del layerCode
      deferred.resolve(layerCode);
    })
    .fail(function() {
      deferred.reject();
    });
  return deferred.promise();
};

//in base all bbox e la layer chiedo al server di restituirmi il vettoriale (geojson) del layer
proto._loadVectorData = function(vectorLayer, bbox) {
  var self = this;
  // eseguo le richieste dei dati al server al fine di ottenere il geojson,
  // vettoriale, del layer richiesto
  return self._getVectorLayerData(vectorLayer, bbox)
    .then(function(vectorDataResponse) {
      self.setVectorLayerData(vectorLayer[self._editingApiField], vectorDataResponse);
      // setto i dati vettoriali del layer vettoriale
      // e verifico se siamo in editingMode write e se ci sono featurelocks
      if (self._editingMode && vectorDataResponse.featurelocks) {
        // nel cso in cui sia in editing (mode w) e che si siano featureLocks
        // setto tale features al layervettoriale
        self.setVectorFeaturesLock(vectorLayer, vectorDataResponse.featurelocks);
      }
      //setto i dati del layer vettoriale (geojson)
      vectorLayer.setData(vectorDataResponse.vector.data);
      if (self._)
        return vectorDataResponse;
    })
    .fail(function() {
      return false;
    })
};

proto.getVectorLayerData = function(layerCode) {
  return this._vectorLayersData[layerCode];
};

proto.getVectorLayersData = function() {
  return this._vectorLayersData;
};

proto.setVectorLayerData = function(layerCode, vectorLayerData) {
  this._vectorLayersData[layerCode] = vectorLayerData;
};

//funzione che setta le features lock del layer vettoriale
proto.setVectorFeaturesLock = function(vectorLayer, featureslock) {
  //vado a pescare le fifferenze tra le featureidlock già caricati id
  var newFeaturesLockIds = _.differenceBy(featureslock, vectorLayer.getFeatureLocks(), 'featureid');
  _.forEach(newFeaturesLockIds, function(newLockId) {
    vectorLayer.addLockId(newLockId)
  });
};

proto.cleanVectorFeaturesLock = function(vectorLayer) {
  vectorLayer.cleanFeatureLocks();
};

proto.lockFeatures = function(layerName) {
  var self = this;
  var d = $.Deferred();
  var bbox = this._mapService.state.bbox;
  var vectorLayer = this._layers[layerName].vector;
  $.get(this._baseUrl+layerName+"/?lock" + this._customUrlParameters+"&in_bbox=" + bbox[0]+","+bbox[1]+","+bbox[2]+","+bbox[3])
    .done(function(data) {
      self.setVectorFeaturesLock(vectorLayer, data.featurelocks);
      d.resolve(data);
    })
    .fail(function(){
      d.reject();
    });
  return d.promise();
};

// ottiene la configurazione del vettoriale
// (qui richiesto solo per la definizione degli input)
proto._getVectorLayerConfig = function(layerApiField) {
  var d = $.Deferred();
  // attravercso il layer name e il base url
  // chiedo la server di inviarmi la configurazione editing del laye
  $.get(this._baseUrl+layerApiField+"/?config"+ this._customUrlParameters)
    .done(function(data) {
      d.resolve(data);
    })
    .fail(function(){
      d.reject();
    });
  return d.promise();
};

// ottiene il vettoriale in modalità  editing
proto._getVectorLayerData = function(vectorLayer, bbox) {
  var d = $.Deferred();
  var lock = this.getMode() == 'w' ? true : false;
  var apiUrl;
  if (lock) {
    apiUrl = this._baseUrl+vectorLayer[this._editingApiField]+"/?editing";
  } else {
    apiUrl = this._baseUrl+vectorLayer[this._editingApiField]+"/?"
  }
  $.get(apiUrl + this._customUrlParameters+"&in_bbox=" + bbox[0]+","+bbox[1]+","+bbox[2]+","+bbox[3])
    .done(function(data) {
      d.resolve(data);
    })
    .fail(function(){
      d.reject();
    });
  return d.promise();
};
// funzione per creare il layer vettoriale
proto._createVectorLayer = function(options) {
  var vector = new VectorLayer(options);
  return vector;
};
//funzione chiamata dal plugin quando si vuole fare un cleanUp dei layers
// !!! -- DA RIVEDERE -- !!!
proto.cleanUpLayers = function() {
  this._loadedExtent = null;
};

module.exports = QGISDataProvider;