const base = require('core/utils/utils').base;
const inherit = require('core/utils/utils').inherit;
const G3WObject = require('core/g3wobject');

function PluginsRegistry() {
  this.config = null;
  this._plugins = {};
  this.pluginsConfigs = {};
  this._loadedPluginUrls = [];
  this.setters = {
    //setters to register plugin
    registerPlugin: function(plugin) {
      if (!this._plugins[plugin.name]) {
        this._plugins[plugin.name] = plugin;
      }
    }
  };
  base(this);

  // initilize plugin
  this.init = function(options) {
    const d = $.Deferred();
    this.pluginsBaseUrl = options.pluginsBaseUrl;
    // plugin configurations
    this.pluginsConfigs = options.pluginsConfigs;
    // plugins that aren't in configuration server but in project
    this.otherPluginsConfig = options.otherPluginsConfig;
    this.setOtherPlugins();
    Object.entries(this.pluginsConfigs).forEach(([name, pluginConfig]) => {
      this._setup(name, pluginConfig);
    });
    return d.promise();
  };

  this.setOtherPlugins = function() {
    if (this.otherPluginsConfig && this.otherPluginsConfig.law && this.otherPluginsConfig.law.length) {
      // law plugin
      this.pluginsConfigs['law'] = this.otherPluginsConfig.law;
      this.pluginsConfigs['law'].gid = this.otherPluginsConfig.gid;
    } else {
      delete this.pluginsConfigs['law'];
    }
  };

  // reaload plugin in case of change map
  this.reloadPlugins = function(initConfig, project) {
    const scripts = $('script');
    const plugins = this.getPlugins();
    for (const pluginName in plugins) {
      const plugin = plugins[pluginName];
      // unload plugin e remove from DOM
      plugin.unload();
      delete this._plugins[pluginName];
      scripts.each((index, scr) => {
        this._loadedPluginUrls.forEach((pluginUrl, idx) => {
          if (scr.getAttribute('src') == pluginUrl && pluginUrl.indexOf(pluginName) != -1) {
            scr.parentNode.removeChild( scr );
            this._loadedPluginUrls.splice(idx, 1);
            return false;
          }})
      });
    }
    this._loadedPluginUrls = [];
    //setup plugins
    this.otherPluginsConfig = project.getState();
    this.setPluginsConfig(initConfig.group.plugins);
    this.setOtherPlugins();
    Object.entries(this.pluginsConfigs).forEach(([pluginName, pluginConfig]) => {
      this._setup(pluginName, pluginConfig);
    });
  };

  this.setPluginsConfig = function(config) {
    this.pluginsConfigs = config;
  };

  this._loadScript = function(url, name) {
    return $script(url, name);
  };

  //load plugin script
  this._setup = function(name, pluginConfig) {
    if (!_.isNull(pluginConfig)) {
      const baseUrl = this.pluginsBaseUrl+name;
      const scriptUrl = baseUrl + '/js/plugin.js?'+Date.now();
      pluginConfig.baseUrl= this.pluginsBaseUrl;
      this._loadScript(scriptUrl, name)
        .ready(name, () => {
          this._loadedPluginUrls.push(scriptUrl);
        })
    }
  };

  this.getPluginConfig = function(pluginName) {
    return this.pluginsConfigs[pluginName];
  };

  this.getPlugins = function() {
    return this._plugins;
  };

  this.getPlugin = function(pluginName) {
    return this._plugins[pluginName];
  };

}

inherit(PluginsRegistry,G3WObject);

module.exports = new PluginsRegistry;
