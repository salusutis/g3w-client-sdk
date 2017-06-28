var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');
var Feature = require('core/layers/features/feature');

function DataProvider(options) {
  options = options || {};
  this._isReady = false;
  this._name = 'provider';
  base(this);
}

inherit(DataProvider, G3WObject);

var proto = DataProvider.prototype;

proto.getFeatures = function() {
  console.log('da sovrascrivere')
};

proto.query = function(options) {
  console.log('metodo da sovrascrivere')
};

proto.setReady = function(bool) {
  this._isReady = bool;
};

proto.isReady = function() {
  return this._isReady;
};

proto.error = function() {
  //TODO
};

proto.isValid = function() {
  console.log('deve essere implementatato dai singoli provider');
};

proto.getName = function() {
  return this._name;
};


module.exports = DataProvider;