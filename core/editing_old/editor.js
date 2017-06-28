var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var resolve = require('core/utils/utils').resolve;
var G3WObject = require('core/g3wobject');
var GUI = require('gui/gui');
var VectorLayer = require('core/map/layer/vectorlayer');
// BASE TOOLS ////
var AddFeatureTool = require('./tools/addfeaturetool');
var MoveFeatureTool = require('./tools/movepointtool');
var ModifyFeatureTool = require('./tools/modifyfeaturetool');
var DeleteFeatureTool = require('./tools/deletefeaturetool');
var PickFeatureTool = require('./tools/pickfeaturetool');
var CutLineTool = require('./tools/cutlinetool');
/// BUFFER /////
var EditBuffer = require('./editbuffer');
// Editor di vettori puntuali
function Editor(options) {
  var options = options || {};
  // indica il componente for che verrà utilizzato dall'editor
  // in caso di operazione di editing (nuovo/edit) di una feature
  this._formComponent = options.formComponent || null;
  // servizio che gestisce l'interazione con la mappa e i suoi elementi
  this._mapService = options.mapService || {};
  // layer vettoriale associato all'editor
  this._vectorLayer = null;
  // vector layer temporaneo dove vengono effettuati gli editing temporaneamente
  this._editVectorLayer = null;
  // è la classe buffer che contiene tutte le operazioni di editing fatte
  this._editBufferClass = options.editBufferClass || EditBuffer;
  this._editBuffer = null;
  // tool attivo
  this._activeTool = null;
  // indica nel caso di true che è stato modificato il layer vettoriale
  this._dirty = false;
  // prefisso delle nuove  feature
  this._newPrefix = '_new_';
  // feature loccate
  this._featureLocks = null;
  // mi dice se è stato avviato o meno
  this._started = false;
  // definisce lo stile del vettore di editing
  this._editingVectorStyle = options.editingVectorStyle || null;
  // verifica se bisogna attivare le relazioni ONE all'aggiunta di una nuova feature
  this.checkOneRelation = options.checkOneRelation || false;
  // mi indicano quale campi non devono essere sovrascritti nel copy and paste
  this._copyAndPasteFieldsNotOverwritable = options.copyAndPasteFieldsNotOverwritable || {};
  // mi indicano i campi del layer che sono in relazione con campi di relazioni
  this._fieldsLayerbindToRelationsFileds = options.fieldsLayerbindToRelationsFileds || {};
  // tools del form come ad esempio copypaste etc ..
  this._formTools = options.formTools || ['copypaste'];
  // la picked feature
  this._pickedFeature = null;
  // form service
  this._formService = null;
  // setters listeners
  this._setterslisteners = {
    before: {},
    after: {}
  };
  // definisce il tipo di geometrie
  this._geometrytypes = [
    'Point',
    'MultiPoint',
    'LineString',
    'Line',
    'MultiLineString',
    'Polygon',
    'MultiPolygon'
  ];
  // elenco dei tool e delle relative classi per tipo di geometria (in base a vector.geometrytype)
  this._toolsForGeometryTypes = {
    'Point': {
      addfeature: AddFeatureTool,
      movefeature: MoveFeatureTool,
      deletefeature: DeleteFeatureTool,
      editattributes: PickFeatureTool
    },
    'MultiPoint': {
      addfeature: AddFeatureTool,
      movefeature: MoveFeatureTool,
      deletefeature: DeleteFeatureTool,
      editattributes: PickFeatureTool
    },
    'Line': {
      addfeature: AddFeatureTool,
      modifyvertex: ModifyFeatureTool,
      movefeature: MoveFeatureTool,
      deletefeature: DeleteFeatureTool,
      editattributes: PickFeatureTool,
      cutline: CutLineTool
    },
    'LineString': {
      addfeature: AddFeatureTool,
      modifyvertex: ModifyFeatureTool,
      movefeature: MoveFeatureTool,
      deletefeature: DeleteFeatureTool,
      editattributes: PickFeatureTool,
      cutline: CutLineTool
    },
    'Polygon': {
      addfeature: AddFeatureTool,
      modifyvertex: ModifyFeatureTool,
      movefeature: MoveFeatureTool,
      deletefeature: DeleteFeatureTool,
      editattributes: PickFeatureTool
    },
    'MultiPolygon': {
      addfeature: AddFeatureTool,
      modifyvertex: ModifyFeatureTool,
      movefeature: MoveFeatureTool,
      deletefeature: DeleteFeatureTool,
      editattributes: PickFeatureTool
    }
  };
  //ACTIVE TOOL -- ISTANZA CON I SUOI METODI E ATTRIBUTI
  this._activeTool = new function() {
    this.type = null;
    this.instance = null;
    // funzione che prende memeoria del tipo di tool e ne prende l'istanza
    this.setTool = function(type, instance) {
      this.type = type;
      this.instance = instance;
    };
    // restituisce il type
    this.getType = function() {
      return this.type;
    };
    // restituisce l'istanza
    this.getTool = function() {
      return this.instance;
    };
    // fa il clear del tool
    this.clear = function() {
      this.type = null;
      this.instance = null;
    };
  };
  // TOOLS
  //terrà traccia dei tool attivi per quel layer vettoriale
  //ad esempio nel caso di un layer Point
  //avrà tale struttura
  /*
   this._tools = {
     addfeature: AddFeatureTool,
     movefeature: MoveFeatureTool,
     deletefeature: DeleteFeatureTool,
     editattributes: PickFeatureTool
  }
  */
  this._tools = {};
  // sono i listeners di default per tutti
  this._setupAddFeatureAttributesEditingListeners();
  this._setupEditAttributesListeners();
  this._askConfirmToDeleteEditingListener();
  //this._setupMoveFeatureEditingListeners();
  //this._setupDeleteFeatureEditingListeners();

  base(this);
}

inherit(Editor, G3WObject);

var proto = Editor.prototype;

// LISTENERS COMUNI A TUTTI

// delete editing listener
proto._askConfirmToDeleteEditingListener = function() {
  var self = this;
  this.onbeforeasync('deleteFeature', function(feature, isNew, next) {
    self._deleteFeatureDialog(next);
  });
};

proto._deleteFeatureDialog = function(next) {
  GUI.dialog.confirm("Vuoi eliminare l'elemento selezionato?",function(result) {
    next(result);
  });
};

// apre form attributi per inserimento
proto._setupAddFeatureAttributesEditingListeners = function() {
  var self = this;
  this.onbeforeasync('addFeature', function(feature, next) {
    self._openEditorForm('new', feature, next);
  }, 100);
};

// apre form attributi per editazione
proto._setupEditAttributesListeners = function() {
  var self = this;
  this.onbeforeasync('pickFeature', function(feature, next) {
    var new_old = self.isNewFeature(feature.getId()) ? 'new' : 'old';
    self._openEditorForm(new_old, feature, next);
  });
};

proto.getcopyAndPasteFieldsNotOverwritable = function() {
  return this._copyAndPasteFieldsNotOverwritable;
};

proto.setcopyAndPasteFieldsNotOverwritable = function(obj) {
    this._copyAndPasteFieldsNotOverwritable = obj;
};

proto.getfieldsLayerbindToRelationsFileds = function() {
  return this._fieldsLayerbindToRelationsFileds;
};
// setta il form service

proto.setFormService = function(formService) {
  this._formService = formService;
};

// prendo il form Service

proto.getFormService = function() {
  return this._formService;
};

// restituisce il mapservice
proto.getMapService = function() {
  return this._mapService;
};
// restituisce la picked feature
proto.getPickedFeature = function() {
  return this._pickedFeature;
};

proto.setPickedFeature = function(pickedFeature) {
  this._pickedFeature = pickedFeature;
};

proto.cleanUpPickedFeature = function() {
  this._pickedFeature.setStyle(null);
  this._pickedFeature = null;
};

// setto i dati del form
proto.setFormData = function(formData) {
  this.formData = formData;
};

// associa l'oggetto VectorLayer su cui si vuole fare l'editing
// inoltre setta i tipi di tools da poter collegare
// al tipo di layer sempre in base al tipo di geometria del layer
proto.setVectorLayer = function(vectorLayer) {
  //verifica il tipo di geometria del layer vettoriale
  var geometrytype = vectorLayer.geometrytype;
  //verifica se è nella tipologia di geometria compatibile con l'editor
  if (!geometrytype || !this._isCompatibleType(geometrytype)) {
    throw Error("Vector geometry type "+geometrytype+" is not valid for editing");
  }
  //nel caso in cui la geometria riscontrata corrisponde ad una geometria valida dell'editor
  //setta i tools dell'editor relativi al tipo di geometria
  this._setToolsForVectorType(geometrytype);
  //assegno il layer vettoriale alla proprità dell'editor
  this._vectorLayer = vectorLayer;
};

// funzione che crea e aggiunge il layer vettoraile di editing alla mappa
proto.addEditingLayerToMap = function(geometryType) {
  // istanzio l'editVectorLayer che è un vettore di appoggio (nuovo)
  // dove vado a fare le modifiche
  this._editVectorLayer = new VectorLayer({
    name: "editvector",
    geometrytype: geometryType
  });
  if (this._editingVectorStyle) {
    this._editVectorLayer.setStyle(this._editingVectorStyle.url);
  }
  //il getMapLyer non è altro che la versione ol.Vector del vectorLayer oggetto
  this._mapService.viewer.map.addLayer(this._editVectorLayer.getMapLayer());
};

//funzione che rimove il vettore di eding dalla mappa e lo resetta
proto.removeEditingLayerFromMap = function() {
  this._mapService.viewer.removeLayerByName(this._editVectorLayer.name);
  this._editVectorLayer = null;
};

// avvia la sessione di editazione con un determinato tool (es. addfeature)
proto.start = function() {
  // TODO: aggiungere notifica nel caso questo if non si verifichi
  var res = false;
  // se è sia stato settato il vectorLayer
  if (this._vectorLayer) {
    //prima di tutto stoppo editor
    this.stop();
    //chiamo la funzione che mi crea il vettoriale di editing dove vendono apportate
    // tutte le modifice del layer
    this.addEditingLayerToMap(this._vectorLayer.geometrytype);
    // istanzio l'EditBuffer
    this._editBuffer = new this._editBufferClass(this);
    //assegno all'attributo _started true;
    this._setStarted(true);
    res = true;
  }
  return res;
};

// termina l'editazione
proto.stop = function() {
  if (this.isStarted()) {
    if (this.stopTool()) {
      //distruggo l'edit buffer
      this._editBuffer.destroy();
      //lo setto a null
      this._editBuffer = null;
      //rimuovo il layer dalla mappa
      this.removeEditingLayerFromMap();
      //setto editor started a false
      this._setStarted(false);
      return true;
    }
    return false;
  }
  return true;
};

proto.destroy = function() {
  if (this.stop()) {
    this.removeAllListeners();
  }
};

//setta il tool corrent per il layer in editing
proto.setTool = function(toolType, options) {
  // al momento stopTool ritorna sempre true
  // quindi if sotto mai verificata
  if (!this.stopTool()) {
    return false;
  }
  // recupera il tool dai tols assegnati in base al tipo di tools richiesto
  // es. toolType = editattributes per editare gli attributi di una featue
  var toolClass = this._tools[toolType];
  // se esiste il tool richiesto
  if (toolClass) {
    //creo l'istanza della classe Tool tutte le volte che vado a settare il tool
    var toolInstance = new toolClass(this, options);
    // setto le proprità type dell'oggetto acriveTool
    // instance e type
    this._activeTool.setTool(toolType, toolInstance);
    // setto i listeners legati al tool scelto
    this._setToolSettersListeners(toolInstance);
    // faccio partire (chiamando il metodo run dell'istanza tool) il tool
    toolInstance.run();
    return true;
  }
};

// funzione chiamata da setTool o da latro che
// verifica se è stata già istanziato un tool
// al fine di interrompere l'editing sul layer
proto.stopTool = function() {
  //verifica se esiste l'istanza del tool (come attiva)
  // e se se nella stop del tool (che non fa altro che rimuovere le interaction dalla mappa)
  // si è verificato o meno un errore (tale funzione al momento ritorna true)
  if (this._activeTool.instance && !this._activeTool.instance.stop()) {
    return false;
  }
  // fa la chisura del form (penso sempre per sicurezza)
  GUI.closeForm();
  // chiude in ogni caso il setModal(grigio sopra la mappa)
  GUI.setModal(false);
  // se non è verificata la condizione sopra (dovuta ad esempio alla non istanziazione di nessus tool)
  // si chiama il metodo clear
  // dell'active Tool che setta il type e l'instace a null (al momento si verifica sempre)
  this._activeTool.clear();
  return true;
};


// ritorna l'activeTool
proto.getActiveTool = function() {
  return this._activeTool;
};

proto.isStarted = function() {
  return this._started;
};

proto.hasActiveTool = function() {
  return !_.isNull(this._activeTool.instance);
};

proto.isToolActive = function(toolType) {
  if (this._activeTool.toolType) {
    return this._activeTool.toolType == toolType;
  }
  return false;
};

proto.commit = function(responseNew) {
  // il parametro newFeatureData contiene informazioni
  // ritornate dal server nel caso di inserimento di nuove relazioni
  // con id
  this._editBuffer.commit();
  // vad ad eliminare le feature cancellate (quelle con stato DELETE)
  // perchè non mi servono più come relazione temporanee e rinominare
  // lo stato delle relazioni NEW to OLD con l'id ritornato dal server
  if (this._formService) {
    this._formService.cleanStateAfterCommit(responseNew);
  }
};

proto.undoAll = function() {
  this._editBuffer.undoAll();
};

proto.setFeatureLocks = function(featureLocks) {
  this._featureLocks = featureLocks;
};

proto.getFeatureLocks = function() {
  return this._featureLocks;
};

proto.getFeatureLockIds = function() {
  return _.map(this._vectorLayer.getFeatureLocks(),function(featurelock) {
    return featurelock.lockid;
  });
};

proto.getFeatureLocksLockIds = function(featureLocks) {
  var featureLocks = featureLocks || this._vectorLayer.getFeatureLocks();
  return _.map(featureLocks,function(featurelock) {
    return featurelock.lockid;
  });
};

proto.getFeatureLocksFeatureIds = function(featureLocks) {
  var featureLocks = featureLocks || this._vectorLayer.getFeatureLocks();
  return _.map(featureLocks,function(featurelock) {
    return featurelock.featureid;
  });
};

proto.getFeatureLockIdsForFeatureIds = function(fids) {
  var featurelocksForFids = _.filter(this._vectorLayer.getFeatureLocks(),function(featurelock) {
    return _.includes(fids,featurelock.featureid);
  });

  return this.getFeatureLocksLockIds(featurelocksForFids);
};

proto.getFeatureLockForFeatureIds = function(fids) {
  // ritorna un aray delle feature che sono state editate e che sono locckate
  //console.log(this._vectorLayer.getFeatureLocks());
  /*return _.filter(this._vectorLayer.getFeatureLocks(), function(featurelock) {
    return _.includes(fids, featurelock.featureid);
  });*/
  return this._vectorLayer.getFeatureLocks();
};
// funzione che prende le feature nuove, aggiornate e cancellate
//dall'edit buffer
proto.getEditedFeatures = function() {
  // prende gli id unici delle feature che sono state editate
  var modifiedFids = this._editBuffer.collectFeatureIds();
  var lockIds = this.getFeatureLockForFeatureIds(modifiedFids);
  return {
    add: this._editBuffer.collectFeatures('new', true),
    update: this._editBuffer.collectFeatures('updated',true),
    delete: this._editBuffer.collectFeatures('deleted',true),
    relationsedits: this.collectRelations(),
    lockids: lockIds
  }
};
// chiama la funzione collecRelations dell'edit buffer
// in modo tale da collezionare tutte le informazioni
// relative all'edit buffer sulle relazioni
proto.collectRelations = function() {
  relationsEdits = this._editBuffer.collectRelations();
  return relationsEdits;
};

// viene chamato quando si preme ad esempio Salva sul Form degli
// attributi di una feature
proto.setFieldsWithValues = function(feature, fields, relations) {
  var attributes = {};
  _.forEach(fields, function(field) {
    // mi serve nel caso delle select ch devo forzare il valore a 'null'
    //
    if (field.value == 'null') {
      field.value = null;
    }
    attributes[field.name] = field.value;
  });
  // setto i campi della feature con i valori editati nel form
  feature.setProperties(attributes);
  // vado a scrivere neln'edit buffer relativo ai campi
  // la features e le relazioni che cono state create o modificate
  this._editBuffer.updateFields(feature, relations);
  if (relations) {
    // se ci sono relazioni vado a settare i dai delle relazioni nel layervettoriale originale
    this._vectorLayer.setRelationsData(feature.getId(), relations);
  }
};

//funzione che in base alla feature passata recupera le relazioni associata ad essa
proto.getRelationsWithValues = function(feature) {
  var fid = feature.getId();
  //verifica se il layer ha relazioni
  // restituisce il valore del campo _relation (se esiste è un array) del vectorLayer
  if (this._vectorLayer.hasRelations()) {
    var fieldsPromise;
    // se non ha fid vuol dire che è nuovo e senza attributi, quindi prendo i fields vuoti
    if (!fid) {
      fieldsPromise = this._vectorLayer.getRelationsWithValues();
    }
    // se per caso ha un fid ma è un vettoriale nuovo
    else if (!this._vectorLayer.getFeatureById(fid)){
      // se questa feature, ancora non presente nel vectorLayer, ha comunque i valori delle FKs popolate, allora le estraggo
      if (this._vectorLayer.featureHasRelationsFksWithValues(feature)){
        var fks = this._vectorLayer.getRelationsFksWithValuesForFeature(feature);
        fieldsPromise = this._vectorLayer.getNewRelationsWithValuesFromFks(fks);
      }
      // altrimenti prendo i fields vuoti
      else {
        fieldsPromise = this._vectorLayer.getRelationsWithValues(fid);
      }
    }
    // se invece è una feature già presente e quindi non nuova
    // verifico se ha dati delle relazioni già  editati
    else {
      var hasEdits = this._editBuffer.hasRelationsEdits(fid);
      if (hasEdits){
        var relationsEdits = this._editBuffer.getRelationsEdits(fid);
        var relations = this._vectorLayer.getRelations();
        _.forEach(relations,function (relation) {
          relation.elements = _.cloneDeep(relationsEdits[relation.name]);
        });
        fieldsPromise = resolve(relations);
      }
      // se non ce li ha vuol dire che devo caricare i dati delle relazioni da remoto
      else {
        fieldsPromise = this._vectorLayer.getRelationsWithValues(fid);
      }
    }
  }
  else {
    // nel caso di nessuna relazione risolvo la promise
    // passando il valore null
    fieldsPromise = resolve(null);
  }
  return fieldsPromise;
};

proto.createRelationElement = function(relation) {
  var element = {};
  var fields = _.cloneDeep(this._vectorLayer.getRelationFields(relation));
  _.forEach(fields, function(field) {
      field.value = null; // DACAPIRE MEGLIO
  });
  element.fields = fields;
  element.id = this.generateId();
  element.state = 'NEW';
  return element;
};

proto.getRelationPkFieldIndex = function(relationName) {
  return this._vectorLayer.getRelationPkFieldIndex(relationName);
};
// retituisce l'oggetto field
proto.getField = function(name, fields) {
  var fields = fields || this.getVectorLayer().getFieldsWithValues();
  var field = null;
  _.forEach(fields, function(f) {
    if (f.name == name) {
      field = f;
    }
  });
  return field;
};

proto.isDirty = function() {
  return this._dirty;
};
// METODI CHE SOVRASCRIVONO ONAFTER, ONBEFORE, ONBEFOREASYNC DELL'OGGETTO G3WOBJECT
// la loro funzione è quella di settare la propriteà dell'editor
// _setterslisteners in modo corretto da poter poi essere sfruttata dal metodo
// _setToolSettersListeners  --- !!!! DA COMPLETARE LA SPIEGAZIONE !!!----

proto.onafter = function(setter, listener, priority) {
  this._onaftertoolaction(setter, listener, priority);
};

// permette di inserire un setter listener sincrono
// prima che venga effettuata una operazione da un tool (es. addfeature)
proto.onbefore = function(setter, listener, priority) {
  this._onbeforetoolaction(setter, listener, false, priority);
};

// come onbefore() ma per listener asincroni
//setter: nome del metodo
//listener: next
proto.onbeforeasync = function(setter, listener, priority) {
  this._onbeforetoolaction(setter, listener, true, priority);
};

proto._onaftertoolaction = function(setter, listener, priority) {
  priority = priority || 0;
  if (!_.get(this._setterslisteners.after, setter)) {
    this._setterslisteners.after[setter] = [];
  }
  this._setterslisteners.after[setter].push({
    fnc: listener,
    priority: priority
  });
};

proto._onbeforetoolaction = function(setter, listener, async, priority) {
  priority = priority || 0;
  //vado a verificare prima se ho come chiaave il setter
  if (!_.get(this._setterslisteners.before, setter)) {
    // se non ce l'ho aggiungo al before
    this._setterslisteners.before[setter] = [];
  }
  //vado ad aggiungere alla catena delle azioni da fare prima di quel setter
  this._setterslisteners.before[setter].push({
    fnc: listener,
    how: async ? 'async' : 'sync',
    priority: priority
  });
};

/////////////////////////////////////

// una volta istanziato il tool aggiungo a questo tutti i listener definiti a livello di editor
proto._setToolSettersListeners = function(tool) {
  // tutte le volte sarà una nuova istanza del tool (anche se attivo/clicco ripetutatemnte sul bottone del tool)
  // quindi la registarzione  dell'onbefore etc .. sarà sempre pulita

  //scorro su i setterListerns impostati dagli editor custom (GeonotesEditor ad esempio)
  // in modo da poter richiamare e settare gli onbefore o onbeefore async o on after
  // nativi dell'oggetto g3wobject sui tool
  //verifico gli on before
  _.forEach(this._setterslisteners.before, function(listeners, setter) {
    // verifico se il tool in questione ha setters
    if (_.hasIn(tool.setters, setter)) {
      // se il tool prevede setters
      _.forEach(listeners, function(listener) {
        // per ogni listener (sono tutti oggetti con
        // chiave fnc, how (vedi sopra)
        // verifico se è un onbefore or un onbeforesync
        // vado a settare la funzione listeners quando il metodo del tool setter
        // viene chiamato
        if (listener.how == 'sync') {
          tool.onbefore(setter, listener.fnc, listener.priority);
        }
        else {
          tool.onbeforeasync(setter, listener.fnc, listener.priority);
        }
      })
    }
  });
  //come sopra ma per gli onafter
  _.forEach(this._setterslisteners.after, function(listeners,setter) {
    if (_.hasIn(tool.setters, setter)) {
      _.forEach(listeners,function(listener) {
        tool.onafter(setter,listener.fnc, listener.priority);
      })
    }
  })
};

proto._transformCoordinateFeatureFromMapToLayer = function(feature) {
  // controlla prima l proiezione
  var mapProjection = this._mapService.getProjection().getCode();
  var layerProjection = this._vectorLayer.getCrs();
  var coord = feature.getGeometry().getCoordinates();
  coord = ol.proj.transform(coord, mapProjection, layerProjection);
  feature.getGeometry().setCoordinates(coord);
  return feature;
};

proto._transformCoordinateFeatureFromLayerToMap = function(feature) {

  // controlla prima la proiezione
  var mapProjection = this._mapService.getProjection().getCode();
  var layerProjection = this._vectorLayer.getCrs();
  var coord = feature.getGeometry().getCoordinates();
  coord = ol.proj.transform(coord, layerProjection, mapProjection);
  feature.getGeometry().setCoordinates(coord);
  return feature;
};

// metodo add Feature che non fa alto che aggiungere la feature al buffer
proto.addFeature = function(feature) {
  feature = this._transformCoordinateFeatureFromMapToLayer(feature);
  this._editBuffer.addFeature(feature);
};
// non fa aalctro che aggiornare la feature del buffer
proto.updateFeature = function(feature) {
  feature = this._transformCoordinateFeatureFromMapToLayer(feature);
  this._editBuffer.updateFeature(feature);
};
//edit feature
proto.pickFeature = function(feature) {
  this.updateFeature(feature)
};
//move feature
proto.moveFeature = function(feature) {
  this.updateFeature(feature);
};
// non fa altro che cancellare la feature dall'edit buffer
proto.deleteFeature = function(feature, relations, isNew) {
  this._editBuffer.deleteFeature(feature, relations);
};

proto.getVectorLayer = function() {
  return this._vectorLayer;
};

proto.getEditVectorLayer = function() {
  return this._editVectorLayer;
};

proto.generateId = function() {
  return this._newPrefix+Date.now();
};

proto.generateFormId = function(vectorName) {
  return vectorName + 'form' + Date.now();
};

proto.isNewFeature = function(fid) {
  if (fid) {
    return fid.toString().indexOf(this._newPrefix) == 0;
  }
  return true;
};
// verifico se la geometria è compatibile con quelle definite dall'editor
proto._isCompatibleType = function(geometrytype) {
  return this._geometrytypes.indexOf(geometrytype) > -1;
};
//setta i tools relativi alla geometria del layer vettoriale passato
proto._setToolsForVectorType = function(geometrytype) {
  var self = this;
  var tools = this._toolsForGeometryTypes[geometrytype];
  _.forEach(tools, function(toolClass, tool) {
    //prendo memorai dell'oggetto tools class
    self._tools[tool] = toolClass;
  })
};
// setto l'attributo started a true quando avvio l'editor
proto._setStarted = function(bool) {
  this._started = bool;
};
// funzione setDirty dell'editor che fa si che questo possa emettere
// l'evento dirty in questo modo psso fare qualcosa quando è stata fatta una modifica
// nei layers dell'editor
proto._setDirty = function(bool) {
  // se non specificato lo setto a vero
  if (_.isNil(bool)) {
    this._dirty = true;
  }
  else {
    this._dirty = bool;
  }
  // emetto l'evento dirty dell'editor
  this.emit("dirty", this._dirty);
};

proto._onSaveEditorForm = function(feature, fields, relations, next) {
  var self = this;
  var next = next;
  var feature = feature;
  return function(fields, relations) {
    self.setFieldsWithValues(feature, fields, relations);
    if (next) {
      // setto a true l'argomento di next per fare in modo che vengono eseguiti
      // se presenti i listerners do onbefore
      next(true);
    }
    GUI.setModal(false);
  };
};

proto._openEditorForm = function(isNew, feature, next) {
  var self = this;
  // viene recuperato il vectorLayer dell'editor
  var vectorLayer = this.getVectorLayer();
  // vengono recuperati i fields del vectorLayer con i valori
  var fields = vectorLayer.getFieldsWithValues(feature);
  // prende il valor pk del vectorLayer
  var pk = vectorLayer.pk;
  // verifico se il valore della chiave primaria e verifica
  // //se esiste l'oggetto field uguale alla chiave primaria
  if (pk && _.isNull(this.getField(pk))) {
    _.forEach(feature.getProperties(), function(value, attribute) {
      var field = self.getField(attribute, fields);
      if (field) {
        field.value = value;
      }
    });
  }
  var showForm  = GUI.showContentFactory('form');
  // recupero la funzione per visualizzazre il componente Form
  var relationsPromise = this.getRelationsWithValues(feature);
  //var queryResultsPanel = showQueryResults('interrogazione');
  relationsPromise
    .then(function(relations) {
      // creo un clone perchè altrimenti se faccio modifice anche temporanee
      // alle relazionimi restano e vanno ad impattare nel cancella
      var relations = _.cloneDeep(relations);
      showForm({
        provider: self,
        name: "Edita attributi "+vectorLayer.name,
        formId: self.generateFormId(vectorLayer.name),
        dataid: vectorLayer.name,
        vectorLayer: vectorLayer,
        pk: vectorLayer.pk,
        isnew: self.isNewFeature(feature.getId()),
        fields: fields,
        relations: relations,
        relationOne: self.checkOneRelation,
        tools: self._formTools,
        formComponent: self._formComponent,
        editor: self,
        buttons:[
          {
            title: "Salva",
            type: "save",
            class: "btn-danger",
            cbk: self._onSaveEditorForm(feature, fields, relations, next)
          },
          {
            title: "Cancella",
            type: "cancel",
            class: "btn-primary",
            cbk: function() {
              if (next) {
                //dico di uscire e non proseguire
                //vado a chiamare la fallback del tool
                next(false);
              }
              GUI.setModal(false);
            }
          }
        ]
      });
    })
    .fail(function() {
      if (next){
        next(false);
      }
      GUI.setModal(false);
    })
};


module.exports = Editor;