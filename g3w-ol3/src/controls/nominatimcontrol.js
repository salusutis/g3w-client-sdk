var Control = require('./control');
function NominatimControl() {
  var self = this;
  this.options = {
    provider: 'osm',
    placeholder: 'Città, indirizzo ... ',
    targetType: 'text-input',
    lang: 'it-IT',
    limit: 5,
    keepOpen: true,
    preventDefault: false,
    autoComplete: false,
    autoCompleteMinLength: 4,
    debug: false
  };

  var inputQueryId = "gcd-input-query";
  var inputResetId = "gcd-input-reset";
  var cssClasses = {
    "namespace": "ol-geocoder",
    "spin": "gcd-pseudo-rotate",
    "hidden": "gcd-hidden",
    "country": "gcd-country",
    "city": "gcd-city",
    "road": "gcd-road",
    "olControl": "ol-control",
    "glass": {
      "container": "gcd-gl-container",
      "control": "gcd-gl-control",
      "button": "gcd-gl-btn",
      "input": "gcd-gl-input",
      "expanded": "gcd-gl-expanded",
      "reset": "gcd-gl-reset",
      "result": "gcd-gl-result"
    },
    "inputText": {
      "container": "gcd-txt-container",
      "control": "gcd-txt-control",
      "input": "gcd-txt-input",
      "reset": "gcd-txt-reset",
      "icon": "gcd-txt-glass",
      "result": "gcd-txt-result"
    }
  };

  var targetType = {
    GLASS: 'glass-button',
    INPUT: 'text-input'
  };
  var vars = Object.freeze({
    inputQueryId: inputQueryId,
    inputResetId: inputResetId,
    cssClasses: cssClasses,
    default: {
      inputQueryId: inputQueryId,
      inputResetId: inputResetId,
      cssClasses: cssClasses
    }
  });

  var utils = {
    toQueryString: function toQueryString(obj) {
      var this$1 = this;
      return Object.keys(obj).reduce(function (a, k) {
        a.push(
          typeof obj[k] === 'object' ?
            this$1.toQueryString(obj[k]) :
            encodeURIComponent(k) + '=' + encodeURIComponent(obj[k])
        );
        return a;
      }, []).join('&');
    },
    encodeUrlXhr: function encodeUrlXhr(url, data) {
      if(data && typeof data === 'object') {
        var str_data = this.toQueryString(data);
        url += (/\?/.test(url) ? '&' : '?') + str_data;
      }
      return url;
    },
    json: function json(url, data) {
      return $.get(url, data)
      },
    jsonp: function jsonp(url, key, callback) {
        // https://github.com/Fresheyeball/micro-jsonp/blob/master/src/jsonp.js
        var head = document.head,
          script = document.createElement('script'),
          // generate minimally unique name for callback function
          callbackName = 'f' + Math.round(Math.random() * Date.now());

        // set request url
        script.setAttribute('src',
          /*  add callback parameter to the url
           where key is the parameter key supplied
           and callbackName is the parameter value */
          (url + (url.indexOf('?') > 0 ? '&' : '?') + key + '=' + callbackName));

        /*  place jsonp callback on window,
         the script sent by the server should call this
         function as it was passed as a url parameter */
        window[callbackName] = function (json) {
          window[callbackName] = undefined;

          // clean up script tag created for request
          setTimeout(function () {
            head.removeChild(script);
          }, 0);

          // hand data back to the user
          callback(json);
        };

        // actually make the request
        head.appendChild(script);
      },
      now: function now() {
        // Polyfill for window.performance.now()
        // @license http://opensource.org/licenses/MIT
        // copyright Paul Irish 2015
        // https://gist.github.com/paulirish/5438650
        if('performance' in window === false) {
          window.performance = {};
        }

        Date.now = (Date.now || function () {  // thanks IE8
          return new Date().getTime();
        });

        if('now' in window.performance === false) {

          var nowOffset = Date.now();

          if(performance.timing && performance.timing.navigationStart) {
            nowOffset = performance.timing.navigationStart;
          }

          window.performance.now = function now() {
            return Date.now() - nowOffset;
          };
        }
        return window.performance.now();
      },

      flyTo: function flyTo(map, coord, duration, resolution) {
        resolution = resolution || 2.388657133911758;
        duration = duration || 500;
        var view = map.getView();
        view.animate({duration: duration, resolution: resolution},
          {duration: duration, center: coord});
      },
      randomId: function randomId(prefix) {
        var id = this.now().toString(36);
        return prefix ? prefix + id : id;
      },
      isNumeric: function isNumeric(str) {
        return /^\d+$/.test(str);
      },
      classRegex: function classRegex(classname) {
        return new RegExp(("(^|\\s+) " + classname + " (\\s+|$)"));
      },
      /**
       * @param {Element|Array<Element>} element DOM node or array of nodes.
       * @param {String|Array<String>} classname Class or array of classes.
       * For example: 'class1 class2' or ['class1', 'class2']
       * @param {Number|undefined} timeout Timeout to remove a class.
       */
      addClass: function addClass(element, classname, timeout) {
        var this$1 = this;

        if(Array.isArray(element)) {
          element.forEach(function (each) {
            this$1.addClass(each, classname);
          });
          return;
        }

        var array = (Array.isArray(classname))
          ? classname
          : classname.split(/\s+/);
        var i = array.length;

        while (i--) {
          if(!this$1.hasClass(element, array[i])) {
            this$1._addClass(element, array[i], timeout);
          }
        }
      },
      _addClass: function _addClass(el, klass, timeout) {
        var this$1 = this;

        // use native if available
        if(el.classList) {
          el.classList.add(klass);
        } else {
          el.className = (el.className + ' ' + klass).trim();
        }

        if(timeout && this.isNumeric(timeout)) {
          window.setTimeout(function () {
            this$1._removeClass(el, klass);
          }, timeout);
        }
      },
      /**
       * @param {Element|Array<Element>} element DOM node or array of nodes.
       * @param {String|Array<String>} classname Class or array of classes.
       * For example: 'class1 class2' or ['class1', 'class2']
       * @param {Number|undefined} timeout Timeout to add a class.
       */
      removeClass: function removeClass(element, classname, timeout) {
        var this$1 = this;

        if(Array.isArray(element)) {
          element.forEach(function (each) {
            this$1.removeClass(each, classname, timeout);
          });
          return;
        }

        var array = (Array.isArray(classname))
          ? classname
          : classname.split(/\s+/);
        var i = array.length;

        while (i--) {
          if(this$1.hasClass(element, array[i])) {
            this$1._removeClass(element, array[i], timeout);
          }
        }
      },
      _removeClass: function _removeClass(el, klass, timeout) {
        var this$1 = this;

        if(el.classList) {
          el.classList.remove(klass);
        } else {
          el.className = (el.className.replace(this.classRegex(klass), ' ')).trim();
        }
        if(timeout && this.isNumeric(timeout)) {
          window.setTimeout(function () {
            this$1._addClass(el, klass);
          }, timeout);
        }
      },
      /**
       * @param {Element} element DOM node.
       * @param {String} classname Classname.
       * @return {Boolean}
       */
      hasClass: function hasClass(element, c) {
        // use native if available
        return element.classList
          ? element.classList.contains(c)
          : this.classRegex(c).test(element.className);
      },
      /**
       * @param {Element|Array<Element>} element DOM node or array of nodes.
       * @param {String} classname Classe.
       */
      toggleClass: function toggleClass(element, classname) {
        var this$1 = this;

        if(Array.isArray(element)) {
          element.forEach(function (each) {
            this$1.toggleClass(each, classname);
          });
          return;
        }

        // use native if available
        if(element.classList) {
          element.classList.toggle(classname);
        } else {
          if(this.hasClass(element, classname)) {
            this._removeClass(element, classname);
          } else {
            this._addClass(element, classname);
          }
        }
      },
      /**
       * Abstraction to querySelectorAll for increased
       * performance and greater usability
       * @param {String} selector
       * @param {Element} context (optional)
       * @param {Boolean} find_all (optional)
       * @return (find_all) {Element} : {Array}
       */
      find: function find(selector, context, find_all) {
        if(context === void 0) context = window.document;
        var simpleRe = /^(#?[\w-]+|\.[\w-.]+)$/,
          periodRe = /\./g,
          slice = Array.prototype.slice,
          matches = [];

        // Redirect call to the more performant function
        // if it's a simple selector and return an array
        // for easier usage
        if(simpleRe.test(selector)) {
          switch (selector[0]) {
            case '#':
              matches = [this.$(selector.substr(1))];
              break;
            case '.':
              matches = slice.call(context.getElementsByClassName(
                selector.substr(1).replace(periodRe, ' ')));
              break;
            default:
              matches = slice.call(context.getElementsByTagName(selector));
          }
        } else {
          // If not a simple selector, query the DOM as usual
          // and return an array for easier usage
          matches = slice.call(context.querySelectorAll(selector));
        }
        return (find_all) ? matches : matches[0];
      },
      $: function $(id) {
        id = (id[0] === '#') ? id.substr(1, id.length) : id;
        return document.getElementById(id);
      },
      isElement: function isElement(obj) {
        // DOM, Level2
        if('HTMLElement' in window) {
          return (!!obj && obj instanceof HTMLElement);
        }
        // Older browsers
        return (!!obj && typeof obj === 'object' && obj.nodeType === 1 &&
        !!obj.nodeName);
      },
      getAllChildren: function getAllChildren(node, tag) {
        return [].slice.call(node.getElementsByTagName(tag));
      },
      isEmpty: function isEmpty(str) {
        return (!str || 0 === str.length);
      },
      emptyArray: function emptyArray(array) {
        while (array.length) {
          array.pop();
        }
      },
      anyMatchInArray: function anyMatchInArray(source, target) {
        return source.some(function (each) {
          return target.indexOf(each) >= 0;
        });
      },
      everyMatchInArray: function everyMatchInArray(arr1, arr2) {
        return arr2.every(function (each) {
          return arr1.indexOf(each) >= 0;
        });
      },
      anyItemHasValue: function anyItemHasValue(obj, has) {
        var this$1 = this;
        if(has === void 0) has = false;

        var keys = Object.keys(obj);
        keys.forEach(function (key) {
          if(!this$1.isEmpty(obj[key])) {
            has = true;
          }
        });
        return has;
      },
      removeAllChildren: function removeAllChildren(node) {
        while (node.firstChild) {
          node.removeChild(node.firstChild);
        }
      },
      removeAll: function removeAll(collection) {
        var node;
        while ((node = collection[0])) {
          node.parentNode.removeChild(node);
        }
      },
      getChildren: function getChildren(node, tag) {
        return [].filter.call(
          node.childNodes, function (el) {
            return tag
              ? el.nodeType === 1 && el.tagName.toLowerCase() === tag
              : el.nodeType === 1;
          }
        );
      },
      template: function template(html, row) {
        var this$1 = this;

        return html.replace(/\{ *([\w_-]+) *\}/g, function (htm, key) {
          var value = (row[key] === undefined) ? '' : row[key];
          return this$1.htmlEscape(value);
        });
      },
      htmlEscape: function htmlEscape(str) {
        return String(str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      },
      /**
       * Overwrites obj1's values with obj2's and adds
       * obj2's if non existent in obj1
       * @returns obj3 a new object based on obj1 and obj2
       */
      mergeOptions: function mergeOptions(obj1, obj2) {
        var obj3 = {};
        for (var attr1 in obj1) {
          obj3[attr1] = obj1[attr1];
        }
        for (var attr2 in obj2) {
          obj3[attr2] = obj2[attr2];
        }
        return obj3;
      },
      createElement: function createElement(node, html) {
        var elem;
        if(Array.isArray(node)) {
          elem = document.createElement(node[0]);

          if(node[1].id) {
            elem.id = node[1].id;
          }
          if(node[1].classname) {
            elem.className = node[1].classname;
          }

          if(node[1].attr) {
            var attr = node[1].attr;
            if(Array.isArray(attr)) {
              var i = -1;
              while (++i < attr.length) {
                elem.setAttribute(attr[i].name, attr[i].value);
              }
            } else {
              elem.setAttribute(attr.name, attr.value);
            }
          }
        } else {
          elem = document.createElement(node);
        }
        elem.innerHTML = html;
        var frag = document.createDocumentFragment();

        while (elem.childNodes[0]) {
          frag.appendChild(elem.childNodes[0]);
        }
        elem.appendChild(frag);
        return elem;
      },
      assert: function assert(condition, message) {
        if(message === void 0) message = 'Assertion failed';

        if(!condition) {
          if(typeof Error !== 'undefined') {
            throw new Error(message);
          }
          throw message; // Fallback
        }
      }
    };

    var klasses = vars.cssClasses;
    var klasses$1 = vars.cssClasses;

  // classe Html //
  var Html = function Html(base) {
    this.options = base.options;
    this.els = this.createControl();
  };

  Html.prototype.createControl = function createControl () {
    var container, containerClass, elements;

    if (this.options.targetType === targetType.INPUT) {
      containerClass = klasses.namespace + ' ' + klasses.inputText.container;
      container = utils.createElement(
        ['div', { classname: containerClass }], Html.input);
      elements = {
        container: container,
        control: utils.find('.' + klasses.inputText.control, container),
        input: utils.find('.' + klasses.inputText.input, container),
        reset: utils.find('.' + klasses.inputText.reset, container),
        result: utils.find('.' + klasses.inputText.result, container)
      };
    } else {
      containerClass = klasses.namespace + ' ' + klasses.glass.container;
      container = utils.createElement(
        ['div', { classname: containerClass }], Html.glass);
      elements = {
        container: container,
        control: utils.find('.' + klasses.glass.control, container),
        button: utils.find('.' + klasses.glass.button, container),
        input: utils.find('.' + klasses.glass.input, container),
        reset: utils.find('.' + klasses.glass.reset, container),
        result: utils.find('.' + klasses.glass.result, container)
      };
    }
    //set placeholder from options
    elements.input.placeholder = this.options.placeholder;
    return elements;
  };

  /* eslint-disable indent */
  Html.glass = [
    '<div class="', klasses.glass.control, ' ', klasses.olControl, '">',
    '<button type="button" class="', klasses.glass.button, '"></button>',
    '<input type="text"',
    ' id="', vars.inputQueryId, '"',
    ' class="', klasses.glass.input, '"',
    ' autocomplete="off" placeholder="Search ...">',
    '<a',
    ' id="', vars.inputResetId, '"',
    ' class="', klasses.glass.reset, ' ', klasses.hidden, '"',
    '></a>',
    '</div>',
    '<ul class="', klasses.glass.result, '"></ul>'
  ].join('');

  Html.input = [
    '<div class="', klasses.inputText.control, '">',
    '<input type="text"',
    ' id="', vars.inputQueryId, '"',
    ' class="', klasses.inputText.input, '"',
    ' autocomplete="off" placeholder="Search ...">',
    '<button type="button" class="btn btn-primary" id="search_nominatim"><i class="fa fa-search" aria-hidden="true"></i></button>',
    '<button type="button"',
    ' id="', vars.inputResetId, '"',
    ' class="', klasses.inputText.reset, ' ', klasses.hidden, '"',
    '></button>',
    '</div>',
    '<ul class="', klasses.inputText.result, '"></ul>'
  ].join('');

  // classe Html fine //

  // classe OpenStreet //

  var OpenStreet = function OpenStreet() {

    this.settings = {
      url: '//nominatim.openstreetmap.org/search/',
      params: {
        q: '',
        format: 'json',
        addressdetails: 1,
        limit: 10,
        countrycodes: 'IT',
        'accept-language': 'it-IT'
      }
    };
  };


  OpenStreet.prototype.getParameters = function getParameters(options) {
    return {
      url: this.settings.url,
      params: {
        q: options.query,
        format: 'json',
        addressdetails: 1,
        limit: options.limit || this.settings.params.limit,
        countrycodes: options.countrycodes || this.settings.params.countrycodes,
        'accept-language': options.lang || this.settings.params['accept-language']
      }
    };
  };

  OpenStreet.prototype.handleResponse = function handleResponse(results) {
    return results.map(function (result) {
      return ({
        lon: result.lon,
        lat: result.lat,
        address: {
          name: result.address.neighbourhood || '',
          road: result.address.road || '',
          postcode: result.address.postcode,
          city: result.address.city || result.address.town,
          state: result.address.state,
          country: result.address.country
        },
        original: {
          formatted: result.display_name,
          details: result.address
        }
      });
    });
  };

  // classe OpenStreet fine //

  // classe Nomitatim //

  var Nominatim = function Nominatim(base, els) {
    this.Base = base;
    this.options = base.options;
    this.options.provider = this.options.provider.toLowerCase();
    this.els = els;
    this.lastQuery = '';
    this.container = this.els.container;
    this.registeredListeners = { mapClick: false };
    this.setListeners();
    this.OpenStreet = new OpenStreet();

  };

  Nominatim.prototype.setListeners = function setListeners () {
    var this$1 = this;
    var timeout, lastQuery;
    var openSearch = function () {
      utils.hasClass(this$1.els.control, klasses$1.glass.expanded) ?
        this$1.collapse() : this$1.expand();
    };
    var query = function (evt) {
      var value = evt.target.value.trim();
      var hit = evt.key ? evt.key === 'Enter' :
        evt.which ? evt.which === 13 :
          evt.keyCode ? evt.keyCode === 13 : false;

      if (hit) {
        evt.preventDefault();
        this$1.query(value);
      }
    };
    var reset = function (evt) {
      this$1.els.input.focus();
      this$1.els.input.value = '';
      this$1.lastQuery = '';
      utils.addClass(this$1.els.reset, klasses$1.hidden);
      this$1.clearResults();
    };
    var handleValue = function (evt) {
      var value = evt.target.value.trim();

      value.length
        ? utils.removeClass(this$1.els.reset, klasses$1.hidden)
        : utils.addClass(this$1.els.reset, klasses$1.hidden);

      if (this$1.options.autoComplete && value !== lastQuery) {
        lastQuery = value;
        timeout && clearTimeout(timeout);
        timeout = setTimeout(function () {
          if (value.length >= this$1.options.autoCompleteMinLength) {
            this$1.query(value);
          }
        }, 200);
      }
    };
    this.els.input.addEventListener('keyup', query, false);
    this.els.input.addEventListener('input', handleValue, false);
    this.els.reset.addEventListener('click', reset, false);
    if (this.options.targetType === targetType.GLASS) {
      this.els.button.addEventListener('click', openSearch, false);
    }
  };

  Nominatim.prototype.query = function query (q) {
    var this$1 = this;
    var ajax = {}, options = this.options;
    var provider = this.getProvider({
      query: q,
      provider: options.provider,
      key: options.key,
      lang: options.lang,
      countrycodes: options.countrycodes,
      limit: options.limit
    });
    if (this.lastQuery === q && this.els.result.firstChild) { return; }
    this.lastQuery = q;
    this.clearResults();
    utils.addClass(this.els.reset, klasses$1.spin);
    ajax.url = document.location.protocol + provider.url;
    ajax.data = provider.params;
    utils.json(ajax)
      .done(function(res) {
        utils.removeClass(this$1.els.reset, klasses$1.spin);
            //will be fullfiled according to provider
            var res_= res.length ? this$1.OpenStreet.handleResponse(res) : undefined;
            this$1.createList(res_);
            if (res_) {
              this$1.listenMapClick();
            }

      })
      .fail(function(error){
        utils.removeClass(this$1.els.reset, klasses$1.spin);
            var li = utils.createElement(
              'li', '<h5>  Il server non risponde</h5>');
            this$1.els.result.appendChild(li);
      })

  };

  Nominatim.prototype.createList = function createList (response) {
    var this$1 = this;
    var ul = this.els.result;
    if (response) {
      response.forEach(function (row) {
        var addressHtml = this$1.addressTemplate(row.address),
          html = ['<a href="#">', addressHtml, '</a>'].join(''),
          li = utils.createElement('li', html);
        li.addEventListener('click', function (evt) {
          evt.preventDefault();
          this$1.chosen(row, addressHtml, row.address, row.original);
        }, false);
        ul.appendChild(li);
      });
    } else {
      li = utils.createElement('li', 'Nessun Risultato');
      ul.appendChild(li);
    }

  };

  Nominatim.prototype.chosen = function chosen(place, addressHtml, addressObj, addressOriginal) {
    var map = this.Base.getMap();
    var coord_ = [parseFloat(place.lon), parseFloat(place.lat)];
    var projection = map.getView().getProjection();
    var coord = ol.proj.transform(coord_, 'EPSG:4326', projection);
    var address = {
      formatted: addressHtml,
      details: addressObj,
      original: addressOriginal
    };
    this.options.keepOpen === false && this.clearResults(true);
    this.Base.dispatchEvent({
      type: 'addresschosen',
      address: address,
      coordinate: coord
    });
  };

  Nominatim.prototype.addressTemplate = function addressTemplate (address) {
    var html = [];
    if (address.name) {
      html.push(['<div class="', klasses$1.road, '">{name}</div>'].join(''));
    }
    if (address.road || address.building || address.house_number) {
      html.push([
        '<div class="', klasses$1.road,
        '">{building} {road} {house_number}</div>'
      ].join(''));
    }
    if (address.city || address.town || address.village) {
      html.push([
        '<div class="', klasses$1.city,
        '">{postcode} {city} {town} {village}</div>'
      ].join(''));
    }
    if (address.state || address.country) {
      html.push([
        '<div class="', klasses$1.country, '">{state} {country}</div>'
      ].join(''));
    }
    return utils.template(html.join('<br>'), address);
  };

  Nominatim.prototype.getProvider = function getProvider (options) {
    return this.OpenStreet.getParameters(options);
  };

  Nominatim.prototype.expand = function expand () {
    var this$1 = this;

    utils.removeClass(this.els.input, klasses$1.spin);
    utils.addClass(this.els.control, klasses$1.glass.expanded);
    window.setTimeout(function () { return this$1.els.input.focus(); }, 100);
    this.listenMapClick();
  };

  Nominatim.prototype.collapse = function collapse () {
    this.els.input.value = '';
    this.els.input.blur();
    utils.addClass(this.els.reset, klasses$1.hidden);
    utils.removeClass(this.els.control, klasses$1.glass.expanded);
    this.clearResults();
  };

  Nominatim.prototype.listenMapClick = function listenMapClick () {
    // already registered
    if (this.registeredListeners.mapClick) { return; }

    var this_ = this;
    var mapElement = this.Base.getMap().getTargetElement();
    this.registeredListeners.mapClick = true;

    //one-time fire click
    mapElement.addEventListener('click', {
      handleEvent: function (evt) {
        this_.clearResults(true);
        mapElement.removeEventListener(evt.type, this, false);
        this_.registeredListeners.mapClick = false;
      }
    }, false);
  };

  Nominatim.prototype.clearResults = function clearResults (collapse) {
    collapse && this.options.targetType === targetType.GLASS ?
      this.collapse() : utils.removeAllChildren(this.els.result);
  };

  Nominatim.prototype.getSource = function getSource () {
    return this.layer.getSource();
  };

  Nominatim.prototype.addLayer = function addLayer () {
    var this$1 = this;

    var found = false;
    var map = this.Base.getMap();

    map.getLayers().forEach(function (layer) {
      if (layer === this$1.layer) { found = true; }
    });
    if (!found) { map.addLayer(this.layer); }
  };

  // classe Nomitatim fine //

  var $html = new Html(this);
  this.container = $html.els.container;
  this.nominatim = new Nominatim(this, $html.els);
  this.layer = this.nominatim.layer;
  Control.call(this, {
    element: this.container,
    name: "nominatim"
  });
}

ol.inherits(NominatimControl, Control);

proto = NominatimControl.prototype;


module.exports = NominatimControl;