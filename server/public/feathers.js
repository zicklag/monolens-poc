(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.feathers = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (process){
/**
 * This is the web browser implementation of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = require('./debug');
exports.log = log;
exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;
exports.storage = 'undefined' != typeof chrome
               && 'undefined' != typeof chrome.storage
                  ? chrome.storage.local
                  : localstorage();

/**
 * Colors.
 */

exports.colors = [
  'lightseagreen',
  'forestgreen',
  'goldenrod',
  'dodgerblue',
  'darkorchid',
  'crimson'
];

/**
 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
 * and the Firebug extension (any Firefox version) are known
 * to support "%c" CSS customizations.
 *
 * TODO: add a `localStorage` variable to explicitly enable/disable colors
 */

function useColors() {
  // NB: In an Electron preload script, document will be defined but not fully
  // initialized. Since we know we're in Chrome, we'll just detect this case
  // explicitly
  if (typeof window !== 'undefined' && window.process && window.process.type === 'renderer') {
    return true;
  }

  // is webkit? http://stackoverflow.com/a/16459606/376773
  // document is undefined in react-native: https://github.com/facebook/react-native/pull/1632
  return (typeof document !== 'undefined' && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance) ||
    // is firebug? http://stackoverflow.com/a/398120/376773
    (typeof window !== 'undefined' && window.console && (window.console.firebug || (window.console.exception && window.console.table))) ||
    // is firefox >= v31?
    // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
    (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31) ||
    // double check webkit in userAgent just in case we are in a worker
    (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/));
}

/**
 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
 */

exports.formatters.j = function(v) {
  try {
    return JSON.stringify(v);
  } catch (err) {
    return '[UnexpectedJSONParseError]: ' + err.message;
  }
};


/**
 * Colorize log arguments if enabled.
 *
 * @api public
 */

function formatArgs(args) {
  var useColors = this.useColors;

  args[0] = (useColors ? '%c' : '')
    + this.namespace
    + (useColors ? ' %c' : ' ')
    + args[0]
    + (useColors ? '%c ' : ' ')
    + '+' + exports.humanize(this.diff);

  if (!useColors) return;

  var c = 'color: ' + this.color;
  args.splice(1, 0, c, 'color: inherit')

  // the final "%c" is somewhat tricky, because there could be other
  // arguments passed either before or after the %c, so we need to
  // figure out the correct index to insert the CSS into
  var index = 0;
  var lastC = 0;
  args[0].replace(/%[a-zA-Z%]/g, function(match) {
    if ('%%' === match) return;
    index++;
    if ('%c' === match) {
      // we only are interested in the *last* %c
      // (the user may have provided their own)
      lastC = index;
    }
  });

  args.splice(lastC, 0, c);
}

/**
 * Invokes `console.log()` when available.
 * No-op when `console.log` is not a "function".
 *
 * @api public
 */

function log() {
  // this hackery is required for IE8/9, where
  // the `console.log` function doesn't have 'apply'
  return 'object' === typeof console
    && console.log
    && Function.prototype.apply.call(console.log, console, arguments);
}

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */

function save(namespaces) {
  try {
    if (null == namespaces) {
      exports.storage.removeItem('debug');
    } else {
      exports.storage.debug = namespaces;
    }
  } catch(e) {}
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */

function load() {
  var r;
  try {
    r = exports.storage.debug;
  } catch(e) {}

  // If debug isn't set in LS, and we're in Electron, try to load $DEBUG
  if (!r && typeof process !== 'undefined' && 'env' in process) {
    r = process.env.DEBUG;
  }

  return r;
}

/**
 * Enable namespaces listed in `localStorage.debug` initially.
 */

exports.enable(load());

/**
 * Localstorage attempts to return the localstorage.
 *
 * This is necessary because safari throws
 * when a user disables cookies/localstorage
 * and you attempt to access it.
 *
 * @return {LocalStorage}
 * @api private
 */

function localstorage() {
  try {
    return window.localStorage;
  } catch (e) {}
}

}).call(this,require('_process'))
},{"./debug":2,"_process":47}],2:[function(require,module,exports){

/**
 * This is the common logic for both the Node.js and web browser
 * implementations of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = createDebug.debug = createDebug['default'] = createDebug;
exports.coerce = coerce;
exports.disable = disable;
exports.enable = enable;
exports.enabled = enabled;
exports.humanize = require('ms');

/**
 * The currently active debug mode names, and names to skip.
 */

exports.names = [];
exports.skips = [];

/**
 * Map of special "%n" handling functions, for the debug "format" argument.
 *
 * Valid key names are a single, lower or upper-case letter, i.e. "n" and "N".
 */

exports.formatters = {};

/**
 * Previous log timestamp.
 */

var prevTime;

/**
 * Select a color.
 * @param {String} namespace
 * @return {Number}
 * @api private
 */

function selectColor(namespace) {
  var hash = 0, i;

  for (i in namespace) {
    hash  = ((hash << 5) - hash) + namespace.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }

  return exports.colors[Math.abs(hash) % exports.colors.length];
}

/**
 * Create a debugger with the given `namespace`.
 *
 * @param {String} namespace
 * @return {Function}
 * @api public
 */

function createDebug(namespace) {

  function debug() {
    // disabled?
    if (!debug.enabled) return;

    var self = debug;

    // set `diff` timestamp
    var curr = +new Date();
    var ms = curr - (prevTime || curr);
    self.diff = ms;
    self.prev = prevTime;
    self.curr = curr;
    prevTime = curr;

    // turn the `arguments` into a proper Array
    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i];
    }

    args[0] = exports.coerce(args[0]);

    if ('string' !== typeof args[0]) {
      // anything else let's inspect with %O
      args.unshift('%O');
    }

    // apply any `formatters` transformations
    var index = 0;
    args[0] = args[0].replace(/%([a-zA-Z%])/g, function(match, format) {
      // if we encounter an escaped % then don't increase the array index
      if (match === '%%') return match;
      index++;
      var formatter = exports.formatters[format];
      if ('function' === typeof formatter) {
        var val = args[index];
        match = formatter.call(self, val);

        // now we need to remove `args[index]` since it's inlined in the `format`
        args.splice(index, 1);
        index--;
      }
      return match;
    });

    // apply env-specific formatting (colors, etc.)
    exports.formatArgs.call(self, args);

    var logFn = debug.log || exports.log || console.log.bind(console);
    logFn.apply(self, args);
  }

  debug.namespace = namespace;
  debug.enabled = exports.enabled(namespace);
  debug.useColors = exports.useColors();
  debug.color = selectColor(namespace);

  // env-specific initialization logic for debug instances
  if ('function' === typeof exports.init) {
    exports.init(debug);
  }

  return debug;
}

/**
 * Enables a debug mode by namespaces. This can include modes
 * separated by a colon and wildcards.
 *
 * @param {String} namespaces
 * @api public
 */

function enable(namespaces) {
  exports.save(namespaces);

  exports.names = [];
  exports.skips = [];

  var split = (typeof namespaces === 'string' ? namespaces : '').split(/[\s,]+/);
  var len = split.length;

  for (var i = 0; i < len; i++) {
    if (!split[i]) continue; // ignore empty strings
    namespaces = split[i].replace(/\*/g, '.*?');
    if (namespaces[0] === '-') {
      exports.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
    } else {
      exports.names.push(new RegExp('^' + namespaces + '$'));
    }
  }
}

/**
 * Disable debug output.
 *
 * @api public
 */

function disable() {
  exports.enable('');
}

/**
 * Returns true if the given mode name is enabled, false otherwise.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */

function enabled(name) {
  var i, len;
  for (i = 0, len = exports.skips.length; i < len; i++) {
    if (exports.skips[i].test(name)) {
      return false;
    }
  }
  for (i = 0, len = exports.names.length; i < len; i++) {
    if (exports.names[i].test(name)) {
      return true;
    }
  }
  return false;
}

/**
 * Coerce `val`.
 *
 * @param {Mixed} val
 * @return {Mixed}
 * @api private
 */

function coerce(val) {
  if (val instanceof Error) return val.stack || val.message;
  return val;
}

},{"ms":46}],3:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        // At least give some kind of context to the user
        var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
        err.context = er;
        throw err;
      }
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    args = Array.prototype.slice.call(arguments, 1);
    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else if (listeners) {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.prototype.listenerCount = function(type) {
  if (this._events) {
    var evlistener = this._events[type];

    if (isFunction(evlistener))
      return 1;
    else if (evlistener)
      return evlistener.length;
  }
  return 0;
};

EventEmitter.listenerCount = function(emitter, type) {
  return emitter.listenerCount(type);
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],4:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _populateHeader = require('./populate-header');

var _populateHeader2 = _interopRequireDefault(_populateHeader);

var _populateAccessToken = require('./populate-access-token');

var _populateAccessToken2 = _interopRequireDefault(_populateAccessToken);

var _populateEntity = require('./populate-entity');

var _populateEntity2 = _interopRequireDefault(_populateEntity);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var hooks = {
  populateHeader: _populateHeader2.default,
  populateAccessToken: _populateAccessToken2.default,
  populateEntity: _populateEntity2.default
};

exports.default = hooks;
module.exports = exports['default'];
},{"./populate-access-token":5,"./populate-entity":6,"./populate-header":7}],5:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = populateAccessToken;
/*
 * Exposes the access token to the client side hooks
 * under hook.params.accessToken.
 */

function populateAccessToken() {
  return function (hook) {
    var app = hook.app;

    if (hook.type !== 'before') {
      return Promise.reject(new Error('The \'populateAccessToken\' hook should only be used as a \'before\' hook.'));
    }

    Object.assign(hook.params, { accessToken: app.get('accessToken') });

    return Promise.resolve(hook);
  };
}
module.exports = exports['default'];
},{}],6:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = populateEntity;
/*
 * Fetch and populate an entity by id encoded in the
 * access token payload. Useful for easily getting the
 * current user after authentication, or any other entity.
 */

function populateEntity() {
  var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  if (!options.service) {
    throw new Error('You need to pass \'options.service\' to the populateEntity() hook.');
  }

  if (!options.field) {
    throw new Error('You need to pass \'options.field\' to the populateEntity() hook.');
  }

  if (!options.entity) {
    throw new Error('You need to pass \'options.entity\' to the populateEntity() hook.');
  }

  return function (hook) {
    var app = hook.app;

    if (hook.type !== 'after') {
      return Promise.reject(new Error('The \'populateEntity\' hook should only be used as an \'after\' hook.'));
    }

    return app.passport.verifyJWT(hook.result.accessToken).then(function (payload) {
      var id = payload[options.field];

      if (!id) {
        return Promise.reject(new Error('Access token payload is missing the \'' + options.field + '\' field.'));
      }

      return app.service(options.service).get(id);
    }).then(function (entity) {
      hook.result[options.entity] = entity;
      app.set(options.entity, entity);

      return Promise.resolve(hook);
    });
  };
}
module.exports = exports['default'];
},{}],7:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = populateHeader;

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/*
 * Sets the access token in the authorization header
 * under hook.params.header so that it can be picked
 * up by the client side REST libraries.
 */

function populateHeader() {
  var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  if (!options.header) {
    throw new Error('You need to pass \'options.header\' to the populateHeader() hook.');
  }

  return function (hook) {
    if (hook.type !== 'before') {
      return Promise.reject(new Error('The \'populateHeader\' hook should only be used as a \'before\' hook.'));
    }

    if (hook.params.accessToken) {
      hook.params.headers = Object.assign({}, _defineProperty({}, options.header, options.prefix ? options.prefix + ' ' + hook.params.accessToken : hook.params.accessToken), hook.params.headers);
    }

    return Promise.resolve(hook);
  };
}
module.exports = exports['default'];
},{}],8:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = init;

var _index = require('./hooks/index');

var _index2 = _interopRequireDefault(_index);

var _passport = require('./passport');

var _passport2 = _interopRequireDefault(_passport);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var defaults = {
  header: 'Authorization',
  cookie: 'feathers-jwt',
  storageKey: 'feathers-jwt',
  jwtStrategy: 'jwt',
  path: '/authentication',
  entity: 'user',
  service: 'users',
  timeout: 5000
};

function init() {
  var config = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  var options = Object.assign({}, defaults, config);

  return function () {
    var app = this;

    app.passport = new _passport2.default(app, options);
    app.authenticate = app.passport.authenticate.bind(app.passport);
    app.logout = app.passport.logout.bind(app.passport);

    // Set up hook that adds token and user to params so that
    // it they can be accessed by client side hooks and services
    app.mixins.push(function (service) {
      // if (typeof service.hooks !== 'function') {
      if (typeof service.before !== 'function' || typeof service.after !== 'function') {
        throw new Error('It looks like feathers-hooks isn\'t configured. It is required before running feathers-authentication.');
      }

      service.before(_index2.default.populateAccessToken(options));
    });

    // Set up hook that adds authorization header for REST provider
    if (app.rest) {
      app.mixins.push(function (service) {
        service.before(_index2.default.populateHeader(options));
      });
    }
  };
}

init.defaults = defaults;
module.exports = exports['default'];
},{"./hooks/index":4,"./passport":9}],9:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _feathersErrors = require('feathers-errors');

var _feathersErrors2 = _interopRequireDefault(_feathersErrors);

var _jwtDecode = require('jwt-decode');

var _jwtDecode2 = _interopRequireDefault(_jwtDecode);

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _utils = require('./utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var debug = (0, _debug2.default)('feathers-authentication-client');

var Passport = function () {
  function Passport(app, options) {
    _classCallCheck(this, Passport);

    if (app.passport) {
      throw new Error('You have already registered authentication on this client app instance. You only need to do it once.');
    }

    Object.assign(this, {
      options: options,
      app: app,
      payloadIsValid: _utils.payloadIsValid,
      getCookie: _utils.getCookie,
      clearCookie: _utils.clearCookie,
      storage: app.get('storage') || this.getStorage(options.storage)
    });

    this.setJWT = this.setJWT.bind(this);

    app.set('storage', this.storage);
    this.getJWT().then(this.setJWT);

    this.setupSocketListeners();
  }

  _createClass(Passport, [{
    key: 'setupSocketListeners',
    value: function setupSocketListeners() {
      var _this = this;

      var app = this.app;
      var socket = app.io || app.primus;
      var emit = app.io ? 'emit' : 'send';
      var reconnected = app.io ? 'reconnect' : 'reconnected';

      if (!socket) {
        return;
      }

      socket.on(reconnected, function () {
        debug('Socket reconnected');

        // If socket was already authenticated then re-authenticate
        // it with the server automatically.
        if (socket.authenticated) {
          var data = {
            strategy: _this.options.jwtStrategy,
            accessToken: app.get('accessToken')
          };
          _this.authenticateSocket(data, socket, emit).then(_this.setJWT).catch(function (error) {
            debug('Error re-authenticating after socket reconnect', error);
            socket.authenticated = false;
            app.emit('reauthentication-error', error);
          });
        }
      });

      var socketUpgradeHandler = function socketUpgradeHandler() {
        socket.io.engine.on('upgrade', function () {
          debug('Socket upgrading');

          // If socket was already authenticated then re-authenticate
          // it with the server automatically.
          if (socket.authenticated) {
            var data = {
              strategy: _this.options.jwtStrategy,
              accessToken: app.get('accessToken')
            };

            _this.authenticateSocket(data, socket, emit).then(_this.setJWT).catch(function (error) {
              debug('Error re-authenticating after socket upgrade', error);
              socket.authenticated = false;
              app.emit('reauthentication-error', error);
            });
          }
        });
      };

      if (socket.io && socket.io.engine) {
        socketUpgradeHandler();
      } else {
        socket.on('connect', socketUpgradeHandler);
      }
    }
  }, {
    key: 'connected',
    value: function connected() {
      var _this2 = this;

      var app = this.app;

      if (app.rest) {
        return Promise.resolve();
      }

      var socket = app.io || app.primus;

      if (!socket) {
        return Promise.reject(new Error('It looks like your client connection has not been configured.'));
      }

      if (app.io && socket.connected || app.primus && socket.readyState === 3) {
        debug('Socket already connected');
        return Promise.resolve(socket);
      }

      return new Promise(function (resolve, reject) {
        var connected = app.primus ? 'open' : 'connect';
        var disconnect = app.io ? 'disconnect' : 'end';
        var timeout = setTimeout(function () {
          debug('Socket connection timed out');
          reject(new Error('Socket connection timed out'));
        }, _this2.options.timeout);

        debug('Waiting for socket connection');

        var handleDisconnect = function handleDisconnect() {
          debug('Socket disconnected before it could connect');
          socket.authenticated = false;
        };

        // If disconnect happens before `connect` the promise will be rejected.
        socket.once(disconnect, handleDisconnect);
        socket.once(connected, function () {
          debug('Socket connected');
          debug('Removing ' + disconnect + ' listener');
          socket.removeListener(disconnect, handleDisconnect);
          clearTimeout(timeout);
          resolve(socket);
        });
      });
    }
  }, {
    key: 'authenticate',
    value: function authenticate() {
      var _this3 = this;

      var credentials = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      var app = this.app;
      var getCredentials = Promise.resolve(credentials);

      // If no strategy was given let's try to authenticate with a stored JWT
      if (!credentials.strategy) {
        if (credentials.accessToken) {
          credentials.strategy = this.options.jwtStrategy;
        } else {
          getCredentials = this.getJWT().then(function (accessToken) {
            if (!accessToken) {
              return Promise.reject(new _feathersErrors2.default.NotAuthenticated('Could not find stored JWT and no authentication strategy was given'));
            }
            return { strategy: _this3.options.jwtStrategy, accessToken: accessToken };
          });
        }
      }

      return getCredentials.then(function (credentials) {
        return _this3.connected(app).then(function (socket) {
          if (app.rest) {
            return app.service(_this3.options.path).create(credentials).then(_this3.setJWT);
          }

          var emit = app.io ? 'emit' : 'send';
          return _this3.authenticateSocket(credentials, socket, emit).then(_this3.setJWT);
        });
      }).then(function (payload) {
        app.emit('authenticated', payload);
        return payload;
      });
    }

    // Returns a promise that authenticates a socket

  }, {
    key: 'authenticateSocket',
    value: function authenticateSocket(credentials, socket, emit) {
      var _this4 = this;

      return new Promise(function (resolve, reject) {
        var timeout = setTimeout(function () {
          debug('authenticateSocket timed out');
          reject(new Error('Authentication timed out'));
        }, _this4.options.timeout);

        debug('Attempting to authenticate socket');
        socket[emit]('authenticate', credentials, function (error, data) {
          if (error) {
            return reject(error);
          }

          clearTimeout(timeout);
          socket.authenticated = true;
          debug('Socket authenticated!');

          resolve(data);
        });
      });
    }
  }, {
    key: 'logoutSocket',
    value: function logoutSocket(socket, emit) {
      var _this5 = this;

      return new Promise(function (resolve, reject) {
        var timeout = setTimeout(function () {
          debug('logoutSocket timed out');
          reject(new Error('Logout timed out'));
        }, _this5.options.timeout);

        socket[emit]('logout', function (error) {
          clearTimeout(timeout);
          socket.authenticated = false;

          if (error) {
            return reject(error);
          }

          resolve();
        });
      });
    }
  }, {
    key: 'logout',
    value: function logout() {
      var _this6 = this;

      var app = this.app;

      app.set('accessToken', null);
      this.clearCookie(this.options.cookie);

      // remove the accessToken from localStorage
      return Promise.resolve(app.get('storage').removeItem(this.options.storageKey)).then(function () {
        // If using sockets de-authenticate the socket
        if (app.io || app.primus) {
          var method = app.io ? 'emit' : 'send';
          var socket = app.io ? app.io : app.primus;

          return _this6.logoutSocket(socket, method);
        }
      }).then(function (result) {
        app.emit('logout', result);

        return result;
      });
    }
  }, {
    key: 'setJWT',
    value: function setJWT(data) {
      var accessToken = data && data.accessToken ? data.accessToken : data;

      if (accessToken) {
        this.app.set('accessToken', accessToken);
        this.app.get('storage').setItem(this.options.storageKey, accessToken);
      }

      return Promise.resolve(data);
    }
  }, {
    key: 'getJWT',
    value: function getJWT() {
      var _this7 = this;

      var app = this.app;
      return new Promise(function (resolve, reject) {
        var accessToken = app.get('accessToken');

        if (accessToken) {
          return resolve(accessToken);
        }

        return Promise.resolve(_this7.storage.getItem(_this7.options.storageKey)).then(function (jwt) {
          var token = jwt || _this7.getCookie(_this7.options.cookie);

          if (token && token !== 'null' && !_this7.payloadIsValid((0, _jwtDecode2.default)(token))) {
            token = undefined;
          }

          return resolve(token);
        }).catch(reject);
      });
    }

    // Pass a jwt token, get back a payload if it's valid.

  }, {
    key: 'verifyJWT',
    value: function verifyJWT(token) {
      if (typeof token !== 'string') {
        return Promise.reject(new Error('Token provided to verifyJWT is missing or not a string'));
      }

      try {
        var payload = (0, _jwtDecode2.default)(token);

        if (this.payloadIsValid(payload)) {
          return Promise.resolve(payload);
        }

        return Promise.reject(new Error('Invalid token: expired'));
      } catch (error) {
        return Promise.reject(new Error('Cannot decode malformed token.'));
      }
    }

    // Returns a storage implementation

  }, {
    key: 'getStorage',
    value: function getStorage(storage) {
      if (storage) {
        return storage;
      }

      return new _utils.Storage();
    }
  }]);

  return Passport;
}();

exports.default = Passport;
module.exports = exports['default'];
},{"./utils":10,"debug":1,"feathers-errors":15,"jwt-decode":45}],10:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports.payloadIsValid = payloadIsValid;
exports.getCookie = getCookie;
exports.clearCookie = clearCookie;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Storage = exports.Storage = function () {
  function Storage() {
    _classCallCheck(this, Storage);

    this.store = {};
  }

  _createClass(Storage, [{
    key: 'getItem',
    value: function getItem(key) {
      return this.store[key];
    }
  }, {
    key: 'setItem',
    value: function setItem(key, value) {
      return this.store[key] = value;
    }
  }, {
    key: 'removeItem',
    value: function removeItem(key) {
      delete this.store[key];
      return this;
    }
  }]);

  return Storage;
}();

// Pass a decoded payload and it will return a boolean based on if it hasn't expired.


function payloadIsValid(payload) {
  return payload && (!payload.exp || payload.exp * 1000 > new Date().getTime());
}

function getCookie(name) {
  if (typeof document !== 'undefined') {
    var value = '; ' + document.cookie;
    var parts = value.split('; ' + name + '=');

    if (parts.length === 2) {
      return parts.pop().split(';').shift();
    }
  }

  return null;
}

function clearCookie(name) {
  if (typeof document !== 'undefined') {
    document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:01 GMT;';
  }

  return null;
}
},{}],11:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = getArguments;

function _typeof(obj) { return obj && typeof Symbol !== "undefined" && obj.constructor === Symbol ? "symbol" : typeof obj; }

var noop = exports.noop = function noop() {};
var getCallback = function getCallback(args) {
  var last = args[args.length - 1];
  return typeof last === 'function' ? last : noop;
};
var getParams = function getParams(args, position) {
  return _typeof(args[position]) === 'object' ? args[position] : {};
};

var updateOrPatch = function updateOrPatch(name) {
  return function (args) {
    var id = args[0];
    var data = args[1];
    var callback = getCallback(args);
    var params = getParams(args, 2);

    if (typeof id === 'function') {
      throw new Error('First parameter for \'' + name + '\' can not be a function');
    }

    if ((typeof data === 'undefined' ? 'undefined' : _typeof(data)) !== 'object') {
      throw new Error('No data provided for \'' + name + '\'');
    }

    if (args.length > 4) {
      throw new Error('Too many arguments for \'' + name + '\' service method');
    }

    return [id, data, params, callback];
  };
};

var getOrRemove = function getOrRemove(name) {
  return function (args) {
    var id = args[0];
    var params = getParams(args, 1);
    var callback = getCallback(args);

    if (args.length > 3) {
      throw new Error('Too many arguments for \'' + name + '\' service method');
    }

    if (typeof id === 'function') {
      throw new Error('First parameter for \'' + name + '\' can not be a function');
    }

    return [id, params, callback];
  };
};

var converters = exports.converters = {
  find: function find(args) {
    var callback = getCallback(args);
    var params = getParams(args, 0);

    if (args.length > 2) {
      throw new Error('Too many arguments for \'find\' service method');
    }

    return [params, callback];
  },
  create: function create(args) {
    var data = args[0];
    var params = getParams(args, 1);
    var callback = getCallback(args);

    if ((typeof data === 'undefined' ? 'undefined' : _typeof(data)) !== 'object') {
      throw new Error('First parameter for \'create\' must be an object');
    }

    if (args.length > 3) {
      throw new Error('Too many arguments for \'create\' service method');
    }

    return [data, params, callback];
  },

  update: updateOrPatch('update'),

  patch: updateOrPatch('patch'),

  get: getOrRemove('get'),

  remove: getOrRemove('remove')
};

function getArguments(method, args) {
  return converters[method](args);
}
},{}],12:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _arguments = require('./arguments');

var _arguments2 = _interopRequireDefault(_arguments);

var _utils = require('./utils');

var _hooks = require('./hooks');

var _hooks2 = _interopRequireDefault(_hooks);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = {
  _: _utils._,
  getArguments: _arguments2.default,
  stripSlashes: _utils.stripSlashes,
  hooks: _hooks2.default,
  matcher: _utils.matcher,
  sorter: _utils.sorter,
  select: _utils.select,
  makeUrl: _utils.makeUrl,
  // lodash functions
  each: _utils.each,
  some: _utils.some,
  every: _utils.every,
  keys: _utils.keys,
  values: _utils.values,
  isMatch: _utils.isMatch,
  isEmpty: _utils.isEmpty,
  isObject: _utils.isObject,
  extend: _utils.extend,
  omit: _utils.omit,
  pick: _utils.pick,
  merge: _utils.merge
};
module.exports = exports['default'];
},{"./arguments":11,"./hooks":13,"./utils":14}],13:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _utils = require('./utils');

function _typeof(obj) { return obj && typeof Symbol !== "undefined" && obj.constructor === Symbol ? "symbol" : typeof obj; }

function getOrRemove(args) {
  return {
    id: args[0],
    params: args[1],
    callback: args[2]
  };
}

function updateOrPatch(args) {
  return {
    id: args[0],
    data: args[1],
    params: args[2],
    callback: args[3]
  };
}

var converters = {
  find: function find(args) {
    return {
      params: args[0],
      callback: args[1]
    };
  },
  create: function create(args) {
    return {
      data: args[0],
      params: args[1],
      callback: args[2]
    };
  },
  get: getOrRemove,
  remove: getOrRemove,
  update: updateOrPatch,
  patch: updateOrPatch
};

function hookObject(method, type, args) {
  var app = arguments.length <= 3 || arguments[3] === undefined ? {} : arguments[3];

  var hook = converters[method](args);

  hook.method = method;
  hook.type = type;

  if (typeof app === 'function') {
    hook.app = app;
  } else {
    _extends(hook, app);
  }

  return hook;
}

function defaultMakeArguments(hook) {
  var result = [];
  if (typeof hook.id !== 'undefined') {
    result.push(hook.id);
  }

  if (hook.data) {
    result.push(hook.data);
  }

  result.push(hook.params || {});
  result.push(hook.callback);

  return result;
}

function makeArguments(hook) {
  if (hook.method === 'find') {
    return [hook.params, hook.callback];
  }

  if (hook.method === 'get' || hook.method === 'remove') {
    return [hook.id, hook.params, hook.callback];
  }

  if (hook.method === 'update' || hook.method === 'patch') {
    return [hook.id, hook.data, hook.params, hook.callback];
  }

  if (hook.method === 'create') {
    return [hook.data, hook.params, hook.callback];
  }

  return defaultMakeArguments(hook);
}

function convertHookData(obj) {
  var hook = {};

  if (Array.isArray(obj)) {
    hook = { all: obj };
  } else if ((typeof obj === 'undefined' ? 'undefined' : _typeof(obj)) !== 'object') {
    hook = { all: [obj] };
  } else {
    (0, _utils.each)(obj, function (value, key) {
      hook[key] = !Array.isArray(value) ? [value] : value;
    });
  }

  return hook;
}

exports.default = {
  hookObject: hookObject,
  hook: hookObject,
  converters: converters,
  defaultMakeArguments: defaultMakeArguments,
  makeArguments: makeArguments,
  convertHookData: convertHookData
};
module.exports = exports['default'];
},{"./utils":14}],14:[function(require,module,exports){
(function (process){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.stripSlashes = stripSlashes;
exports.each = each;
exports.some = some;
exports.every = every;
exports.keys = keys;
exports.values = values;
exports.isMatch = isMatch;
exports.isEmpty = isEmpty;
exports.isObject = isObject;
exports.extend = extend;
exports.omit = omit;
exports.pick = pick;
exports.merge = merge;
exports.select = select;
exports.matcher = matcher;
exports.sorter = sorter;
exports.makeUrl = makeUrl;

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _typeof(obj) { return obj && typeof Symbol !== "undefined" && obj.constructor === Symbol ? "symbol" : typeof obj; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function stripSlashes(name) {
  return name.replace(/^(\/*)|(\/*)$/g, '');
}

function each(obj, callback) {
  if (obj && typeof obj.forEach === 'function') {
    obj.forEach(callback);
  } else if (isObject(obj)) {
    Object.keys(obj).forEach(function (key) {
      return callback(obj[key], key);
    });
  }
}

function some(value, callback) {
  return Object.keys(value).map(function (key) {
    return [value[key], key];
  }).some(function (current) {
    return callback.apply(undefined, _toConsumableArray(current));
  });
}

function every(value, callback) {
  return Object.keys(value).map(function (key) {
    return [value[key], key];
  }).every(function (current) {
    return callback.apply(undefined, _toConsumableArray(current));
  });
}

function keys(obj) {
  return Object.keys(obj);
}

function values(obj) {
  return _.keys(obj).map(function (key) {
    return obj[key];
  });
}

function isMatch(obj, item) {
  return _.keys(item).every(function (key) {
    return obj[key] === item[key];
  });
}

function isEmpty(obj) {
  return _.keys(obj).length === 0;
}

function isObject(item) {
  return (typeof item === 'undefined' ? 'undefined' : _typeof(item)) === 'object' && !Array.isArray(item) && item !== null;
}

function extend() {
  return _extends.apply(undefined, arguments);
}

function omit(obj) {
  var result = _.extend({}, obj);

  for (var _len = arguments.length, keys = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    keys[_key - 1] = arguments[_key];
  }

  keys.forEach(function (key) {
    return delete result[key];
  });
  return result;
}

function pick(source) {
  var result = {};

  for (var _len2 = arguments.length, keys = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
    keys[_key2 - 1] = arguments[_key2];
  }

  keys.forEach(function (key) {
    result[key] = source[key];
  });
  return result;
}

function merge(target, source) {
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(function (key) {
      if (isObject(source[key])) {
        if (!target[key]) _extends(target, _defineProperty({}, key, {}));
        merge(target[key], source[key]);
      } else {
        _extends(target, _defineProperty({}, key, source[key]));
      }
    });
  }
  return target;
}

var _ = exports._ = {
  each: each,
  some: some,
  every: every,
  keys: keys,
  values: values,
  isMatch: isMatch,
  isEmpty: isEmpty,
  isObject: isObject,
  extend: extend,
  omit: omit,
  pick: pick,
  merge: merge
};

var specialFilters = exports.specialFilters = {
  $in: function $in(key, ins) {
    return function (current) {
      return ins.indexOf(current[key]) !== -1;
    };
  },
  $nin: function $nin(key, nins) {
    return function (current) {
      return nins.indexOf(current[key]) === -1;
    };
  },
  $lt: function $lt(key, value) {
    return function (current) {
      return current[key] < value;
    };
  },
  $lte: function $lte(key, value) {
    return function (current) {
      return current[key] <= value;
    };
  },
  $gt: function $gt(key, value) {
    return function (current) {
      return current[key] > value;
    };
  },
  $gte: function $gte(key, value) {
    return function (current) {
      return current[key] >= value;
    };
  },
  $ne: function $ne(key, value) {
    return function (current) {
      return current[key] !== value;
    };
  }
};

function select(params) {
  var fields = params && params.query && params.query.$select;

  for (var _len3 = arguments.length, otherFields = Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
    otherFields[_key3 - 1] = arguments[_key3];
  }

  if (Array.isArray(fields) && otherFields.length) {
    fields.push.apply(fields, otherFields);
  }

  var convert = function convert(result) {
    if (!Array.isArray(fields)) {
      return result;
    }

    return _.pick.apply(_, [result].concat(_toConsumableArray(fields)));
  };

  return function (result) {
    if (Array.isArray(result)) {
      return result.map(convert);
    }

    return convert(result);
  };
}

function matcher(originalQuery) {
  var query = _.omit(originalQuery, '$limit', '$skip', '$sort', '$select');

  return function (item) {
    if (query.$or && _.some(query.$or, function (or) {
      return matcher(or)(item);
    })) {
      return true;
    }

    return _.every(query, function (value, key) {
      if (value !== null && (typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object') {
        return _.every(value, function (target, filterType) {
          if (specialFilters[filterType]) {
            var filter = specialFilters[filterType](key, target);
            return filter(item);
          }

          return false;
        });
      } else if (typeof item[key] !== 'undefined') {
        return item[key] === query[key];
      }

      return false;
    });
  };
}

function sorter($sort) {
  return function (first, second) {
    var comparator = 0;
    each($sort, function (modifier, key) {
      modifier = parseInt(modifier, 10);

      if (first[key] < second[key]) {
        comparator -= 1 * modifier;
      }

      if (first[key] > second[key]) {
        comparator += 1 * modifier;
      }
    });
    return comparator;
  };
}

function makeUrl(path) {
  var app = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

  var get = typeof app.get === 'function' ? app.get.bind(app) : function () {};
  var env = get('env') || process.env.NODE_ENV;
  var host = get('host') || process.env.HOST_NAME || 'localhost';
  var protocol = env === 'development' || env === 'test' || env === undefined ? 'http' : 'https';
  var PORT = get('port') || process.env.PORT || 3030;
  var port = env === 'development' || env === 'test' || env === undefined ? ':' + PORT : '';

  path = path || '';

  return protocol + '://' + host + port + '/' + stripSlashes(path);
}
}).call(this,require('_process'))
},{"_process":47}],15:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var debug = require('debug')('feathers-errors');

function FeathersError(msg, name, code, className, data) {
  msg = msg || 'Error';

  var errors = void 0;
  var message = void 0;
  var newData = void 0;

  if (msg instanceof Error) {
    message = msg.message || 'Error';

    // NOTE (EK): This is typically to handle validation errors
    if (msg.errors) {
      errors = msg.errors;
    }
  } else if ((typeof msg === 'undefined' ? 'undefined' : _typeof(msg)) === 'object') {
    // Support plain old objects
    message = msg.message || 'Error';
    data = msg;
  } else {
    // message is just a string
    message = msg;
  }

  Error.call(this, message);

  if (data) {
    // NOTE(EK): To make sure that we are not messing
    // with immutable data, just make a copy.
    // https://github.com/feathersjs/feathers-errors/issues/19
    newData = JSON.parse(JSON.stringify(data));

    if (newData.errors) {
      errors = newData.errors;
      delete newData.errors;
    } else if (data.errors) {
      // The errors property from data could be
      // stripped away while cloning resulting newData not to have it
      // For example: when cloning arrays this property
      errors = JSON.parse(JSON.stringify(data.errors));
    }
  }

  // NOTE (EK): Babel doesn't support this so
  // we have to pass in the class name manually.
  // this.name = this.constructor.name;
  this.type = 'FeathersError';
  this.name = name;
  this.message = message;
  this.code = code;
  this.className = className;
  this.data = newData;
  this.errors = errors || {};

  debug(this.name + '(' + this.code + '): ' + this.message);
}

FeathersError.prototype = new Error();

// NOTE (EK): A little hack to get around `message` not
// being included in the default toJSON call.
Object.defineProperty(FeathersError.prototype, 'toJSON', {
  value: function value() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      className: this.className,
      data: this.data,
      errors: this.errors
    };
  }
});

// 400 - Bad Request
function BadRequest(message, data) {
  FeathersError.call(this, message, 'BadRequest', 400, 'bad-request', data);
}

BadRequest.prototype = new FeathersError();

// 401 - Not Authenticated
function NotAuthenticated(message, data) {
  FeathersError.call(this, message, 'NotAuthenticated', 401, 'not-authenticated', data);
}

NotAuthenticated.prototype = new FeathersError();

// 402 - Payment Error
function PaymentError(message, data) {
  FeathersError.call(this, message, 'PaymentError', 402, 'payment-error', data);
}

PaymentError.prototype = new FeathersError();

// 403 - Forbidden
function Forbidden(message, data) {
  FeathersError.call(this, message, 'Forbidden', 403, 'forbidden', data);
}

Forbidden.prototype = new FeathersError();

// 404 - Not Found
function NotFound(message, data) {
  FeathersError.call(this, message, 'NotFound', 404, 'not-found', data);
}

NotFound.prototype = new FeathersError();

// 405 - Method Not Allowed
function MethodNotAllowed(message, data) {
  FeathersError.call(this, message, 'MethodNotAllowed', 405, 'method-not-allowed', data);
}

MethodNotAllowed.prototype = new FeathersError();

// 406 - Not Acceptable
function NotAcceptable(message, data) {
  FeathersError.call(this, message, 'NotAcceptable', 406, 'not-acceptable', data);
}

NotAcceptable.prototype = new FeathersError();

// 408 - Timeout
function Timeout(message, data) {
  FeathersError.call(this, message, 'Timeout', 408, 'timeout', data);
}

Timeout.prototype = new FeathersError();

// 409 - Conflict
function Conflict(message, data) {
  FeathersError.call(this, message, 'Conflict', 409, 'conflict', data);
}

Conflict.prototype = new FeathersError();

// 411 - Length Required
function LengthRequired(message, data) {
  FeathersError.call(this, message, 'LengthRequired', 411, 'length-required', data);
}

LengthRequired.prototype = new FeathersError();

// 422 Unprocessable
function Unprocessable(message, data) {
  FeathersError.call(this, message, 'Unprocessable', 422, 'unprocessable', data);
}

Unprocessable.prototype = new FeathersError();

// 429 Too Many Requests
function TooManyRequests(message, data) {
  FeathersError.call(this, message, 'TooManyRequests', 429, 'too-many-requests', data);
}

TooManyRequests.prototype = new FeathersError();

// 500 - General Error
function GeneralError(message, data) {
  FeathersError.call(this, message, 'GeneralError', 500, 'general-error', data);
}

GeneralError.prototype = new FeathersError();

// 501 - Not Implemented
function NotImplemented(message, data) {
  FeathersError.call(this, message, 'NotImplemented', 501, 'not-implemented', data);
}

NotImplemented.prototype = new FeathersError();

// 502 - Bad Gateway
function BadGateway(message, data) {
  FeathersError.call(this, message, 'BadGateway', 502, 'bad-gateway', data);
}

BadGateway.prototype = new FeathersError();

// 503 - Unavailable
function Unavailable(message, data) {
  FeathersError.call(this, message, 'Unavailable', 503, 'unavailable', data);
}

Unavailable.prototype = new FeathersError();

var errors = {
  FeathersError: FeathersError,
  BadRequest: BadRequest,
  NotAuthenticated: NotAuthenticated,
  PaymentError: PaymentError,
  Forbidden: Forbidden,
  NotFound: NotFound,
  MethodNotAllowed: MethodNotAllowed,
  NotAcceptable: NotAcceptable,
  Timeout: Timeout,
  Conflict: Conflict,
  LengthRequired: LengthRequired,
  Unprocessable: Unprocessable,
  TooManyRequests: TooManyRequests,
  GeneralError: GeneralError,
  NotImplemented: NotImplemented,
  BadGateway: BadGateway,
  Unavailable: Unavailable,
  400: BadRequest,
  401: NotAuthenticated,
  402: PaymentError,
  403: Forbidden,
  404: NotFound,
  405: MethodNotAllowed,
  406: NotAcceptable,
  408: Timeout,
  409: Conflict,
  411: LengthRequired,
  422: Unprocessable,
  429: TooManyRequests,
  500: GeneralError,
  501: NotImplemented,
  502: BadGateway,
  503: Unavailable
};

function convert(error) {
  if (!error) {
    return error;
  }

  var FeathersError = errors[error.name];
  var result = FeathersError ? new FeathersError(error.message, error.data) : new Error(error.message || error);

  if ((typeof error === 'undefined' ? 'undefined' : _typeof(error)) === 'object') {
    _extends(result, error);
  }

  return result;
}

exports.default = _extends({
  convert: convert,
  types: errors,
  errors: errors
}, errors);
module.exports = exports['default'];
},{"debug":1}],16:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

exports.isHookObject = isHookObject;
exports.processHooks = processHooks;
exports.addHookTypes = addHookTypes;
exports.getHooks = getHooks;
exports.baseMixin = baseMixin;

var _feathersCommons = require('feathers-commons');

function isHookObject(hookObject) {
  return (typeof hookObject === 'undefined' ? 'undefined' : _typeof(hookObject)) === 'object' && typeof hookObject.method === 'string' && typeof hookObject.type === 'string';
}

function processHooks(hooks, initialHookObject) {
  var _this = this;

  var hookObject = initialHookObject;
  var updateCurrentHook = function updateCurrentHook(current) {
    if (current) {
      if (!isHookObject(current)) {
        throw new Error(hookObject.type + ' hook for \'' + hookObject.method + '\' method returned invalid hook object');
      }

      hookObject = current;
    }

    return hookObject;
  };
  var promise = Promise.resolve(hookObject);

  // Go through all hooks and chain them into our promise
  hooks.forEach(function (fn) {
    var hook = fn.bind(_this);

    if (hook.length === 2) {
      // function(hook, next)
      promise = promise.then(function (hookObject) {
        return new Promise(function (resolve, reject) {
          hook(hookObject, function (error, result) {
            return error ? reject(error) : resolve(result);
          });
        });
      });
    } else {
      // function(hook)
      promise = promise.then(hook);
    }

    // Use the returned hook object or the old one
    promise = promise.then(updateCurrentHook);
  });

  return promise.catch(function (error) {
    // Add the hook information to any errors
    error.hook = hookObject;
    throw error;
  });
}

function addHookTypes(target) {
  var types = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : ['before', 'after', 'error'];

  Object.defineProperty(target, '__hooks', {
    value: {}
  });

  types.forEach(function (type) {
    // Initialize properties where hook functions are stored
    target.__hooks[type] = {};
  });
}

function getHooks(app, service, type, method) {
  var appLast = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;

  var appHooks = app.__hooks[type][method] || [];
  var serviceHooks = service.__hooks[type][method] || [];

  if (appLast) {
    return serviceHooks.concat(appHooks);
  }

  return appHooks.concat(serviceHooks);
}

function baseMixin(methods) {
  var mixin = {
    hooks: function hooks(allHooks) {
      var _this2 = this;

      (0, _feathersCommons.each)(allHooks, function (obj, type) {
        if (!_this2.__hooks[type]) {
          throw new Error('\'' + type + '\' is not a valid hook type');
        }

        var hooks = _feathersCommons.hooks.convertHookData(obj);

        (0, _feathersCommons.each)(hooks, function (value, method) {
          if (method !== 'all' && methods.indexOf(method) === -1) {
            throw new Error('\'' + method + '\' is not a valid hook method');
          }
        });

        methods.forEach(function (method) {
          if (!(hooks[method] || hooks.all)) {
            return;
          }

          var myHooks = _this2.__hooks[type][method] || (_this2.__hooks[type][method] = []);

          if (hooks.all) {
            myHooks.push.apply(myHooks, hooks.all);
          }

          if (hooks[method]) {
            myHooks.push.apply(myHooks, hooks[method]);
          }
        });
      });

      return this;
    }
  };

  for (var _len = arguments.length, objs = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    objs[_key - 1] = arguments[_key];
  }

  return Object.assign.apply(Object, [mixin].concat(objs));
}
},{"feathers-commons":12}],17:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _uberproto = require('uberproto');

var _uberproto2 = _interopRequireDefault(_uberproto);

var _feathersCommons = require('feathers-commons');

var _commons = require('./commons');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function isPromise(result) {
  return typeof result !== 'undefined' && typeof result.then === 'function';
}

function hookMixin(service) {
  if (typeof service.hooks === 'function') {
    return;
  }

  var app = this;
  var methods = app.methods;
  var old = {
    before: service.before,
    after: service.after
  };
  var mixin = (0, _commons.baseMixin)(methods, {
    before: function before(_before) {
      return this.hooks({ before: _before });
    },
    after: function after(_after) {
      return this.hooks({ after: _after });
    }
  });

  (0, _commons.addHookTypes)(service);

  methods.forEach(function (method) {
    if (typeof service[method] !== 'function') {
      return;
    }

    mixin[method] = function () {
      var _this = this;

      var service = this;
      // A reference to the original method
      var _super = this._super.bind(this);
      // Additional data to add to the hook object
      var hookData = {
        app: app,
        service: service,
        get path() {
          return Object.keys(app.services).find(function (path) {
            return app.services[path] === service;
          });
        }
      };
      // Create the hook object that gets passed through
      var hookObject = _feathersCommons.hooks.hookObject(method, 'before', arguments, hookData);
      // Get all hooks
      var hooks = {
        // For before hooks the app hooks will run first
        before: (0, _commons.getHooks)(app, this, 'before', method),
        // For after and error hooks the app hooks will run last
        after: (0, _commons.getHooks)(app, this, 'after', method, true),
        error: (0, _commons.getHooks)(app, this, 'error', method, true)
      };

      // Process all before hooks
      return _commons.processHooks.call(this, hooks.before, hookObject)
      // Use the hook object to call the original method
      .then(function (hookObject) {
        if (typeof hookObject.result !== 'undefined') {
          return Promise.resolve(hookObject);
        }

        return new Promise(function (resolve, reject) {
          var args = _feathersCommons.hooks.makeArguments(hookObject);
          // The method may not be normalized yet so we have to handle both
          // ways, either by callback or by Promise
          var callback = function callback(error, result) {
            if (error) {
              reject(error);
            } else {
              hookObject.result = result;
              resolve(hookObject);
            }
          };

          // We replace the callback with resolving the promise
          args.splice(args.length - 1, 1, callback);

          var result = _super.apply(undefined, _toConsumableArray(args));

          if (isPromise(result)) {
            result.then(function (data) {
              return callback(null, data);
            }, callback);
          }
        });
      })
      // Make a copy of hookObject from `before` hooks and update type
      .then(function (hookObject) {
        return Object.assign({}, hookObject, { type: 'after' });
      })
      // Run through all `after` hooks
      .then(_commons.processHooks.bind(this, hooks.after))
      // Finally, return the result
      .then(function (hookObject) {
        return hookObject.result;
      })
      // Handle errors
      .catch(function (error) {
        var errorHook = Object.assign({}, error.hook || hookObject, {
          type: 'error',
          original: error.hook,
          error: error
        });

        return _commons.processHooks.call(_this, hooks.error, errorHook).then(function (hook) {
          return Promise.reject(hook.error);
        });
      });
    };
  });

  service.mixin(mixin);

  // Before hooks that were registered in the service
  if (old.before) {
    service.before(old.before);
  }

  // After hooks that were registered in the service
  if (old.after) {
    service.after(old.after);
  }
}

function configure() {
  return function () {
    var app = this;

    (0, _commons.addHookTypes)(app);

    _uberproto2.default.mixin((0, _commons.baseMixin)(app.methods), app);

    this.mixins.unshift(hookMixin);
  };
}

exports.default = configure;
module.exports = exports['default'];
},{"./commons":16,"feathers-commons":12,"uberproto":55}],18:[function(require,module,exports){
module.exports = require('./lib/client');

},{"./lib/client":19}],19:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (connection, options) {
  if (!connection) {
    throw new Error('Primus connection needs to be provided');
  }

  var defaultService = function defaultService(name) {
    return new _client2.default(Object.assign({}, options, {
      name: name,
      connection: connection,
      method: 'send'
    }));
  };

  var initialize = function initialize() {
    if (typeof this.defaultService === 'function') {
      throw new Error('Only one default client provider can be configured');
    }

    this.primus = connection;
    this.defaultService = defaultService;
  };

  initialize.Service = _client2.default;
  initialize.service = defaultService;

  return initialize;
};

var _client = require('feathers-socket-commons/client');

var _client2 = _interopRequireDefault(_client);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

module.exports = exports['default'];
},{"feathers-socket-commons/client":29}],20:[function(require,module,exports){
module.exports = require('./lib/client/index');

},{"./lib/client/index":25}],21:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _base = require('./base');

var _base2 = _interopRequireDefault(_base);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Service = function (_Base) {
  _inherits(Service, _Base);

  function Service() {
    _classCallCheck(this, Service);

    return _possibleConstructorReturn(this, (Service.__proto__ || Object.getPrototypeOf(Service)).apply(this, arguments));
  }

  _createClass(Service, [{
    key: 'request',
    value: function request(options) {
      var http = this.connection;
      var Headers = this.options.Headers;

      if (!http || !Headers) {
        throw new Error('Please pass angular\'s \'http\' (instance) and and object with \'Headers\' (class) to feathers-rest');
      }

      var url = options.url;
      var requestOptions = {
        method: options.method,
        body: options.body,
        headers: new Headers(_extends({ Accept: 'application/json' }, this.options.headers, options.headers))
      };

      return new Promise(function (resolve, reject) {
        http.request(url, requestOptions).subscribe(resolve, reject);
      }).then(function (res) {
        return res.json();
      }).catch(function (error) {
        var response = error.response || error;

        throw response instanceof Error ? response : response.json() || response;
      });
    }
  }]);

  return Service;
}(_base2.default);

exports.default = Service;
module.exports = exports['default'];
},{"./base":23}],22:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _base = require('./base');

var _base2 = _interopRequireDefault(_base);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Service = function (_Base) {
  _inherits(Service, _Base);

  function Service() {
    _classCallCheck(this, Service);

    return _possibleConstructorReturn(this, (Service.__proto__ || Object.getPrototypeOf(Service)).apply(this, arguments));
  }

  _createClass(Service, [{
    key: 'request',
    value: function request(options) {
      var config = {
        url: options.url,
        method: options.method,
        data: options.body,
        headers: _extends({
          Accept: 'application/json'
        }, this.options.headers, options.headers)
      };

      return this.connection.request(config).then(function (res) {
        return res.data;
      }).catch(function (error) {
        var response = error.response || error;

        throw response instanceof Error ? response : response.data || response;
      });
    }
  }]);

  return Service;
}(_base2.default);

exports.default = Service;
module.exports = exports['default'];
},{"./base":23}],23:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _qs = require('qs');

var _qs2 = _interopRequireDefault(_qs);

var _feathersCommons = require('feathers-commons');

var _feathersErrors = require('feathers-errors');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function toError(error) {
  throw (0, _feathersErrors.convert)(error);
}

var Base = function () {
  function Base(settings) {
    _classCallCheck(this, Base);

    this.name = (0, _feathersCommons.stripSlashes)(settings.name);
    this.options = settings.options;
    this.connection = settings.connection;
    this.base = settings.base + '/' + this.name;
  }

  _createClass(Base, [{
    key: 'makeUrl',
    value: function makeUrl(params, id) {
      params = params || {};
      var url = this.base;

      if (typeof id !== 'undefined' && id !== null) {
        url += '/' + id;
      }

      if (Object.keys(params).length !== 0) {
        var queryString = _qs2.default.stringify(params);

        url += '?' + queryString;
      }

      return url;
    }
  }, {
    key: 'find',
    value: function find() {
      var params = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      return this.request({
        url: this.makeUrl(params.query),
        method: 'GET',
        headers: _extends({}, params.headers)
      }).catch(toError);
    }
  }, {
    key: 'get',
    value: function get(id) {
      var params = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      if (typeof id === 'undefined') {
        return Promise.reject(new Error('id for \'get\' can not be undefined'));
      }

      return this.request({
        url: this.makeUrl(params.query, id),
        method: 'GET',
        headers: _extends({}, params.headers)
      }).catch(toError);
    }
  }, {
    key: 'create',
    value: function create(body) {
      var params = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      return this.request({
        url: this.makeUrl(params.query),
        body: body,
        method: 'POST',
        headers: _extends({ 'Content-Type': 'application/json' }, params.headers)
      }).catch(toError);
    }
  }, {
    key: 'update',
    value: function update(id, body) {
      var params = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

      if (typeof id === 'undefined') {
        return Promise.reject(new Error('id for \'update\' can not be undefined, only \'null\' when updating multiple entries'));
      }

      return this.request({
        url: this.makeUrl(params.query, id),
        body: body,
        method: 'PUT',
        headers: _extends({ 'Content-Type': 'application/json' }, params.headers)
      }).catch(toError);
    }
  }, {
    key: 'patch',
    value: function patch(id, body) {
      var params = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

      if (typeof id === 'undefined') {
        return Promise.reject(new Error('id for \'patch\' can not be undefined, only \'null\' when updating multiple entries'));
      }

      return this.request({
        url: this.makeUrl(params.query, id),
        body: body,
        method: 'PATCH',
        headers: _extends({ 'Content-Type': 'application/json' }, params.headers)
      }).catch(toError);
    }
  }, {
    key: 'remove',
    value: function remove(id) {
      var params = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      if (typeof id === 'undefined') {
        return Promise.reject(new Error('id for \'remove\' can not be undefined, only \'null\' when removing multiple entries'));
      }

      return this.request({
        url: this.makeUrl(params.query, id),
        method: 'DELETE',
        headers: _extends({}, params.headers)
      }).catch(toError);
    }
  }]);

  return Base;
}();

exports.default = Base;
module.exports = exports['default'];
},{"feathers-commons":12,"feathers-errors":15,"qs":49}],24:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _base = require('./base');

var _base2 = _interopRequireDefault(_base);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Service = function (_Base) {
  _inherits(Service, _Base);

  function Service() {
    _classCallCheck(this, Service);

    return _possibleConstructorReturn(this, (Service.__proto__ || Object.getPrototypeOf(Service)).apply(this, arguments));
  }

  _createClass(Service, [{
    key: 'request',
    value: function request(options) {
      var fetchOptions = _extends({}, options);

      fetchOptions.headers = _extends({
        Accept: 'application/json'
      }, this.options.headers, fetchOptions.headers);

      if (options.body) {
        fetchOptions.body = JSON.stringify(options.body);
      }

      var fetch = this.connection;

      return fetch(options.url, fetchOptions).then(this.checkStatus).then(function (response) {
        if (response.status === 204) {
          return null;
        }

        return response.json();
      });
    }
  }, {
    key: 'checkStatus',
    value: function checkStatus(response) {
      if (response.ok) {
        return response;
      }

      return response.json().then(function (error) {
        error.response = response;
        throw error;
      });
    }
  }]);

  return Service;
}(_base2.default);

exports.default = Service;
module.exports = exports['default'];
},{"./base":23}],25:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function () {
  var base = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';

  var result = {};

  Object.keys(transports).forEach(function (key) {
    var Service = transports[key];

    result[key] = function (connection) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      if (!connection) {
        throw new Error(key + ' has to be provided to feathers-rest');
      }

      var defaultService = function defaultService(name) {
        return new Service({ base: base, name: name, connection: connection, options: options });
      };

      var initialize = function initialize() {
        if (typeof this.defaultService === 'function') {
          throw new Error('Only one default client provider can be configured');
        }

        this.rest = connection;
        this.defaultService = defaultService;
      };

      initialize.Service = Service;
      initialize.service = defaultService;

      return initialize;
    };
  });

  return result;
};

var _jquery = require('./jquery');

var _jquery2 = _interopRequireDefault(_jquery);

var _superagent = require('./superagent');

var _superagent2 = _interopRequireDefault(_superagent);

var _request = require('./request');

var _request2 = _interopRequireDefault(_request);

var _fetch = require('./fetch');

var _fetch2 = _interopRequireDefault(_fetch);

var _axios = require('./axios');

var _axios2 = _interopRequireDefault(_axios);

var _angular = require('./angular');

var _angular2 = _interopRequireDefault(_angular);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var transports = {
  jquery: _jquery2.default,
  superagent: _superagent2.default,
  request: _request2.default,
  fetch: _fetch2.default,
  axios: _axios2.default,
  angular: _angular2.default
};

module.exports = exports['default'];
},{"./angular":21,"./axios":22,"./fetch":24,"./jquery":26,"./request":27,"./superagent":28}],26:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _base = require('./base');

var _base2 = _interopRequireDefault(_base);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Service = function (_Base) {
  _inherits(Service, _Base);

  function Service() {
    _classCallCheck(this, Service);

    return _possibleConstructorReturn(this, (Service.__proto__ || Object.getPrototypeOf(Service)).apply(this, arguments));
  }

  _createClass(Service, [{
    key: 'request',
    value: function request(options) {
      var _this2 = this;

      var opts = _extends({
        dataType: options.type || 'json'
      }, {
        headers: this.options.headers || {}
      }, options);

      if (options.body) {
        opts.data = JSON.stringify(options.body);
        opts.contentType = 'application/json';
      }

      delete opts.type;
      delete opts.body;

      return new Promise(function (resolve, reject) {
        _this2.connection.ajax(opts).then(resolve, function (xhr) {
          var error = xhr.responseText;

          try {
            error = JSON.parse(error);
          } catch (e) {
            error = new Error(xhr.responseText);
          }

          error.xhr = error.response = xhr;

          reject(error);
        });
      });
    }
  }]);

  return Service;
}(_base2.default);

exports.default = Service;
module.exports = exports['default'];
},{"./base":23}],27:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _base = require('./base');

var _base2 = _interopRequireDefault(_base);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Service = function (_Base) {
  _inherits(Service, _Base);

  function Service() {
    _classCallCheck(this, Service);

    return _possibleConstructorReturn(this, (Service.__proto__ || Object.getPrototypeOf(Service)).apply(this, arguments));
  }

  _createClass(Service, [{
    key: 'request',
    value: function request(options) {
      var _this2 = this;

      return new Promise(function (resolve, reject) {
        _this2.connection(_extends({
          json: true
        }, options), function (error, res, data) {
          if (error) {
            return reject(error);
          }

          if (!error && res.statusCode >= 400) {
            if (typeof data === 'string') {
              return reject(new Error(data));
            }

            data.response = res;

            return reject(_extends(new Error(data.message), data));
          }

          resolve(data);
        });
      });
    }
  }]);

  return Service;
}(_base2.default);

exports.default = Service;
module.exports = exports['default'];
},{"./base":23}],28:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _base = require('./base');

var _base2 = _interopRequireDefault(_base);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Service = function (_Base) {
  _inherits(Service, _Base);

  function Service() {
    _classCallCheck(this, Service);

    return _possibleConstructorReturn(this, (Service.__proto__ || Object.getPrototypeOf(Service)).apply(this, arguments));
  }

  _createClass(Service, [{
    key: 'request',
    value: function request(options) {
      var superagent = this.connection(options.method, options.url).set(this.options.headers || {}).set('Accept', 'application/json').set(options.headers || {}).type(options.type || 'json');

      return new Promise(function (resolve, reject) {
        superagent.set(options.headers);

        if (options.body) {
          superagent.send(options.body);
        }

        superagent.end(function (error, res) {
          if (error) {
            try {
              var response = error.response;
              error = JSON.parse(error.response.text);
              error.response = response;
            } catch (e) {}

            return reject(error);
          }

          resolve(res && res.body);
        });
      });
    }
  }]);

  return Service;
}(_base2.default);

exports.default = Service;
module.exports = exports['default'];
},{"./base":23}],29:[function(require,module,exports){
arguments[4][18][0].apply(exports,arguments)
},{"./lib/client":30,"dup":18}],30:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _utils = require('./utils');

var _feathersErrors = require('feathers-errors');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var debug = require('debug')('feathers-socket-commons:client');
var namespacedEmitterMethods = ['addListener', 'emit', 'listenerCount', 'listeners', 'on', 'once', 'prependListener', 'prependOnceListener', 'removeAllListeners', 'removeListener'];
var otherEmitterMethods = ['eventNames', 'getMaxListeners', 'setMaxListeners'];

var addEmitterMethods = function addEmitterMethods(service) {
  otherEmitterMethods.forEach(function (method) {
    service[method] = function () {
      var _connection;

      if (typeof this.connection[method] !== 'function') {
        throw new Error('Can not call \'' + method + '\' on the client service connection.');
      }

      return (_connection = this.connection)[method].apply(_connection, arguments);
    };
  });

  namespacedEmitterMethods.forEach(function (method) {
    service[method] = function (name) {
      var _connection2;

      if (typeof this.connection[method] !== 'function') {
        throw new Error('Can not call \'' + method + '\' on the client service connection.');
      }

      var eventName = this.path + ' ' + name;

      debug('Calling emitter method ' + method + ' with ' + ('namespaced event \'' + eventName + '\''));

      for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }

      var result = (_connection2 = this.connection)[method].apply(_connection2, [eventName].concat(args));

      return result === this.connection ? this : result;
    };
  });
};

var Service = function () {
  function Service(options) {
    _classCallCheck(this, Service);

    this.events = _utils.events;
    this.path = options.name;
    this.connection = options.connection;
    this.method = options.method;
    this.timeout = options.timeout || 5000;

    addEmitterMethods(this);
  }

  _createClass(Service, [{
    key: 'send',
    value: function send(method) {
      var _this = this;

      for (var _len2 = arguments.length, args = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
        args[_key2 - 1] = arguments[_key2];
      }

      var callback = null;
      if (typeof args[args.length - 1] === 'function') {
        callback = args.pop();
      }

      return new Promise(function (resolve, reject) {
        var _connection3;

        var event = _this.path + '::' + method;
        var timeoutId = setTimeout(function () {
          return reject(new Error('Timeout of ' + _this.timeout + 'ms exceeded calling ' + event));
        }, _this.timeout);

        args.unshift(event);
        args.push(function (error, data) {
          error = (0, _feathersErrors.convert)(error);
          clearTimeout(timeoutId);

          if (callback) {
            callback(error, data);
          }

          return error ? reject(error) : resolve(data);
        });

        debug('Sending socket.' + _this.method, args);

        (_connection3 = _this.connection)[_this.method].apply(_connection3, args);
      });
    }
  }, {
    key: 'find',
    value: function find() {
      var params = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      return this.send('find', params.query || {});
    }
  }, {
    key: 'get',
    value: function get(id) {
      var params = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      return this.send('get', id, params.query || {});
    }
  }, {
    key: 'create',
    value: function create(data) {
      var params = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      return this.send('create', data, params.query || {});
    }
  }, {
    key: 'update',
    value: function update(id, data) {
      var params = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

      return this.send('update', id, data, params.query || {});
    }
  }, {
    key: 'patch',
    value: function patch(id, data) {
      var params = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

      return this.send('patch', id, data, params.query || {});
    }
  }, {
    key: 'remove',
    value: function remove(id) {
      var params = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      return this.send('remove', id, params.query || {});
    }
  }, {
    key: 'off',
    value: function off(name) {
      for (var _len3 = arguments.length, args = Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
        args[_key3 - 1] = arguments[_key3];
      }

      if (typeof this.connection.off === 'function') {
        var _connection4;

        return (_connection4 = this.connection).off.apply(_connection4, [this.path + ' ' + name].concat(args));
      } else if (args.length === 0) {
        return this.removeAllListeners(name);
      }

      return this.removeListener.apply(this, [name].concat(args));
    }
  }]);

  return Service;
}();

exports.default = Service;
module.exports = exports['default'];
},{"./utils":31,"debug":1,"feathers-errors":15}],31:[function(require,module,exports){
(function (process){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.events = exports.eventMappings = undefined;
exports.convertFilterData = convertFilterData;
exports.promisify = promisify;
exports.normalizeError = normalizeError;
exports.normalizeArgs = normalizeArgs;

var _feathersCommons = require('feathers-commons');

var eventMappings = exports.eventMappings = {
  create: 'created',
  update: 'updated',
  patch: 'patched',
  remove: 'removed'
};

var events = exports.events = Object.keys(eventMappings).map(function (method) {
  return eventMappings[method];
});

function convertFilterData(obj) {
  return _feathersCommons.hooks.convertHookData(obj);
}

function promisify(method, context) {
  for (var _len = arguments.length, args = Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
    args[_key - 2] = arguments[_key];
  }

  return new Promise(function (resolve, reject) {
    method.apply(context, args.concat(function (error, result) {
      if (error) {
        return reject(error);
      }

      resolve(result);
    }));
  });
}

function normalizeError(e) {
  var result = {};

  Object.getOwnPropertyNames(e).forEach(function (key) {
    return result[key] = e[key];
  });

  if (process.env.NODE_ENV === 'production') {
    delete result.stack;
  }

  delete result.hook;

  return result;
}

function normalizeArgs(args) {
  var ret = [];
  if (args.length === 2 && Array.isArray(args['0'])) {
    ret = args[0];
    ret.push(args[1]);
    return ret;
  }
  return args;
}
}).call(this,require('_process'))
},{"_process":47,"feathers-commons":12}],32:[function(require,module,exports){
arguments[4][18][0].apply(exports,arguments)
},{"./lib/client":33,"dup":18}],33:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

exports.default = function (connection, options) {
  if (!connection) {
    throw new Error('Socket.io connection needs to be provided');
  }

  var defaultService = function defaultService(name) {
    var settings = _extends({}, options, {
      name: name,
      connection: connection,
      method: 'emit'
    });

    return new _client2.default(settings);
  };

  var initialize = function initialize() {
    if (typeof this.defaultService === 'function') {
      throw new Error('Only one default client provider can be configured');
    }

    this.io = connection;
    this.defaultService = defaultService;
  };

  initialize.Service = _client2.default;
  initialize.service = defaultService;

  return initialize;
};

var _client = require('feathers-socket-commons/client');

var _client2 = _interopRequireDefault(_client);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

module.exports = exports['default'];
},{"feathers-socket-commons/client":29}],34:[function(require,module,exports){
arguments[4][20][0].apply(exports,arguments)
},{"./lib/client/index":37,"dup":20}],35:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _feathersCommons = require('feathers-commons');

var _uberproto = require('uberproto');

var _uberproto2 = _interopRequireDefault(_uberproto);

var _index = require('./mixins/index');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var debug = (0, _debug2.default)('feathers:application');
var methods = ['find', 'get', 'create', 'update', 'patch', 'remove'];
var Proto = _uberproto2.default.extend({
  create: null
});

exports.default = {
  init: function init() {
    Object.assign(this, {
      methods: methods,
      mixins: (0, _index2.default)(),
      services: {},
      providers: [],
      _setup: false
    });
  },
  service: function service(location, _service) {
    var _this = this;

    var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

    location = (0, _feathersCommons.stripSlashes)(location);

    if (!_service) {
      var current = this.services[location];

      if (typeof current === 'undefined' && typeof this.defaultService === 'function') {
        return this.service(location, this.defaultService(location), options);
      }

      return current;
    }

    var protoService = Proto.extend(_service);

    debug('Registering new service at `' + location + '`');

    // Add all the mixins
    this.mixins.forEach(function (fn) {
      return fn.call(_this, protoService);
    });

    if (typeof protoService._setup === 'function') {
      protoService._setup(this, location);
    }

    // Run the provider functions to register the service
    this.providers.forEach(function (provider) {
      return provider.call(_this, location, protoService, options);
    });

    // If we ran setup already, set this service up explicitly
    if (this._isSetup && typeof protoService.setup === 'function') {
      debug('Setting up service for `' + location + '`');
      protoService.setup(this, location);
    }

    return this.services[location] = protoService;
  },
  use: function use(location) {
    var service = void 0;
    var middleware = Array.from(arguments).slice(1).reduce(function (middleware, arg) {
      if (typeof arg === 'function') {
        middleware[service ? 'after' : 'before'].push(arg);
      } else if (!service) {
        service = arg;
      } else {
        throw new Error('invalid arg passed to app.use');
      }
      return middleware;
    }, {
      before: [],
      after: []
    });

    var hasMethod = function hasMethod(methods) {
      return methods.some(function (name) {
        return service && typeof service[name] === 'function';
      });
    };

    // Check for service (any object with at least one service method)
    if (hasMethod(['handle', 'set']) || !hasMethod(this.methods.concat('setup'))) {
      return this._super.apply(this, arguments);
    }

    // Any arguments left over are other middleware that we want to pass to the providers
    this.service(location, service, { middleware: middleware });

    return this;
  },
  setup: function setup() {
    var _this2 = this;

    // Setup each service (pass the app so that they can look up other services etc.)
    Object.keys(this.services).forEach(function (path) {
      var service = _this2.services[path];

      debug('Setting up service for `' + path + '`');
      if (typeof service.setup === 'function') {
        service.setup(_this2, path);
      }
    });

    this._isSetup = true;

    return this;
  },


  // Express 3.x configure is gone in 4.x but we'll keep a more basic version
  // That just takes a function in order to keep Feathers plugin configuration easier.
  // Environment specific configurations should be done as suggested in the 4.x migration guide:
  // https://github.com/visionmedia/express/wiki/Migrating-from-3.x-to-4.x
  configure: function configure(fn) {
    fn.call(this);

    return this;
  },
  listen: function listen() {
    var server = this._super.apply(this, arguments);

    this.setup(server);
    debug('Feathers application listening');

    return server;
  }
};
module.exports = exports['default'];
},{"./mixins/index":40,"debug":1,"feathers-commons":12,"uberproto":55}],36:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function () {
  var app = {
    settings: {},

    get: function get(name) {
      return this.settings[name];
    },
    set: function set(name, value) {
      this.settings[name] = value;
      return this;
    },
    disable: function disable(name) {
      this.settings[name] = false;
      return this;
    },
    disabled: function disabled(name) {
      return !this.settings[name];
    },
    enable: function enable(name) {
      this.settings[name] = true;
      return this;
    },
    enabled: function enabled(name) {
      return !!this.settings[name];
    },
    use: function use() {
      throw new Error('Middleware functions can not be used in the Feathers client');
    },
    listen: function listen() {
      return {};
    }
  };

  _uberproto2.default.mixin(_events.EventEmitter.prototype, app);

  return app;
};

var _events = require('events');

var _uberproto = require('uberproto');

var _uberproto2 = _interopRequireDefault(_uberproto);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

module.exports = exports['default'];
},{"events":3,"uberproto":55}],37:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = createApplication;

var _feathers = require('../feathers');

var _feathers2 = _interopRequireDefault(_feathers);

var _express = require('./express');

var _express2 = _interopRequireDefault(_express);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function createApplication() {
  return (0, _feathers2.default)(_express2.default.apply(undefined, arguments));
}

createApplication.version = '2.0.1';
module.exports = exports['default'];
},{"../feathers":38,"./express":36}],38:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = createApplication;

var _uberproto = require('uberproto');

var _uberproto2 = _interopRequireDefault(_uberproto);

var _application = require('./application');

var _application2 = _interopRequireDefault(_application);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Create a Feathers application that extends Express.
 *
 * @return {Function}
 * @api public
 */
function createApplication(app) {
  _uberproto2.default.mixin(_application2.default, app);
  app.init();
  return app;
}
module.exports = exports['default'];
},{"./application":35,"uberproto":55}],39:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (service) {
  var app = this;
  var isEmitter = typeof service.on === 'function' && typeof service.emit === 'function';
  var emitter = service._rubberDuck = _rubberduck2.default.emitter(service);

  if (typeof service.mixin === 'function' && !isEmitter) {
    service.mixin(_events.EventEmitter.prototype);
  }

  service._serviceEvents = Array.isArray(service.events) ? service.events.slice() : [];

  // Pass the Rubberduck error event through
  // TODO deal with error events properly
  emitter.on('error', function (errors) {
    service.emit('serviceError', errors[0]);
  });

  Object.keys(eventMappings).forEach(function (method) {
    var event = eventMappings[method];
    var alreadyEmits = service._serviceEvents.indexOf(event) !== -1;

    if (typeof service[method] === 'function' && !alreadyEmits) {
      // The Rubberduck event name (e.g. afterCreate, afterUpdate or afterDestroy)
      var eventName = 'after' + upperCase(method);
      service._serviceEvents.push(event);
      // Punch the given method
      emitter.punch(method, -1);
      // Pass the event and error event through
      emitter.on(eventName, function (results, args) {
        if (!results[0]) {
          // callback without error
          var hook = hookObject(method, 'after', args);
          var data = Array.isArray(results[1]) ? results[1] : [results[1]];

          hook.app = app;
          data.forEach(function (current) {
            return service.emit(event, current, hook);
          });
        } else {
          service.emit('serviceError', results[0]);
        }
      });
    }
  });
};

var _rubberduck = require('rubberduck');

var _rubberduck2 = _interopRequireDefault(_rubberduck);

var _events = require('events');

var _feathersCommons = require('feathers-commons');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var hookObject = _feathersCommons.hooks.hookObject;
var eventMappings = {
  create: 'created',
  update: 'updated',
  remove: 'removed',
  patch: 'patched'
};

function upperCase(name) {
  return name.charAt(0).toUpperCase() + name.substring(1);
}

module.exports = exports['default'];
},{"events":3,"feathers-commons":12,"rubberduck":53}],40:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function () {
  var mixins = [require('./promise'), require('./event'), require('./normalizer')];

  // Override push to make sure that normalize is always the last
  mixins.push = function () {
    var args = [this.length - 1, 0].concat(Array.from(arguments));
    this.splice.apply(this, args);
    return this.length;
  };

  return mixins;
};

module.exports = exports['default'];
},{"./event":39,"./normalizer":41,"./promise":42}],41:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (service) {
  if (typeof service.mixin === 'function') {
    var mixin = {};

    this.methods.forEach(function (method) {
      if (typeof service[method] === 'function') {
        mixin[method] = function () {
          return this._super.apply(this, (0, _feathersCommons.getArguments)(method, arguments));
        };
      }
    });

    service.mixin(mixin);
  }
};

var _feathersCommons = require('feathers-commons');

module.exports = exports['default'];
},{"feathers-commons":12}],42:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (service) {
  if (typeof service.mixin === 'function') {
    var mixin = {};

    this.methods.forEach(function (method) {
      if (typeof service[method] === 'function') {
        mixin[method] = wrapper;
      }
    });

    service.mixin(mixin);
  }
};

function isPromise(result) {
  return typeof result !== 'undefined' && typeof result.then === 'function';
}

function wrapper() {
  var result = this._super.apply(this, arguments);
  var callback = arguments[arguments.length - 1];

  if (typeof callback === 'function' && isPromise(result)) {
    result.then(function (data) {
      return callback(null, data);
    }, function (error) {
      return callback(error);
    });
  }
  return result;
}

module.exports = exports['default'];
},{}],43:[function(require,module,exports){
/**
 * The code was extracted from:
 * https://github.com/davidchambers/Base64.js
 */

var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

function InvalidCharacterError(message) {
  this.message = message;
}

InvalidCharacterError.prototype = new Error();
InvalidCharacterError.prototype.name = 'InvalidCharacterError';

function polyfill (input) {
  var str = String(input).replace(/=+$/, '');
  if (str.length % 4 == 1) {
    throw new InvalidCharacterError("'atob' failed: The string to be decoded is not correctly encoded.");
  }
  for (
    // initialize result and counters
    var bc = 0, bs, buffer, idx = 0, output = '';
    // get next character
    buffer = str.charAt(idx++);
    // character found in table? initialize bit storage and add its ascii value;
    ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer,
      // and if not first of each 4 characters,
      // convert the first 8 bits to one ascii character
      bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0
  ) {
    // try to find character in table (0-63, not found => -1)
    buffer = chars.indexOf(buffer);
  }
  return output;
}


module.exports = typeof window !== 'undefined' && window.atob && window.atob.bind(window) || polyfill;

},{}],44:[function(require,module,exports){
var atob = require('./atob');

function b64DecodeUnicode(str) {
  return decodeURIComponent(atob(str).replace(/(.)/g, function (m, p) {
    var code = p.charCodeAt(0).toString(16).toUpperCase();
    if (code.length < 2) {
      code = '0' + code;
    }
    return '%' + code;
  }));
}

module.exports = function(str) {
  var output = str.replace(/-/g, "+").replace(/_/g, "/");
  switch (output.length % 4) {
    case 0:
      break;
    case 2:
      output += "==";
      break;
    case 3:
      output += "=";
      break;
    default:
      throw "Illegal base64url string!";
  }

  try{
    return b64DecodeUnicode(output);
  } catch (err) {
    return atob(output);
  }
};

},{"./atob":43}],45:[function(require,module,exports){
'use strict';

var base64_url_decode = require('./base64_url_decode');

function InvalidTokenError(message) {
  this.message = message;
}

InvalidTokenError.prototype = new Error();
InvalidTokenError.prototype.name = 'InvalidTokenError';

module.exports = function (token,options) {
  if (typeof token !== 'string') {
    throw new InvalidTokenError('Invalid token specified');
  }

  options = options || {};
  var pos = options.header === true ? 0 : 1;
  try {
    return JSON.parse(base64_url_decode(token.split('.')[pos]));
  } catch (e) {
    throw new InvalidTokenError('Invalid token specified: ' + e.message);
  }
};

module.exports.InvalidTokenError = InvalidTokenError;

},{"./base64_url_decode":44}],46:[function(require,module,exports){
/**
 * Helpers.
 */

var s = 1000;
var m = s * 60;
var h = m * 60;
var d = h * 24;
var y = d * 365.25;

/**
 * Parse or format the given `val`.
 *
 * Options:
 *
 *  - `long` verbose formatting [false]
 *
 * @param {String|Number} val
 * @param {Object} [options]
 * @throws {Error} throw an error if val is not a non-empty string or a number
 * @return {String|Number}
 * @api public
 */

module.exports = function(val, options) {
  options = options || {};
  var type = typeof val;
  if (type === 'string' && val.length > 0) {
    return parse(val);
  } else if (type === 'number' && isNaN(val) === false) {
    return options.long ? fmtLong(val) : fmtShort(val);
  }
  throw new Error(
    'val is not a non-empty string or a valid number. val=' +
      JSON.stringify(val)
  );
};

/**
 * Parse the given `str` and return milliseconds.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function parse(str) {
  str = String(str);
  if (str.length > 100) {
    return;
  }
  var match = /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(
    str
  );
  if (!match) {
    return;
  }
  var n = parseFloat(match[1]);
  var type = (match[2] || 'ms').toLowerCase();
  switch (type) {
    case 'years':
    case 'year':
    case 'yrs':
    case 'yr':
    case 'y':
      return n * y;
    case 'days':
    case 'day':
    case 'd':
      return n * d;
    case 'hours':
    case 'hour':
    case 'hrs':
    case 'hr':
    case 'h':
      return n * h;
    case 'minutes':
    case 'minute':
    case 'mins':
    case 'min':
    case 'm':
      return n * m;
    case 'seconds':
    case 'second':
    case 'secs':
    case 'sec':
    case 's':
      return n * s;
    case 'milliseconds':
    case 'millisecond':
    case 'msecs':
    case 'msec':
    case 'ms':
      return n;
    default:
      return undefined;
  }
}

/**
 * Short format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function fmtShort(ms) {
  if (ms >= d) {
    return Math.round(ms / d) + 'd';
  }
  if (ms >= h) {
    return Math.round(ms / h) + 'h';
  }
  if (ms >= m) {
    return Math.round(ms / m) + 'm';
  }
  if (ms >= s) {
    return Math.round(ms / s) + 's';
  }
  return ms + 'ms';
}

/**
 * Long format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function fmtLong(ms) {
  return plural(ms, d, 'day') ||
    plural(ms, h, 'hour') ||
    plural(ms, m, 'minute') ||
    plural(ms, s, 'second') ||
    ms + ' ms';
}

/**
 * Pluralization helper.
 */

function plural(ms, n, name) {
  if (ms < n) {
    return;
  }
  if (ms < n * 1.5) {
    return Math.floor(ms / n) + ' ' + name;
  }
  return Math.ceil(ms / n) + ' ' + name + 's';
}

},{}],47:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],48:[function(require,module,exports){
'use strict';

var replace = String.prototype.replace;
var percentTwenties = /%20/g;

module.exports = {
    'default': 'RFC3986',
    formatters: {
        RFC1738: function (value) {
            return replace.call(value, percentTwenties, '+');
        },
        RFC3986: function (value) {
            return value;
        }
    },
    RFC1738: 'RFC1738',
    RFC3986: 'RFC3986'
};

},{}],49:[function(require,module,exports){
'use strict';

var stringify = require('./stringify');
var parse = require('./parse');
var formats = require('./formats');

module.exports = {
    formats: formats,
    parse: parse,
    stringify: stringify
};

},{"./formats":48,"./parse":50,"./stringify":51}],50:[function(require,module,exports){
'use strict';

var utils = require('./utils');

var has = Object.prototype.hasOwnProperty;

var defaults = {
    allowDots: false,
    allowPrototypes: false,
    arrayLimit: 20,
    decoder: utils.decode,
    delimiter: '&',
    depth: 5,
    parameterLimit: 1000,
    plainObjects: false,
    strictNullHandling: false
};

var parseValues = function parseQueryStringValues(str, options) {
    var obj = {};
    var parts = str.split(options.delimiter, options.parameterLimit === Infinity ? undefined : options.parameterLimit);

    for (var i = 0; i < parts.length; ++i) {
        var part = parts[i];
        var pos = part.indexOf(']=') === -1 ? part.indexOf('=') : part.indexOf(']=') + 1;

        var key, val;
        if (pos === -1) {
            key = options.decoder(part);
            val = options.strictNullHandling ? null : '';
        } else {
            key = options.decoder(part.slice(0, pos));
            val = options.decoder(part.slice(pos + 1));
        }
        if (has.call(obj, key)) {
            obj[key] = [].concat(obj[key]).concat(val);
        } else {
            obj[key] = val;
        }
    }

    return obj;
};

var parseObject = function parseObjectRecursive(chain, val, options) {
    if (!chain.length) {
        return val;
    }

    var root = chain.shift();

    var obj;
    if (root === '[]') {
        obj = [];
        obj = obj.concat(parseObject(chain, val, options));
    } else {
        obj = options.plainObjects ? Object.create(null) : {};
        var cleanRoot = root.charAt(0) === '[' && root.charAt(root.length - 1) === ']' ? root.slice(1, -1) : root;
        var index = parseInt(cleanRoot, 10);
        if (
            !isNaN(index) &&
            root !== cleanRoot &&
            String(index) === cleanRoot &&
            index >= 0 &&
            (options.parseArrays && index <= options.arrayLimit)
        ) {
            obj = [];
            obj[index] = parseObject(chain, val, options);
        } else {
            obj[cleanRoot] = parseObject(chain, val, options);
        }
    }

    return obj;
};

var parseKeys = function parseQueryStringKeys(givenKey, val, options) {
    if (!givenKey) {
        return;
    }

    // Transform dot notation to bracket notation
    var key = options.allowDots ? givenKey.replace(/\.([^.[]+)/g, '[$1]') : givenKey;

    // The regex chunks

    var brackets = /(\[[^[\]]*])/;
    var child = /(\[[^[\]]*])/g;

    // Get the parent

    var segment = brackets.exec(key);
    var parent = segment ? key.slice(0, segment.index) : key;

    // Stash the parent if it exists

    var keys = [];
    if (parent) {
        // If we aren't using plain objects, optionally prefix keys
        // that would overwrite object prototype properties
        if (!options.plainObjects && has.call(Object.prototype, parent)) {
            if (!options.allowPrototypes) {
                return;
            }
        }

        keys.push(parent);
    }

    // Loop through children appending to the array until we hit depth

    var i = 0;
    while ((segment = child.exec(key)) !== null && i < options.depth) {
        i += 1;
        if (!options.plainObjects && has.call(Object.prototype, segment[1].slice(1, -1))) {
            if (!options.allowPrototypes) {
                return;
            }
        }
        keys.push(segment[1]);
    }

    // If there's a remainder, just add whatever is left

    if (segment) {
        keys.push('[' + key.slice(segment.index) + ']');
    }

    return parseObject(keys, val, options);
};

module.exports = function (str, opts) {
    var options = opts || {};

    if (options.decoder !== null && options.decoder !== undefined && typeof options.decoder !== 'function') {
        throw new TypeError('Decoder has to be a function.');
    }

    options.delimiter = typeof options.delimiter === 'string' || utils.isRegExp(options.delimiter) ? options.delimiter : defaults.delimiter;
    options.depth = typeof options.depth === 'number' ? options.depth : defaults.depth;
    options.arrayLimit = typeof options.arrayLimit === 'number' ? options.arrayLimit : defaults.arrayLimit;
    options.parseArrays = options.parseArrays !== false;
    options.decoder = typeof options.decoder === 'function' ? options.decoder : defaults.decoder;
    options.allowDots = typeof options.allowDots === 'boolean' ? options.allowDots : defaults.allowDots;
    options.plainObjects = typeof options.plainObjects === 'boolean' ? options.plainObjects : defaults.plainObjects;
    options.allowPrototypes = typeof options.allowPrototypes === 'boolean' ? options.allowPrototypes : defaults.allowPrototypes;
    options.parameterLimit = typeof options.parameterLimit === 'number' ? options.parameterLimit : defaults.parameterLimit;
    options.strictNullHandling = typeof options.strictNullHandling === 'boolean' ? options.strictNullHandling : defaults.strictNullHandling;

    if (str === '' || str === null || typeof str === 'undefined') {
        return options.plainObjects ? Object.create(null) : {};
    }

    var tempObj = typeof str === 'string' ? parseValues(str, options) : str;
    var obj = options.plainObjects ? Object.create(null) : {};

    // Iterate over the keys and setup the new object

    var keys = Object.keys(tempObj);
    for (var i = 0; i < keys.length; ++i) {
        var key = keys[i];
        var newObj = parseKeys(key, tempObj[key], options);
        obj = utils.merge(obj, newObj, options);
    }

    return utils.compact(obj);
};

},{"./utils":52}],51:[function(require,module,exports){
'use strict';

var utils = require('./utils');
var formats = require('./formats');

var arrayPrefixGenerators = {
    brackets: function brackets(prefix) { // eslint-disable-line func-name-matching
        return prefix + '[]';
    },
    indices: function indices(prefix, key) { // eslint-disable-line func-name-matching
        return prefix + '[' + key + ']';
    },
    repeat: function repeat(prefix) { // eslint-disable-line func-name-matching
        return prefix;
    }
};

var toISO = Date.prototype.toISOString;

var defaults = {
    delimiter: '&',
    encode: true,
    encoder: utils.encode,
    encodeValuesOnly: false,
    serializeDate: function serializeDate(date) { // eslint-disable-line func-name-matching
        return toISO.call(date);
    },
    skipNulls: false,
    strictNullHandling: false
};

var stringify = function stringify( // eslint-disable-line func-name-matching
    object,
    prefix,
    generateArrayPrefix,
    strictNullHandling,
    skipNulls,
    encoder,
    filter,
    sort,
    allowDots,
    serializeDate,
    formatter,
    encodeValuesOnly
) {
    var obj = object;
    if (typeof filter === 'function') {
        obj = filter(prefix, obj);
    } else if (obj instanceof Date) {
        obj = serializeDate(obj);
    } else if (obj === null) {
        if (strictNullHandling) {
            return encoder && !encodeValuesOnly ? encoder(prefix) : prefix;
        }

        obj = '';
    }

    if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean' || utils.isBuffer(obj)) {
        if (encoder) {
            var keyValue = encodeValuesOnly ? prefix : encoder(prefix);
            return [formatter(keyValue) + '=' + formatter(encoder(obj))];
        }
        return [formatter(prefix) + '=' + formatter(String(obj))];
    }

    var values = [];

    if (typeof obj === 'undefined') {
        return values;
    }

    var objKeys;
    if (Array.isArray(filter)) {
        objKeys = filter;
    } else {
        var keys = Object.keys(obj);
        objKeys = sort ? keys.sort(sort) : keys;
    }

    for (var i = 0; i < objKeys.length; ++i) {
        var key = objKeys[i];

        if (skipNulls && obj[key] === null) {
            continue;
        }

        if (Array.isArray(obj)) {
            values = values.concat(stringify(
                obj[key],
                generateArrayPrefix(prefix, key),
                generateArrayPrefix,
                strictNullHandling,
                skipNulls,
                encoder,
                filter,
                sort,
                allowDots,
                serializeDate,
                formatter,
                encodeValuesOnly
            ));
        } else {
            values = values.concat(stringify(
                obj[key],
                prefix + (allowDots ? '.' + key : '[' + key + ']'),
                generateArrayPrefix,
                strictNullHandling,
                skipNulls,
                encoder,
                filter,
                sort,
                allowDots,
                serializeDate,
                formatter,
                encodeValuesOnly
            ));
        }
    }

    return values;
};

module.exports = function (object, opts) {
    var obj = object;
    var options = opts || {};

    if (options.encoder !== null && options.encoder !== undefined && typeof options.encoder !== 'function') {
        throw new TypeError('Encoder has to be a function.');
    }

    var delimiter = typeof options.delimiter === 'undefined' ? defaults.delimiter : options.delimiter;
    var strictNullHandling = typeof options.strictNullHandling === 'boolean' ? options.strictNullHandling : defaults.strictNullHandling;
    var skipNulls = typeof options.skipNulls === 'boolean' ? options.skipNulls : defaults.skipNulls;
    var encode = typeof options.encode === 'boolean' ? options.encode : defaults.encode;
    var encoder = typeof options.encoder === 'function' ? options.encoder : defaults.encoder;
    var sort = typeof options.sort === 'function' ? options.sort : null;
    var allowDots = typeof options.allowDots === 'undefined' ? false : options.allowDots;
    var serializeDate = typeof options.serializeDate === 'function' ? options.serializeDate : defaults.serializeDate;
    var encodeValuesOnly = typeof options.encodeValuesOnly === 'boolean' ? options.encodeValuesOnly : defaults.encodeValuesOnly;
    if (typeof options.format === 'undefined') {
        options.format = formats.default;
    } else if (!Object.prototype.hasOwnProperty.call(formats.formatters, options.format)) {
        throw new TypeError('Unknown format option provided.');
    }
    var formatter = formats.formatters[options.format];
    var objKeys;
    var filter;

    if (typeof options.filter === 'function') {
        filter = options.filter;
        obj = filter('', obj);
    } else if (Array.isArray(options.filter)) {
        filter = options.filter;
        objKeys = filter;
    }

    var keys = [];

    if (typeof obj !== 'object' || obj === null) {
        return '';
    }

    var arrayFormat;
    if (options.arrayFormat in arrayPrefixGenerators) {
        arrayFormat = options.arrayFormat;
    } else if ('indices' in options) {
        arrayFormat = options.indices ? 'indices' : 'repeat';
    } else {
        arrayFormat = 'indices';
    }

    var generateArrayPrefix = arrayPrefixGenerators[arrayFormat];

    if (!objKeys) {
        objKeys = Object.keys(obj);
    }

    if (sort) {
        objKeys.sort(sort);
    }

    for (var i = 0; i < objKeys.length; ++i) {
        var key = objKeys[i];

        if (skipNulls && obj[key] === null) {
            continue;
        }

        keys = keys.concat(stringify(
            obj[key],
            key,
            generateArrayPrefix,
            strictNullHandling,
            skipNulls,
            encode ? encoder : null,
            filter,
            sort,
            allowDots,
            serializeDate,
            formatter,
            encodeValuesOnly
        ));
    }

    return keys.join(delimiter);
};

},{"./formats":48,"./utils":52}],52:[function(require,module,exports){
'use strict';

var has = Object.prototype.hasOwnProperty;

var hexTable = (function () {
    var array = [];
    for (var i = 0; i < 256; ++i) {
        array.push('%' + ((i < 16 ? '0' : '') + i.toString(16)).toUpperCase());
    }

    return array;
}());

exports.arrayToObject = function (source, options) {
    var obj = options && options.plainObjects ? Object.create(null) : {};
    for (var i = 0; i < source.length; ++i) {
        if (typeof source[i] !== 'undefined') {
            obj[i] = source[i];
        }
    }

    return obj;
};

exports.merge = function (target, source, options) {
    if (!source) {
        return target;
    }

    if (typeof source !== 'object') {
        if (Array.isArray(target)) {
            target.push(source);
        } else if (typeof target === 'object') {
            if (options.plainObjects || options.allowPrototypes || !has.call(Object.prototype, source)) {
                target[source] = true;
            }
        } else {
            return [target, source];
        }

        return target;
    }

    if (typeof target !== 'object') {
        return [target].concat(source);
    }

    var mergeTarget = target;
    if (Array.isArray(target) && !Array.isArray(source)) {
        mergeTarget = exports.arrayToObject(target, options);
    }

    if (Array.isArray(target) && Array.isArray(source)) {
        source.forEach(function (item, i) {
            if (has.call(target, i)) {
                if (target[i] && typeof target[i] === 'object') {
                    target[i] = exports.merge(target[i], item, options);
                } else {
                    target.push(item);
                }
            } else {
                target[i] = item;
            }
        });
        return target;
    }

    return Object.keys(source).reduce(function (acc, key) {
        var value = source[key];

        if (Object.prototype.hasOwnProperty.call(acc, key)) {
            acc[key] = exports.merge(acc[key], value, options);
        } else {
            acc[key] = value;
        }
        return acc;
    }, mergeTarget);
};

exports.decode = function (str) {
    try {
        return decodeURIComponent(str.replace(/\+/g, ' '));
    } catch (e) {
        return str;
    }
};

exports.encode = function (str) {
    // This code was originally written by Brian White (mscdex) for the io.js core querystring library.
    // It has been adapted here for stricter adherence to RFC 3986
    if (str.length === 0) {
        return str;
    }

    var string = typeof str === 'string' ? str : String(str);

    var out = '';
    for (var i = 0; i < string.length; ++i) {
        var c = string.charCodeAt(i);

        if (
            c === 0x2D || // -
            c === 0x2E || // .
            c === 0x5F || // _
            c === 0x7E || // ~
            (c >= 0x30 && c <= 0x39) || // 0-9
            (c >= 0x41 && c <= 0x5A) || // a-z
            (c >= 0x61 && c <= 0x7A) // A-Z
        ) {
            out += string.charAt(i);
            continue;
        }

        if (c < 0x80) {
            out = out + hexTable[c];
            continue;
        }

        if (c < 0x800) {
            out = out + (hexTable[0xC0 | (c >> 6)] + hexTable[0x80 | (c & 0x3F)]);
            continue;
        }

        if (c < 0xD800 || c >= 0xE000) {
            out = out + (hexTable[0xE0 | (c >> 12)] + hexTable[0x80 | ((c >> 6) & 0x3F)] + hexTable[0x80 | (c & 0x3F)]);
            continue;
        }

        i += 1;
        c = 0x10000 + (((c & 0x3FF) << 10) | (string.charCodeAt(i) & 0x3FF));
        out += hexTable[0xF0 | (c >> 18)] + hexTable[0x80 | ((c >> 12) & 0x3F)] + hexTable[0x80 | ((c >> 6) & 0x3F)] + hexTable[0x80 | (c & 0x3F)]; // eslint-disable-line max-len
    }

    return out;
};

exports.compact = function (obj, references) {
    if (typeof obj !== 'object' || obj === null) {
        return obj;
    }

    var refs = references || [];
    var lookup = refs.indexOf(obj);
    if (lookup !== -1) {
        return refs[lookup];
    }

    refs.push(obj);

    if (Array.isArray(obj)) {
        var compacted = [];

        for (var i = 0; i < obj.length; ++i) {
            if (obj[i] && typeof obj[i] === 'object') {
                compacted.push(exports.compact(obj[i], refs));
            } else if (typeof obj[i] !== 'undefined') {
                compacted.push(obj[i]);
            }
        }

        return compacted;
    }

    var keys = Object.keys(obj);
    keys.forEach(function (key) {
        obj[key] = exports.compact(obj[key], refs);
    });

    return obj;
};

exports.isRegExp = function (obj) {
    return Object.prototype.toString.call(obj) === '[object RegExp]';
};

exports.isBuffer = function (obj) {
    if (obj === null || typeof obj === 'undefined') {
        return false;
    }

    return !!(obj.constructor && obj.constructor.isBuffer && obj.constructor.isBuffer(obj));
};

},{}],53:[function(require,module,exports){
var events = require('events');
var utils = require('./utils');
var wrap = exports.wrap = {
  /**
   * Wrap an anonymous or named function to notify an Emitter and
   * return the wrapper function.
   * @param {events.EventEmitter} emitter The emitter to notify
   * @param {Function} fn The function to wrap
   * @param {String} name The optional name
   */
  fn: function(emitter, fn, strict, name, scope) {
    var wrapped = function() {
      var result;
      utils.emitEvents(emitter, 'before', name, [arguments, this, name]);

      try {
        result = fn.apply(scope || this, arguments);
      } catch (e) {
        utils.emitEvents(emitter, 'error', name, [ e, arguments, this, name ]);
        throw e;
      }

      utils.emitEvents(emitter, 'after', name, [ result, arguments, this, name ]);
      return result;
    };

    if (strict) {
      eval('wrapped = ' + utils.addArgs(wrapped.toString(), fn.length));
    }

    return wrapped;
  },
  /**
   * Wrap an anonymous or named function that calls a callback asynchronously
   * to notify an Emitter and return the wrapper function.
   * @param {events.EventEmitter} emitter The emitter to notify
   * @param {Function} fn The function to wrap
   * @param {Integer} position The position of the callback in the arguments
   * array (defaults to 0). Set to -1 if the callback is the last argument.
   * @param {String} name The optional name
   */
  async: function(emitter, fn, position, strict, name, scope) {
    var wrapped = function() {
      var pos = position == -1 ? arguments.length - 1 : (position || 0);
      var callback = arguments[pos];
      var context = this;
      var methodArgs = arguments;
      var callbackWrapper = function() {
        try {
          callback.apply(context, arguments);
        } catch (e) {
          utils.emitEvents(emitter, 'error', name, [ e, methodArgs, context, name ]);
          throw e;
        }
        var eventType = arguments[0] instanceof Error ? 'error' : 'after';
        utils.emitEvents(emitter, eventType, name, [ arguments, methodArgs, context, name ]);
      };

      utils.emitEvents(emitter, 'before', name, [ methodArgs, this, name ]);
      methodArgs[pos] = callbackWrapper;

      try {
        return fn.apply(scope || this, methodArgs);
      } catch (e) {
        utils.emitEvents(emitter, 'error', name, [ e, methodArgs, context, name ]);
        throw e;
      }
    };

    if (strict) {
      eval('wrapped = ' + utils.addArgs(wrapped.toString(), fn.length));
    }

    return wrapped;
  }
};

var Emitter = exports.Emitter = function(obj) {
  this.obj = obj;
};

Emitter.prototype = Object.create(events.EventEmitter.prototype);

/**
 * Punch a method with the given name, with
 * @param {String | Array} method The name of the method or a list of
 * method names.
 * @param {Integer} position The optional position of the asynchronous callback
 * in the arguments list.
 */
Emitter.prototype.punch = function(method, position, strict) {
  if (Array.isArray(method)) {
    var self = this;
    method.forEach(function(method) {
      self.punch(method, position, strict);
    });
  } else {
    var old = this.obj[method];
    if (typeof old == 'function') {
      this.obj[method] = (!position && position !== 0) ?
        wrap.fn(this, old, strict, method) :
        wrap.async(this, old, position, strict, method);
    }
  }
  return this;
};

exports.emitter = function(obj) {
  return new Emitter(obj);
};

},{"./utils":54,"events":3}],54:[function(require,module,exports){
exports.toBase26 = function(num) {
  var outString = '';
  var letters = 'abcdefghijklmnopqrstuvwxyz';
  while (num > 25) {
    var remainder = num % 26;
    outString = letters.charAt(remainder) + outString;
    num = Math.floor(num / 26) - 1;
  }
  outString = letters.charAt(num) + outString;
  return outString;
};

exports.makeFakeArgs = function(len) {
  var argArr = [];
  for (var i = 0; i < len; i++) {
    argArr.push(exports.toBase26(i));
  }
  return argArr.join(",");
};

exports.addArgs = function(fnString, argLen) {
  return fnString.replace(/function\s*\(\)/, 'function(' + exports.makeFakeArgs(argLen) + ')');
};

exports.emitEvents = function(emitter, type, name, args) {
  var ucName = name ? name.replace(/^\w/, function(first) {
    return first.toUpperCase();
  }) : null;

  emitter.emit.apply(emitter, [type].concat(args));
  if (ucName) {
    emitter.emit.apply(emitter, [type + ucName].concat(args));
  }
};

},{}],55:[function(require,module,exports){
/* global define */
/**
 * A base object for ECMAScript 5 style prototypal inheritance.
 *
 * @see https://github.com/rauschma/proto-js/
 * @see http://ejohn.org/blog/simple-javascript-inheritance/
 * @see http://uxebu.com/blog/2011/02/23/object-based-inheritance-for-ecmascript-5/
 */
(function (root, factory) {
	if (typeof define === 'function' && define.amd) {
		define([], factory);
	} else if (typeof exports === 'object') {
		module.exports = factory();
	} else {
		root.Proto = factory();
	}
}(this, function () {

	function makeSuper(_super, old, name, fn) {
		return function () {
			var tmp = this._super;

			// Add a new ._super() method that is the same method
			// but either pointing to the prototype method
			// or to the overwritten method
			this._super = (typeof old === 'function') ? old : _super[name];

			// The method only need to be bound temporarily, so we
			// remove it when we're done executing
			var ret = fn.apply(this, arguments);
			this._super = tmp;

			return ret;
		};
	}

	function legacyMixin(prop, obj) {
		var self = obj || this;
		var fnTest = /\b_super\b/;
		var _super = Object.getPrototypeOf(self) || self.prototype;
		var _old;

		// Copy the properties over
		for (var name in prop) {
			// store the old function which would be overwritten
			_old = self[name];

			// Check if we're overwriting an existing function
			if(
					((
						typeof prop[name] === 'function' &&
						typeof _super[name] === 'function'
					) || (
						typeof _old === 'function' &&
						typeof prop[name] === 'function'
					)) && fnTest.test(prop[name])
			) {
				self[name] = makeSuper(_super, _old, name, prop[name]);
			} else {
				self[name] = prop[name];
			}
		}

		return self;
	}

	function es5Mixin(prop, obj) {
		var self = obj || this;
		var fnTest = /\b_super\b/;
		var _super = Object.getPrototypeOf(self) || self.prototype;
		var descriptors = {};
		var proto = prop;
		var processProperty = function(name) {
			if(!descriptors[name]) {
				descriptors[name] = Object.getOwnPropertyDescriptor(proto, name);
			}
		};

		// Collect all property descriptors
		do {
			Object.getOwnPropertyNames(proto).forEach(processProperty);
    } while((proto = Object.getPrototypeOf(proto)) && Object.getPrototypeOf(proto));
		
		Object.keys(descriptors).forEach(function(name) {
			var descriptor = descriptors[name];

			if(typeof descriptor.value === 'function' && fnTest.test(descriptor.value)) {
				descriptor.value = makeSuper(_super, self[name], name, descriptor.value);
			}

			Object.defineProperty(self, name, descriptor);
		});

		return self;
	}

	return {
		/**
		 * Create a new object using Object.create. The arguments will be
		 * passed to the new instances init method or to a method name set in
		 * __init.
		 */
		create: function () {
			var instance = Object.create(this);
			var init = typeof instance.__init === 'string' ? instance.__init : 'init';

			if (typeof instance[init] === 'function') {
				instance[init].apply(instance, arguments);
			}
			return instance;
		},
		/**
		 * Mixin a given set of properties
		 * @param prop The properties to mix in
		 * @param obj [optional] The object to add the mixin
		 */
		mixin: typeof Object.defineProperty === 'function' ? es5Mixin : legacyMixin,
		/**
		 * Extend the current or a given object with the given property
		 * and return the extended object.
		 * @param prop The properties to extend with
		 * @param obj [optional] The object to extend from
		 * @returns The extended object
		 */
		extend: function (prop, obj) {
			return this.mixin(prop, Object.create(obj || this));
		},
		/**
		 * Return a callback function with this set to the current or a given context object.
		 * @param name Name of the method to proxy
		 * @param args... [optional] Arguments to use for partial application
		 */
		proxy: function (name) {
			var fn = this[name];
			var args = Array.prototype.slice.call(arguments, 1);

			args.unshift(this);
			return fn.bind.apply(fn, args);
		}
	};

}));

},{}],56:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _client = require('feathers/client');

var _client2 = _interopRequireDefault(_client);

var _feathersHooks = require('feathers-hooks');

var _feathersHooks2 = _interopRequireDefault(_feathersHooks);

var _feathersErrors = require('feathers-errors');

var _feathersErrors2 = _interopRequireDefault(_feathersErrors);

var _feathersAuthenticationClient = require('feathers-authentication-client');

var _feathersAuthenticationClient2 = _interopRequireDefault(_feathersAuthenticationClient);

var _client3 = require('feathers-rest/client');

var _client4 = _interopRequireDefault(_client3);

var _client5 = require('feathers-socketio/client');

var _client6 = _interopRequireDefault(_client5);

var _client7 = require('feathers-primus/client');

var _client8 = _interopRequireDefault(_client7);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

Object.assign(_client2.default, {
  socketio: _client6.default,
  primus: _client8.default,
  rest: _client4.default,
  hooks: _feathersHooks2.default,
  authentication: _feathersAuthenticationClient2.default,
  errors: _feathersErrors2.default
});

exports.default = _client2.default;
module.exports = exports['default'];

},{"feathers-authentication-client":8,"feathers-errors":15,"feathers-hooks":17,"feathers-primus/client":18,"feathers-rest/client":20,"feathers-socketio/client":32,"feathers/client":34}]},{},[56])(56)
});