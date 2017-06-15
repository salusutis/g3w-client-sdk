var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');


function DataProvider(options) {
  options = options || {};
  this._isReady = false;
  this._name = 'dataprovider';
  base(this);
}


var proto = DataProvider.prototype;

proto.getData = function() {
  console.log('da sovrascrivere')
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


inherit(DataProvider, G3WObject);

module.exports =  DataProvider;