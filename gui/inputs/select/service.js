const inherit = require('core/utils/utils').inherit;
const base = require('core/utils/utils').base;
const getAppLanguage = require('core/i18n/i18n.service').getAppLanguage;
const CatalogLayersStoresRegistry = require('core/catalog/cataloglayersstoresregistry');
var Service = require('gui/inputs/service');

function SelectService(options) {
  options = options || {};
  base(this, options);
  this.layer = null;
}

inherit(SelectService, Service);

var proto = SelectService.prototype;

proto._getLayerById = function(layer_id) {
  return CatalogLayersStoresRegistry.getLayerById(layer_id);
};

proto.getLanguage = function() {
  return getAppLanguage();
};

proto.addValue = function(value) {
  this.state.input.options.values.push(value);
};

proto.getKeyByValue = function({search}={}) {
  const options = this.state.input.options;
  const {value, key} = options;
  this.getData({
    key:value,
    value: key,
    search
  }).then((arrayValues) => {
    const [_value] = arrayValues;
    const {$value : key, text: value} = _value;
    this.addValue({
      key,
      value
    })
  }).catch((err) => {
    console.log(err);
  })
};

proto.getData = function({layer_id= this.state.input.options.layer_id, key=this.state.input.options.key, value=this.state.input.options.value, search} = {}) {
  const search_value = `${key}|${search}`.trim();
  return new Promise((resolve, reject) => {
    if (!this._layer) {
      this._layer = this._getLayerById(layer_id);
    }
    this._layer.getDataTable({
      suggest: search_value,
      ordering: key
    }).then((response) => {
      const values = [];
      const features = response.features;
      for (let i=0; i < features.length; i++) {
        values.push({
          text:features[i].properties[key],
          id: i,
          $value: features[i].properties[value]
        })
      }
      resolve(values);
    }).fail((err) => {
      reject(err);
    })
  });
};

module.exports = SelectService;
