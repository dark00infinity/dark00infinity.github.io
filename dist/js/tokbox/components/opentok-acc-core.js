(function e(t, n, r) {
  function s(o, u) {
    if (!n[o]) {
      if (!t[o]) {
        var a = typeof require == "function" && require;
        if (!u && a) return a(o, !0);
        if (i) return i(o, !0);
        var f = new Error("Cannot find module '" + o + "'");
        throw f.code = "MODULE_NOT_FOUND", f
      }
      var l = n[o] = {
        exports: {}
      };
      t[o][0].call(l.exports, function (e) {
        var n = t[o][1][e];
        return s(n ? n : e)
      }, l, l.exports, e, t, n, r)
    }
    return n[o].exports
  }
  var i = typeof require == "function" && require;
  for (var o = 0; o < r.length; o++) s(r[o]);
  return s
})({
  1: [function (require, module, exports) {
    module.exports = require('./lib/axios');
  }, {
    "./lib/axios": 3
  }],
  2: [function (require, module, exports) {
    (function (process) {
      'use strict';

      var utils = require('./../utils');
      var settle = require('./../core/settle');
      var buildURL = require('./../helpers/buildURL');
      var parseHeaders = require('./../helpers/parseHeaders');
      var isURLSameOrigin = require('./../helpers/isURLSameOrigin');
      var createError = require('../core/createError');
      var btoa = (typeof window !== 'undefined' && window.btoa && window.btoa.bind(window)) || require('./../helpers/btoa');

      module.exports = function xhrAdapter(config) {
        return new Promise(function dispatchXhrRequest(resolve, reject) {
          var requestData = config.data;
          var requestHeaders = config.headers;

          if (utils.isFormData(requestData)) {
            delete requestHeaders['Content-Type']; // Let the browser set it
          }

          var request = new XMLHttpRequest();
          var loadEvent = 'onreadystatechange';
          var xDomain = false;

          // For IE 8/9 CORS support
          // Only supports POST and GET calls and doesn't returns the response headers.
          // DON'T do this for testing b/c XMLHttpRequest is mocked, not XDomainRequest.
          if (process.env.NODE_ENV !== 'test' &&
            typeof window !== 'undefined' &&
            window.XDomainRequest && !('withCredentials' in request) &&
            !isURLSameOrigin(config.url)) {
            request = new window.XDomainRequest();
            loadEvent = 'onload';
            xDomain = true;
            request.onprogress = function handleProgress() {};
            request.ontimeout = function handleTimeout() {};
          }

          // HTTP basic authentication
          if (config.auth) {
            var username = config.auth.username || '';
            var password = config.auth.password || '';
            requestHeaders.Authorization = 'Basic ' + btoa(username + ':' + password);
          }

          request.open(config.method.toUpperCase(), buildURL(config.url, config.params, config.paramsSerializer), true);

          // Set the request timeout in MS
          request.timeout = config.timeout;

          // Listen for ready state
          request[loadEvent] = function handleLoad() {
            if (!request || (request.readyState !== 4 && !xDomain)) {
              return;
            }

            // The request errored out and we didn't get a response, this will be
            // handled by onerror instead
            // With one exception: request that using file: protocol, most browsers
            // will return status as 0 even though it's a successful request
            if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf('file:') === 0)) {
              return;
            }

            // Prepare the response
            var responseHeaders = 'getAllResponseHeaders' in request ? parseHeaders(request.getAllResponseHeaders()) : null;
            var responseData = !config.responseType || config.responseType === 'text' ? request.responseText : request.response;
            var response = {
              data: responseData,
              // IE sends 1223 instead of 204 (https://github.com/mzabriskie/axios/issues/201)
              status: request.status === 1223 ? 204 : request.status,
              statusText: request.status === 1223 ? 'No Content' : request.statusText,
              headers: responseHeaders,
              config: config,
              request: request
            };

            settle(resolve, reject, response);

            // Clean up request
            request = null;
          };

          // Handle low level network errors
          request.onerror = function handleError() {
            // Real errors are hidden from us by the browser
            // onerror should only fire if it's a network error
            reject(createError('Network Error', config));

            // Clean up request
            request = null;
          };

          // Handle timeout
          request.ontimeout = function handleTimeout() {
            reject(createError('timeout of ' + config.timeout + 'ms exceeded', config, 'ECONNABORTED'));

            // Clean up request
            request = null;
          };

          // Add xsrf header
          // This is only done if running in a standard browser environment.
          // Specifically not if we're in a web worker, or react-native.
          if (utils.isStandardBrowserEnv()) {
            var cookies = require('./../helpers/cookies');

            // Add xsrf header
            var xsrfValue = (config.withCredentials || isURLSameOrigin(config.url)) && config.xsrfCookieName ?
              cookies.read(config.xsrfCookieName) :
              undefined;

            if (xsrfValue) {
              requestHeaders[config.xsrfHeaderName] = xsrfValue;
            }
          }

          // Add headers to the request
          if ('setRequestHeader' in request) {
            utils.forEach(requestHeaders, function setRequestHeader(val, key) {
              if (typeof requestData === 'undefined' && key.toLowerCase() === 'content-type') {
                // Remove Content-Type if data is undefined
                delete requestHeaders[key];
              } else {
                // Otherwise add header to the request
                request.setRequestHeader(key, val);
              }
            });
          }

          // Add withCredentials to request if needed
          if (config.withCredentials) {
            request.withCredentials = true;
          }

          // Add responseType to request if needed
          if (config.responseType) {
            try {
              request.responseType = config.responseType;
            } catch (e) {
              if (request.responseType !== 'json') {
                throw e;
              }
            }
          }

          // Handle progress if needed
          if (typeof config.onDownloadProgress === 'function') {
            request.addEventListener('progress', config.onDownloadProgress);
          }

          // Not all browsers support upload events
          if (typeof config.onUploadProgress === 'function' && request.upload) {
            request.upload.addEventListener('progress', config.onUploadProgress);
          }

          if (config.cancelToken) {
            // Handle cancellation
            config.cancelToken.promise.then(function onCanceled(cancel) {
              if (!request) {
                return;
              }

              request.abort();
              reject(cancel);
              // Clean up request
              request = null;
            });
          }

          if (requestData === undefined) {
            requestData = null;
          }

          // Send the request
          request.send(requestData);
        });
      };

    }).call(this, require('_process'))
  }, {
    "../core/createError": 9,
    "./../core/settle": 12,
    "./../helpers/btoa": 16,
    "./../helpers/buildURL": 17,
    "./../helpers/cookies": 19,
    "./../helpers/isURLSameOrigin": 21,
    "./../helpers/parseHeaders": 23,
    "./../utils": 25,
    "_process": 322
  }],
  3: [function (require, module, exports) {
    'use strict';

    var utils = require('./utils');
    var bind = require('./helpers/bind');
    var Axios = require('./core/Axios');
    var defaults = require('./defaults');

    /**
     * Create an instance of Axios
     *
     * @param {Object} defaultConfig The default config for the instance
     * @return {Axios} A new instance of Axios
     */
    function createInstance(defaultConfig) {
      var context = new Axios(defaultConfig);
      var instance = bind(Axios.prototype.request, context);

      // Copy axios.prototype to instance
      utils.extend(instance, Axios.prototype, context);

      // Copy context to instance
      utils.extend(instance, context);

      return instance;
    }

    // Create the default instance to be exported
    var axios = createInstance(defaults);

    // Expose Axios class to allow class inheritance
    axios.Axios = Axios;

    // Factory for creating new instances
    axios.create = function create(instanceConfig) {
      return createInstance(utils.merge(defaults, instanceConfig));
    };

    // Expose Cancel & CancelToken
    axios.Cancel = require('./cancel/Cancel');
    axios.CancelToken = require('./cancel/CancelToken');
    axios.isCancel = require('./cancel/isCancel');

    // Expose all/spread
    axios.all = function all(promises) {
      return Promise.all(promises);
    };
    axios.spread = require('./helpers/spread');

    module.exports = axios;

    // Allow use of default import syntax in TypeScript
    module.exports.default = axios;

  }, {
    "./cancel/Cancel": 4,
    "./cancel/CancelToken": 5,
    "./cancel/isCancel": 6,
    "./core/Axios": 7,
    "./defaults": 14,
    "./helpers/bind": 15,
    "./helpers/spread": 24,
    "./utils": 25
  }],
  4: [function (require, module, exports) {
    'use strict';

    /**
     * A `Cancel` is an object that is thrown when an operation is canceled.
     *
     * @class
     * @param {string=} message The message.
     */
    function Cancel(message) {
      this.message = message;
    }

    Cancel.prototype.toString = function toString() {
      return 'Cancel' + (this.message ? ': ' + this.message : '');
    };

    Cancel.prototype.__CANCEL__ = true;

    module.exports = Cancel;

  }, {}],
  5: [function (require, module, exports) {
    'use strict';

    var Cancel = require('./Cancel');

    /**
     * A `CancelToken` is an object that can be used to request cancellation of an operation.
     *
     * @class
     * @param {Function} executor The executor function.
     */
    function CancelToken(executor) {
      if (typeof executor !== 'function') {
        throw new TypeError('executor must be a function.');
      }

      var resolvePromise;
      this.promise = new Promise(function promiseExecutor(resolve) {
        resolvePromise = resolve;
      });

      var token = this;
      executor(function cancel(message) {
        if (token.reason) {
          // Cancellation has already been requested
          return;
        }

        token.reason = new Cancel(message);
        resolvePromise(token.reason);
      });
    }

    /**
     * Throws a `Cancel` if cancellation has been requested.
     */
    CancelToken.prototype.throwIfRequested = function throwIfRequested() {
      if (this.reason) {
        throw this.reason;
      }
    };

    /**
     * Returns an object that contains a new `CancelToken` and a function that, when called,
     * cancels the `CancelToken`.
     */
    CancelToken.source = function source() {
      var cancel;
      var token = new CancelToken(function executor(c) {
        cancel = c;
      });
      return {
        token: token,
        cancel: cancel
      };
    };

    module.exports = CancelToken;

  }, {
    "./Cancel": 4
  }],
  6: [function (require, module, exports) {
    'use strict';

    module.exports = function isCancel(value) {
      return !!(value && value.__CANCEL__);
    };

  }, {}],
  7: [function (require, module, exports) {
    'use strict';

    var defaults = require('./../defaults');
    var utils = require('./../utils');
    var InterceptorManager = require('./InterceptorManager');
    var dispatchRequest = require('./dispatchRequest');
    var isAbsoluteURL = require('./../helpers/isAbsoluteURL');
    var combineURLs = require('./../helpers/combineURLs');

    /**
     * Create a new instance of Axios
     *
     * @param {Object} instanceConfig The default config for the instance
     */
    function Axios(instanceConfig) {
      this.defaults = instanceConfig;
      this.interceptors = {
        request: new InterceptorManager(),
        response: new InterceptorManager()
      };
    }

    /**
     * Dispatch a request
     *
     * @param {Object} config The config specific for this request (merged with this.defaults)
     */
    Axios.prototype.request = function request(config) {
      /*eslint no-param-reassign:0*/
      // Allow for axios('example/url'[, config]) a la fetch API
      if (typeof config === 'string') {
        config = utils.merge({
          url: arguments[0]
        }, arguments[1]);
      }

      config = utils.merge(defaults, this.defaults, {
        method: 'get'
      }, config);

      // Support baseURL config
      if (config.baseURL && !isAbsoluteURL(config.url)) {
        config.url = combineURLs(config.baseURL, config.url);
      }

      // Hook up interceptors middleware
      var chain = [dispatchRequest, undefined];
      var promise = Promise.resolve(config);

      this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
        chain.unshift(interceptor.fulfilled, interceptor.rejected);
      });

      this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
        chain.push(interceptor.fulfilled, interceptor.rejected);
      });

      while (chain.length) {
        promise = promise.then(chain.shift(), chain.shift());
      }

      return promise;
    };

    // Provide aliases for supported request methods
    utils.forEach(['delete', 'get', 'head'], function forEachMethodNoData(method) {
      /*eslint func-names:0*/
      Axios.prototype[method] = function (url, config) {
        return this.request(utils.merge(config || {}, {
          method: method,
          url: url
        }));
      };
    });

    utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
      /*eslint func-names:0*/
      Axios.prototype[method] = function (url, data, config) {
        return this.request(utils.merge(config || {}, {
          method: method,
          url: url,
          data: data
        }));
      };
    });

    module.exports = Axios;

  }, {
    "./../defaults": 14,
    "./../helpers/combineURLs": 18,
    "./../helpers/isAbsoluteURL": 20,
    "./../utils": 25,
    "./InterceptorManager": 8,
    "./dispatchRequest": 10
  }],
  8: [function (require, module, exports) {
    'use strict';

    var utils = require('./../utils');

    function InterceptorManager() {
      this.handlers = [];
    }

    /**
     * Add a new interceptor to the stack
     *
     * @param {Function} fulfilled The function to handle `then` for a `Promise`
     * @param {Function} rejected The function to handle `reject` for a `Promise`
     *
     * @return {Number} An ID used to remove interceptor later
     */
    InterceptorManager.prototype.use = function use(fulfilled, rejected) {
      this.handlers.push({
        fulfilled: fulfilled,
        rejected: rejected
      });
      return this.handlers.length - 1;
    };

    /**
     * Remove an interceptor from the stack
     *
     * @param {Number} id The ID that was returned by `use`
     */
    InterceptorManager.prototype.eject = function eject(id) {
      if (this.handlers[id]) {
        this.handlers[id] = null;
      }
    };

    /**
     * Iterate over all the registered interceptors
     *
     * This method is particularly useful for skipping over any
     * interceptors that may have become `null` calling `eject`.
     *
     * @param {Function} fn The function to call for each interceptor
     */
    InterceptorManager.prototype.forEach = function forEach(fn) {
      utils.forEach(this.handlers, function forEachHandler(h) {
        if (h !== null) {
          fn(h);
        }
      });
    };

    module.exports = InterceptorManager;

  }, {
    "./../utils": 25
  }],
  9: [function (require, module, exports) {
    'use strict';

    var enhanceError = require('./enhanceError');

    /**
     * Create an Error with the specified message, config, error code, and response.
     *
     * @param {string} message The error message.
     * @param {Object} config The config.
     * @param {string} [code] The error code (for example, 'ECONNABORTED').
     @ @param {Object} [response] The response.
     * @returns {Error} The created error.
     */
    module.exports = function createError(message, config, code, response) {
      var error = new Error(message);
      return enhanceError(error, config, code, response);
    };

  }, {
    "./enhanceError": 11
  }],
  10: [function (require, module, exports) {
    'use strict';

    var utils = require('./../utils');
    var transformData = require('./transformData');
    var isCancel = require('../cancel/isCancel');
    var defaults = require('../defaults');

    /**
     * Throws a `Cancel` if cancellation has been requested.
     */
    function throwIfCancellationRequested(config) {
      if (config.cancelToken) {
        config.cancelToken.throwIfRequested();
      }
    }

    /**
     * Dispatch a request to the server using the configured adapter.
     *
     * @param {object} config The config that is to be used for the request
     * @returns {Promise} The Promise to be fulfilled
     */
    module.exports = function dispatchRequest(config) {
      throwIfCancellationRequested(config);

      // Ensure headers exist
      config.headers = config.headers || {};

      // Transform request data
      config.data = transformData(
        config.data,
        config.headers,
        config.transformRequest
      );

      // Flatten headers
      config.headers = utils.merge(
        config.headers.common || {},
        config.headers[config.method] || {},
        config.headers || {}
      );

      utils.forEach(
        ['delete', 'get', 'head', 'post', 'put', 'patch', 'common'],
        function cleanHeaderConfig(method) {
          delete config.headers[method];
        }
      );

      var adapter = config.adapter || defaults.adapter;

      return adapter(config).then(function onAdapterResolution(response) {
        throwIfCancellationRequested(config);

        // Transform response data
        response.data = transformData(
          response.data,
          response.headers,
          config.transformResponse
        );

        return response;
      }, function onAdapterRejection(reason) {
        if (!isCancel(reason)) {
          throwIfCancellationRequested(config);

          // Transform response data
          if (reason && reason.response) {
            reason.response.data = transformData(
              reason.response.data,
              reason.response.headers,
              config.transformResponse
            );
          }
        }

        return Promise.reject(reason);
      });
    };

  }, {
    "../cancel/isCancel": 6,
    "../defaults": 14,
    "./../utils": 25,
    "./transformData": 13
  }],
  11: [function (require, module, exports) {
    'use strict';

    /**
     * Update an Error with the specified config, error code, and response.
     *
     * @param {Error} error The error to update.
     * @param {Object} config The config.
     * @param {string} [code] The error code (for example, 'ECONNABORTED').
     @ @param {Object} [response] The response.
     * @returns {Error} The error.
     */
    module.exports = function enhanceError(error, config, code, response) {
      error.config = config;
      if (code) {
        error.code = code;
      }
      error.response = response;
      return error;
    };

  }, {}],
  12: [function (require, module, exports) {
    'use strict';

    var createError = require('./createError');

    /**
     * Resolve or reject a Promise based on response status.
     *
     * @param {Function} resolve A function that resolves the promise.
     * @param {Function} reject A function that rejects the promise.
     * @param {object} response The response.
     */
    module.exports = function settle(resolve, reject, response) {
      var validateStatus = response.config.validateStatus;
      // Note: status is not exposed by XDomainRequest
      if (!response.status || !validateStatus || validateStatus(response.status)) {
        resolve(response);
      } else {
        reject(createError(
          'Request failed with status code ' + response.status,
          response.config,
          null,
          response
        ));
      }
    };

  }, {
    "./createError": 9
  }],
  13: [function (require, module, exports) {
    'use strict';

    var utils = require('./../utils');

    /**
     * Transform the data for a request or a response
     *
     * @param {Object|String} data The data to be transformed
     * @param {Array} headers The headers for the request or response
     * @param {Array|Function} fns A single function or Array of functions
     * @returns {*} The resulting transformed data
     */
    module.exports = function transformData(data, headers, fns) {
      /*eslint no-param-reassign:0*/
      utils.forEach(fns, function transform(fn) {
        data = fn(data, headers);
      });

      return data;
    };

  }, {
    "./../utils": 25
  }],
  14: [function (require, module, exports) {
    (function (process) {
      'use strict';

      var utils = require('./utils');
      var normalizeHeaderName = require('./helpers/normalizeHeaderName');

      var PROTECTION_PREFIX = /^\)\]\}',?\n/;
      var DEFAULT_CONTENT_TYPE = {
        'Content-Type': 'application/x-www-form-urlencoded'
      };

      function setContentTypeIfUnset(headers, value) {
        if (!utils.isUndefined(headers) && utils.isUndefined(headers['Content-Type'])) {
          headers['Content-Type'] = value;
        }
      }

      function getDefaultAdapter() {
        var adapter;
        if (typeof XMLHttpRequest !== 'undefined') {
          // For browsers use XHR adapter
          adapter = require('./adapters/xhr');
        } else if (typeof process !== 'undefined') {
          // For node use HTTP adapter
          adapter = require('./adapters/http');
        }
        return adapter;
      }

      var defaults = {
        adapter: getDefaultAdapter(),

        transformRequest: [function transformRequest(data, headers) {
          normalizeHeaderName(headers, 'Content-Type');
          if (utils.isFormData(data) ||
            utils.isArrayBuffer(data) ||
            utils.isStream(data) ||
            utils.isFile(data) ||
            utils.isBlob(data)
          ) {
            return data;
          }
          if (utils.isArrayBufferView(data)) {
            return data.buffer;
          }
          if (utils.isURLSearchParams(data)) {
            setContentTypeIfUnset(headers, 'application/x-www-form-urlencoded;charset=utf-8');
            return data.toString();
          }
          if (utils.isObject(data)) {
            setContentTypeIfUnset(headers, 'application/json;charset=utf-8');
            return JSON.stringify(data);
          }
          return data;
        }],

        transformResponse: [function transformResponse(data) {
          /*eslint no-param-reassign:0*/
          if (typeof data === 'string') {
            data = data.replace(PROTECTION_PREFIX, '');
            try {
              data = JSON.parse(data);
            } catch (e) {
              /* Ignore */
            }
          }
          return data;
        }],

        timeout: 0,

        xsrfCookieName: 'XSRF-TOKEN',
        xsrfHeaderName: 'X-XSRF-TOKEN',

        maxContentLength: -1,

        validateStatus: function validateStatus(status) {
          return status >= 200 && status < 300;
        }
      };

      defaults.headers = {
        common: {
          'Accept': 'application/json, text/plain, */*'
        }
      };

      utils.forEach(['delete', 'get', 'head'], function forEachMehtodNoData(method) {
        defaults.headers[method] = {};
      });

      utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
        defaults.headers[method] = utils.merge(DEFAULT_CONTENT_TYPE);
      });

      module.exports = defaults;

    }).call(this, require('_process'))
  }, {
    "./adapters/http": 2,
    "./adapters/xhr": 2,
    "./helpers/normalizeHeaderName": 22,
    "./utils": 25,
    "_process": 322
  }],
  15: [function (require, module, exports) {
    'use strict';

    module.exports = function bind(fn, thisArg) {
      return function wrap() {
        var args = new Array(arguments.length);
        for (var i = 0; i < args.length; i++) {
          args[i] = arguments[i];
        }
        return fn.apply(thisArg, args);
      };
    };

  }, {}],
  16: [function (require, module, exports) {
    'use strict';

    // btoa polyfill for IE<10 courtesy https://github.com/davidchambers/Base64.js

    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

    function E() {
      this.message = 'String contains an invalid character';
    }
    E.prototype = new Error;
    E.prototype.code = 5;
    E.prototype.name = 'InvalidCharacterError';

    function btoa(input) {
      var str = String(input);
      var output = '';
      for (
        // initialize result and counter
        var block, charCode, idx = 0, map = chars;
        // if the next str index does not exist:
        //   change the mapping table to "="
        //   check if d has no fractional digits
        str.charAt(idx | 0) || (map = '=', idx % 1);
        // "8 - idx % 1 * 8" generates the sequence 2, 4, 6, 8
        output += map.charAt(63 & block >> 8 - idx % 1 * 8)
      ) {
        charCode = str.charCodeAt(idx += 3 / 4);
        if (charCode > 0xFF) {
          throw new E();
        }
        block = block << 8 | charCode;
      }
      return output;
    }

    module.exports = btoa;

  }, {}],
  17: [function (require, module, exports) {
    'use strict';

    var utils = require('./../utils');

    function encode(val) {
      return encodeURIComponent(val).
      replace(/%40/gi, '@').
      replace(/%3A/gi, ':').
      replace(/%24/g, '$').
      replace(/%2C/gi, ',').
      replace(/%20/g, '+').
      replace(/%5B/gi, '[').
      replace(/%5D/gi, ']');
    }

    /**
     * Build a URL by appending params to the end
     *
     * @param {string} url The base of the url (e.g., http://www.google.com)
     * @param {object} [params] The params to be appended
     * @returns {string} The formatted url
     */
    module.exports = function buildURL(url, params, paramsSerializer) {
      /*eslint no-param-reassign:0*/
      if (!params) {
        return url;
      }

      var serializedParams;
      if (paramsSerializer) {
        serializedParams = paramsSerializer(params);
      } else if (utils.isURLSearchParams(params)) {
        serializedParams = params.toString();
      } else {
        var parts = [];

        utils.forEach(params, function serialize(val, key) {
          if (val === null || typeof val === 'undefined') {
            return;
          }

          if (utils.isArray(val)) {
            key = key + '[]';
          }

          if (!utils.isArray(val)) {
            val = [val];
          }

          utils.forEach(val, function parseValue(v) {
            if (utils.isDate(v)) {
              v = v.toISOString();
            } else if (utils.isObject(v)) {
              v = JSON.stringify(v);
            }
            parts.push(encode(key) + '=' + encode(v));
          });
        });

        serializedParams = parts.join('&');
      }

      if (serializedParams) {
        url += (url.indexOf('?') === -1 ? '?' : '&') + serializedParams;
      }

      return url;
    };

  }, {
    "./../utils": 25
  }],
  18: [function (require, module, exports) {
    'use strict';

    /**
     * Creates a new URL by combining the specified URLs
     *
     * @param {string} baseURL The base URL
     * @param {string} relativeURL The relative URL
     * @returns {string} The combined URL
     */
    module.exports = function combineURLs(baseURL, relativeURL) {
      return baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '');
    };

  }, {}],
  19: [function (require, module, exports) {
    'use strict';

    var utils = require('./../utils');

    module.exports = (
      utils.isStandardBrowserEnv() ?

      // Standard browser envs support document.cookie
      (function standardBrowserEnv() {
        return {
          write: function write(name, value, expires, path, domain, secure) {
            var cookie = [];
            cookie.push(name + '=' + encodeURIComponent(value));

            if (utils.isNumber(expires)) {
              cookie.push('expires=' + new Date(expires).toGMTString());
            }

            if (utils.isString(path)) {
              cookie.push('path=' + path);
            }

            if (utils.isString(domain)) {
              cookie.push('domain=' + domain);
            }

            if (secure === true) {
              cookie.push('secure');
            }

            document.cookie = cookie.join('; ');
          },

          read: function read(name) {
            var match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
            return (match ? decodeURIComponent(match[3]) : null);
          },

          remove: function remove(name) {
            this.write(name, '', Date.now() - 86400000);
          }
        };
      })() :

      // Non standard browser env (web workers, react-native) lack needed support.
      (function nonStandardBrowserEnv() {
        return {
          write: function write() {},
          read: function read() {
            return null;
          },
          remove: function remove() {}
        };
      })()
    );

  }, {
    "./../utils": 25
  }],
  20: [function (require, module, exports) {
    'use strict';

    /**
     * Determines whether the specified URL is absolute
     *
     * @param {string} url The URL to test
     * @returns {boolean} True if the specified URL is absolute, otherwise false
     */
    module.exports = function isAbsoluteURL(url) {
      // A URL is considered absolute if it begins with "<scheme>://" or "//" (protocol-relative URL).
      // RFC 3986 defines scheme name as a sequence of characters beginning with a letter and followed
      // by any combination of letters, digits, plus, period, or hyphen.
      return /^([a-z][a-z\d\+\-\.]*:)?\/\//i.test(url);
    };

  }, {}],
  21: [function (require, module, exports) {
    'use strict';

    var utils = require('./../utils');

    module.exports = (
      utils.isStandardBrowserEnv() ?

      // Standard browser envs have full support of the APIs needed to test
      // whether the request URL is of the same origin as current location.
      (function standardBrowserEnv() {
        var msie = /(msie|trident)/i.test(navigator.userAgent);
        var urlParsingNode = document.createElement('a');
        var originURL;

        /**
         * Parse a URL to discover it's components
         *
         * @param {String} url The URL to be parsed
         * @returns {Object}
         */
        function resolveURL(url) {
          var href = url;

          if (msie) {
            // IE needs attribute set twice to normalize properties
            urlParsingNode.setAttribute('href', href);
            href = urlParsingNode.href;
          }

          urlParsingNode.setAttribute('href', href);

          // urlParsingNode provides the UrlUtils interface - http://url.spec.whatwg.org/#urlutils
          return {
            href: urlParsingNode.href,
            protocol: urlParsingNode.protocol ? urlParsingNode.protocol.replace(/:$/, '') : '',
            host: urlParsingNode.host,
            search: urlParsingNode.search ? urlParsingNode.search.replace(/^\?/, '') : '',
            hash: urlParsingNode.hash ? urlParsingNode.hash.replace(/^#/, '') : '',
            hostname: urlParsingNode.hostname,
            port: urlParsingNode.port,
            pathname: (urlParsingNode.pathname.charAt(0) === '/') ?
              urlParsingNode.pathname : '/' + urlParsingNode.pathname
          };
        }

        originURL = resolveURL(window.location.href);

        /**
         * Determine if a URL shares the same origin as the current location
         *
         * @param {String} requestURL The URL to test
         * @returns {boolean} True if URL shares the same origin, otherwise false
         */
        return function isURLSameOrigin(requestURL) {
          var parsed = (utils.isString(requestURL)) ? resolveURL(requestURL) : requestURL;
          return (parsed.protocol === originURL.protocol &&
            parsed.host === originURL.host);
        };
      })() :

      // Non standard browser envs (web workers, react-native) lack needed support.
      (function nonStandardBrowserEnv() {
        return function isURLSameOrigin() {
          return true;
        };
      })()
    );

  }, {
    "./../utils": 25
  }],
  22: [function (require, module, exports) {
    'use strict';

    var utils = require('../utils');

    module.exports = function normalizeHeaderName(headers, normalizedName) {
      utils.forEach(headers, function processHeader(value, name) {
        if (name !== normalizedName && name.toUpperCase() === normalizedName.toUpperCase()) {
          headers[normalizedName] = value;
          delete headers[name];
        }
      });
    };

  }, {
    "../utils": 25
  }],
  23: [function (require, module, exports) {
    'use strict';

    var utils = require('./../utils');

    /**
     * Parse headers into an object
     *
     * ```
     * Date: Wed, 27 Aug 2014 08:58:49 GMT
     * Content-Type: application/json
     * Connection: keep-alive
     * Transfer-Encoding: chunked
     * ```
     *
     * @param {String} headers Headers needing to be parsed
     * @returns {Object} Headers parsed into an object
     */
    module.exports = function parseHeaders(headers) {
      var parsed = {};
      var key;
      var val;
      var i;

      if (!headers) {
        return parsed;
      }

      utils.forEach(headers.split('\n'), function parser(line) {
        i = line.indexOf(':');
        key = utils.trim(line.substr(0, i)).toLowerCase();
        val = utils.trim(line.substr(i + 1));

        if (key) {
          parsed[key] = parsed[key] ? parsed[key] + ', ' + val : val;
        }
      });

      return parsed;
    };

  }, {
    "./../utils": 25
  }],
  24: [function (require, module, exports) {
    'use strict';

    /**
     * Syntactic sugar for invoking a function and expanding an array for arguments.
     *
     * Common use case would be to use `Function.prototype.apply`.
     *
     *  ```js
     *  function f(x, y, z) {}
     *  var args = [1, 2, 3];
     *  f.apply(null, args);
     *  ```
     *
     * With `spread` this example can be re-written.
     *
     *  ```js
     *  spread(function(x, y, z) {})([1, 2, 3]);
     *  ```
     *
     * @param {Function} callback
     * @returns {Function}
     */
    module.exports = function spread(callback) {
      return function wrap(arr) {
        return callback.apply(null, arr);
      };
    };

  }, {}],
  25: [function (require, module, exports) {
    'use strict';

    var bind = require('./helpers/bind');

    /*global toString:true*/

    // utils is a library of generic helper functions non-specific to axios

    var toString = Object.prototype.toString;

    /**
     * Determine if a value is an Array
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is an Array, otherwise false
     */
    function isArray(val) {
      return toString.call(val) === '[object Array]';
    }

    /**
     * Determine if a value is an ArrayBuffer
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is an ArrayBuffer, otherwise false
     */
    function isArrayBuffer(val) {
      return toString.call(val) === '[object ArrayBuffer]';
    }

    /**
     * Determine if a value is a FormData
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is an FormData, otherwise false
     */
    function isFormData(val) {
      return (typeof FormData !== 'undefined') && (val instanceof FormData);
    }

    /**
     * Determine if a value is a view on an ArrayBuffer
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a view on an ArrayBuffer, otherwise false
     */
    function isArrayBufferView(val) {
      var result;
      if ((typeof ArrayBuffer !== 'undefined') && (ArrayBuffer.isView)) {
        result = ArrayBuffer.isView(val);
      } else {
        result = (val) && (val.buffer) && (val.buffer instanceof ArrayBuffer);
      }
      return result;
    }

    /**
     * Determine if a value is a String
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a String, otherwise false
     */
    function isString(val) {
      return typeof val === 'string';
    }

    /**
     * Determine if a value is a Number
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Number, otherwise false
     */
    function isNumber(val) {
      return typeof val === 'number';
    }

    /**
     * Determine if a value is undefined
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if the value is undefined, otherwise false
     */
    function isUndefined(val) {
      return typeof val === 'undefined';
    }

    /**
     * Determine if a value is an Object
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is an Object, otherwise false
     */
    function isObject(val) {
      return val !== null && typeof val === 'object';
    }

    /**
     * Determine if a value is a Date
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Date, otherwise false
     */
    function isDate(val) {
      return toString.call(val) === '[object Date]';
    }

    /**
     * Determine if a value is a File
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a File, otherwise false
     */
    function isFile(val) {
      return toString.call(val) === '[object File]';
    }

    /**
     * Determine if a value is a Blob
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Blob, otherwise false
     */
    function isBlob(val) {
      return toString.call(val) === '[object Blob]';
    }

    /**
     * Determine if a value is a Function
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Function, otherwise false
     */
    function isFunction(val) {
      return toString.call(val) === '[object Function]';
    }

    /**
     * Determine if a value is a Stream
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Stream, otherwise false
     */
    function isStream(val) {
      return isObject(val) && isFunction(val.pipe);
    }

    /**
     * Determine if a value is a URLSearchParams object
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a URLSearchParams object, otherwise false
     */
    function isURLSearchParams(val) {
      return typeof URLSearchParams !== 'undefined' && val instanceof URLSearchParams;
    }

    /**
     * Trim excess whitespace off the beginning and end of a string
     *
     * @param {String} str The String to trim
     * @returns {String} The String freed of excess whitespace
     */
    function trim(str) {
      return str.replace(/^\s*/, '').replace(/\s*$/, '');
    }

    /**
     * Determine if we're running in a standard browser environment
     *
     * This allows axios to run in a web worker, and react-native.
     * Both environments support XMLHttpRequest, but not fully standard globals.
     *
     * web workers:
     *  typeof window -> undefined
     *  typeof document -> undefined
     *
     * react-native:
     *  typeof document.createElement -> undefined
     */
    function isStandardBrowserEnv() {
      return (
        typeof window !== 'undefined' &&
        typeof document !== 'undefined' &&
        typeof document.createElement === 'function'
      );
    }

    /**
     * Iterate over an Array or an Object invoking a function for each item.
     *
     * If `obj` is an Array callback will be called passing
     * the value, index, and complete array for each item.
     *
     * If 'obj' is an Object callback will be called passing
     * the value, key, and complete object for each property.
     *
     * @param {Object|Array} obj The object to iterate
     * @param {Function} fn The callback to invoke for each item
     */
    function forEach(obj, fn) {
      // Don't bother if no value provided
      if (obj === null || typeof obj === 'undefined') {
        return;
      }

      // Force an array if not already something iterable
      if (typeof obj !== 'object' && !isArray(obj)) {
        /*eslint no-param-reassign:0*/
        obj = [obj];
      }

      if (isArray(obj)) {
        // Iterate over array values
        for (var i = 0, l = obj.length; i < l; i++) {
          fn.call(null, obj[i], i, obj);
        }
      } else {
        // Iterate over object keys
        for (var key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            fn.call(null, obj[key], key, obj);
          }
        }
      }
    }

    /**
     * Accepts varargs expecting each argument to be an object, then
     * immutably merges the properties of each object and returns result.
     *
     * When multiple objects contain the same key the later object in
     * the arguments list will take precedence.
     *
     * Example:
     *
     * ```js
     * var result = merge({foo: 123}, {foo: 456});
     * console.log(result.foo); // outputs 456
     * ```
     *
     * @param {Object} obj1 Object to merge
     * @returns {Object} Result of all merge properties
     */
    function merge( /* obj1, obj2, obj3, ... */ ) {
      var result = {};

      function assignValue(val, key) {
        if (typeof result[key] === 'object' && typeof val === 'object') {
          result[key] = merge(result[key], val);
        } else {
          result[key] = val;
        }
      }

      for (var i = 0, l = arguments.length; i < l; i++) {
        forEach(arguments[i], assignValue);
      }
      return result;
    }

    /**
     * Extends object a by mutably adding to it the properties of object b.
     *
     * @param {Object} a The object to be extended
     * @param {Object} b The object to copy properties from
     * @param {Object} thisArg The object to bind function to
     * @return {Object} The resulting value of object a
     */
    function extend(a, b, thisArg) {
      forEach(b, function assignValue(val, key) {
        if (thisArg && typeof val === 'function') {
          a[key] = bind(val, thisArg);
        } else {
          a[key] = val;
        }
      });
      return a;
    }

    module.exports = {
      isArray: isArray,
      isArrayBuffer: isArrayBuffer,
      isFormData: isFormData,
      isArrayBufferView: isArrayBufferView,
      isString: isString,
      isNumber: isNumber,
      isObject: isObject,
      isUndefined: isUndefined,
      isDate: isDate,
      isFile: isFile,
      isBlob: isBlob,
      isFunction: isFunction,
      isStream: isStream,
      isURLSearchParams: isURLSearchParams,
      isStandardBrowserEnv: isStandardBrowserEnv,
      forEach: forEach,
      merge: merge,
      extend: extend,
      trim: trim
    };

  }, {
    "./helpers/bind": 15
  }],
  26: [function (require, module, exports) {
    (function (global) {
      "use strict";

      require("core-js/shim");

      require("regenerator-runtime/runtime");

      require("core-js/fn/regexp/escape");

      if (global._babelPolyfill) {
        throw new Error("only one instance of babel-polyfill is allowed");
      }
      global._babelPolyfill = true;

      var DEFINE_PROPERTY = "defineProperty";

      function define(O, key, value) {
        O[key] || Object[DEFINE_PROPERTY](O, key, {
          writable: true,
          configurable: true,
          value: value
        });
      }

      define(String.prototype, "padLeft", "".padStart);
      define(String.prototype, "padRight", "".padEnd);

      "pop,reverse,shift,keys,values,entries,indexOf,every,some,forEach,map,filter,find,findIndex,includes,join,slice,concat,push,splice,unshift,sort,lastIndexOf,reduce,reduceRight,copyWithin,fill".split(",").forEach(function (key) {
        [][key] && define(Array, key, Function.call.bind([][key]));
      });
    }).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
  }, {
    "core-js/fn/regexp/escape": 27,
    "core-js/shim": 320,
    "regenerator-runtime/runtime": 323
  }],
  27: [function (require, module, exports) {
    require('../../modules/core.regexp.escape');
    module.exports = require('../../modules/_core').RegExp.escape;
  }, {
    "../../modules/_core": 48,
    "../../modules/core.regexp.escape": 144
  }],
  28: [function (require, module, exports) {
    module.exports = function (it) {
      if (typeof it != 'function') throw TypeError(it + ' is not a function!');
      return it;
    };
  }, {}],
  29: [function (require, module, exports) {
    var cof = require('./_cof');
    module.exports = function (it, msg) {
      if (typeof it != 'number' && cof(it) != 'Number') throw TypeError(msg);
      return +it;
    };
  }, {
    "./_cof": 43
  }],
  30: [function (require, module, exports) {
    // 22.1.3.31 Array.prototype[@@unscopables]
    var UNSCOPABLES = require('./_wks')('unscopables'),
      ArrayProto = Array.prototype;
    if (ArrayProto[UNSCOPABLES] == undefined) require('./_hide')(ArrayProto, UNSCOPABLES, {});
    module.exports = function (key) {
      ArrayProto[UNSCOPABLES][key] = true;
    };
  }, {
    "./_hide": 65,
    "./_wks": 142
  }],
  31: [function (require, module, exports) {
    module.exports = function (it, Constructor, name, forbiddenField) {
      if (!(it instanceof Constructor) || (forbiddenField !== undefined && forbiddenField in it)) {
        throw TypeError(name + ': incorrect invocation!');
      }
      return it;
    };
  }, {}],
  32: [function (require, module, exports) {
    var isObject = require('./_is-object');
    module.exports = function (it) {
      if (!isObject(it)) throw TypeError(it + ' is not an object!');
      return it;
    };
  }, {
    "./_is-object": 74
  }],
  33: [function (require, module, exports) {
    // 22.1.3.3 Array.prototype.copyWithin(target, start, end = this.length)
    'use strict';
    var toObject = require('./_to-object'),
      toIndex = require('./_to-index'),
      toLength = require('./_to-length');

    module.exports = [].copyWithin || function copyWithin(target /*= 0*/ , start /*= 0, end = @length*/ ) {
      var O = toObject(this),
        len = toLength(O.length),
        to = toIndex(target, len),
        from = toIndex(start, len),
        end = arguments.length > 2 ? arguments[2] : undefined,
        count = Math.min((end === undefined ? len : toIndex(end, len)) - from, len - to),
        inc = 1;
      if (from < to && to < from + count) {
        inc = -1;
        from += count - 1;
        to += count - 1;
      }
      while (count-- > 0) {
        if (from in O) O[to] = O[from];
        else delete O[to];
        to += inc;
        from += inc;
      }
      return O;
    };
  }, {
    "./_to-index": 130,
    "./_to-length": 133,
    "./_to-object": 134
  }],
  34: [function (require, module, exports) {
    // 22.1.3.6 Array.prototype.fill(value, start = 0, end = this.length)
    'use strict';
    var toObject = require('./_to-object'),
      toIndex = require('./_to-index'),
      toLength = require('./_to-length');
    module.exports = function fill(value /*, start = 0, end = @length */ ) {
      var O = toObject(this),
        length = toLength(O.length),
        aLen = arguments.length,
        index = toIndex(aLen > 1 ? arguments[1] : undefined, length),
        end = aLen > 2 ? arguments[2] : undefined,
        endPos = end === undefined ? length : toIndex(end, length);
      while (endPos > index) O[index++] = value;
      return O;
    };
  }, {
    "./_to-index": 130,
    "./_to-length": 133,
    "./_to-object": 134
  }],
  35: [function (require, module, exports) {
    var forOf = require('./_for-of');

    module.exports = function (iter, ITERATOR) {
      var result = [];
      forOf(iter, false, result.push, result, ITERATOR);
      return result;
    };

  }, {
    "./_for-of": 62
  }],
  36: [function (require, module, exports) {
    // false -> Array#indexOf
    // true  -> Array#includes
    var toIObject = require('./_to-iobject'),
      toLength = require('./_to-length'),
      toIndex = require('./_to-index');
    module.exports = function (IS_INCLUDES) {
      return function ($this, el, fromIndex) {
        var O = toIObject($this),
          length = toLength(O.length),
          index = toIndex(fromIndex, length),
          value;
        // Array#includes uses SameValueZero equality algorithm
        if (IS_INCLUDES && el != el)
          while (length > index) {
            value = O[index++];
            if (value != value) return true;
            // Array#toIndex ignores holes, Array#includes - not
          } else
            for (; length > index; index++)
              if (IS_INCLUDES || index in O) {
                if (O[index] === el) return IS_INCLUDES || index || 0;
              } return !IS_INCLUDES && -1;
      };
    };
  }, {
    "./_to-index": 130,
    "./_to-iobject": 132,
    "./_to-length": 133
  }],
  37: [function (require, module, exports) {
    // 0 -> Array#forEach
    // 1 -> Array#map
    // 2 -> Array#filter
    // 3 -> Array#some
    // 4 -> Array#every
    // 5 -> Array#find
    // 6 -> Array#findIndex
    var ctx = require('./_ctx'),
      IObject = require('./_iobject'),
      toObject = require('./_to-object'),
      toLength = require('./_to-length'),
      asc = require('./_array-species-create');
    module.exports = function (TYPE, $create) {
      var IS_MAP = TYPE == 1,
        IS_FILTER = TYPE == 2,
        IS_SOME = TYPE == 3,
        IS_EVERY = TYPE == 4,
        IS_FIND_INDEX = TYPE == 6,
        NO_HOLES = TYPE == 5 || IS_FIND_INDEX,
        create = $create || asc;
      return function ($this, callbackfn, that) {
        var O = toObject($this),
          self = IObject(O),
          f = ctx(callbackfn, that, 3),
          length = toLength(self.length),
          index = 0,
          result = IS_MAP ? create($this, length) : IS_FILTER ? create($this, 0) : undefined,
          val, res;
        for (; length > index; index++)
          if (NO_HOLES || index in self) {
            val = self[index];
            res = f(val, index, O);
            if (TYPE) {
              if (IS_MAP) result[index] = res; // map
              else if (res) switch (TYPE) {
                case 3:
                  return true; // some
                case 5:
                  return val; // find
                case 6:
                  return index; // findIndex
                case 2:
                  result.push(val); // filter
              } else if (IS_EVERY) return false; // every
            }
          }
        return IS_FIND_INDEX ? -1 : IS_SOME || IS_EVERY ? IS_EVERY : result;
      };
    };
  }, {
    "./_array-species-create": 40,
    "./_ctx": 50,
    "./_iobject": 70,
    "./_to-length": 133,
    "./_to-object": 134
  }],
  38: [function (require, module, exports) {
    var aFunction = require('./_a-function'),
      toObject = require('./_to-object'),
      IObject = require('./_iobject'),
      toLength = require('./_to-length');

    module.exports = function (that, callbackfn, aLen, memo, isRight) {
      aFunction(callbackfn);
      var O = toObject(that),
        self = IObject(O),
        length = toLength(O.length),
        index = isRight ? length - 1 : 0,
        i = isRight ? -1 : 1;
      if (aLen < 2)
        for (;;) {
          if (index in self) {
            memo = self[index];
            index += i;
            break;
          }
          index += i;
          if (isRight ? index < 0 : length <= index) {
            throw TypeError('Reduce of empty array with no initial value');
          }
        }
      for (; isRight ? index >= 0 : length > index; index += i)
        if (index in self) {
          memo = callbackfn(memo, self[index], index, O);
        }
      return memo;
    };
  }, {
    "./_a-function": 28,
    "./_iobject": 70,
    "./_to-length": 133,
    "./_to-object": 134
  }],
  39: [function (require, module, exports) {
    var isObject = require('./_is-object'),
      isArray = require('./_is-array'),
      SPECIES = require('./_wks')('species');

    module.exports = function (original) {
      var C;
      if (isArray(original)) {
        C = original.constructor;
        // cross-realm fallback
        if (typeof C == 'function' && (C === Array || isArray(C.prototype))) C = undefined;
        if (isObject(C)) {
          C = C[SPECIES];
          if (C === null) C = undefined;
        }
      }
      return C === undefined ? Array : C;
    };
  }, {
    "./_is-array": 72,
    "./_is-object": 74,
    "./_wks": 142
  }],
  40: [function (require, module, exports) {
    // 9.4.2.3 ArraySpeciesCreate(originalArray, length)
    var speciesConstructor = require('./_array-species-constructor');

    module.exports = function (original, length) {
      return new(speciesConstructor(original))(length);
    };
  }, {
    "./_array-species-constructor": 39
  }],
  41: [function (require, module, exports) {
    'use strict';
    var aFunction = require('./_a-function'),
      isObject = require('./_is-object'),
      invoke = require('./_invoke'),
      arraySlice = [].slice,
      factories = {};

    var construct = function (F, len, args) {
      if (!(len in factories)) {
        for (var n = [], i = 0; i < len; i++) n[i] = 'a[' + i + ']';
        factories[len] = Function('F,a', 'return new F(' + n.join(',') + ')');
      }
      return factories[len](F, args);
    };

    module.exports = Function.bind || function bind(that /*, args... */ ) {
      var fn = aFunction(this),
        partArgs = arraySlice.call(arguments, 1);
      var bound = function ( /* args... */ ) {
        var args = partArgs.concat(arraySlice.call(arguments));
        return this instanceof bound ? construct(fn, args.length, args) : invoke(fn, args, that);
      };
      if (isObject(fn.prototype)) bound.prototype = fn.prototype;
      return bound;
    };
  }, {
    "./_a-function": 28,
    "./_invoke": 69,
    "./_is-object": 74
  }],
  42: [function (require, module, exports) {
    // getting tag from 19.1.3.6 Object.prototype.toString()
    var cof = require('./_cof'),
      TAG = require('./_wks')('toStringTag')
      // ES3 wrong here
      ,
      ARG = cof(function () {
        return arguments;
      }()) == 'Arguments';

    // fallback for IE11 Script Access Denied error
    var tryGet = function (it, key) {
      try {
        return it[key];
      } catch (e) {
        /* empty */
      }
    };

    module.exports = function (it) {
      var O, T, B;
      return it === undefined ? 'Undefined' : it === null ? 'Null'
        // @@toStringTag case
        :
        typeof (T = tryGet(O = Object(it), TAG)) == 'string' ? T
        // builtinTag case
        :
        ARG ? cof(O)
        // ES3 arguments fallback
        :
        (B = cof(O)) == 'Object' && typeof O.callee == 'function' ? 'Arguments' : B;
    };
  }, {
    "./_cof": 43,
    "./_wks": 142
  }],
  43: [function (require, module, exports) {
    var toString = {}.toString;

    module.exports = function (it) {
      return toString.call(it).slice(8, -1);
    };
  }, {}],
  44: [function (require, module, exports) {
    'use strict';
    var dP = require('./_object-dp').f,
      create = require('./_object-create'),
      redefineAll = require('./_redefine-all'),
      ctx = require('./_ctx'),
      anInstance = require('./_an-instance'),
      defined = require('./_defined'),
      forOf = require('./_for-of'),
      $iterDefine = require('./_iter-define'),
      step = require('./_iter-step'),
      setSpecies = require('./_set-species'),
      DESCRIPTORS = require('./_descriptors'),
      fastKey = require('./_meta').fastKey,
      SIZE = DESCRIPTORS ? '_s' : 'size';

    var getEntry = function (that, key) {
      // fast case
      var index = fastKey(key),
        entry;
      if (index !== 'F') return that._i[index];
      // frozen object case
      for (entry = that._f; entry; entry = entry.n) {
        if (entry.k == key) return entry;
      }
    };

    module.exports = {
      getConstructor: function (wrapper, NAME, IS_MAP, ADDER) {
        var C = wrapper(function (that, iterable) {
          anInstance(that, C, NAME, '_i');
          that._i = create(null); // index
          that._f = undefined; // first entry
          that._l = undefined; // last entry
          that[SIZE] = 0; // size
          if (iterable != undefined) forOf(iterable, IS_MAP, that[ADDER], that);
        });
        redefineAll(C.prototype, {
          // 23.1.3.1 Map.prototype.clear()
          // 23.2.3.2 Set.prototype.clear()
          clear: function clear() {
            for (var that = this, data = that._i, entry = that._f; entry; entry = entry.n) {
              entry.r = true;
              if (entry.p) entry.p = entry.p.n = undefined;
              delete data[entry.i];
            }
            that._f = that._l = undefined;
            that[SIZE] = 0;
          },
          // 23.1.3.3 Map.prototype.delete(key)
          // 23.2.3.4 Set.prototype.delete(value)
          'delete': function (key) {
            var that = this,
              entry = getEntry(that, key);
            if (entry) {
              var next = entry.n,
                prev = entry.p;
              delete that._i[entry.i];
              entry.r = true;
              if (prev) prev.n = next;
              if (next) next.p = prev;
              if (that._f == entry) that._f = next;
              if (that._l == entry) that._l = prev;
              that[SIZE]--;
            }
            return !!entry;
          },
          // 23.2.3.6 Set.prototype.forEach(callbackfn, thisArg = undefined)
          // 23.1.3.5 Map.prototype.forEach(callbackfn, thisArg = undefined)
          forEach: function forEach(callbackfn /*, that = undefined */ ) {
            anInstance(this, C, 'forEach');
            var f = ctx(callbackfn, arguments.length > 1 ? arguments[1] : undefined, 3),
              entry;
            while (entry = entry ? entry.n : this._f) {
              f(entry.v, entry.k, this);
              // revert to the last existing entry
              while (entry && entry.r) entry = entry.p;
            }
          },
          // 23.1.3.7 Map.prototype.has(key)
          // 23.2.3.7 Set.prototype.has(value)
          has: function has(key) {
            return !!getEntry(this, key);
          }
        });
        if (DESCRIPTORS) dP(C.prototype, 'size', {
          get: function () {
            return defined(this[SIZE]);
          }
        });
        return C;
      },
      def: function (that, key, value) {
        var entry = getEntry(that, key),
          prev, index;
        // change existing entry
        if (entry) {
          entry.v = value;
          // create new entry
        } else {
          that._l = entry = {
            i: index = fastKey(key, true), // <- index
            k: key, // <- key
            v: value, // <- value
            p: prev = that._l, // <- previous entry
            n: undefined, // <- next entry
            r: false // <- removed
          };
          if (!that._f) that._f = entry;
          if (prev) prev.n = entry;
          that[SIZE]++;
          // add to index
          if (index !== 'F') that._i[index] = entry;
        }
        return that;
      },
      getEntry: getEntry,
      setStrong: function (C, NAME, IS_MAP) {
        // add .keys, .values, .entries, [@@iterator]
        // 23.1.3.4, 23.1.3.8, 23.1.3.11, 23.1.3.12, 23.2.3.5, 23.2.3.8, 23.2.3.10, 23.2.3.11
        $iterDefine(C, NAME, function (iterated, kind) {
          this._t = iterated; // target
          this._k = kind; // kind
          this._l = undefined; // previous
        }, function () {
          var that = this,
            kind = that._k,
            entry = that._l;
          // revert to the last existing entry
          while (entry && entry.r) entry = entry.p;
          // get next entry
          if (!that._t || !(that._l = entry = entry ? entry.n : that._t._f)) {
            // or finish the iteration
            that._t = undefined;
            return step(1);
          }
          // return step by kind
          if (kind == 'keys') return step(0, entry.k);
          if (kind == 'values') return step(0, entry.v);
          return step(0, [entry.k, entry.v]);
        }, IS_MAP ? 'entries' : 'values', !IS_MAP, true);

        // add [@@species], 23.1.2.2, 23.2.2.2
        setSpecies(NAME);
      }
    };
  }, {
    "./_an-instance": 31,
    "./_ctx": 50,
    "./_defined": 52,
    "./_descriptors": 53,
    "./_for-of": 62,
    "./_iter-define": 78,
    "./_iter-step": 80,
    "./_meta": 87,
    "./_object-create": 91,
    "./_object-dp": 92,
    "./_redefine-all": 111,
    "./_set-species": 116
  }],
  45: [function (require, module, exports) {
    // https://github.com/DavidBruant/Map-Set.prototype.toJSON
    var classof = require('./_classof'),
      from = require('./_array-from-iterable');
    module.exports = function (NAME) {
      return function toJSON() {
        if (classof(this) != NAME) throw TypeError(NAME + "#toJSON isn't generic");
        return from(this);
      };
    };
  }, {
    "./_array-from-iterable": 35,
    "./_classof": 42
  }],
  46: [function (require, module, exports) {
    'use strict';
    var redefineAll = require('./_redefine-all'),
      getWeak = require('./_meta').getWeak,
      anObject = require('./_an-object'),
      isObject = require('./_is-object'),
      anInstance = require('./_an-instance'),
      forOf = require('./_for-of'),
      createArrayMethod = require('./_array-methods'),
      $has = require('./_has'),
      arrayFind = createArrayMethod(5),
      arrayFindIndex = createArrayMethod(6),
      id = 0;

    // fallback for uncaught frozen keys
    var uncaughtFrozenStore = function (that) {
      return that._l || (that._l = new UncaughtFrozenStore);
    };
    var UncaughtFrozenStore = function () {
      this.a = [];
    };
    var findUncaughtFrozen = function (store, key) {
      return arrayFind(store.a, function (it) {
        return it[0] === key;
      });
    };
    UncaughtFrozenStore.prototype = {
      get: function (key) {
        var entry = findUncaughtFrozen(this, key);
        if (entry) return entry[1];
      },
      has: function (key) {
        return !!findUncaughtFrozen(this, key);
      },
      set: function (key, value) {
        var entry = findUncaughtFrozen(this, key);
        if (entry) entry[1] = value;
        else this.a.push([key, value]);
      },
      'delete': function (key) {
        var index = arrayFindIndex(this.a, function (it) {
          return it[0] === key;
        });
        if (~index) this.a.splice(index, 1);
        return !!~index;
      }
    };

    module.exports = {
      getConstructor: function (wrapper, NAME, IS_MAP, ADDER) {
        var C = wrapper(function (that, iterable) {
          anInstance(that, C, NAME, '_i');
          that._i = id++; // collection id
          that._l = undefined; // leak store for uncaught frozen objects
          if (iterable != undefined) forOf(iterable, IS_MAP, that[ADDER], that);
        });
        redefineAll(C.prototype, {
          // 23.3.3.2 WeakMap.prototype.delete(key)
          // 23.4.3.3 WeakSet.prototype.delete(value)
          'delete': function (key) {
            if (!isObject(key)) return false;
            var data = getWeak(key);
            if (data === true) return uncaughtFrozenStore(this)['delete'](key);
            return data && $has(data, this._i) && delete data[this._i];
          },
          // 23.3.3.4 WeakMap.prototype.has(key)
          // 23.4.3.4 WeakSet.prototype.has(value)
          has: function has(key) {
            if (!isObject(key)) return false;
            var data = getWeak(key);
            if (data === true) return uncaughtFrozenStore(this).has(key);
            return data && $has(data, this._i);
          }
        });
        return C;
      },
      def: function (that, key, value) {
        var data = getWeak(anObject(key), true);
        if (data === true) uncaughtFrozenStore(that).set(key, value);
        else data[that._i] = value;
        return that;
      },
      ufstore: uncaughtFrozenStore
    };
  }, {
    "./_an-instance": 31,
    "./_an-object": 32,
    "./_array-methods": 37,
    "./_for-of": 62,
    "./_has": 64,
    "./_is-object": 74,
    "./_meta": 87,
    "./_redefine-all": 111
  }],
  47: [function (require, module, exports) {
    'use strict';
    var global = require('./_global'),
      $export = require('./_export'),
      redefine = require('./_redefine'),
      redefineAll = require('./_redefine-all'),
      meta = require('./_meta'),
      forOf = require('./_for-of'),
      anInstance = require('./_an-instance'),
      isObject = require('./_is-object'),
      fails = require('./_fails'),
      $iterDetect = require('./_iter-detect'),
      setToStringTag = require('./_set-to-string-tag'),
      inheritIfRequired = require('./_inherit-if-required');

    module.exports = function (NAME, wrapper, methods, common, IS_MAP, IS_WEAK) {
      var Base = global[NAME],
        C = Base,
        ADDER = IS_MAP ? 'set' : 'add',
        proto = C && C.prototype,
        O = {};
      var fixMethod = function (KEY) {
        var fn = proto[KEY];
        redefine(proto, KEY,
          KEY == 'delete' ? function (a) {
            return IS_WEAK && !isObject(a) ? false : fn.call(this, a === 0 ? 0 : a);
          } : KEY == 'has' ? function has(a) {
            return IS_WEAK && !isObject(a) ? false : fn.call(this, a === 0 ? 0 : a);
          } : KEY == 'get' ? function get(a) {
            return IS_WEAK && !isObject(a) ? undefined : fn.call(this, a === 0 ? 0 : a);
          } : KEY == 'add' ? function add(a) {
            fn.call(this, a === 0 ? 0 : a);
            return this;
          } :
          function set(a, b) {
            fn.call(this, a === 0 ? 0 : a, b);
            return this;
          }
        );
      };
      if (typeof C != 'function' || !(IS_WEAK || proto.forEach && !fails(function () {
          new C().entries().next();
        }))) {
        // create collection constructor
        C = common.getConstructor(wrapper, NAME, IS_MAP, ADDER);
        redefineAll(C.prototype, methods);
        meta.NEED = true;
      } else {
        var instance = new C
          // early implementations not supports chaining
          ,
          HASNT_CHAINING = instance[ADDER](IS_WEAK ? {} : -0, 1) != instance
          // V8 ~  Chromium 40- weak-collections throws on primitives, but should return false
          ,
          THROWS_ON_PRIMITIVES = fails(function () {
            instance.has(1);
          })
          // most early implementations doesn't supports iterables, most modern - not close it correctly
          ,
          ACCEPT_ITERABLES = $iterDetect(function (iter) {
            new C(iter);
          }) // eslint-disable-line no-new
          // for early implementations -0 and +0 not the same
          ,
          BUGGY_ZERO = !IS_WEAK && fails(function () {
            // V8 ~ Chromium 42- fails only with 5+ elements
            var $instance = new C(),
              index = 5;
            while (index--) $instance[ADDER](index, index);
            return !$instance.has(-0);
          });
        if (!ACCEPT_ITERABLES) {
          C = wrapper(function (target, iterable) {
            anInstance(target, C, NAME);
            var that = inheritIfRequired(new Base, target, C);
            if (iterable != undefined) forOf(iterable, IS_MAP, that[ADDER], that);
            return that;
          });
          C.prototype = proto;
          proto.constructor = C;
        }
        if (THROWS_ON_PRIMITIVES || BUGGY_ZERO) {
          fixMethod('delete');
          fixMethod('has');
          IS_MAP && fixMethod('get');
        }
        if (BUGGY_ZERO || HASNT_CHAINING) fixMethod(ADDER);
        // weak collections should not contains .clear method
        if (IS_WEAK && proto.clear) delete proto.clear;
      }

      setToStringTag(C, NAME);

      O[NAME] = C;
      $export($export.G + $export.W + $export.F * (C != Base), O);

      if (!IS_WEAK) common.setStrong(C, NAME, IS_MAP);

      return C;
    };
  }, {
    "./_an-instance": 31,
    "./_export": 57,
    "./_fails": 59,
    "./_for-of": 62,
    "./_global": 63,
    "./_inherit-if-required": 68,
    "./_is-object": 74,
    "./_iter-detect": 79,
    "./_meta": 87,
    "./_redefine": 112,
    "./_redefine-all": 111,
    "./_set-to-string-tag": 117
  }],
  48: [function (require, module, exports) {
    var core = module.exports = {
      version: '2.4.0'
    };
    if (typeof __e == 'number') __e = core; // eslint-disable-line no-undef
  }, {}],
  49: [function (require, module, exports) {
    'use strict';
    var $defineProperty = require('./_object-dp'),
      createDesc = require('./_property-desc');

    module.exports = function (object, index, value) {
      if (index in object) $defineProperty.f(object, index, createDesc(0, value));
      else object[index] = value;
    };
  }, {
    "./_object-dp": 92,
    "./_property-desc": 110
  }],
  50: [function (require, module, exports) {
    // optional / simple context binding
    var aFunction = require('./_a-function');
    module.exports = function (fn, that, length) {
      aFunction(fn);
      if (that === undefined) return fn;
      switch (length) {
        case 1:
          return function (a) {
            return fn.call(that, a);
          };
        case 2:
          return function (a, b) {
            return fn.call(that, a, b);
          };
        case 3:
          return function (a, b, c) {
            return fn.call(that, a, b, c);
          };
      }
      return function ( /* ...args */ ) {
        return fn.apply(that, arguments);
      };
    };
  }, {
    "./_a-function": 28
  }],
  51: [function (require, module, exports) {
    'use strict';
    var anObject = require('./_an-object'),
      toPrimitive = require('./_to-primitive'),
      NUMBER = 'number';

    module.exports = function (hint) {
      if (hint !== 'string' && hint !== NUMBER && hint !== 'default') throw TypeError('Incorrect hint');
      return toPrimitive(anObject(this), hint != NUMBER);
    };
  }, {
    "./_an-object": 32,
    "./_to-primitive": 135
  }],
  52: [function (require, module, exports) {
    // 7.2.1 RequireObjectCoercible(argument)
    module.exports = function (it) {
      if (it == undefined) throw TypeError("Can't call method on  " + it);
      return it;
    };
  }, {}],
  53: [function (require, module, exports) {
    // Thank's IE8 for his funny defineProperty
    module.exports = !require('./_fails')(function () {
      return Object.defineProperty({}, 'a', {
        get: function () {
          return 7;
        }
      }).a != 7;
    });
  }, {
    "./_fails": 59
  }],
  54: [function (require, module, exports) {
    var isObject = require('./_is-object'),
      document = require('./_global').document
      // in old IE typeof document.createElement is 'object'
      ,
      is = isObject(document) && isObject(document.createElement);
    module.exports = function (it) {
      return is ? document.createElement(it) : {};
    };
  }, {
    "./_global": 63,
    "./_is-object": 74
  }],
  55: [function (require, module, exports) {
    // IE 8- don't enum bug keys
    module.exports = (
      'constructor,hasOwnProperty,isPrototypeOf,propertyIsEnumerable,toLocaleString,toString,valueOf'
    ).split(',');
  }, {}],
  56: [function (require, module, exports) {
    // all enumerable object keys, includes symbols
    var getKeys = require('./_object-keys'),
      gOPS = require('./_object-gops'),
      pIE = require('./_object-pie');
    module.exports = function (it) {
      var result = getKeys(it),
        getSymbols = gOPS.f;
      if (getSymbols) {
        var symbols = getSymbols(it),
          isEnum = pIE.f,
          i = 0,
          key;
        while (symbols.length > i)
          if (isEnum.call(it, key = symbols[i++])) result.push(key);
      }
      return result;
    };
  }, {
    "./_object-gops": 98,
    "./_object-keys": 101,
    "./_object-pie": 102
  }],
  57: [function (require, module, exports) {
    var global = require('./_global'),
      core = require('./_core'),
      hide = require('./_hide'),
      redefine = require('./_redefine'),
      ctx = require('./_ctx'),
      PROTOTYPE = 'prototype';

    var $export = function (type, name, source) {
      var IS_FORCED = type & $export.F,
        IS_GLOBAL = type & $export.G,
        IS_STATIC = type & $export.S,
        IS_PROTO = type & $export.P,
        IS_BIND = type & $export.B,
        target = IS_GLOBAL ? global : IS_STATIC ? global[name] || (global[name] = {}) : (global[name] || {})[PROTOTYPE],
        exports = IS_GLOBAL ? core : core[name] || (core[name] = {}),
        expProto = exports[PROTOTYPE] || (exports[PROTOTYPE] = {}),
        key, own, out, exp;
      if (IS_GLOBAL) source = name;
      for (key in source) {
        // contains in native
        own = !IS_FORCED && target && target[key] !== undefined;
        // export native or passed
        out = (own ? target : source)[key];
        // bind timers to global for call from export context
        exp = IS_BIND && own ? ctx(out, global) : IS_PROTO && typeof out == 'function' ? ctx(Function.call, out) : out;
        // extend global
        if (target) redefine(target, key, out, type & $export.U);
        // export
        if (exports[key] != out) hide(exports, key, exp);
        if (IS_PROTO && expProto[key] != out) expProto[key] = out;
      }
    };
    global.core = core;
    // type bitmap
    $export.F = 1; // forced
    $export.G = 2; // global
    $export.S = 4; // static
    $export.P = 8; // proto
    $export.B = 16; // bind
    $export.W = 32; // wrap
    $export.U = 64; // safe
    $export.R = 128; // real proto method for `library` 
    module.exports = $export;
  }, {
    "./_core": 48,
    "./_ctx": 50,
    "./_global": 63,
    "./_hide": 65,
    "./_redefine": 112
  }],
  58: [function (require, module, exports) {
    var MATCH = require('./_wks')('match');
    module.exports = function (KEY) {
      var re = /./;
      try {
        '/./' [KEY](re);
      } catch (e) {
        try {
          re[MATCH] = false;
          return !'/./' [KEY](re);
        } catch (f) {
          /* empty */
        }
      }
      return true;
    };
  }, {
    "./_wks": 142
  }],
  59: [function (require, module, exports) {
    module.exports = function (exec) {
      try {
        return !!exec();
      } catch (e) {
        return true;
      }
    };
  }, {}],
  60: [function (require, module, exports) {
    'use strict';
    var hide = require('./_hide'),
      redefine = require('./_redefine'),
      fails = require('./_fails'),
      defined = require('./_defined'),
      wks = require('./_wks');

    module.exports = function (KEY, length, exec) {
      var SYMBOL = wks(KEY),
        fns = exec(defined, SYMBOL, '' [KEY]),
        strfn = fns[0],
        rxfn = fns[1];
      if (fails(function () {
          var O = {};
          O[SYMBOL] = function () {
            return 7;
          };
          return '' [KEY](O) != 7;
        })) {
        redefine(String.prototype, KEY, strfn);
        hide(RegExp.prototype, SYMBOL, length == 2
          // 21.2.5.8 RegExp.prototype[@@replace](string, replaceValue)
          // 21.2.5.11 RegExp.prototype[@@split](string, limit)
          ?
          function (string, arg) {
            return rxfn.call(string, this, arg);
          }
          // 21.2.5.6 RegExp.prototype[@@match](string)
          // 21.2.5.9 RegExp.prototype[@@search](string)
          :
          function (string) {
            return rxfn.call(string, this);
          }
        );
      }
    };
  }, {
    "./_defined": 52,
    "./_fails": 59,
    "./_hide": 65,
    "./_redefine": 112,
    "./_wks": 142
  }],
  61: [function (require, module, exports) {
    'use strict';
    // 21.2.5.3 get RegExp.prototype.flags
    var anObject = require('./_an-object');
    module.exports = function () {
      var that = anObject(this),
        result = '';
      if (that.global) result += 'g';
      if (that.ignoreCase) result += 'i';
      if (that.multiline) result += 'm';
      if (that.unicode) result += 'u';
      if (that.sticky) result += 'y';
      return result;
    };
  }, {
    "./_an-object": 32
  }],
  62: [function (require, module, exports) {
    var ctx = require('./_ctx'),
      call = require('./_iter-call'),
      isArrayIter = require('./_is-array-iter'),
      anObject = require('./_an-object'),
      toLength = require('./_to-length'),
      getIterFn = require('./core.get-iterator-method'),
      BREAK = {},
      RETURN = {};
    var exports = module.exports = function (iterable, entries, fn, that, ITERATOR) {
      var iterFn = ITERATOR ? function () {
          return iterable;
        } : getIterFn(iterable),
        f = ctx(fn, that, entries ? 2 : 1),
        index = 0,
        length, step, iterator, result;
      if (typeof iterFn != 'function') throw TypeError(iterable + ' is not iterable!');
      // fast case for arrays with default iterator
      if (isArrayIter(iterFn))
        for (length = toLength(iterable.length); length > index; index++) {
          result = entries ? f(anObject(step = iterable[index])[0], step[1]) : f(iterable[index]);
          if (result === BREAK || result === RETURN) return result;
        } else
          for (iterator = iterFn.call(iterable); !(step = iterator.next()).done;) {
            result = call(iterator, f, step.value, entries);
            if (result === BREAK || result === RETURN) return result;
          }
    };
    exports.BREAK = BREAK;
    exports.RETURN = RETURN;
  }, {
    "./_an-object": 32,
    "./_ctx": 50,
    "./_is-array-iter": 71,
    "./_iter-call": 76,
    "./_to-length": 133,
    "./core.get-iterator-method": 143
  }],
  63: [function (require, module, exports) {
    // https://github.com/zloirock/core-js/issues/86#issuecomment-115759028
    var global = module.exports = typeof window != 'undefined' && window.Math == Math ?
      window : typeof self != 'undefined' && self.Math == Math ? self : Function('return this')();
    if (typeof __g == 'number') __g = global; // eslint-disable-line no-undef
  }, {}],
  64: [function (require, module, exports) {
    var hasOwnProperty = {}.hasOwnProperty;
    module.exports = function (it, key) {
      return hasOwnProperty.call(it, key);
    };
  }, {}],
  65: [function (require, module, exports) {
    var dP = require('./_object-dp'),
      createDesc = require('./_property-desc');
    module.exports = require('./_descriptors') ? function (object, key, value) {
      return dP.f(object, key, createDesc(1, value));
    } : function (object, key, value) {
      object[key] = value;
      return object;
    };
  }, {
    "./_descriptors": 53,
    "./_object-dp": 92,
    "./_property-desc": 110
  }],
  66: [function (require, module, exports) {
    module.exports = require('./_global').document && document.documentElement;
  }, {
    "./_global": 63
  }],
  67: [function (require, module, exports) {
    module.exports = !require('./_descriptors') && !require('./_fails')(function () {
      return Object.defineProperty(require('./_dom-create')('div'), 'a', {
        get: function () {
          return 7;
        }
      }).a != 7;
    });
  }, {
    "./_descriptors": 53,
    "./_dom-create": 54,
    "./_fails": 59
  }],
  68: [function (require, module, exports) {
    var isObject = require('./_is-object'),
      setPrototypeOf = require('./_set-proto').set;
    module.exports = function (that, target, C) {
      var P, S = target.constructor;
      if (S !== C && typeof S == 'function' && (P = S.prototype) !== C.prototype && isObject(P) && setPrototypeOf) {
        setPrototypeOf(that, P);
      }
      return that;
    };
  }, {
    "./_is-object": 74,
    "./_set-proto": 115
  }],
  69: [function (require, module, exports) {
    // fast apply, http://jsperf.lnkit.com/fast-apply/5
    module.exports = function (fn, args, that) {
      var un = that === undefined;
      switch (args.length) {
        case 0:
          return un ? fn() :
            fn.call(that);
        case 1:
          return un ? fn(args[0]) :
            fn.call(that, args[0]);
        case 2:
          return un ? fn(args[0], args[1]) :
            fn.call(that, args[0], args[1]);
        case 3:
          return un ? fn(args[0], args[1], args[2]) :
            fn.call(that, args[0], args[1], args[2]);
        case 4:
          return un ? fn(args[0], args[1], args[2], args[3]) :
            fn.call(that, args[0], args[1], args[2], args[3]);
      }
      return fn.apply(that, args);
    };
  }, {}],
  70: [function (require, module, exports) {
    // fallback for non-array-like ES3 and non-enumerable old V8 strings
    var cof = require('./_cof');
    module.exports = Object('z').propertyIsEnumerable(0) ? Object : function (it) {
      return cof(it) == 'String' ? it.split('') : Object(it);
    };
  }, {
    "./_cof": 43
  }],
  71: [function (require, module, exports) {
    // check on default Array iterator
    var Iterators = require('./_iterators'),
      ITERATOR = require('./_wks')('iterator'),
      ArrayProto = Array.prototype;

    module.exports = function (it) {
      return it !== undefined && (Iterators.Array === it || ArrayProto[ITERATOR] === it);
    };
  }, {
    "./_iterators": 81,
    "./_wks": 142
  }],
  72: [function (require, module, exports) {
    // 7.2.2 IsArray(argument)
    var cof = require('./_cof');
    module.exports = Array.isArray || function isArray(arg) {
      return cof(arg) == 'Array';
    };
  }, {
    "./_cof": 43
  }],
  73: [function (require, module, exports) {
    // 20.1.2.3 Number.isInteger(number)
    var isObject = require('./_is-object'),
      floor = Math.floor;
    module.exports = function isInteger(it) {
      return !isObject(it) && isFinite(it) && floor(it) === it;
    };
  }, {
    "./_is-object": 74
  }],
  74: [function (require, module, exports) {
    module.exports = function (it) {
      return typeof it === 'object' ? it !== null : typeof it === 'function';
    };
  }, {}],
  75: [function (require, module, exports) {
    // 7.2.8 IsRegExp(argument)
    var isObject = require('./_is-object'),
      cof = require('./_cof'),
      MATCH = require('./_wks')('match');
    module.exports = function (it) {
      var isRegExp;
      return isObject(it) && ((isRegExp = it[MATCH]) !== undefined ? !!isRegExp : cof(it) == 'RegExp');
    };
  }, {
    "./_cof": 43,
    "./_is-object": 74,
    "./_wks": 142
  }],
  76: [function (require, module, exports) {
    // call something on iterator step with safe closing on error
    var anObject = require('./_an-object');
    module.exports = function (iterator, fn, value, entries) {
      try {
        return entries ? fn(anObject(value)[0], value[1]) : fn(value);
        // 7.4.6 IteratorClose(iterator, completion)
      } catch (e) {
        var ret = iterator['return'];
        if (ret !== undefined) anObject(ret.call(iterator));
        throw e;
      }
    };
  }, {
    "./_an-object": 32
  }],
  77: [function (require, module, exports) {
    'use strict';
    var create = require('./_object-create'),
      descriptor = require('./_property-desc'),
      setToStringTag = require('./_set-to-string-tag'),
      IteratorPrototype = {};

    // 25.1.2.1.1 %IteratorPrototype%[@@iterator]()
    require('./_hide')(IteratorPrototype, require('./_wks')('iterator'), function () {
      return this;
    });

    module.exports = function (Constructor, NAME, next) {
      Constructor.prototype = create(IteratorPrototype, {
        next: descriptor(1, next)
      });
      setToStringTag(Constructor, NAME + ' Iterator');
    };
  }, {
    "./_hide": 65,
    "./_object-create": 91,
    "./_property-desc": 110,
    "./_set-to-string-tag": 117,
    "./_wks": 142
  }],
  78: [function (require, module, exports) {
    'use strict';
    var LIBRARY = require('./_library'),
      $export = require('./_export'),
      redefine = require('./_redefine'),
      hide = require('./_hide'),
      has = require('./_has'),
      Iterators = require('./_iterators'),
      $iterCreate = require('./_iter-create'),
      setToStringTag = require('./_set-to-string-tag'),
      getPrototypeOf = require('./_object-gpo'),
      ITERATOR = require('./_wks')('iterator'),
      BUGGY = !([].keys && 'next' in [].keys()) // Safari has buggy iterators w/o `next`
      ,
      FF_ITERATOR = '@@iterator',
      KEYS = 'keys',
      VALUES = 'values';

    var returnThis = function () {
      return this;
    };

    module.exports = function (Base, NAME, Constructor, next, DEFAULT, IS_SET, FORCED) {
      $iterCreate(Constructor, NAME, next);
      var getMethod = function (kind) {
        if (!BUGGY && kind in proto) return proto[kind];
        switch (kind) {
          case KEYS:
            return function keys() {
              return new Constructor(this, kind);
            };
          case VALUES:
            return function values() {
              return new Constructor(this, kind);
            };
        }
        return function entries() {
          return new Constructor(this, kind);
        };
      };
      var TAG = NAME + ' Iterator',
        DEF_VALUES = DEFAULT == VALUES,
        VALUES_BUG = false,
        proto = Base.prototype,
        $native = proto[ITERATOR] || proto[FF_ITERATOR] || DEFAULT && proto[DEFAULT],
        $default = $native || getMethod(DEFAULT),
        $entries = DEFAULT ? !DEF_VALUES ? $default : getMethod('entries') : undefined,
        $anyNative = NAME == 'Array' ? proto.entries || $native : $native,
        methods, key, IteratorPrototype;
      // Fix native
      if ($anyNative) {
        IteratorPrototype = getPrototypeOf($anyNative.call(new Base));
        if (IteratorPrototype !== Object.prototype) {
          // Set @@toStringTag to native iterators
          setToStringTag(IteratorPrototype, TAG, true);
          // fix for some old engines
          if (!LIBRARY && !has(IteratorPrototype, ITERATOR)) hide(IteratorPrototype, ITERATOR, returnThis);
        }
      }
      // fix Array#{values, @@iterator}.name in V8 / FF
      if (DEF_VALUES && $native && $native.name !== VALUES) {
        VALUES_BUG = true;
        $default = function values() {
          return $native.call(this);
        };
      }
      // Define iterator
      if ((!LIBRARY || FORCED) && (BUGGY || VALUES_BUG || !proto[ITERATOR])) {
        hide(proto, ITERATOR, $default);
      }
      // Plug for library
      Iterators[NAME] = $default;
      Iterators[TAG] = returnThis;
      if (DEFAULT) {
        methods = {
          values: DEF_VALUES ? $default : getMethod(VALUES),
          keys: IS_SET ? $default : getMethod(KEYS),
          entries: $entries
        };
        if (FORCED)
          for (key in methods) {
            if (!(key in proto)) redefine(proto, key, methods[key]);
          } else $export($export.P + $export.F * (BUGGY || VALUES_BUG), NAME, methods);
      }
      return methods;
    };
  }, {
    "./_export": 57,
    "./_has": 64,
    "./_hide": 65,
    "./_iter-create": 77,
    "./_iterators": 81,
    "./_library": 83,
    "./_object-gpo": 99,
    "./_redefine": 112,
    "./_set-to-string-tag": 117,
    "./_wks": 142
  }],
  79: [function (require, module, exports) {
    var ITERATOR = require('./_wks')('iterator'),
      SAFE_CLOSING = false;

    try {
      var riter = [7][ITERATOR]();
      riter['return'] = function () {
        SAFE_CLOSING = true;
      };
      Array.from(riter, function () {
        throw 2;
      });
    } catch (e) {
      /* empty */
    }

    module.exports = function (exec, skipClosing) {
      if (!skipClosing && !SAFE_CLOSING) return false;
      var safe = false;
      try {
        var arr = [7],
          iter = arr[ITERATOR]();
        iter.next = function () {
          return {
            done: safe = true
          };
        };
        arr[ITERATOR] = function () {
          return iter;
        };
        exec(arr);
      } catch (e) {
        /* empty */
      }
      return safe;
    };
  }, {
    "./_wks": 142
  }],
  80: [function (require, module, exports) {
    module.exports = function (done, value) {
      return {
        value: value,
        done: !!done
      };
    };
  }, {}],
  81: [function (require, module, exports) {
    module.exports = {};
  }, {}],
  82: [function (require, module, exports) {
    var getKeys = require('./_object-keys'),
      toIObject = require('./_to-iobject');
    module.exports = function (object, el) {
      var O = toIObject(object),
        keys = getKeys(O),
        length = keys.length,
        index = 0,
        key;
      while (length > index)
        if (O[key = keys[index++]] === el) return key;
    };
  }, {
    "./_object-keys": 101,
    "./_to-iobject": 132
  }],
  83: [function (require, module, exports) {
    module.exports = false;
  }, {}],
  84: [function (require, module, exports) {
    // 20.2.2.14 Math.expm1(x)
    var $expm1 = Math.expm1;
    module.exports = (!$expm1
      // Old FF bug
      ||
      $expm1(10) > 22025.465794806719 || $expm1(10) < 22025.4657948067165168
      // Tor Browser bug
      ||
      $expm1(-2e-17) != -2e-17
    ) ? function expm1(x) {
      return (x = +x) == 0 ? x : x > -1e-6 && x < 1e-6 ? x + x * x / 2 : Math.exp(x) - 1;
    } : $expm1;
  }, {}],
  85: [function (require, module, exports) {
    // 20.2.2.20 Math.log1p(x)
    module.exports = Math.log1p || function log1p(x) {
      return (x = +x) > -1e-8 && x < 1e-8 ? x - x * x / 2 : Math.log(1 + x);
    };
  }, {}],
  86: [function (require, module, exports) {
    // 20.2.2.28 Math.sign(x)
    module.exports = Math.sign || function sign(x) {
      return (x = +x) == 0 || x != x ? x : x < 0 ? -1 : 1;
    };
  }, {}],
  87: [function (require, module, exports) {
    var META = require('./_uid')('meta'),
      isObject = require('./_is-object'),
      has = require('./_has'),
      setDesc = require('./_object-dp').f,
      id = 0;
    var isExtensible = Object.isExtensible || function () {
      return true;
    };
    var FREEZE = !require('./_fails')(function () {
      return isExtensible(Object.preventExtensions({}));
    });
    var setMeta = function (it) {
      setDesc(it, META, {
        value: {
          i: 'O' + ++id, // object ID
          w: {} // weak collections IDs
        }
      });
    };
    var fastKey = function (it, create) {
      // return primitive with prefix
      if (!isObject(it)) return typeof it == 'symbol' ? it : (typeof it == 'string' ? 'S' : 'P') + it;
      if (!has(it, META)) {
        // can't set metadata to uncaught frozen object
        if (!isExtensible(it)) return 'F';
        // not necessary to add metadata
        if (!create) return 'E';
        // add missing metadata
        setMeta(it);
        // return object ID
      }
      return it[META].i;
    };
    var getWeak = function (it, create) {
      if (!has(it, META)) {
        // can't set metadata to uncaught frozen object
        if (!isExtensible(it)) return true;
        // not necessary to add metadata
        if (!create) return false;
        // add missing metadata
        setMeta(it);
        // return hash weak collections IDs
      }
      return it[META].w;
    };
    // add metadata on freeze-family methods calling
    var onFreeze = function (it) {
      if (FREEZE && meta.NEED && isExtensible(it) && !has(it, META)) setMeta(it);
      return it;
    };
    var meta = module.exports = {
      KEY: META,
      NEED: false,
      fastKey: fastKey,
      getWeak: getWeak,
      onFreeze: onFreeze
    };
  }, {
    "./_fails": 59,
    "./_has": 64,
    "./_is-object": 74,
    "./_object-dp": 92,
    "./_uid": 139
  }],
  88: [function (require, module, exports) {
    var Map = require('./es6.map'),
      $export = require('./_export'),
      shared = require('./_shared')('metadata'),
      store = shared.store || (shared.store = new(require('./es6.weak-map')));

    var getOrCreateMetadataMap = function (target, targetKey, create) {
      var targetMetadata = store.get(target);
      if (!targetMetadata) {
        if (!create) return undefined;
        store.set(target, targetMetadata = new Map);
      }
      var keyMetadata = targetMetadata.get(targetKey);
      if (!keyMetadata) {
        if (!create) return undefined;
        targetMetadata.set(targetKey, keyMetadata = new Map);
      }
      return keyMetadata;
    };
    var ordinaryHasOwnMetadata = function (MetadataKey, O, P) {
      var metadataMap = getOrCreateMetadataMap(O, P, false);
      return metadataMap === undefined ? false : metadataMap.has(MetadataKey);
    };
    var ordinaryGetOwnMetadata = function (MetadataKey, O, P) {
      var metadataMap = getOrCreateMetadataMap(O, P, false);
      return metadataMap === undefined ? undefined : metadataMap.get(MetadataKey);
    };
    var ordinaryDefineOwnMetadata = function (MetadataKey, MetadataValue, O, P) {
      getOrCreateMetadataMap(O, P, true).set(MetadataKey, MetadataValue);
    };
    var ordinaryOwnMetadataKeys = function (target, targetKey) {
      var metadataMap = getOrCreateMetadataMap(target, targetKey, false),
        keys = [];
      if (metadataMap) metadataMap.forEach(function (_, key) {
        keys.push(key);
      });
      return keys;
    };
    var toMetaKey = function (it) {
      return it === undefined || typeof it == 'symbol' ? it : String(it);
    };
    var exp = function (O) {
      $export($export.S, 'Reflect', O);
    };

    module.exports = {
      store: store,
      map: getOrCreateMetadataMap,
      has: ordinaryHasOwnMetadata,
      get: ordinaryGetOwnMetadata,
      set: ordinaryDefineOwnMetadata,
      keys: ordinaryOwnMetadataKeys,
      key: toMetaKey,
      exp: exp
    };
  }, {
    "./_export": 57,
    "./_shared": 119,
    "./es6.map": 174,
    "./es6.weak-map": 280
  }],
  89: [function (require, module, exports) {
    var global = require('./_global'),
      macrotask = require('./_task').set,
      Observer = global.MutationObserver || global.WebKitMutationObserver,
      process = global.process,
      Promise = global.Promise,
      isNode = require('./_cof')(process) == 'process';

    module.exports = function () {
      var head, last, notify;

      var flush = function () {
        var parent, fn;
        if (isNode && (parent = process.domain)) parent.exit();
        while (head) {
          fn = head.fn;
          head = head.next;
          try {
            fn();
          } catch (e) {
            if (head) notify();
            else last = undefined;
            throw e;
          }
        }
        last = undefined;
        if (parent) parent.enter();
      };

      // Node.js
      if (isNode) {
        notify = function () {
          process.nextTick(flush);
        };
        // browsers with MutationObserver
      } else if (Observer) {
        var toggle = true,
          node = document.createTextNode('');
        new Observer(flush).observe(node, {
          characterData: true
        }); // eslint-disable-line no-new
        notify = function () {
          node.data = toggle = !toggle;
        };
        // environments with maybe non-completely correct, but existent Promise
      } else if (Promise && Promise.resolve) {
        var promise = Promise.resolve();
        notify = function () {
          promise.then(flush);
        };
        // for other environments - macrotask based on:
        // - setImmediate
        // - MessageChannel
        // - window.postMessag
        // - onreadystatechange
        // - setTimeout
      } else {
        notify = function () {
          // strange IE + webpack dev server bug - use .call(global)
          macrotask.call(global, flush);
        };
      }

      return function (fn) {
        var task = {
          fn: fn,
          next: undefined
        };
        if (last) last.next = task;
        if (!head) {
          head = task;
          notify();
        }
        last = task;
      };
    };
  }, {
    "./_cof": 43,
    "./_global": 63,
    "./_task": 129
  }],
  90: [function (require, module, exports) {
    'use strict';
    // 19.1.2.1 Object.assign(target, source, ...)
    var getKeys = require('./_object-keys'),
      gOPS = require('./_object-gops'),
      pIE = require('./_object-pie'),
      toObject = require('./_to-object'),
      IObject = require('./_iobject'),
      $assign = Object.assign;

    // should work with symbols and should have deterministic property order (V8 bug)
    module.exports = !$assign || require('./_fails')(function () {
      var A = {},
        B = {},
        S = Symbol(),
        K = 'abcdefghijklmnopqrst';
      A[S] = 7;
      K.split('').forEach(function (k) {
        B[k] = k;
      });
      return $assign({}, A)[S] != 7 || Object.keys($assign({}, B)).join('') != K;
    }) ? function assign(target, source) { // eslint-disable-line no-unused-vars
      var T = toObject(target),
        aLen = arguments.length,
        index = 1,
        getSymbols = gOPS.f,
        isEnum = pIE.f;
      while (aLen > index) {
        var S = IObject(arguments[index++]),
          keys = getSymbols ? getKeys(S).concat(getSymbols(S)) : getKeys(S),
          length = keys.length,
          j = 0,
          key;
        while (length > j)
          if (isEnum.call(S, key = keys[j++])) T[key] = S[key];
      }
      return T;
    } : $assign;
  }, {
    "./_fails": 59,
    "./_iobject": 70,
    "./_object-gops": 98,
    "./_object-keys": 101,
    "./_object-pie": 102,
    "./_to-object": 134
  }],
  91: [function (require, module, exports) {
    // 19.1.2.2 / 15.2.3.5 Object.create(O [, Properties])
    var anObject = require('./_an-object'),
      dPs = require('./_object-dps'),
      enumBugKeys = require('./_enum-bug-keys'),
      IE_PROTO = require('./_shared-key')('IE_PROTO'),
      Empty = function () {
        /* empty */
      },
      PROTOTYPE = 'prototype';

    // Create object with fake `null` prototype: use iframe Object with cleared prototype
    var createDict = function () {
      // Thrash, waste and sodomy: IE GC bug
      var iframe = require('./_dom-create')('iframe'),
        i = enumBugKeys.length,
        lt = '<',
        gt = '>',
        iframeDocument;
      iframe.style.display = 'none';
      require('./_html').appendChild(iframe);
      iframe.src = 'javascript:'; // eslint-disable-line no-script-url
      // createDict = iframe.contentWindow.Object;
      // html.removeChild(iframe);
      iframeDocument = iframe.contentWindow.document;
      iframeDocument.open();
      iframeDocument.write(lt + 'script' + gt + 'document.F=Object' + lt + '/script' + gt);
      iframeDocument.close();
      createDict = iframeDocument.F;
      while (i--) delete createDict[PROTOTYPE][enumBugKeys[i]];
      return createDict();
    };

    module.exports = Object.create || function create(O, Properties) {
      var result;
      if (O !== null) {
        Empty[PROTOTYPE] = anObject(O);
        result = new Empty;
        Empty[PROTOTYPE] = null;
        // add "__proto__" for Object.getPrototypeOf polyfill
        result[IE_PROTO] = O;
      } else result = createDict();
      return Properties === undefined ? result : dPs(result, Properties);
    };

  }, {
    "./_an-object": 32,
    "./_dom-create": 54,
    "./_enum-bug-keys": 55,
    "./_html": 66,
    "./_object-dps": 93,
    "./_shared-key": 118
  }],
  92: [function (require, module, exports) {
    var anObject = require('./_an-object'),
      IE8_DOM_DEFINE = require('./_ie8-dom-define'),
      toPrimitive = require('./_to-primitive'),
      dP = Object.defineProperty;

    exports.f = require('./_descriptors') ? Object.defineProperty : function defineProperty(O, P, Attributes) {
      anObject(O);
      P = toPrimitive(P, true);
      anObject(Attributes);
      if (IE8_DOM_DEFINE) try {
        return dP(O, P, Attributes);
      } catch (e) {
        /* empty */
      }
      if ('get' in Attributes || 'set' in Attributes) throw TypeError('Accessors not supported!');
      if ('value' in Attributes) O[P] = Attributes.value;
      return O;
    };
  }, {
    "./_an-object": 32,
    "./_descriptors": 53,
    "./_ie8-dom-define": 67,
    "./_to-primitive": 135
  }],
  93: [function (require, module, exports) {
    var dP = require('./_object-dp'),
      anObject = require('./_an-object'),
      getKeys = require('./_object-keys');

    module.exports = require('./_descriptors') ? Object.defineProperties : function defineProperties(O, Properties) {
      anObject(O);
      var keys = getKeys(Properties),
        length = keys.length,
        i = 0,
        P;
      while (length > i) dP.f(O, P = keys[i++], Properties[P]);
      return O;
    };
  }, {
    "./_an-object": 32,
    "./_descriptors": 53,
    "./_object-dp": 92,
    "./_object-keys": 101
  }],
  94: [function (require, module, exports) {
    // Forced replacement prototype accessors methods
    module.exports = require('./_library') || !require('./_fails')(function () {
      var K = Math.random();
      // In FF throws only define methods
      __defineSetter__.call(null, K, function () {
        /* empty */
      });
      delete require('./_global')[K];
    });
  }, {
    "./_fails": 59,
    "./_global": 63,
    "./_library": 83
  }],
  95: [function (require, module, exports) {
    var pIE = require('./_object-pie'),
      createDesc = require('./_property-desc'),
      toIObject = require('./_to-iobject'),
      toPrimitive = require('./_to-primitive'),
      has = require('./_has'),
      IE8_DOM_DEFINE = require('./_ie8-dom-define'),
      gOPD = Object.getOwnPropertyDescriptor;

    exports.f = require('./_descriptors') ? gOPD : function getOwnPropertyDescriptor(O, P) {
      O = toIObject(O);
      P = toPrimitive(P, true);
      if (IE8_DOM_DEFINE) try {
        return gOPD(O, P);
      } catch (e) {
        /* empty */
      }
      if (has(O, P)) return createDesc(!pIE.f.call(O, P), O[P]);
    };
  }, {
    "./_descriptors": 53,
    "./_has": 64,
    "./_ie8-dom-define": 67,
    "./_object-pie": 102,
    "./_property-desc": 110,
    "./_to-iobject": 132,
    "./_to-primitive": 135
  }],
  96: [function (require, module, exports) {
    // fallback for IE11 buggy Object.getOwnPropertyNames with iframe and window
    var toIObject = require('./_to-iobject'),
      gOPN = require('./_object-gopn').f,
      toString = {}.toString;

    var windowNames = typeof window == 'object' && window && Object.getOwnPropertyNames ?
      Object.getOwnPropertyNames(window) : [];

    var getWindowNames = function (it) {
      try {
        return gOPN(it);
      } catch (e) {
        return windowNames.slice();
      }
    };

    module.exports.f = function getOwnPropertyNames(it) {
      return windowNames && toString.call(it) == '[object Window]' ? getWindowNames(it) : gOPN(toIObject(it));
    };

  }, {
    "./_object-gopn": 97,
    "./_to-iobject": 132
  }],
  97: [function (require, module, exports) {
    // 19.1.2.7 / 15.2.3.4 Object.getOwnPropertyNames(O)
    var $keys = require('./_object-keys-internal'),
      hiddenKeys = require('./_enum-bug-keys').concat('length', 'prototype');

    exports.f = Object.getOwnPropertyNames || function getOwnPropertyNames(O) {
      return $keys(O, hiddenKeys);
    };
  }, {
    "./_enum-bug-keys": 55,
    "./_object-keys-internal": 100
  }],
  98: [function (require, module, exports) {
    exports.f = Object.getOwnPropertySymbols;
  }, {}],
  99: [function (require, module, exports) {
    // 19.1.2.9 / 15.2.3.2 Object.getPrototypeOf(O)
    var has = require('./_has'),
      toObject = require('./_to-object'),
      IE_PROTO = require('./_shared-key')('IE_PROTO'),
      ObjectProto = Object.prototype;

    module.exports = Object.getPrototypeOf || function (O) {
      O = toObject(O);
      if (has(O, IE_PROTO)) return O[IE_PROTO];
      if (typeof O.constructor == 'function' && O instanceof O.constructor) {
        return O.constructor.prototype;
      }
      return O instanceof Object ? ObjectProto : null;
    };
  }, {
    "./_has": 64,
    "./_shared-key": 118,
    "./_to-object": 134
  }],
  100: [function (require, module, exports) {
    var has = require('./_has'),
      toIObject = require('./_to-iobject'),
      arrayIndexOf = require('./_array-includes')(false),
      IE_PROTO = require('./_shared-key')('IE_PROTO');

    module.exports = function (object, names) {
      var O = toIObject(object),
        i = 0,
        result = [],
        key;
      for (key in O)
        if (key != IE_PROTO) has(O, key) && result.push(key);
      // Don't enum bug & hidden keys
      while (names.length > i)
        if (has(O, key = names[i++])) {
          ~arrayIndexOf(result, key) || result.push(key);
        }
      return result;
    };
  }, {
    "./_array-includes": 36,
    "./_has": 64,
    "./_shared-key": 118,
    "./_to-iobject": 132
  }],
  101: [function (require, module, exports) {
    // 19.1.2.14 / 15.2.3.14 Object.keys(O)
    var $keys = require('./_object-keys-internal'),
      enumBugKeys = require('./_enum-bug-keys');

    module.exports = Object.keys || function keys(O) {
      return $keys(O, enumBugKeys);
    };
  }, {
    "./_enum-bug-keys": 55,
    "./_object-keys-internal": 100
  }],
  102: [function (require, module, exports) {
    exports.f = {}.propertyIsEnumerable;
  }, {}],
  103: [function (require, module, exports) {
    // most Object methods by ES6 should accept primitives
    var $export = require('./_export'),
      core = require('./_core'),
      fails = require('./_fails');
    module.exports = function (KEY, exec) {
      var fn = (core.Object || {})[KEY] || Object[KEY],
        exp = {};
      exp[KEY] = exec(fn);
      $export($export.S + $export.F * fails(function () {
        fn(1);
      }), 'Object', exp);
    };
  }, {
    "./_core": 48,
    "./_export": 57,
    "./_fails": 59
  }],
  104: [function (require, module, exports) {
    var getKeys = require('./_object-keys'),
      toIObject = require('./_to-iobject'),
      isEnum = require('./_object-pie').f;
    module.exports = function (isEntries) {
      return function (it) {
        var O = toIObject(it),
          keys = getKeys(O),
          length = keys.length,
          i = 0,
          result = [],
          key;
        while (length > i)
          if (isEnum.call(O, key = keys[i++])) {
            result.push(isEntries ? [key, O[key]] : O[key]);
          } return result;
      };
    };
  }, {
    "./_object-keys": 101,
    "./_object-pie": 102,
    "./_to-iobject": 132
  }],
  105: [function (require, module, exports) {
    // all object keys, includes non-enumerable and symbols
    var gOPN = require('./_object-gopn'),
      gOPS = require('./_object-gops'),
      anObject = require('./_an-object'),
      Reflect = require('./_global').Reflect;
    module.exports = Reflect && Reflect.ownKeys || function ownKeys(it) {
      var keys = gOPN.f(anObject(it)),
        getSymbols = gOPS.f;
      return getSymbols ? keys.concat(getSymbols(it)) : keys;
    };
  }, {
    "./_an-object": 32,
    "./_global": 63,
    "./_object-gopn": 97,
    "./_object-gops": 98
  }],
  106: [function (require, module, exports) {
    var $parseFloat = require('./_global').parseFloat,
      $trim = require('./_string-trim').trim;

    module.exports = 1 / $parseFloat(require('./_string-ws') + '-0') !== -Infinity ? function parseFloat(str) {
      var string = $trim(String(str), 3),
        result = $parseFloat(string);
      return result === 0 && string.charAt(0) == '-' ? -0 : result;
    } : $parseFloat;
  }, {
    "./_global": 63,
    "./_string-trim": 127,
    "./_string-ws": 128
  }],
  107: [function (require, module, exports) {
    var $parseInt = require('./_global').parseInt,
      $trim = require('./_string-trim').trim,
      ws = require('./_string-ws'),
      hex = /^[\-+]?0[xX]/;

    module.exports = $parseInt(ws + '08') !== 8 || $parseInt(ws + '0x16') !== 22 ? function parseInt(str, radix) {
      var string = $trim(String(str), 3);
      return $parseInt(string, (radix >>> 0) || (hex.test(string) ? 16 : 10));
    } : $parseInt;
  }, {
    "./_global": 63,
    "./_string-trim": 127,
    "./_string-ws": 128
  }],
  108: [function (require, module, exports) {
    'use strict';
    var path = require('./_path'),
      invoke = require('./_invoke'),
      aFunction = require('./_a-function');
    module.exports = function ( /* ...pargs */ ) {
      var fn = aFunction(this),
        length = arguments.length,
        pargs = Array(length),
        i = 0,
        _ = path._,
        holder = false;
      while (length > i)
        if ((pargs[i] = arguments[i++]) === _) holder = true;
      return function ( /* ...args */ ) {
        var that = this,
          aLen = arguments.length,
          j = 0,
          k = 0,
          args;
        if (!holder && !aLen) return invoke(fn, pargs, that);
        args = pargs.slice();
        if (holder)
          for (; length > j; j++)
            if (args[j] === _) args[j] = arguments[k++];
        while (aLen > k) args.push(arguments[k++]);
        return invoke(fn, args, that);
      };
    };
  }, {
    "./_a-function": 28,
    "./_invoke": 69,
    "./_path": 109
  }],
  109: [function (require, module, exports) {
    module.exports = require('./_global');
  }, {
    "./_global": 63
  }],
  110: [function (require, module, exports) {
    module.exports = function (bitmap, value) {
      return {
        enumerable: !(bitmap & 1),
        configurable: !(bitmap & 2),
        writable: !(bitmap & 4),
        value: value
      };
    };
  }, {}],
  111: [function (require, module, exports) {
    var redefine = require('./_redefine');
    module.exports = function (target, src, safe) {
      for (var key in src) redefine(target, key, src[key], safe);
      return target;
    };
  }, {
    "./_redefine": 112
  }],
  112: [function (require, module, exports) {
    var global = require('./_global'),
      hide = require('./_hide'),
      has = require('./_has'),
      SRC = require('./_uid')('src'),
      TO_STRING = 'toString',
      $toString = Function[TO_STRING],
      TPL = ('' + $toString).split(TO_STRING);

    require('./_core').inspectSource = function (it) {
      return $toString.call(it);
    };

    (module.exports = function (O, key, val, safe) {
      var isFunction = typeof val == 'function';
      if (isFunction) has(val, 'name') || hide(val, 'name', key);
      if (O[key] === val) return;
      if (isFunction) has(val, SRC) || hide(val, SRC, O[key] ? '' + O[key] : TPL.join(String(key)));
      if (O === global) {
        O[key] = val;
      } else {
        if (!safe) {
          delete O[key];
          hide(O, key, val);
        } else {
          if (O[key]) O[key] = val;
          else hide(O, key, val);
        }
      }
      // add fake Function#toString for correct work wrapped methods / constructors with methods like LoDash isNative
    })(Function.prototype, TO_STRING, function toString() {
      return typeof this == 'function' && this[SRC] || $toString.call(this);
    });
  }, {
    "./_core": 48,
    "./_global": 63,
    "./_has": 64,
    "./_hide": 65,
    "./_uid": 139
  }],
  113: [function (require, module, exports) {
    module.exports = function (regExp, replace) {
      var replacer = replace === Object(replace) ? function (part) {
        return replace[part];
      } : replace;
      return function (it) {
        return String(it).replace(regExp, replacer);
      };
    };
  }, {}],
  114: [function (require, module, exports) {
    // 7.2.9 SameValue(x, y)
    module.exports = Object.is || function is(x, y) {
      return x === y ? x !== 0 || 1 / x === 1 / y : x != x && y != y;
    };
  }, {}],
  115: [function (require, module, exports) {
    // Works with __proto__ only. Old v8 can't work with null proto objects.
    /* eslint-disable no-proto */
    var isObject = require('./_is-object'),
      anObject = require('./_an-object');
    var check = function (O, proto) {
      anObject(O);
      if (!isObject(proto) && proto !== null) throw TypeError(proto + ": can't set as prototype!");
    };
    module.exports = {
      set: Object.setPrototypeOf || ('__proto__' in {} ? // eslint-disable-line
        function (test, buggy, set) {
          try {
            set = require('./_ctx')(Function.call, require('./_object-gopd').f(Object.prototype, '__proto__').set, 2);
            set(test, []);
            buggy = !(test instanceof Array);
          } catch (e) {
            buggy = true;
          }
          return function setPrototypeOf(O, proto) {
            check(O, proto);
            if (buggy) O.__proto__ = proto;
            else set(O, proto);
            return O;
          };
        }({}, false) : undefined),
      check: check
    };
  }, {
    "./_an-object": 32,
    "./_ctx": 50,
    "./_is-object": 74,
    "./_object-gopd": 95
  }],
  116: [function (require, module, exports) {
    'use strict';
    var global = require('./_global'),
      dP = require('./_object-dp'),
      DESCRIPTORS = require('./_descriptors'),
      SPECIES = require('./_wks')('species');

    module.exports = function (KEY) {
      var C = global[KEY];
      if (DESCRIPTORS && C && !C[SPECIES]) dP.f(C, SPECIES, {
        configurable: true,
        get: function () {
          return this;
        }
      });
    };
  }, {
    "./_descriptors": 53,
    "./_global": 63,
    "./_object-dp": 92,
    "./_wks": 142
  }],
  117: [function (require, module, exports) {
    var def = require('./_object-dp').f,
      has = require('./_has'),
      TAG = require('./_wks')('toStringTag');

    module.exports = function (it, tag, stat) {
      if (it && !has(it = stat ? it : it.prototype, TAG)) def(it, TAG, {
        configurable: true,
        value: tag
      });
    };
  }, {
    "./_has": 64,
    "./_object-dp": 92,
    "./_wks": 142
  }],
  118: [function (require, module, exports) {
    var shared = require('./_shared')('keys'),
      uid = require('./_uid');
    module.exports = function (key) {
      return shared[key] || (shared[key] = uid(key));
    };
  }, {
    "./_shared": 119,
    "./_uid": 139
  }],
  119: [function (require, module, exports) {
    var global = require('./_global'),
      SHARED = '__core-js_shared__',
      store = global[SHARED] || (global[SHARED] = {});
    module.exports = function (key) {
      return store[key] || (store[key] = {});
    };
  }, {
    "./_global": 63
  }],
  120: [function (require, module, exports) {
    // 7.3.20 SpeciesConstructor(O, defaultConstructor)
    var anObject = require('./_an-object'),
      aFunction = require('./_a-function'),
      SPECIES = require('./_wks')('species');
    module.exports = function (O, D) {
      var C = anObject(O).constructor,
        S;
      return C === undefined || (S = anObject(C)[SPECIES]) == undefined ? D : aFunction(S);
    };
  }, {
    "./_a-function": 28,
    "./_an-object": 32,
    "./_wks": 142
  }],
  121: [function (require, module, exports) {
    var fails = require('./_fails');

    module.exports = function (method, arg) {
      return !!method && fails(function () {
        arg ? method.call(null, function () {}, 1) : method.call(null);
      });
    };
  }, {
    "./_fails": 59
  }],
  122: [function (require, module, exports) {
    var toInteger = require('./_to-integer'),
      defined = require('./_defined');
    // true  -> String#at
    // false -> String#codePointAt
    module.exports = function (TO_STRING) {
      return function (that, pos) {
        var s = String(defined(that)),
          i = toInteger(pos),
          l = s.length,
          a, b;
        if (i < 0 || i >= l) return TO_STRING ? '' : undefined;
        a = s.charCodeAt(i);
        return a < 0xd800 || a > 0xdbff || i + 1 === l || (b = s.charCodeAt(i + 1)) < 0xdc00 || b > 0xdfff ?
          TO_STRING ? s.charAt(i) : a :
          TO_STRING ? s.slice(i, i + 2) : (a - 0xd800 << 10) + (b - 0xdc00) + 0x10000;
      };
    };
  }, {
    "./_defined": 52,
    "./_to-integer": 131
  }],
  123: [function (require, module, exports) {
    // helper for String#{startsWith, endsWith, includes}
    var isRegExp = require('./_is-regexp'),
      defined = require('./_defined');

    module.exports = function (that, searchString, NAME) {
      if (isRegExp(searchString)) throw TypeError('String#' + NAME + " doesn't accept regex!");
      return String(defined(that));
    };
  }, {
    "./_defined": 52,
    "./_is-regexp": 75
  }],
  124: [function (require, module, exports) {
    var $export = require('./_export'),
      fails = require('./_fails'),
      defined = require('./_defined'),
      quot = /"/g;
    // B.2.3.2.1 CreateHTML(string, tag, attribute, value)
    var createHTML = function (string, tag, attribute, value) {
      var S = String(defined(string)),
        p1 = '<' + tag;
      if (attribute !== '') p1 += ' ' + attribute + '="' + String(value).replace(quot, '&quot;') + '"';
      return p1 + '>' + S + '</' + tag + '>';
    };
    module.exports = function (NAME, exec) {
      var O = {};
      O[NAME] = exec(createHTML);
      $export($export.P + $export.F * fails(function () {
        var test = '' [NAME]('"');
        return test !== test.toLowerCase() || test.split('"').length > 3;
      }), 'String', O);
    };
  }, {
    "./_defined": 52,
    "./_export": 57,
    "./_fails": 59
  }],
  125: [function (require, module, exports) {
    // https://github.com/tc39/proposal-string-pad-start-end
    var toLength = require('./_to-length'),
      repeat = require('./_string-repeat'),
      defined = require('./_defined');

    module.exports = function (that, maxLength, fillString, left) {
      var S = String(defined(that)),
        stringLength = S.length,
        fillStr = fillString === undefined ? ' ' : String(fillString),
        intMaxLength = toLength(maxLength);
      if (intMaxLength <= stringLength || fillStr == '') return S;
      var fillLen = intMaxLength - stringLength,
        stringFiller = repeat.call(fillStr, Math.ceil(fillLen / fillStr.length));
      if (stringFiller.length > fillLen) stringFiller = stringFiller.slice(0, fillLen);
      return left ? stringFiller + S : S + stringFiller;
    };

  }, {
    "./_defined": 52,
    "./_string-repeat": 126,
    "./_to-length": 133
  }],
  126: [function (require, module, exports) {
    'use strict';
    var toInteger = require('./_to-integer'),
      defined = require('./_defined');

    module.exports = function repeat(count) {
      var str = String(defined(this)),
        res = '',
        n = toInteger(count);
      if (n < 0 || n == Infinity) throw RangeError("Count can't be negative");
      for (; n > 0;
        (n >>>= 1) && (str += str))
        if (n & 1) res += str;
      return res;
    };
  }, {
    "./_defined": 52,
    "./_to-integer": 131
  }],
  127: [function (require, module, exports) {
    var $export = require('./_export'),
      defined = require('./_defined'),
      fails = require('./_fails'),
      spaces = require('./_string-ws'),
      space = '[' + spaces + ']',
      non = '\u200b\u0085',
      ltrim = RegExp('^' + space + space + '*'),
      rtrim = RegExp(space + space + '*$');

    var exporter = function (KEY, exec, ALIAS) {
      var exp = {};
      var FORCE = fails(function () {
        return !!spaces[KEY]() || non[KEY]() != non;
      });
      var fn = exp[KEY] = FORCE ? exec(trim) : spaces[KEY];
      if (ALIAS) exp[ALIAS] = fn;
      $export($export.P + $export.F * FORCE, 'String', exp);
    };

    // 1 -> String#trimLeft
    // 2 -> String#trimRight
    // 3 -> String#trim
    var trim = exporter.trim = function (string, TYPE) {
      string = String(defined(string));
      if (TYPE & 1) string = string.replace(ltrim, '');
      if (TYPE & 2) string = string.replace(rtrim, '');
      return string;
    };

    module.exports = exporter;
  }, {
    "./_defined": 52,
    "./_export": 57,
    "./_fails": 59,
    "./_string-ws": 128
  }],
  128: [function (require, module, exports) {
    module.exports = '\x09\x0A\x0B\x0C\x0D\x20\xA0\u1680\u180E\u2000\u2001\u2002\u2003' +
      '\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u2028\u2029\uFEFF';
  }, {}],
  129: [function (require, module, exports) {
    var ctx = require('./_ctx'),
      invoke = require('./_invoke'),
      html = require('./_html'),
      cel = require('./_dom-create'),
      global = require('./_global'),
      process = global.process,
      setTask = global.setImmediate,
      clearTask = global.clearImmediate,
      MessageChannel = global.MessageChannel,
      counter = 0,
      queue = {},
      ONREADYSTATECHANGE = 'onreadystatechange',
      defer, channel, port;
    var run = function () {
      var id = +this;
      if (queue.hasOwnProperty(id)) {
        var fn = queue[id];
        delete queue[id];
        fn();
      }
    };
    var listener = function (event) {
      run.call(event.data);
    };
    // Node.js 0.9+ & IE10+ has setImmediate, otherwise:
    if (!setTask || !clearTask) {
      setTask = function setImmediate(fn) {
        var args = [],
          i = 1;
        while (arguments.length > i) args.push(arguments[i++]);
        queue[++counter] = function () {
          invoke(typeof fn == 'function' ? fn : Function(fn), args);
        };
        defer(counter);
        return counter;
      };
      clearTask = function clearImmediate(id) {
        delete queue[id];
      };
      // Node.js 0.8-
      if (require('./_cof')(process) == 'process') {
        defer = function (id) {
          process.nextTick(ctx(run, id, 1));
        };
        // Browsers with MessageChannel, includes WebWorkers
      } else if (MessageChannel) {
        channel = new MessageChannel;
        port = channel.port2;
        channel.port1.onmessage = listener;
        defer = ctx(port.postMessage, port, 1);
        // Browsers with postMessage, skip WebWorkers
        // IE8 has postMessage, but it's sync & typeof its postMessage is 'object'
      } else if (global.addEventListener && typeof postMessage == 'function' && !global.importScripts) {
        defer = function (id) {
          global.postMessage(id + '', '*');
        };
        global.addEventListener('message', listener, false);
        // IE8-
      } else if (ONREADYSTATECHANGE in cel('script')) {
        defer = function (id) {
          html.appendChild(cel('script'))[ONREADYSTATECHANGE] = function () {
            html.removeChild(this);
            run.call(id);
          };
        };
        // Rest old browsers
      } else {
        defer = function (id) {
          setTimeout(ctx(run, id, 1), 0);
        };
      }
    }
    module.exports = {
      set: setTask,
      clear: clearTask
    };
  }, {
    "./_cof": 43,
    "./_ctx": 50,
    "./_dom-create": 54,
    "./_global": 63,
    "./_html": 66,
    "./_invoke": 69
  }],
  130: [function (require, module, exports) {
    var toInteger = require('./_to-integer'),
      max = Math.max,
      min = Math.min;
    module.exports = function (index, length) {
      index = toInteger(index);
      return index < 0 ? max(index + length, 0) : min(index, length);
    };
  }, {
    "./_to-integer": 131
  }],
  131: [function (require, module, exports) {
    // 7.1.4 ToInteger
    var ceil = Math.ceil,
      floor = Math.floor;
    module.exports = function (it) {
      return isNaN(it = +it) ? 0 : (it > 0 ? floor : ceil)(it);
    };
  }, {}],
  132: [function (require, module, exports) {
    // to indexed object, toObject with fallback for non-array-like ES3 strings
    var IObject = require('./_iobject'),
      defined = require('./_defined');
    module.exports = function (it) {
      return IObject(defined(it));
    };
  }, {
    "./_defined": 52,
    "./_iobject": 70
  }],
  133: [function (require, module, exports) {
    // 7.1.15 ToLength
    var toInteger = require('./_to-integer'),
      min = Math.min;
    module.exports = function (it) {
      return it > 0 ? min(toInteger(it), 0x1fffffffffffff) : 0; // pow(2, 53) - 1 == 9007199254740991
    };
  }, {
    "./_to-integer": 131
  }],
  134: [function (require, module, exports) {
    // 7.1.13 ToObject(argument)
    var defined = require('./_defined');
    module.exports = function (it) {
      return Object(defined(it));
    };
  }, {
    "./_defined": 52
  }],
  135: [function (require, module, exports) {
    // 7.1.1 ToPrimitive(input [, PreferredType])
    var isObject = require('./_is-object');
    // instead of the ES6 spec version, we didn't implement @@toPrimitive case
    // and the second argument - flag - preferred type is a string
    module.exports = function (it, S) {
      if (!isObject(it)) return it;
      var fn, val;
      if (S && typeof (fn = it.toString) == 'function' && !isObject(val = fn.call(it))) return val;
      if (typeof (fn = it.valueOf) == 'function' && !isObject(val = fn.call(it))) return val;
      if (!S && typeof (fn = it.toString) == 'function' && !isObject(val = fn.call(it))) return val;
      throw TypeError("Can't convert object to primitive value");
    };
  }, {
    "./_is-object": 74
  }],
  136: [function (require, module, exports) {
    'use strict';
    if (require('./_descriptors')) {
      var LIBRARY = require('./_library'),
        global = require('./_global'),
        fails = require('./_fails'),
        $export = require('./_export'),
        $typed = require('./_typed'),
        $buffer = require('./_typed-buffer'),
        ctx = require('./_ctx'),
        anInstance = require('./_an-instance'),
        propertyDesc = require('./_property-desc'),
        hide = require('./_hide'),
        redefineAll = require('./_redefine-all'),
        toInteger = require('./_to-integer'),
        toLength = require('./_to-length'),
        toIndex = require('./_to-index'),
        toPrimitive = require('./_to-primitive'),
        has = require('./_has'),
        same = require('./_same-value'),
        classof = require('./_classof'),
        isObject = require('./_is-object'),
        toObject = require('./_to-object'),
        isArrayIter = require('./_is-array-iter'),
        create = require('./_object-create'),
        getPrototypeOf = require('./_object-gpo'),
        gOPN = require('./_object-gopn').f,
        getIterFn = require('./core.get-iterator-method'),
        uid = require('./_uid'),
        wks = require('./_wks'),
        createArrayMethod = require('./_array-methods'),
        createArrayIncludes = require('./_array-includes'),
        speciesConstructor = require('./_species-constructor'),
        ArrayIterators = require('./es6.array.iterator'),
        Iterators = require('./_iterators'),
        $iterDetect = require('./_iter-detect'),
        setSpecies = require('./_set-species'),
        arrayFill = require('./_array-fill'),
        arrayCopyWithin = require('./_array-copy-within'),
        $DP = require('./_object-dp'),
        $GOPD = require('./_object-gopd'),
        dP = $DP.f,
        gOPD = $GOPD.f,
        RangeError = global.RangeError,
        TypeError = global.TypeError,
        Uint8Array = global.Uint8Array,
        ARRAY_BUFFER = 'ArrayBuffer',
        SHARED_BUFFER = 'Shared' + ARRAY_BUFFER,
        BYTES_PER_ELEMENT = 'BYTES_PER_ELEMENT',
        PROTOTYPE = 'prototype',
        ArrayProto = Array[PROTOTYPE],
        $ArrayBuffer = $buffer.ArrayBuffer,
        $DataView = $buffer.DataView,
        arrayForEach = createArrayMethod(0),
        arrayFilter = createArrayMethod(2),
        arraySome = createArrayMethod(3),
        arrayEvery = createArrayMethod(4),
        arrayFind = createArrayMethod(5),
        arrayFindIndex = createArrayMethod(6),
        arrayIncludes = createArrayIncludes(true),
        arrayIndexOf = createArrayIncludes(false),
        arrayValues = ArrayIterators.values,
        arrayKeys = ArrayIterators.keys,
        arrayEntries = ArrayIterators.entries,
        arrayLastIndexOf = ArrayProto.lastIndexOf,
        arrayReduce = ArrayProto.reduce,
        arrayReduceRight = ArrayProto.reduceRight,
        arrayJoin = ArrayProto.join,
        arraySort = ArrayProto.sort,
        arraySlice = ArrayProto.slice,
        arrayToString = ArrayProto.toString,
        arrayToLocaleString = ArrayProto.toLocaleString,
        ITERATOR = wks('iterator'),
        TAG = wks('toStringTag'),
        TYPED_CONSTRUCTOR = uid('typed_constructor'),
        DEF_CONSTRUCTOR = uid('def_constructor'),
        ALL_CONSTRUCTORS = $typed.CONSTR,
        TYPED_ARRAY = $typed.TYPED,
        VIEW = $typed.VIEW,
        WRONG_LENGTH = 'Wrong length!';

      var $map = createArrayMethod(1, function (O, length) {
        return allocate(speciesConstructor(O, O[DEF_CONSTRUCTOR]), length);
      });

      var LITTLE_ENDIAN = fails(function () {
        return new Uint8Array(new Uint16Array([1]).buffer)[0] === 1;
      });

      var FORCED_SET = !!Uint8Array && !!Uint8Array[PROTOTYPE].set && fails(function () {
        new Uint8Array(1).set({});
      });

      var strictToLength = function (it, SAME) {
        if (it === undefined) throw TypeError(WRONG_LENGTH);
        var number = +it,
          length = toLength(it);
        if (SAME && !same(number, length)) throw RangeError(WRONG_LENGTH);
        return length;
      };

      var toOffset = function (it, BYTES) {
        var offset = toInteger(it);
        if (offset < 0 || offset % BYTES) throw RangeError('Wrong offset!');
        return offset;
      };

      var validate = function (it) {
        if (isObject(it) && TYPED_ARRAY in it) return it;
        throw TypeError(it + ' is not a typed array!');
      };

      var allocate = function (C, length) {
        if (!(isObject(C) && TYPED_CONSTRUCTOR in C)) {
          throw TypeError('It is not a typed array constructor!');
        }
        return new C(length);
      };

      var speciesFromList = function (O, list) {
        return fromList(speciesConstructor(O, O[DEF_CONSTRUCTOR]), list);
      };

      var fromList = function (C, list) {
        var index = 0,
          length = list.length,
          result = allocate(C, length);
        while (length > index) result[index] = list[index++];
        return result;
      };

      var addGetter = function (it, key, internal) {
        dP(it, key, {
          get: function () {
            return this._d[internal];
          }
        });
      };

      var $from = function from(source /*, mapfn, thisArg */ ) {
        var O = toObject(source),
          aLen = arguments.length,
          mapfn = aLen > 1 ? arguments[1] : undefined,
          mapping = mapfn !== undefined,
          iterFn = getIterFn(O),
          i, length, values, result, step, iterator;
        if (iterFn != undefined && !isArrayIter(iterFn)) {
          for (iterator = iterFn.call(O), values = [], i = 0; !(step = iterator.next()).done; i++) {
            values.push(step.value);
          }
          O = values;
        }
        if (mapping && aLen > 2) mapfn = ctx(mapfn, arguments[2], 2);
        for (i = 0, length = toLength(O.length), result = allocate(this, length); length > i; i++) {
          result[i] = mapping ? mapfn(O[i], i) : O[i];
        }
        return result;
      };

      var $of = function of ( /*...items*/ ) {
        var index = 0,
          length = arguments.length,
          result = allocate(this, length);
        while (length > index) result[index] = arguments[index++];
        return result;
      };

      // iOS Safari 6.x fails here
      var TO_LOCALE_BUG = !!Uint8Array && fails(function () {
        arrayToLocaleString.call(new Uint8Array(1));
      });

      var $toLocaleString = function toLocaleString() {
        return arrayToLocaleString.apply(TO_LOCALE_BUG ? arraySlice.call(validate(this)) : validate(this), arguments);
      };

      var proto = {
        copyWithin: function copyWithin(target, start /*, end */ ) {
          return arrayCopyWithin.call(validate(this), target, start, arguments.length > 2 ? arguments[2] : undefined);
        },
        every: function every(callbackfn /*, thisArg */ ) {
          return arrayEvery(validate(this), callbackfn, arguments.length > 1 ? arguments[1] : undefined);
        },
        fill: function fill(value /*, start, end */ ) { // eslint-disable-line no-unused-vars
          return arrayFill.apply(validate(this), arguments);
        },
        filter: function filter(callbackfn /*, thisArg */ ) {
          return speciesFromList(this, arrayFilter(validate(this), callbackfn,
            arguments.length > 1 ? arguments[1] : undefined));
        },
        find: function find(predicate /*, thisArg */ ) {
          return arrayFind(validate(this), predicate, arguments.length > 1 ? arguments[1] : undefined);
        },
        findIndex: function findIndex(predicate /*, thisArg */ ) {
          return arrayFindIndex(validate(this), predicate, arguments.length > 1 ? arguments[1] : undefined);
        },
        forEach: function forEach(callbackfn /*, thisArg */ ) {
          arrayForEach(validate(this), callbackfn, arguments.length > 1 ? arguments[1] : undefined);
        },
        indexOf: function indexOf(searchElement /*, fromIndex */ ) {
          return arrayIndexOf(validate(this), searchElement, arguments.length > 1 ? arguments[1] : undefined);
        },
        includes: function includes(searchElement /*, fromIndex */ ) {
          return arrayIncludes(validate(this), searchElement, arguments.length > 1 ? arguments[1] : undefined);
        },
        join: function join(separator) { // eslint-disable-line no-unused-vars
          return arrayJoin.apply(validate(this), arguments);
        },
        lastIndexOf: function lastIndexOf(searchElement /*, fromIndex */ ) { // eslint-disable-line no-unused-vars
          return arrayLastIndexOf.apply(validate(this), arguments);
        },
        map: function map(mapfn /*, thisArg */ ) {
          return $map(validate(this), mapfn, arguments.length > 1 ? arguments[1] : undefined);
        },
        reduce: function reduce(callbackfn /*, initialValue */ ) { // eslint-disable-line no-unused-vars
          return arrayReduce.apply(validate(this), arguments);
        },
        reduceRight: function reduceRight(callbackfn /*, initialValue */ ) { // eslint-disable-line no-unused-vars
          return arrayReduceRight.apply(validate(this), arguments);
        },
        reverse: function reverse() {
          var that = this,
            length = validate(that).length,
            middle = Math.floor(length / 2),
            index = 0,
            value;
          while (index < middle) {
            value = that[index];
            that[index++] = that[--length];
            that[length] = value;
          }
          return that;
        },
        some: function some(callbackfn /*, thisArg */ ) {
          return arraySome(validate(this), callbackfn, arguments.length > 1 ? arguments[1] : undefined);
        },
        sort: function sort(comparefn) {
          return arraySort.call(validate(this), comparefn);
        },
        subarray: function subarray(begin, end) {
          var O = validate(this),
            length = O.length,
            $begin = toIndex(begin, length);
          return new(speciesConstructor(O, O[DEF_CONSTRUCTOR]))(
            O.buffer,
            O.byteOffset + $begin * O.BYTES_PER_ELEMENT,
            toLength((end === undefined ? length : toIndex(end, length)) - $begin)
          );
        }
      };

      var $slice = function slice(start, end) {
        return speciesFromList(this, arraySlice.call(validate(this), start, end));
      };

      var $set = function set(arrayLike /*, offset */ ) {
        validate(this);
        var offset = toOffset(arguments[1], 1),
          length = this.length,
          src = toObject(arrayLike),
          len = toLength(src.length),
          index = 0;
        if (len + offset > length) throw RangeError(WRONG_LENGTH);
        while (index < len) this[offset + index] = src[index++];
      };

      var $iterators = {
        entries: function entries() {
          return arrayEntries.call(validate(this));
        },
        keys: function keys() {
          return arrayKeys.call(validate(this));
        },
        values: function values() {
          return arrayValues.call(validate(this));
        }
      };

      var isTAIndex = function (target, key) {
        return isObject(target) &&
          target[TYPED_ARRAY] &&
          typeof key != 'symbol' &&
          key in target &&
          String(+key) == String(key);
      };
      var $getDesc = function getOwnPropertyDescriptor(target, key) {
        return isTAIndex(target, key = toPrimitive(key, true)) ?
          propertyDesc(2, target[key]) :
          gOPD(target, key);
      };
      var $setDesc = function defineProperty(target, key, desc) {
        if (isTAIndex(target, key = toPrimitive(key, true)) &&
          isObject(desc) &&
          has(desc, 'value') &&
          !has(desc, 'get') &&
          !has(desc, 'set')
          // TODO: add validation descriptor w/o calling accessors
          &&
          !desc.configurable &&
          (!has(desc, 'writable') || desc.writable) &&
          (!has(desc, 'enumerable') || desc.enumerable)
        ) {
          target[key] = desc.value;
          return target;
        } else return dP(target, key, desc);
      };

      if (!ALL_CONSTRUCTORS) {
        $GOPD.f = $getDesc;
        $DP.f = $setDesc;
      }

      $export($export.S + $export.F * !ALL_CONSTRUCTORS, 'Object', {
        getOwnPropertyDescriptor: $getDesc,
        defineProperty: $setDesc
      });

      if (fails(function () {
          arrayToString.call({});
        })) {
        arrayToString = arrayToLocaleString = function toString() {
          return arrayJoin.call(this);
        }
      }

      var $TypedArrayPrototype$ = redefineAll({}, proto);
      redefineAll($TypedArrayPrototype$, $iterators);
      hide($TypedArrayPrototype$, ITERATOR, $iterators.values);
      redefineAll($TypedArrayPrototype$, {
        slice: $slice,
        set: $set,
        constructor: function () {
          /* noop */
        },
        toString: arrayToString,
        toLocaleString: $toLocaleString
      });
      addGetter($TypedArrayPrototype$, 'buffer', 'b');
      addGetter($TypedArrayPrototype$, 'byteOffset', 'o');
      addGetter($TypedArrayPrototype$, 'byteLength', 'l');
      addGetter($TypedArrayPrototype$, 'length', 'e');
      dP($TypedArrayPrototype$, TAG, {
        get: function () {
          return this[TYPED_ARRAY];
        }
      });

      module.exports = function (KEY, BYTES, wrapper, CLAMPED) {
        CLAMPED = !!CLAMPED;
        var NAME = KEY + (CLAMPED ? 'Clamped' : '') + 'Array',
          ISNT_UINT8 = NAME != 'Uint8Array',
          GETTER = 'get' + KEY,
          SETTER = 'set' + KEY,
          TypedArray = global[NAME],
          Base = TypedArray || {},
          TAC = TypedArray && getPrototypeOf(TypedArray),
          FORCED = !TypedArray || !$typed.ABV,
          O = {},
          TypedArrayPrototype = TypedArray && TypedArray[PROTOTYPE];
        var getter = function (that, index) {
          var data = that._d;
          return data.v[GETTER](index * BYTES + data.o, LITTLE_ENDIAN);
        };
        var setter = function (that, index, value) {
          var data = that._d;
          if (CLAMPED) value = (value = Math.round(value)) < 0 ? 0 : value > 0xff ? 0xff : value & 0xff;
          data.v[SETTER](index * BYTES + data.o, value, LITTLE_ENDIAN);
        };
        var addElement = function (that, index) {
          dP(that, index, {
            get: function () {
              return getter(this, index);
            },
            set: function (value) {
              return setter(this, index, value);
            },
            enumerable: true
          });
        };
        if (FORCED) {
          TypedArray = wrapper(function (that, data, $offset, $length) {
            anInstance(that, TypedArray, NAME, '_d');
            var index = 0,
              offset = 0,
              buffer, byteLength, length, klass;
            if (!isObject(data)) {
              length = strictToLength(data, true)
              byteLength = length * BYTES;
              buffer = new $ArrayBuffer(byteLength);
            } else if (data instanceof $ArrayBuffer || (klass = classof(data)) == ARRAY_BUFFER || klass == SHARED_BUFFER) {
              buffer = data;
              offset = toOffset($offset, BYTES);
              var $len = data.byteLength;
              if ($length === undefined) {
                if ($len % BYTES) throw RangeError(WRONG_LENGTH);
                byteLength = $len - offset;
                if (byteLength < 0) throw RangeError(WRONG_LENGTH);
              } else {
                byteLength = toLength($length) * BYTES;
                if (byteLength + offset > $len) throw RangeError(WRONG_LENGTH);
              }
              length = byteLength / BYTES;
            } else if (TYPED_ARRAY in data) {
              return fromList(TypedArray, data);
            } else {
              return $from.call(TypedArray, data);
            }
            hide(that, '_d', {
              b: buffer,
              o: offset,
              l: byteLength,
              e: length,
              v: new $DataView(buffer)
            });
            while (index < length) addElement(that, index++);
          });
          TypedArrayPrototype = TypedArray[PROTOTYPE] = create($TypedArrayPrototype$);
          hide(TypedArrayPrototype, 'constructor', TypedArray);
        } else if (!$iterDetect(function (iter) {
            // V8 works with iterators, but fails in many other cases
            // https://code.google.com/p/v8/issues/detail?id=4552
            new TypedArray(null); // eslint-disable-line no-new
            new TypedArray(iter); // eslint-disable-line no-new
          }, true)) {
          TypedArray = wrapper(function (that, data, $offset, $length) {
            anInstance(that, TypedArray, NAME);
            var klass;
            // `ws` module bug, temporarily remove validation length for Uint8Array
            // https://github.com/websockets/ws/pull/645
            if (!isObject(data)) return new Base(strictToLength(data, ISNT_UINT8));
            if (data instanceof $ArrayBuffer || (klass = classof(data)) == ARRAY_BUFFER || klass == SHARED_BUFFER) {
              return $length !== undefined ?
                new Base(data, toOffset($offset, BYTES), $length) :
                $offset !== undefined ?
                new Base(data, toOffset($offset, BYTES)) :
                new Base(data);
            }
            if (TYPED_ARRAY in data) return fromList(TypedArray, data);
            return $from.call(TypedArray, data);
          });
          arrayForEach(TAC !== Function.prototype ? gOPN(Base).concat(gOPN(TAC)) : gOPN(Base), function (key) {
            if (!(key in TypedArray)) hide(TypedArray, key, Base[key]);
          });
          TypedArray[PROTOTYPE] = TypedArrayPrototype;
          if (!LIBRARY) TypedArrayPrototype.constructor = TypedArray;
        }
        var $nativeIterator = TypedArrayPrototype[ITERATOR],
          CORRECT_ITER_NAME = !!$nativeIterator && ($nativeIterator.name == 'values' || $nativeIterator.name == undefined),
          $iterator = $iterators.values;
        hide(TypedArray, TYPED_CONSTRUCTOR, true);
        hide(TypedArrayPrototype, TYPED_ARRAY, NAME);
        hide(TypedArrayPrototype, VIEW, true);
        hide(TypedArrayPrototype, DEF_CONSTRUCTOR, TypedArray);

        if (CLAMPED ? new TypedArray(1)[TAG] != NAME : !(TAG in TypedArrayPrototype)) {
          dP(TypedArrayPrototype, TAG, {
            get: function () {
              return NAME;
            }
          });
        }

        O[NAME] = TypedArray;

        $export($export.G + $export.W + $export.F * (TypedArray != Base), O);

        $export($export.S, NAME, {
          BYTES_PER_ELEMENT: BYTES,
          from: $from,
          of: $of
        });

        if (!(BYTES_PER_ELEMENT in TypedArrayPrototype)) hide(TypedArrayPrototype, BYTES_PER_ELEMENT, BYTES);

        $export($export.P, NAME, proto);

        setSpecies(NAME);

        $export($export.P + $export.F * FORCED_SET, NAME, {
          set: $set
        });

        $export($export.P + $export.F * !CORRECT_ITER_NAME, NAME, $iterators);

        $export($export.P + $export.F * (TypedArrayPrototype.toString != arrayToString), NAME, {
          toString: arrayToString
        });

        $export($export.P + $export.F * fails(function () {
          new TypedArray(1).slice();
        }), NAME, {
          slice: $slice
        });

        $export($export.P + $export.F * (fails(function () {
          return [1, 2].toLocaleString() != new TypedArray([1, 2]).toLocaleString()
        }) || !fails(function () {
          TypedArrayPrototype.toLocaleString.call([1, 2]);
        })), NAME, {
          toLocaleString: $toLocaleString
        });

        Iterators[NAME] = CORRECT_ITER_NAME ? $nativeIterator : $iterator;
        if (!LIBRARY && !CORRECT_ITER_NAME) hide(TypedArrayPrototype, ITERATOR, $iterator);
      };
    } else module.exports = function () {
      /* empty */
    };
  }, {
    "./_an-instance": 31,
    "./_array-copy-within": 33,
    "./_array-fill": 34,
    "./_array-includes": 36,
    "./_array-methods": 37,
    "./_classof": 42,
    "./_ctx": 50,
    "./_descriptors": 53,
    "./_export": 57,
    "./_fails": 59,
    "./_global": 63,
    "./_has": 64,
    "./_hide": 65,
    "./_is-array-iter": 71,
    "./_is-object": 74,
    "./_iter-detect": 79,
    "./_iterators": 81,
    "./_library": 83,
    "./_object-create": 91,
    "./_object-dp": 92,
    "./_object-gopd": 95,
    "./_object-gopn": 97,
    "./_object-gpo": 99,
    "./_property-desc": 110,
    "./_redefine-all": 111,
    "./_same-value": 114,
    "./_set-species": 116,
    "./_species-constructor": 120,
    "./_to-index": 130,
    "./_to-integer": 131,
    "./_to-length": 133,
    "./_to-object": 134,
    "./_to-primitive": 135,
    "./_typed": 138,
    "./_typed-buffer": 137,
    "./_uid": 139,
    "./_wks": 142,
    "./core.get-iterator-method": 143,
    "./es6.array.iterator": 155
  }],
  137: [function (require, module, exports) {
    'use strict';
    var global = require('./_global'),
      DESCRIPTORS = require('./_descriptors'),
      LIBRARY = require('./_library'),
      $typed = require('./_typed'),
      hide = require('./_hide'),
      redefineAll = require('./_redefine-all'),
      fails = require('./_fails'),
      anInstance = require('./_an-instance'),
      toInteger = require('./_to-integer'),
      toLength = require('./_to-length'),
      gOPN = require('./_object-gopn').f,
      dP = require('./_object-dp').f,
      arrayFill = require('./_array-fill'),
      setToStringTag = require('./_set-to-string-tag'),
      ARRAY_BUFFER = 'ArrayBuffer',
      DATA_VIEW = 'DataView',
      PROTOTYPE = 'prototype',
      WRONG_LENGTH = 'Wrong length!',
      WRONG_INDEX = 'Wrong index!',
      $ArrayBuffer = global[ARRAY_BUFFER],
      $DataView = global[DATA_VIEW],
      Math = global.Math,
      RangeError = global.RangeError,
      Infinity = global.Infinity,
      BaseBuffer = $ArrayBuffer,
      abs = Math.abs,
      pow = Math.pow,
      floor = Math.floor,
      log = Math.log,
      LN2 = Math.LN2,
      BUFFER = 'buffer',
      BYTE_LENGTH = 'byteLength',
      BYTE_OFFSET = 'byteOffset',
      $BUFFER = DESCRIPTORS ? '_b' : BUFFER,
      $LENGTH = DESCRIPTORS ? '_l' : BYTE_LENGTH,
      $OFFSET = DESCRIPTORS ? '_o' : BYTE_OFFSET;

    // IEEE754 conversions based on https://github.com/feross/ieee754
    var packIEEE754 = function (value, mLen, nBytes) {
      var buffer = Array(nBytes),
        eLen = nBytes * 8 - mLen - 1,
        eMax = (1 << eLen) - 1,
        eBias = eMax >> 1,
        rt = mLen === 23 ? pow(2, -24) - pow(2, -77) : 0,
        i = 0,
        s = value < 0 || value === 0 && 1 / value < 0 ? 1 : 0,
        e, m, c;
      value = abs(value)
      if (value != value || value === Infinity) {
        m = value != value ? 1 : 0;
        e = eMax;
      } else {
        e = floor(log(value) / LN2);
        if (value * (c = pow(2, -e)) < 1) {
          e--;
          c *= 2;
        }
        if (e + eBias >= 1) {
          value += rt / c;
        } else {
          value += rt * pow(2, 1 - eBias);
        }
        if (value * c >= 2) {
          e++;
          c /= 2;
        }
        if (e + eBias >= eMax) {
          m = 0;
          e = eMax;
        } else if (e + eBias >= 1) {
          m = (value * c - 1) * pow(2, mLen);
          e = e + eBias;
        } else {
          m = value * pow(2, eBias - 1) * pow(2, mLen);
          e = 0;
        }
      }
      for (; mLen >= 8; buffer[i++] = m & 255, m /= 256, mLen -= 8);
      e = e << mLen | m;
      eLen += mLen;
      for (; eLen > 0; buffer[i++] = e & 255, e /= 256, eLen -= 8);
      buffer[--i] |= s * 128;
      return buffer;
    };
    var unpackIEEE754 = function (buffer, mLen, nBytes) {
      var eLen = nBytes * 8 - mLen - 1,
        eMax = (1 << eLen) - 1,
        eBias = eMax >> 1,
        nBits = eLen - 7,
        i = nBytes - 1,
        s = buffer[i--],
        e = s & 127,
        m;
      s >>= 7;
      for (; nBits > 0; e = e * 256 + buffer[i], i--, nBits -= 8);
      m = e & (1 << -nBits) - 1;
      e >>= -nBits;
      nBits += mLen;
      for (; nBits > 0; m = m * 256 + buffer[i], i--, nBits -= 8);
      if (e === 0) {
        e = 1 - eBias;
      } else if (e === eMax) {
        return m ? NaN : s ? -Infinity : Infinity;
      } else {
        m = m + pow(2, mLen);
        e = e - eBias;
      }
      return (s ? -1 : 1) * m * pow(2, e - mLen);
    };

    var unpackI32 = function (bytes) {
      return bytes[3] << 24 | bytes[2] << 16 | bytes[1] << 8 | bytes[0];
    };
    var packI8 = function (it) {
      return [it & 0xff];
    };
    var packI16 = function (it) {
      return [it & 0xff, it >> 8 & 0xff];
    };
    var packI32 = function (it) {
      return [it & 0xff, it >> 8 & 0xff, it >> 16 & 0xff, it >> 24 & 0xff];
    };
    var packF64 = function (it) {
      return packIEEE754(it, 52, 8);
    };
    var packF32 = function (it) {
      return packIEEE754(it, 23, 4);
    };

    var addGetter = function (C, key, internal) {
      dP(C[PROTOTYPE], key, {
        get: function () {
          return this[internal];
        }
      });
    };

    var get = function (view, bytes, index, isLittleEndian) {
      var numIndex = +index,
        intIndex = toInteger(numIndex);
      if (numIndex != intIndex || intIndex < 0 || intIndex + bytes > view[$LENGTH]) throw RangeError(WRONG_INDEX);
      var store = view[$BUFFER]._b,
        start = intIndex + view[$OFFSET],
        pack = store.slice(start, start + bytes);
      return isLittleEndian ? pack : pack.reverse();
    };
    var set = function (view, bytes, index, conversion, value, isLittleEndian) {
      var numIndex = +index,
        intIndex = toInteger(numIndex);
      if (numIndex != intIndex || intIndex < 0 || intIndex + bytes > view[$LENGTH]) throw RangeError(WRONG_INDEX);
      var store = view[$BUFFER]._b,
        start = intIndex + view[$OFFSET],
        pack = conversion(+value);
      for (var i = 0; i < bytes; i++) store[start + i] = pack[isLittleEndian ? i : bytes - i - 1];
    };

    var validateArrayBufferArguments = function (that, length) {
      anInstance(that, $ArrayBuffer, ARRAY_BUFFER);
      var numberLength = +length,
        byteLength = toLength(numberLength);
      if (numberLength != byteLength) throw RangeError(WRONG_LENGTH);
      return byteLength;
    };

    if (!$typed.ABV) {
      $ArrayBuffer = function ArrayBuffer(length) {
        var byteLength = validateArrayBufferArguments(this, length);
        this._b = arrayFill.call(Array(byteLength), 0);
        this[$LENGTH] = byteLength;
      };

      $DataView = function DataView(buffer, byteOffset, byteLength) {
        anInstance(this, $DataView, DATA_VIEW);
        anInstance(buffer, $ArrayBuffer, DATA_VIEW);
        var bufferLength = buffer[$LENGTH],
          offset = toInteger(byteOffset);
        if (offset < 0 || offset > bufferLength) throw RangeError('Wrong offset!');
        byteLength = byteLength === undefined ? bufferLength - offset : toLength(byteLength);
        if (offset + byteLength > bufferLength) throw RangeError(WRONG_LENGTH);
        this[$BUFFER] = buffer;
        this[$OFFSET] = offset;
        this[$LENGTH] = byteLength;
      };

      if (DESCRIPTORS) {
        addGetter($ArrayBuffer, BYTE_LENGTH, '_l');
        addGetter($DataView, BUFFER, '_b');
        addGetter($DataView, BYTE_LENGTH, '_l');
        addGetter($DataView, BYTE_OFFSET, '_o');
      }

      redefineAll($DataView[PROTOTYPE], {
        getInt8: function getInt8(byteOffset) {
          return get(this, 1, byteOffset)[0] << 24 >> 24;
        },
        getUint8: function getUint8(byteOffset) {
          return get(this, 1, byteOffset)[0];
        },
        getInt16: function getInt16(byteOffset /*, littleEndian */ ) {
          var bytes = get(this, 2, byteOffset, arguments[1]);
          return (bytes[1] << 8 | bytes[0]) << 16 >> 16;
        },
        getUint16: function getUint16(byteOffset /*, littleEndian */ ) {
          var bytes = get(this, 2, byteOffset, arguments[1]);
          return bytes[1] << 8 | bytes[0];
        },
        getInt32: function getInt32(byteOffset /*, littleEndian */ ) {
          return unpackI32(get(this, 4, byteOffset, arguments[1]));
        },
        getUint32: function getUint32(byteOffset /*, littleEndian */ ) {
          return unpackI32(get(this, 4, byteOffset, arguments[1])) >>> 0;
        },
        getFloat32: function getFloat32(byteOffset /*, littleEndian */ ) {
          return unpackIEEE754(get(this, 4, byteOffset, arguments[1]), 23, 4);
        },
        getFloat64: function getFloat64(byteOffset /*, littleEndian */ ) {
          return unpackIEEE754(get(this, 8, byteOffset, arguments[1]), 52, 8);
        },
        setInt8: function setInt8(byteOffset, value) {
          set(this, 1, byteOffset, packI8, value);
        },
        setUint8: function setUint8(byteOffset, value) {
          set(this, 1, byteOffset, packI8, value);
        },
        setInt16: function setInt16(byteOffset, value /*, littleEndian */ ) {
          set(this, 2, byteOffset, packI16, value, arguments[2]);
        },
        setUint16: function setUint16(byteOffset, value /*, littleEndian */ ) {
          set(this, 2, byteOffset, packI16, value, arguments[2]);
        },
        setInt32: function setInt32(byteOffset, value /*, littleEndian */ ) {
          set(this, 4, byteOffset, packI32, value, arguments[2]);
        },
        setUint32: function setUint32(byteOffset, value /*, littleEndian */ ) {
          set(this, 4, byteOffset, packI32, value, arguments[2]);
        },
        setFloat32: function setFloat32(byteOffset, value /*, littleEndian */ ) {
          set(this, 4, byteOffset, packF32, value, arguments[2]);
        },
        setFloat64: function setFloat64(byteOffset, value /*, littleEndian */ ) {
          set(this, 8, byteOffset, packF64, value, arguments[2]);
        }
      });
    } else {
      if (!fails(function () {
          new $ArrayBuffer; // eslint-disable-line no-new
        }) || !fails(function () {
          new $ArrayBuffer(.5); // eslint-disable-line no-new
        })) {
        $ArrayBuffer = function ArrayBuffer(length) {
          return new BaseBuffer(validateArrayBufferArguments(this, length));
        };
        var ArrayBufferProto = $ArrayBuffer[PROTOTYPE] = BaseBuffer[PROTOTYPE];
        for (var keys = gOPN(BaseBuffer), j = 0, key; keys.length > j;) {
          if (!((key = keys[j++]) in $ArrayBuffer)) hide($ArrayBuffer, key, BaseBuffer[key]);
        };
        if (!LIBRARY) ArrayBufferProto.constructor = $ArrayBuffer;
      }
      // iOS Safari 7.x bug
      var view = new $DataView(new $ArrayBuffer(2)),
        $setInt8 = $DataView[PROTOTYPE].setInt8;
      view.setInt8(0, 2147483648);
      view.setInt8(1, 2147483649);
      if (view.getInt8(0) || !view.getInt8(1)) redefineAll($DataView[PROTOTYPE], {
        setInt8: function setInt8(byteOffset, value) {
          $setInt8.call(this, byteOffset, value << 24 >> 24);
        },
        setUint8: function setUint8(byteOffset, value) {
          $setInt8.call(this, byteOffset, value << 24 >> 24);
        }
      }, true);
    }
    setToStringTag($ArrayBuffer, ARRAY_BUFFER);
    setToStringTag($DataView, DATA_VIEW);
    hide($DataView[PROTOTYPE], $typed.VIEW, true);
    exports[ARRAY_BUFFER] = $ArrayBuffer;
    exports[DATA_VIEW] = $DataView;
  }, {
    "./_an-instance": 31,
    "./_array-fill": 34,
    "./_descriptors": 53,
    "./_fails": 59,
    "./_global": 63,
    "./_hide": 65,
    "./_library": 83,
    "./_object-dp": 92,
    "./_object-gopn": 97,
    "./_redefine-all": 111,
    "./_set-to-string-tag": 117,
    "./_to-integer": 131,
    "./_to-length": 133,
    "./_typed": 138
  }],
  138: [function (require, module, exports) {
    var global = require('./_global'),
      hide = require('./_hide'),
      uid = require('./_uid'),
      TYPED = uid('typed_array'),
      VIEW = uid('view'),
      ABV = !!(global.ArrayBuffer && global.DataView),
      CONSTR = ABV,
      i = 0,
      l = 9,
      Typed;

    var TypedArrayConstructors = (
      'Int8Array,Uint8Array,Uint8ClampedArray,Int16Array,Uint16Array,Int32Array,Uint32Array,Float32Array,Float64Array'
    ).split(',');

    while (i < l) {
      if (Typed = global[TypedArrayConstructors[i++]]) {
        hide(Typed.prototype, TYPED, true);
        hide(Typed.prototype, VIEW, true);
      } else CONSTR = false;
    }

    module.exports = {
      ABV: ABV,
      CONSTR: CONSTR,
      TYPED: TYPED,
      VIEW: VIEW
    };
  }, {
    "./_global": 63,
    "./_hide": 65,
    "./_uid": 139
  }],
  139: [function (require, module, exports) {
    var id = 0,
      px = Math.random();
    module.exports = function (key) {
      return 'Symbol('.concat(key === undefined ? '' : key, ')_', (++id + px).toString(36));
    };
  }, {}],
  140: [function (require, module, exports) {
    var global = require('./_global'),
      core = require('./_core'),
      LIBRARY = require('./_library'),
      wksExt = require('./_wks-ext'),
      defineProperty = require('./_object-dp').f;
    module.exports = function (name) {
      var $Symbol = core.Symbol || (core.Symbol = LIBRARY ? {} : global.Symbol || {});
      if (name.charAt(0) != '_' && !(name in $Symbol)) defineProperty($Symbol, name, {
        value: wksExt.f(name)
      });
    };
  }, {
    "./_core": 48,
    "./_global": 63,
    "./_library": 83,
    "./_object-dp": 92,
    "./_wks-ext": 141
  }],
  141: [function (require, module, exports) {
    exports.f = require('./_wks');
  }, {
    "./_wks": 142
  }],
  142: [function (require, module, exports) {
    var store = require('./_shared')('wks'),
      uid = require('./_uid'),
      Symbol = require('./_global').Symbol,
      USE_SYMBOL = typeof Symbol == 'function';

    var $exports = module.exports = function (name) {
      return store[name] || (store[name] =
        USE_SYMBOL && Symbol[name] || (USE_SYMBOL ? Symbol : uid)('Symbol.' + name));
    };

    $exports.store = store;
  }, {
    "./_global": 63,
    "./_shared": 119,
    "./_uid": 139
  }],
  143: [function (require, module, exports) {
    var classof = require('./_classof'),
      ITERATOR = require('./_wks')('iterator'),
      Iterators = require('./_iterators');
    module.exports = require('./_core').getIteratorMethod = function (it) {
      if (it != undefined) return it[ITERATOR] ||
        it['@@iterator'] ||
        Iterators[classof(it)];
    };
  }, {
    "./_classof": 42,
    "./_core": 48,
    "./_iterators": 81,
    "./_wks": 142
  }],
  144: [function (require, module, exports) {
    // https://github.com/benjamingr/RexExp.escape
    var $export = require('./_export'),
      $re = require('./_replacer')(/[\\^$*+?.()|[\]{}]/g, '\\$&');

    $export($export.S, 'RegExp', {
      escape: function escape(it) {
        return $re(it);
      }
    });

  }, {
    "./_export": 57,
    "./_replacer": 113
  }],
  145: [function (require, module, exports) {
    // 22.1.3.3 Array.prototype.copyWithin(target, start, end = this.length)
    var $export = require('./_export');

    $export($export.P, 'Array', {
      copyWithin: require('./_array-copy-within')
    });

    require('./_add-to-unscopables')('copyWithin');
  }, {
    "./_add-to-unscopables": 30,
    "./_array-copy-within": 33,
    "./_export": 57
  }],
  146: [function (require, module, exports) {
    'use strict';
    var $export = require('./_export'),
      $every = require('./_array-methods')(4);

    $export($export.P + $export.F * !require('./_strict-method')([].every, true), 'Array', {
      // 22.1.3.5 / 15.4.4.16 Array.prototype.every(callbackfn [, thisArg])
      every: function every(callbackfn /* , thisArg */ ) {
        return $every(this, callbackfn, arguments[1]);
      }
    });
  }, {
    "./_array-methods": 37,
    "./_export": 57,
    "./_strict-method": 121
  }],
  147: [function (require, module, exports) {
    // 22.1.3.6 Array.prototype.fill(value, start = 0, end = this.length)
    var $export = require('./_export');

    $export($export.P, 'Array', {
      fill: require('./_array-fill')
    });

    require('./_add-to-unscopables')('fill');
  }, {
    "./_add-to-unscopables": 30,
    "./_array-fill": 34,
    "./_export": 57
  }],
  148: [function (require, module, exports) {
    'use strict';
    var $export = require('./_export'),
      $filter = require('./_array-methods')(2);

    $export($export.P + $export.F * !require('./_strict-method')([].filter, true), 'Array', {
      // 22.1.3.7 / 15.4.4.20 Array.prototype.filter(callbackfn [, thisArg])
      filter: function filter(callbackfn /* , thisArg */ ) {
        return $filter(this, callbackfn, arguments[1]);
      }
    });
  }, {
    "./_array-methods": 37,
    "./_export": 57,
    "./_strict-method": 121
  }],
  149: [function (require, module, exports) {
    'use strict';
    // 22.1.3.9 Array.prototype.findIndex(predicate, thisArg = undefined)
    var $export = require('./_export'),
      $find = require('./_array-methods')(6),
      KEY = 'findIndex',
      forced = true;
    // Shouldn't skip holes
    if (KEY in []) Array(1)[KEY](function () {
      forced = false;
    });
    $export($export.P + $export.F * forced, 'Array', {
      findIndex: function findIndex(callbackfn /*, that = undefined */ ) {
        return $find(this, callbackfn, arguments.length > 1 ? arguments[1] : undefined);
      }
    });
    require('./_add-to-unscopables')(KEY);
  }, {
    "./_add-to-unscopables": 30,
    "./_array-methods": 37,
    "./_export": 57
  }],
  150: [function (require, module, exports) {
    'use strict';
    // 22.1.3.8 Array.prototype.find(predicate, thisArg = undefined)
    var $export = require('./_export'),
      $find = require('./_array-methods')(5),
      KEY = 'find',
      forced = true;
    // Shouldn't skip holes
    if (KEY in []) Array(1)[KEY](function () {
      forced = false;
    });
    $export($export.P + $export.F * forced, 'Array', {
      find: function find(callbackfn /*, that = undefined */ ) {
        return $find(this, callbackfn, arguments.length > 1 ? arguments[1] : undefined);
      }
    });
    require('./_add-to-unscopables')(KEY);
  }, {
    "./_add-to-unscopables": 30,
    "./_array-methods": 37,
    "./_export": 57
  }],
  151: [function (require, module, exports) {
    'use strict';
    var $export = require('./_export'),
      $forEach = require('./_array-methods')(0),
      STRICT = require('./_strict-method')([].forEach, true);

    $export($export.P + $export.F * !STRICT, 'Array', {
      // 22.1.3.10 / 15.4.4.18 Array.prototype.forEach(callbackfn [, thisArg])
      forEach: function forEach(callbackfn /* , thisArg */ ) {
        return $forEach(this, callbackfn, arguments[1]);
      }
    });
  }, {
    "./_array-methods": 37,
    "./_export": 57,
    "./_strict-method": 121
  }],
  152: [function (require, module, exports) {
    'use strict';
    var ctx = require('./_ctx'),
      $export = require('./_export'),
      toObject = require('./_to-object'),
      call = require('./_iter-call'),
      isArrayIter = require('./_is-array-iter'),
      toLength = require('./_to-length'),
      createProperty = require('./_create-property'),
      getIterFn = require('./core.get-iterator-method');

    $export($export.S + $export.F * !require('./_iter-detect')(function (iter) {
      Array.from(iter);
    }), 'Array', {
      // 22.1.2.1 Array.from(arrayLike, mapfn = undefined, thisArg = undefined)
      from: function from(arrayLike /*, mapfn = undefined, thisArg = undefined*/ ) {
        var O = toObject(arrayLike),
          C = typeof this == 'function' ? this : Array,
          aLen = arguments.length,
          mapfn = aLen > 1 ? arguments[1] : undefined,
          mapping = mapfn !== undefined,
          index = 0,
          iterFn = getIterFn(O),
          length, result, step, iterator;
        if (mapping) mapfn = ctx(mapfn, aLen > 2 ? arguments[2] : undefined, 2);
        // if object isn't iterable or it's array with default iterator - use simple case
        if (iterFn != undefined && !(C == Array && isArrayIter(iterFn))) {
          for (iterator = iterFn.call(O), result = new C; !(step = iterator.next()).done; index++) {
            createProperty(result, index, mapping ? call(iterator, mapfn, [step.value, index], true) : step.value);
          }
        } else {
          length = toLength(O.length);
          for (result = new C(length); length > index; index++) {
            createProperty(result, index, mapping ? mapfn(O[index], index) : O[index]);
          }
        }
        result.length = index;
        return result;
      }
    });

  }, {
    "./_create-property": 49,
    "./_ctx": 50,
    "./_export": 57,
    "./_is-array-iter": 71,
    "./_iter-call": 76,
    "./_iter-detect": 79,
    "./_to-length": 133,
    "./_to-object": 134,
    "./core.get-iterator-method": 143
  }],
  153: [function (require, module, exports) {
    'use strict';
    var $export = require('./_export'),
      $indexOf = require('./_array-includes')(false),
      $native = [].indexOf,
      NEGATIVE_ZERO = !!$native && 1 / [1].indexOf(1, -0) < 0;

    $export($export.P + $export.F * (NEGATIVE_ZERO || !require('./_strict-method')($native)), 'Array', {
      // 22.1.3.11 / 15.4.4.14 Array.prototype.indexOf(searchElement [, fromIndex])
      indexOf: function indexOf(searchElement /*, fromIndex = 0 */ ) {
        return NEGATIVE_ZERO
          // convert -0 to +0
          ?
          $native.apply(this, arguments) || 0 :
          $indexOf(this, searchElement, arguments[1]);
      }
    });
  }, {
    "./_array-includes": 36,
    "./_export": 57,
    "./_strict-method": 121
  }],
  154: [function (require, module, exports) {
    // 22.1.2.2 / 15.4.3.2 Array.isArray(arg)
    var $export = require('./_export');

    $export($export.S, 'Array', {
      isArray: require('./_is-array')
    });
  }, {
    "./_export": 57,
    "./_is-array": 72
  }],
  155: [function (require, module, exports) {
    'use strict';
    var addToUnscopables = require('./_add-to-unscopables'),
      step = require('./_iter-step'),
      Iterators = require('./_iterators'),
      toIObject = require('./_to-iobject');

    // 22.1.3.4 Array.prototype.entries()
    // 22.1.3.13 Array.prototype.keys()
    // 22.1.3.29 Array.prototype.values()
    // 22.1.3.30 Array.prototype[@@iterator]()
    module.exports = require('./_iter-define')(Array, 'Array', function (iterated, kind) {
      this._t = toIObject(iterated); // target
      this._i = 0; // next index
      this._k = kind; // kind
      // 22.1.5.2.1 %ArrayIteratorPrototype%.next()
    }, function () {
      var O = this._t,
        kind = this._k,
        index = this._i++;
      if (!O || index >= O.length) {
        this._t = undefined;
        return step(1);
      }
      if (kind == 'keys') return step(0, index);
      if (kind == 'values') return step(0, O[index]);
      return step(0, [index, O[index]]);
    }, 'values');

    // argumentsList[@@iterator] is %ArrayProto_values% (9.4.4.6, 9.4.4.7)
    Iterators.Arguments = Iterators.Array;

    addToUnscopables('keys');
    addToUnscopables('values');
    addToUnscopables('entries');
  }, {
    "./_add-to-unscopables": 30,
    "./_iter-define": 78,
    "./_iter-step": 80,
    "./_iterators": 81,
    "./_to-iobject": 132
  }],
  156: [function (require, module, exports) {
    'use strict';
    // 22.1.3.13 Array.prototype.join(separator)
    var $export = require('./_export'),
      toIObject = require('./_to-iobject'),
      arrayJoin = [].join;

    // fallback for not array-like strings
    $export($export.P + $export.F * (require('./_iobject') != Object || !require('./_strict-method')(arrayJoin)), 'Array', {
      join: function join(separator) {
        return arrayJoin.call(toIObject(this), separator === undefined ? ',' : separator);
      }
    });
  }, {
    "./_export": 57,
    "./_iobject": 70,
    "./_strict-method": 121,
    "./_to-iobject": 132
  }],
  157: [function (require, module, exports) {
    'use strict';
    var $export = require('./_export'),
      toIObject = require('./_to-iobject'),
      toInteger = require('./_to-integer'),
      toLength = require('./_to-length'),
      $native = [].lastIndexOf,
      NEGATIVE_ZERO = !!$native && 1 / [1].lastIndexOf(1, -0) < 0;

    $export($export.P + $export.F * (NEGATIVE_ZERO || !require('./_strict-method')($native)), 'Array', {
      // 22.1.3.14 / 15.4.4.15 Array.prototype.lastIndexOf(searchElement [, fromIndex])
      lastIndexOf: function lastIndexOf(searchElement /*, fromIndex = @[*-1] */ ) {
        // convert -0 to +0
        if (NEGATIVE_ZERO) return $native.apply(this, arguments) || 0;
        var O = toIObject(this),
          length = toLength(O.length),
          index = length - 1;
        if (arguments.length > 1) index = Math.min(index, toInteger(arguments[1]));
        if (index < 0) index = length + index;
        for (; index >= 0; index--)
          if (index in O)
            if (O[index] === searchElement) return index || 0;
        return -1;
      }
    });
  }, {
    "./_export": 57,
    "./_strict-method": 121,
    "./_to-integer": 131,
    "./_to-iobject": 132,
    "./_to-length": 133
  }],
  158: [function (require, module, exports) {
    'use strict';
    var $export = require('./_export'),
      $map = require('./_array-methods')(1);

    $export($export.P + $export.F * !require('./_strict-method')([].map, true), 'Array', {
      // 22.1.3.15 / 15.4.4.19 Array.prototype.map(callbackfn [, thisArg])
      map: function map(callbackfn /* , thisArg */ ) {
        return $map(this, callbackfn, arguments[1]);
      }
    });
  }, {
    "./_array-methods": 37,
    "./_export": 57,
    "./_strict-method": 121
  }],
  159: [function (require, module, exports) {
    'use strict';
    var $export = require('./_export'),
      createProperty = require('./_create-property');

    // WebKit Array.of isn't generic
    $export($export.S + $export.F * require('./_fails')(function () {
      function F() {}
      return !(Array.of.call(F) instanceof F);
    }), 'Array', {
      // 22.1.2.3 Array.of( ...items)
      of: function of ( /* ...args */ ) {
        var index = 0,
          aLen = arguments.length,
          result = new(typeof this == 'function' ? this : Array)(aLen);
        while (aLen > index) createProperty(result, index, arguments[index++]);
        result.length = aLen;
        return result;
      }
    });
  }, {
    "./_create-property": 49,
    "./_export": 57,
    "./_fails": 59
  }],
  160: [function (require, module, exports) {
    'use strict';
    var $export = require('./_export'),
      $reduce = require('./_array-reduce');

    $export($export.P + $export.F * !require('./_strict-method')([].reduceRight, true), 'Array', {
      // 22.1.3.19 / 15.4.4.22 Array.prototype.reduceRight(callbackfn [, initialValue])
      reduceRight: function reduceRight(callbackfn /* , initialValue */ ) {
        return $reduce(this, callbackfn, arguments.length, arguments[1], true);
      }
    });
  }, {
    "./_array-reduce": 38,
    "./_export": 57,
    "./_strict-method": 121
  }],
  161: [function (require, module, exports) {
    'use strict';
    var $export = require('./_export'),
      $reduce = require('./_array-reduce');

    $export($export.P + $export.F * !require('./_strict-method')([].reduce, true), 'Array', {
      // 22.1.3.18 / 15.4.4.21 Array.prototype.reduce(callbackfn [, initialValue])
      reduce: function reduce(callbackfn /* , initialValue */ ) {
        return $reduce(this, callbackfn, arguments.length, arguments[1], false);
      }
    });
  }, {
    "./_array-reduce": 38,
    "./_export": 57,
    "./_strict-method": 121
  }],
  162: [function (require, module, exports) {
    'use strict';
    var $export = require('./_export'),
      html = require('./_html'),
      cof = require('./_cof'),
      toIndex = require('./_to-index'),
      toLength = require('./_to-length'),
      arraySlice = [].slice;

    // fallback for not array-like ES3 strings and DOM objects
    $export($export.P + $export.F * require('./_fails')(function () {
      if (html) arraySlice.call(html);
    }), 'Array', {
      slice: function slice(begin, end) {
        var len = toLength(this.length),
          klass = cof(this);
        end = end === undefined ? len : end;
        if (klass == 'Array') return arraySlice.call(this, begin, end);
        var start = toIndex(begin, len),
          upTo = toIndex(end, len),
          size = toLength(upTo - start),
          cloned = Array(size),
          i = 0;
        for (; i < size; i++) cloned[i] = klass == 'String' ?
          this.charAt(start + i) :
          this[start + i];
        return cloned;
      }
    });
  }, {
    "./_cof": 43,
    "./_export": 57,
    "./_fails": 59,
    "./_html": 66,
    "./_to-index": 130,
    "./_to-length": 133
  }],
  163: [function (require, module, exports) {
    'use strict';
    var $export = require('./_export'),
      $some = require('./_array-methods')(3);

    $export($export.P + $export.F * !require('./_strict-method')([].some, true), 'Array', {
      // 22.1.3.23 / 15.4.4.17 Array.prototype.some(callbackfn [, thisArg])
      some: function some(callbackfn /* , thisArg */ ) {
        return $some(this, callbackfn, arguments[1]);
      }
    });
  }, {
    "./_array-methods": 37,
    "./_export": 57,
    "./_strict-method": 121
  }],
  164: [function (require, module, exports) {
    'use strict';
    var $export = require('./_export'),
      aFunction = require('./_a-function'),
      toObject = require('./_to-object'),
      fails = require('./_fails'),
      $sort = [].sort,
      test = [1, 2, 3];

    $export($export.P + $export.F * (fails(function () {
      // IE8-
      test.sort(undefined);
    }) || !fails(function () {
      // V8 bug
      test.sort(null);
      // Old WebKit
    }) || !require('./_strict-method')($sort)), 'Array', {
      // 22.1.3.25 Array.prototype.sort(comparefn)
      sort: function sort(comparefn) {
        return comparefn === undefined ?
          $sort.call(toObject(this)) :
          $sort.call(toObject(this), aFunction(comparefn));
      }
    });
  }, {
    "./_a-function": 28,
    "./_export": 57,
    "./_fails": 59,
    "./_strict-method": 121,
    "./_to-object": 134
  }],
  165: [function (require, module, exports) {
    require('./_set-species')('Array');
  }, {
    "./_set-species": 116
  }],
  166: [function (require, module, exports) {
    // 20.3.3.1 / 15.9.4.4 Date.now()
    var $export = require('./_export');

    $export($export.S, 'Date', {
      now: function () {
        return new Date().getTime();
      }
    });
  }, {
    "./_export": 57
  }],
  167: [function (require, module, exports) {
    'use strict';
    // 20.3.4.36 / 15.9.5.43 Date.prototype.toISOString()
    var $export = require('./_export'),
      fails = require('./_fails'),
      getTime = Date.prototype.getTime;

    var lz = function (num) {
      return num > 9 ? num : '0' + num;
    };

    // PhantomJS / old WebKit has a broken implementations
    $export($export.P + $export.F * (fails(function () {
      return new Date(-5e13 - 1).toISOString() != '0385-07-25T07:06:39.999Z';
    }) || !fails(function () {
      new Date(NaN).toISOString();
    })), 'Date', {
      toISOString: function toISOString() {
        if (!isFinite(getTime.call(this))) throw RangeError('Invalid time value');
        var d = this,
          y = d.getUTCFullYear(),
          m = d.getUTCMilliseconds(),
          s = y < 0 ? '-' : y > 9999 ? '+' : '';
        return s + ('00000' + Math.abs(y)).slice(s ? -6 : -4) +
          '-' + lz(d.getUTCMonth() + 1) + '-' + lz(d.getUTCDate()) +
          'T' + lz(d.getUTCHours()) + ':' + lz(d.getUTCMinutes()) +
          ':' + lz(d.getUTCSeconds()) + '.' + (m > 99 ? m : '0' + lz(m)) + 'Z';
      }
    });
  }, {
    "./_export": 57,
    "./_fails": 59
  }],
  168: [function (require, module, exports) {
    'use strict';
    var $export = require('./_export'),
      toObject = require('./_to-object'),
      toPrimitive = require('./_to-primitive');

    $export($export.P + $export.F * require('./_fails')(function () {
      return new Date(NaN).toJSON() !== null || Date.prototype.toJSON.call({
        toISOString: function () {
          return 1;
        }
      }) !== 1;
    }), 'Date', {
      toJSON: function toJSON(key) {
        var O = toObject(this),
          pv = toPrimitive(O);
        return typeof pv == 'number' && !isFinite(pv) ? null : O.toISOString();
      }
    });
  }, {
    "./_export": 57,
    "./_fails": 59,
    "./_to-object": 134,
    "./_to-primitive": 135
  }],
  169: [function (require, module, exports) {
    var TO_PRIMITIVE = require('./_wks')('toPrimitive'),
      proto = Date.prototype;

    if (!(TO_PRIMITIVE in proto)) require('./_hide')(proto, TO_PRIMITIVE, require('./_date-to-primitive'));
  }, {
    "./_date-to-primitive": 51,
    "./_hide": 65,
    "./_wks": 142
  }],
  170: [function (require, module, exports) {
    var DateProto = Date.prototype,
      INVALID_DATE = 'Invalid Date',
      TO_STRING = 'toString',
      $toString = DateProto[TO_STRING],
      getTime = DateProto.getTime;
    if (new Date(NaN) + '' != INVALID_DATE) {
      require('./_redefine')(DateProto, TO_STRING, function toString() {
        var value = getTime.call(this);
        return value === value ? $toString.call(this) : INVALID_DATE;
      });
    }
  }, {
    "./_redefine": 112
  }],
  171: [function (require, module, exports) {
    // 19.2.3.2 / 15.3.4.5 Function.prototype.bind(thisArg, args...)
    var $export = require('./_export');

    $export($export.P, 'Function', {
      bind: require('./_bind')
    });
  }, {
    "./_bind": 41,
    "./_export": 57
  }],
  172: [function (require, module, exports) {
    'use strict';
    var isObject = require('./_is-object'),
      getPrototypeOf = require('./_object-gpo'),
      HAS_INSTANCE = require('./_wks')('hasInstance'),
      FunctionProto = Function.prototype;
    // 19.2.3.6 Function.prototype[@@hasInstance](V)
    if (!(HAS_INSTANCE in FunctionProto)) require('./_object-dp').f(FunctionProto, HAS_INSTANCE, {
      value: function (O) {
        if (typeof this != 'function' || !isObject(O)) return false;
        if (!isObject(this.prototype)) return O instanceof this;
        // for environment w/o native `@@hasInstance` logic enough `instanceof`, but add this:
        while (O = getPrototypeOf(O))
          if (this.prototype === O) return true;
        return false;
      }
    });
  }, {
    "./_is-object": 74,
    "./_object-dp": 92,
    "./_object-gpo": 99,
    "./_wks": 142
  }],
  173: [function (require, module, exports) {
    var dP = require('./_object-dp').f,
      createDesc = require('./_property-desc'),
      has = require('./_has'),
      FProto = Function.prototype,
      nameRE = /^\s*function ([^ (]*)/,
      NAME = 'name';

    var isExtensible = Object.isExtensible || function () {
      return true;
    };

    // 19.2.4.2 name
    NAME in FProto || require('./_descriptors') && dP(FProto, NAME, {
      configurable: true,
      get: function () {
        try {
          var that = this,
            name = ('' + that).match(nameRE)[1];
          has(that, NAME) || !isExtensible(that) || dP(that, NAME, createDesc(5, name));
          return name;
        } catch (e) {
          return '';
        }
      }
    });
  }, {
    "./_descriptors": 53,
    "./_has": 64,
    "./_object-dp": 92,
    "./_property-desc": 110
  }],
  174: [function (require, module, exports) {
    'use strict';
    var strong = require('./_collection-strong');

    // 23.1 Map Objects
    module.exports = require('./_collection')('Map', function (get) {
      return function Map() {
        return get(this, arguments.length > 0 ? arguments[0] : undefined);
      };
    }, {
      // 23.1.3.6 Map.prototype.get(key)
      get: function get(key) {
        var entry = strong.getEntry(this, key);
        return entry && entry.v;
      },
      // 23.1.3.9 Map.prototype.set(key, value)
      set: function set(key, value) {
        return strong.def(this, key === 0 ? 0 : key, value);
      }
    }, strong, true);
  }, {
    "./_collection": 47,
    "./_collection-strong": 44
  }],
  175: [function (require, module, exports) {
    // 20.2.2.3 Math.acosh(x)
    var $export = require('./_export'),
      log1p = require('./_math-log1p'),
      sqrt = Math.sqrt,
      $acosh = Math.acosh;

    $export($export.S + $export.F * !($acosh
      // V8 bug: https://code.google.com/p/v8/issues/detail?id=3509
      &&
      Math.floor($acosh(Number.MAX_VALUE)) == 710
      // Tor Browser bug: Math.acosh(Infinity) -> NaN 
      &&
      $acosh(Infinity) == Infinity
    ), 'Math', {
      acosh: function acosh(x) {
        return (x = +x) < 1 ? NaN : x > 94906265.62425156 ?
          Math.log(x) + Math.LN2 :
          log1p(x - 1 + sqrt(x - 1) * sqrt(x + 1));
      }
    });
  }, {
    "./_export": 57,
    "./_math-log1p": 85
  }],
  176: [function (require, module, exports) {
    // 20.2.2.5 Math.asinh(x)
    var $export = require('./_export'),
      $asinh = Math.asinh;

    function asinh(x) {
      return !isFinite(x = +x) || x == 0 ? x : x < 0 ? -asinh(-x) : Math.log(x + Math.sqrt(x * x + 1));
    }

    // Tor Browser bug: Math.asinh(0) -> -0 
    $export($export.S + $export.F * !($asinh && 1 / $asinh(0) > 0), 'Math', {
      asinh: asinh
    });
  }, {
    "./_export": 57
  }],
  177: [function (require, module, exports) {
    // 20.2.2.7 Math.atanh(x)
    var $export = require('./_export'),
      $atanh = Math.atanh;

    // Tor Browser bug: Math.atanh(-0) -> 0 
    $export($export.S + $export.F * !($atanh && 1 / $atanh(-0) < 0), 'Math', {
      atanh: function atanh(x) {
        return (x = +x) == 0 ? x : Math.log((1 + x) / (1 - x)) / 2;
      }
    });
  }, {
    "./_export": 57
  }],
  178: [function (require, module, exports) {
    // 20.2.2.9 Math.cbrt(x)
    var $export = require('./_export'),
      sign = require('./_math-sign');

    $export($export.S, 'Math', {
      cbrt: function cbrt(x) {
        return sign(x = +x) * Math.pow(Math.abs(x), 1 / 3);
      }
    });
  }, {
    "./_export": 57,
    "./_math-sign": 86
  }],
  179: [function (require, module, exports) {
    // 20.2.2.11 Math.clz32(x)
    var $export = require('./_export');

    $export($export.S, 'Math', {
      clz32: function clz32(x) {
        return (x >>>= 0) ? 31 - Math.floor(Math.log(x + 0.5) * Math.LOG2E) : 32;
      }
    });
  }, {
    "./_export": 57
  }],
  180: [function (require, module, exports) {
    // 20.2.2.12 Math.cosh(x)
    var $export = require('./_export'),
      exp = Math.exp;

    $export($export.S, 'Math', {
      cosh: function cosh(x) {
        return (exp(x = +x) + exp(-x)) / 2;
      }
    });
  }, {
    "./_export": 57
  }],
  181: [function (require, module, exports) {
    // 20.2.2.14 Math.expm1(x)
    var $export = require('./_export'),
      $expm1 = require('./_math-expm1');

    $export($export.S + $export.F * ($expm1 != Math.expm1), 'Math', {
      expm1: $expm1
    });
  }, {
    "./_export": 57,
    "./_math-expm1": 84
  }],
  182: [function (require, module, exports) {
    // 20.2.2.16 Math.fround(x)
    var $export = require('./_export'),
      sign = require('./_math-sign'),
      pow = Math.pow,
      EPSILON = pow(2, -52),
      EPSILON32 = pow(2, -23),
      MAX32 = pow(2, 127) * (2 - EPSILON32),
      MIN32 = pow(2, -126);

    var roundTiesToEven = function (n) {
      return n + 1 / EPSILON - 1 / EPSILON;
    };


    $export($export.S, 'Math', {
      fround: function fround(x) {
        var $abs = Math.abs(x),
          $sign = sign(x),
          a, result;
        if ($abs < MIN32) return $sign * roundTiesToEven($abs / MIN32 / EPSILON32) * MIN32 * EPSILON32;
        a = (1 + EPSILON32 / EPSILON) * $abs;
        result = a - (a - $abs);
        if (result > MAX32 || result != result) return $sign * Infinity;
        return $sign * result;
      }
    });
  }, {
    "./_export": 57,
    "./_math-sign": 86
  }],
  183: [function (require, module, exports) {
    // 20.2.2.17 Math.hypot([value1[, value2[, … ]]])
    var $export = require('./_export'),
      abs = Math.abs;

    $export($export.S, 'Math', {
      hypot: function hypot(value1, value2) { // eslint-disable-line no-unused-vars
        var sum = 0,
          i = 0,
          aLen = arguments.length,
          larg = 0,
          arg, div;
        while (i < aLen) {
          arg = abs(arguments[i++]);
          if (larg < arg) {
            div = larg / arg;
            sum = sum * div * div + 1;
            larg = arg;
          } else if (arg > 0) {
            div = arg / larg;
            sum += div * div;
          } else sum += arg;
        }
        return larg === Infinity ? Infinity : larg * Math.sqrt(sum);
      }
    });
  }, {
    "./_export": 57
  }],
  184: [function (require, module, exports) {
    // 20.2.2.18 Math.imul(x, y)
    var $export = require('./_export'),
      $imul = Math.imul;

    // some WebKit versions fails with big numbers, some has wrong arity
    $export($export.S + $export.F * require('./_fails')(function () {
      return $imul(0xffffffff, 5) != -5 || $imul.length != 2;
    }), 'Math', {
      imul: function imul(x, y) {
        var UINT16 = 0xffff,
          xn = +x,
          yn = +y,
          xl = UINT16 & xn,
          yl = UINT16 & yn;
        return 0 | xl * yl + ((UINT16 & xn >>> 16) * yl + xl * (UINT16 & yn >>> 16) << 16 >>> 0);
      }
    });
  }, {
    "./_export": 57,
    "./_fails": 59
  }],
  185: [function (require, module, exports) {
    // 20.2.2.21 Math.log10(x)
    var $export = require('./_export');

    $export($export.S, 'Math', {
      log10: function log10(x) {
        return Math.log(x) / Math.LN10;
      }
    });
  }, {
    "./_export": 57
  }],
  186: [function (require, module, exports) {
    // 20.2.2.20 Math.log1p(x)
    var $export = require('./_export');

    $export($export.S, 'Math', {
      log1p: require('./_math-log1p')
    });
  }, {
    "./_export": 57,
    "./_math-log1p": 85
  }],
  187: [function (require, module, exports) {
    // 20.2.2.22 Math.log2(x)
    var $export = require('./_export');

    $export($export.S, 'Math', {
      log2: function log2(x) {
        return Math.log(x) / Math.LN2;
      }
    });
  }, {
    "./_export": 57
  }],
  188: [function (require, module, exports) {
    // 20.2.2.28 Math.sign(x)
    var $export = require('./_export');

    $export($export.S, 'Math', {
      sign: require('./_math-sign')
    });
  }, {
    "./_export": 57,
    "./_math-sign": 86
  }],
  189: [function (require, module, exports) {
    // 20.2.2.30 Math.sinh(x)
    var $export = require('./_export'),
      expm1 = require('./_math-expm1'),
      exp = Math.exp;

    // V8 near Chromium 38 has a problem with very small numbers
    $export($export.S + $export.F * require('./_fails')(function () {
      return !Math.sinh(-2e-17) != -2e-17;
    }), 'Math', {
      sinh: function sinh(x) {
        return Math.abs(x = +x) < 1 ?
          (expm1(x) - expm1(-x)) / 2 :
          (exp(x - 1) - exp(-x - 1)) * (Math.E / 2);
      }
    });
  }, {
    "./_export": 57,
    "./_fails": 59,
    "./_math-expm1": 84
  }],
  190: [function (require, module, exports) {
    // 20.2.2.33 Math.tanh(x)
    var $export = require('./_export'),
      expm1 = require('./_math-expm1'),
      exp = Math.exp;

    $export($export.S, 'Math', {
      tanh: function tanh(x) {
        var a = expm1(x = +x),
          b = expm1(-x);
        return a == Infinity ? 1 : b == Infinity ? -1 : (a - b) / (exp(x) + exp(-x));
      }
    });
  }, {
    "./_export": 57,
    "./_math-expm1": 84
  }],
  191: [function (require, module, exports) {
    // 20.2.2.34 Math.trunc(x)
    var $export = require('./_export');

    $export($export.S, 'Math', {
      trunc: function trunc(it) {
        return (it > 0 ? Math.floor : Math.ceil)(it);
      }
    });
  }, {
    "./_export": 57
  }],
  192: [function (require, module, exports) {
    'use strict';
    var global = require('./_global'),
      has = require('./_has'),
      cof = require('./_cof'),
      inheritIfRequired = require('./_inherit-if-required'),
      toPrimitive = require('./_to-primitive'),
      fails = require('./_fails'),
      gOPN = require('./_object-gopn').f,
      gOPD = require('./_object-gopd').f,
      dP = require('./_object-dp').f,
      $trim = require('./_string-trim').trim,
      NUMBER = 'Number',
      $Number = global[NUMBER],
      Base = $Number,
      proto = $Number.prototype
      // Opera ~12 has broken Object#toString
      ,
      BROKEN_COF = cof(require('./_object-create')(proto)) == NUMBER,
      TRIM = 'trim' in String.prototype;

    // 7.1.3 ToNumber(argument)
    var toNumber = function (argument) {
      var it = toPrimitive(argument, false);
      if (typeof it == 'string' && it.length > 2) {
        it = TRIM ? it.trim() : $trim(it, 3);
        var first = it.charCodeAt(0),
          third, radix, maxCode;
        if (first === 43 || first === 45) {
          third = it.charCodeAt(2);
          if (third === 88 || third === 120) return NaN; // Number('+0x1') should be NaN, old V8 fix
        } else if (first === 48) {
          switch (it.charCodeAt(1)) {
            case 66:
            case 98:
              radix = 2;
              maxCode = 49;
              break; // fast equal /^0b[01]+$/i
            case 79:
            case 111:
              radix = 8;
              maxCode = 55;
              break; // fast equal /^0o[0-7]+$/i
            default:
              return +it;
          }
          for (var digits = it.slice(2), i = 0, l = digits.length, code; i < l; i++) {
            code = digits.charCodeAt(i);
            // parseInt parses a string to a first unavailable symbol
            // but ToNumber should return NaN if a string contains unavailable symbols
            if (code < 48 || code > maxCode) return NaN;
          }
          return parseInt(digits, radix);
        }
      }
      return +it;
    };

    if (!$Number(' 0o1') || !$Number('0b1') || $Number('+0x1')) {
      $Number = function Number(value) {
        var it = arguments.length < 1 ? 0 : value,
          that = this;
        return that instanceof $Number
          // check on 1..constructor(foo) case
          &&
          (BROKEN_COF ? fails(function () {
            proto.valueOf.call(that);
          }) : cof(that) != NUMBER) ?
          inheritIfRequired(new Base(toNumber(it)), that, $Number) : toNumber(it);
      };
      for (var keys = require('./_descriptors') ? gOPN(Base) : (
          // ES3:
          'MAX_VALUE,MIN_VALUE,NaN,NEGATIVE_INFINITY,POSITIVE_INFINITY,' +
          // ES6 (in case, if modules with ES6 Number statics required before):
          'EPSILON,isFinite,isInteger,isNaN,isSafeInteger,MAX_SAFE_INTEGER,' +
          'MIN_SAFE_INTEGER,parseFloat,parseInt,isInteger'
        ).split(','), j = 0, key; keys.length > j; j++) {
        if (has(Base, key = keys[j]) && !has($Number, key)) {
          dP($Number, key, gOPD(Base, key));
        }
      }
      $Number.prototype = proto;
      proto.constructor = $Number;
      require('./_redefine')(global, NUMBER, $Number);
    }
  }, {
    "./_cof": 43,
    "./_descriptors": 53,
    "./_fails": 59,
    "./_global": 63,
    "./_has": 64,
    "./_inherit-if-required": 68,
    "./_object-create": 91,
    "./_object-dp": 92,
    "./_object-gopd": 95,
    "./_object-gopn": 97,
    "./_redefine": 112,
    "./_string-trim": 127,
    "./_to-primitive": 135
  }],
  193: [function (require, module, exports) {
    // 20.1.2.1 Number.EPSILON
    var $export = require('./_export');

    $export($export.S, 'Number', {
      EPSILON: Math.pow(2, -52)
    });
  }, {
    "./_export": 57
  }],
  194: [function (require, module, exports) {
    // 20.1.2.2 Number.isFinite(number)
    var $export = require('./_export'),
      _isFinite = require('./_global').isFinite;

    $export($export.S, 'Number', {
      isFinite: function isFinite(it) {
        return typeof it == 'number' && _isFinite(it);
      }
    });
  }, {
    "./_export": 57,
    "./_global": 63
  }],
  195: [function (require, module, exports) {
    // 20.1.2.3 Number.isInteger(number)
    var $export = require('./_export');

    $export($export.S, 'Number', {
      isInteger: require('./_is-integer')
    });
  }, {
    "./_export": 57,
    "./_is-integer": 73
  }],
  196: [function (require, module, exports) {
    // 20.1.2.4 Number.isNaN(number)
    var $export = require('./_export');

    $export($export.S, 'Number', {
      isNaN: function isNaN(number) {
        return number != number;
      }
    });
  }, {
    "./_export": 57
  }],
  197: [function (require, module, exports) {
    // 20.1.2.5 Number.isSafeInteger(number)
    var $export = require('./_export'),
      isInteger = require('./_is-integer'),
      abs = Math.abs;

    $export($export.S, 'Number', {
      isSafeInteger: function isSafeInteger(number) {
        return isInteger(number) && abs(number) <= 0x1fffffffffffff;
      }
    });
  }, {
    "./_export": 57,
    "./_is-integer": 73
  }],
  198: [function (require, module, exports) {
    // 20.1.2.6 Number.MAX_SAFE_INTEGER
    var $export = require('./_export');

    $export($export.S, 'Number', {
      MAX_SAFE_INTEGER: 0x1fffffffffffff
    });
  }, {
    "./_export": 57
  }],
  199: [function (require, module, exports) {
    // 20.1.2.10 Number.MIN_SAFE_INTEGER
    var $export = require('./_export');

    $export($export.S, 'Number', {
      MIN_SAFE_INTEGER: -0x1fffffffffffff
    });
  }, {
    "./_export": 57
  }],
  200: [function (require, module, exports) {
    var $export = require('./_export'),
      $parseFloat = require('./_parse-float');
    // 20.1.2.12 Number.parseFloat(string)
    $export($export.S + $export.F * (Number.parseFloat != $parseFloat), 'Number', {
      parseFloat: $parseFloat
    });
  }, {
    "./_export": 57,
    "./_parse-float": 106
  }],
  201: [function (require, module, exports) {
    var $export = require('./_export'),
      $parseInt = require('./_parse-int');
    // 20.1.2.13 Number.parseInt(string, radix)
    $export($export.S + $export.F * (Number.parseInt != $parseInt), 'Number', {
      parseInt: $parseInt
    });
  }, {
    "./_export": 57,
    "./_parse-int": 107
  }],
  202: [function (require, module, exports) {
    'use strict';
    var $export = require('./_export'),
      toInteger = require('./_to-integer'),
      aNumberValue = require('./_a-number-value'),
      repeat = require('./_string-repeat'),
      $toFixed = 1..toFixed,
      floor = Math.floor,
      data = [0, 0, 0, 0, 0, 0],
      ERROR = 'Number.toFixed: incorrect invocation!',
      ZERO = '0';

    var multiply = function (n, c) {
      var i = -1,
        c2 = c;
      while (++i < 6) {
        c2 += n * data[i];
        data[i] = c2 % 1e7;
        c2 = floor(c2 / 1e7);
      }
    };
    var divide = function (n) {
      var i = 6,
        c = 0;
      while (--i >= 0) {
        c += data[i];
        data[i] = floor(c / n);
        c = (c % n) * 1e7;
      }
    };
    var numToString = function () {
      var i = 6,
        s = '';
      while (--i >= 0) {
        if (s !== '' || i === 0 || data[i] !== 0) {
          var t = String(data[i]);
          s = s === '' ? t : s + repeat.call(ZERO, 7 - t.length) + t;
        }
      }
      return s;
    };
    var pow = function (x, n, acc) {
      return n === 0 ? acc : n % 2 === 1 ? pow(x, n - 1, acc * x) : pow(x * x, n / 2, acc);
    };
    var log = function (x) {
      var n = 0,
        x2 = x;
      while (x2 >= 4096) {
        n += 12;
        x2 /= 4096;
      }
      while (x2 >= 2) {
        n += 1;
        x2 /= 2;
      }
      return n;
    };

    $export($export.P + $export.F * (!!$toFixed && (
      0.00008.toFixed(3) !== '0.000' ||
      0.9.toFixed(0) !== '1' ||
      1.255.toFixed(2) !== '1.25' ||
      1000000000000000128..toFixed(0) !== '1000000000000000128'
    ) || !require('./_fails')(function () {
      // V8 ~ Android 4.3-
      $toFixed.call({});
    })), 'Number', {
      toFixed: function toFixed(fractionDigits) {
        var x = aNumberValue(this, ERROR),
          f = toInteger(fractionDigits),
          s = '',
          m = ZERO,
          e, z, j, k;
        if (f < 0 || f > 20) throw RangeError(ERROR);
        if (x != x) return 'NaN';
        if (x <= -1e21 || x >= 1e21) return String(x);
        if (x < 0) {
          s = '-';
          x = -x;
        }
        if (x > 1e-21) {
          e = log(x * pow(2, 69, 1)) - 69;
          z = e < 0 ? x * pow(2, -e, 1) : x / pow(2, e, 1);
          z *= 0x10000000000000;
          e = 52 - e;
          if (e > 0) {
            multiply(0, z);
            j = f;
            while (j >= 7) {
              multiply(1e7, 0);
              j -= 7;
            }
            multiply(pow(10, j, 1), 0);
            j = e - 1;
            while (j >= 23) {
              divide(1 << 23);
              j -= 23;
            }
            divide(1 << j);
            multiply(1, 1);
            divide(2);
            m = numToString();
          } else {
            multiply(0, z);
            multiply(1 << -e, 0);
            m = numToString() + repeat.call(ZERO, f);
          }
        }
        if (f > 0) {
          k = m.length;
          m = s + (k <= f ? '0.' + repeat.call(ZERO, f - k) + m : m.slice(0, k - f) + '.' + m.slice(k - f));
        } else {
          m = s + m;
        }
        return m;
      }
    });
  }, {
    "./_a-number-value": 29,
    "./_export": 57,
    "./_fails": 59,
    "./_string-repeat": 126,
    "./_to-integer": 131
  }],
  203: [function (require, module, exports) {
    'use strict';
    var $export = require('./_export'),
      $fails = require('./_fails'),
      aNumberValue = require('./_a-number-value'),
      $toPrecision = 1..toPrecision;

    $export($export.P + $export.F * ($fails(function () {
      // IE7-
      return $toPrecision.call(1, undefined) !== '1';
    }) || !$fails(function () {
      // V8 ~ Android 4.3-
      $toPrecision.call({});
    })), 'Number', {
      toPrecision: function toPrecision(precision) {
        var that = aNumberValue(this, 'Number#toPrecision: incorrect invocation!');
        return precision === undefined ? $toPrecision.call(that) : $toPrecision.call(that, precision);
      }
    });
  }, {
    "./_a-number-value": 29,
    "./_export": 57,
    "./_fails": 59
  }],
  204: [function (require, module, exports) {
    // 19.1.3.1 Object.assign(target, source)
    var $export = require('./_export');

    $export($export.S + $export.F, 'Object', {
      assign: require('./_object-assign')
    });
  }, {
    "./_export": 57,
    "./_object-assign": 90
  }],
  205: [function (require, module, exports) {
    var $export = require('./_export')
    // 19.1.2.2 / 15.2.3.5 Object.create(O [, Properties])
    $export($export.S, 'Object', {
      create: require('./_object-create')
    });
  }, {
    "./_export": 57,
    "./_object-create": 91
  }],
  206: [function (require, module, exports) {
    var $export = require('./_export');
    // 19.1.2.3 / 15.2.3.7 Object.defineProperties(O, Properties)
    $export($export.S + $export.F * !require('./_descriptors'), 'Object', {
      defineProperties: require('./_object-dps')
    });
  }, {
    "./_descriptors": 53,
    "./_export": 57,
    "./_object-dps": 93
  }],
  207: [function (require, module, exports) {
    var $export = require('./_export');
    // 19.1.2.4 / 15.2.3.6 Object.defineProperty(O, P, Attributes)
    $export($export.S + $export.F * !require('./_descriptors'), 'Object', {
      defineProperty: require('./_object-dp').f
    });
  }, {
    "./_descriptors": 53,
    "./_export": 57,
    "./_object-dp": 92
  }],
  208: [function (require, module, exports) {
    // 19.1.2.5 Object.freeze(O)
    var isObject = require('./_is-object'),
      meta = require('./_meta').onFreeze;

    require('./_object-sap')('freeze', function ($freeze) {
      return function freeze(it) {
        return $freeze && isObject(it) ? $freeze(meta(it)) : it;
      };
    });
  }, {
    "./_is-object": 74,
    "./_meta": 87,
    "./_object-sap": 103
  }],
  209: [function (require, module, exports) {
    // 19.1.2.6 Object.getOwnPropertyDescriptor(O, P)
    var toIObject = require('./_to-iobject'),
      $getOwnPropertyDescriptor = require('./_object-gopd').f;

    require('./_object-sap')('getOwnPropertyDescriptor', function () {
      return function getOwnPropertyDescriptor(it, key) {
        return $getOwnPropertyDescriptor(toIObject(it), key);
      };
    });
  }, {
    "./_object-gopd": 95,
    "./_object-sap": 103,
    "./_to-iobject": 132
  }],
  210: [function (require, module, exports) {
    // 19.1.2.7 Object.getOwnPropertyNames(O)
    require('./_object-sap')('getOwnPropertyNames', function () {
      return require('./_object-gopn-ext').f;
    });
  }, {
    "./_object-gopn-ext": 96,
    "./_object-sap": 103
  }],
  211: [function (require, module, exports) {
    // 19.1.2.9 Object.getPrototypeOf(O)
    var toObject = require('./_to-object'),
      $getPrototypeOf = require('./_object-gpo');

    require('./_object-sap')('getPrototypeOf', function () {
      return function getPrototypeOf(it) {
        return $getPrototypeOf(toObject(it));
      };
    });
  }, {
    "./_object-gpo": 99,
    "./_object-sap": 103,
    "./_to-object": 134
  }],
  212: [function (require, module, exports) {
    // 19.1.2.11 Object.isExtensible(O)
    var isObject = require('./_is-object');

    require('./_object-sap')('isExtensible', function ($isExtensible) {
      return function isExtensible(it) {
        return isObject(it) ? $isExtensible ? $isExtensible(it) : true : false;
      };
    });
  }, {
    "./_is-object": 74,
    "./_object-sap": 103
  }],
  213: [function (require, module, exports) {
    // 19.1.2.12 Object.isFrozen(O)
    var isObject = require('./_is-object');

    require('./_object-sap')('isFrozen', function ($isFrozen) {
      return function isFrozen(it) {
        return isObject(it) ? $isFrozen ? $isFrozen(it) : false : true;
      };
    });
  }, {
    "./_is-object": 74,
    "./_object-sap": 103
  }],
  214: [function (require, module, exports) {
    // 19.1.2.13 Object.isSealed(O)
    var isObject = require('./_is-object');

    require('./_object-sap')('isSealed', function ($isSealed) {
      return function isSealed(it) {
        return isObject(it) ? $isSealed ? $isSealed(it) : false : true;
      };
    });
  }, {
    "./_is-object": 74,
    "./_object-sap": 103
  }],
  215: [function (require, module, exports) {
    // 19.1.3.10 Object.is(value1, value2)
    var $export = require('./_export');
    $export($export.S, 'Object', {
      is: require('./_same-value')
    });
  }, {
    "./_export": 57,
    "./_same-value": 114
  }],
  216: [function (require, module, exports) {
    // 19.1.2.14 Object.keys(O)
    var toObject = require('./_to-object'),
      $keys = require('./_object-keys');

    require('./_object-sap')('keys', function () {
      return function keys(it) {
        return $keys(toObject(it));
      };
    });
  }, {
    "./_object-keys": 101,
    "./_object-sap": 103,
    "./_to-object": 134
  }],
  217: [function (require, module, exports) {
    // 19.1.2.15 Object.preventExtensions(O)
    var isObject = require('./_is-object'),
      meta = require('./_meta').onFreeze;

    require('./_object-sap')('preventExtensions', function ($preventExtensions) {
      return function preventExtensions(it) {
        return $preventExtensions && isObject(it) ? $preventExtensions(meta(it)) : it;
      };
    });
  }, {
    "./_is-object": 74,
    "./_meta": 87,
    "./_object-sap": 103
  }],
  218: [function (require, module, exports) {
    // 19.1.2.17 Object.seal(O)
    var isObject = require('./_is-object'),
      meta = require('./_meta').onFreeze;

    require('./_object-sap')('seal', function ($seal) {
      return function seal(it) {
        return $seal && isObject(it) ? $seal(meta(it)) : it;
      };
    });
  }, {
    "./_is-object": 74,
    "./_meta": 87,
    "./_object-sap": 103
  }],
  219: [function (require, module, exports) {
    // 19.1.3.19 Object.setPrototypeOf(O, proto)
    var $export = require('./_export');
    $export($export.S, 'Object', {
      setPrototypeOf: require('./_set-proto').set
    });
  }, {
    "./_export": 57,
    "./_set-proto": 115
  }],
  220: [function (require, module, exports) {
    'use strict';
    // 19.1.3.6 Object.prototype.toString()
    var classof = require('./_classof'),
      test = {};
    test[require('./_wks')('toStringTag')] = 'z';
    if (test + '' != '[object z]') {
      require('./_redefine')(Object.prototype, 'toString', function toString() {
        return '[object ' + classof(this) + ']';
      }, true);
    }
  }, {
    "./_classof": 42,
    "./_redefine": 112,
    "./_wks": 142
  }],
  221: [function (require, module, exports) {
    var $export = require('./_export'),
      $parseFloat = require('./_parse-float');
    // 18.2.4 parseFloat(string)
    $export($export.G + $export.F * (parseFloat != $parseFloat), {
      parseFloat: $parseFloat
    });
  }, {
    "./_export": 57,
    "./_parse-float": 106
  }],
  222: [function (require, module, exports) {
    var $export = require('./_export'),
      $parseInt = require('./_parse-int');
    // 18.2.5 parseInt(string, radix)
    $export($export.G + $export.F * (parseInt != $parseInt), {
      parseInt: $parseInt
    });
  }, {
    "./_export": 57,
    "./_parse-int": 107
  }],
  223: [function (require, module, exports) {
    'use strict';
    var LIBRARY = require('./_library'),
      global = require('./_global'),
      ctx = require('./_ctx'),
      classof = require('./_classof'),
      $export = require('./_export'),
      isObject = require('./_is-object'),
      aFunction = require('./_a-function'),
      anInstance = require('./_an-instance'),
      forOf = require('./_for-of'),
      speciesConstructor = require('./_species-constructor'),
      task = require('./_task').set,
      microtask = require('./_microtask')(),
      PROMISE = 'Promise',
      TypeError = global.TypeError,
      process = global.process,
      $Promise = global[PROMISE],
      process = global.process,
      isNode = classof(process) == 'process',
      empty = function () {
        /* empty */
      },
      Internal, GenericPromiseCapability, Wrapper;

    var USE_NATIVE = !! function () {
      try {
        // correct subclassing with @@species support
        var promise = $Promise.resolve(1),
          FakePromise = (promise.constructor = {})[require('./_wks')('species')] = function (exec) {
            exec(empty, empty);
          };
        // unhandled rejections tracking support, NodeJS Promise without it fails @@species test
        return (isNode || typeof PromiseRejectionEvent == 'function') && promise.then(empty) instanceof FakePromise;
      } catch (e) {
        /* empty */
      }
    }();

    // helpers
    var sameConstructor = function (a, b) {
      // with library wrapper special case
      return a === b || a === $Promise && b === Wrapper;
    };
    var isThenable = function (it) {
      var then;
      return isObject(it) && typeof (then = it.then) == 'function' ? then : false;
    };
    var newPromiseCapability = function (C) {
      return sameConstructor($Promise, C) ?
        new PromiseCapability(C) :
        new GenericPromiseCapability(C);
    };
    var PromiseCapability = GenericPromiseCapability = function (C) {
      var resolve, reject;
      this.promise = new C(function ($$resolve, $$reject) {
        if (resolve !== undefined || reject !== undefined) throw TypeError('Bad Promise constructor');
        resolve = $$resolve;
        reject = $$reject;
      });
      this.resolve = aFunction(resolve);
      this.reject = aFunction(reject);
    };
    var perform = function (exec) {
      try {
        exec();
      } catch (e) {
        return {
          error: e
        };
      }
    };
    var notify = function (promise, isReject) {
      if (promise._n) return;
      promise._n = true;
      var chain = promise._c;
      microtask(function () {
        var value = promise._v,
          ok = promise._s == 1,
          i = 0;
        var run = function (reaction) {
          var handler = ok ? reaction.ok : reaction.fail,
            resolve = reaction.resolve,
            reject = reaction.reject,
            domain = reaction.domain,
            result, then;
          try {
            if (handler) {
              if (!ok) {
                if (promise._h == 2) onHandleUnhandled(promise);
                promise._h = 1;
              }
              if (handler === true) result = value;
              else {
                if (domain) domain.enter();
                result = handler(value);
                if (domain) domain.exit();
              }
              if (result === reaction.promise) {
                reject(TypeError('Promise-chain cycle'));
              } else if (then = isThenable(result)) {
                then.call(result, resolve, reject);
              } else resolve(result);
            } else reject(value);
          } catch (e) {
            reject(e);
          }
        };
        while (chain.length > i) run(chain[i++]); // variable length - can't use forEach
        promise._c = [];
        promise._n = false;
        if (isReject && !promise._h) onUnhandled(promise);
      });
    };
    var onUnhandled = function (promise) {
      task.call(global, function () {
        var value = promise._v,
          abrupt, handler, console;
        if (isUnhandled(promise)) {
          abrupt = perform(function () {
            if (isNode) {
              process.emit('unhandledRejection', value, promise);
            } else if (handler = global.onunhandledrejection) {
              handler({
                promise: promise,
                reason: value
              });
            } else if ((console = global.console) && console.error) {
              console.error('Unhandled promise rejection', value);
            }
          });
          // Browsers should not trigger `rejectionHandled` event if it was handled here, NodeJS - should
          promise._h = isNode || isUnhandled(promise) ? 2 : 1;
        }
        promise._a = undefined;
        if (abrupt) throw abrupt.error;
      });
    };
    var isUnhandled = function (promise) {
      if (promise._h == 1) return false;
      var chain = promise._a || promise._c,
        i = 0,
        reaction;
      while (chain.length > i) {
        reaction = chain[i++];
        if (reaction.fail || !isUnhandled(reaction.promise)) return false;
      }
      return true;
    };
    var onHandleUnhandled = function (promise) {
      task.call(global, function () {
        var handler;
        if (isNode) {
          process.emit('rejectionHandled', promise);
        } else if (handler = global.onrejectionhandled) {
          handler({
            promise: promise,
            reason: promise._v
          });
        }
      });
    };
    var $reject = function (value) {
      var promise = this;
      if (promise._d) return;
      promise._d = true;
      promise = promise._w || promise; // unwrap
      promise._v = value;
      promise._s = 2;
      if (!promise._a) promise._a = promise._c.slice();
      notify(promise, true);
    };
    var $resolve = function (value) {
      var promise = this,
        then;
      if (promise._d) return;
      promise._d = true;
      promise = promise._w || promise; // unwrap
      try {
        if (promise === value) throw TypeError("Promise can't be resolved itself");
        if (then = isThenable(value)) {
          microtask(function () {
            var wrapper = {
              _w: promise,
              _d: false
            }; // wrap
            try {
              then.call(value, ctx($resolve, wrapper, 1), ctx($reject, wrapper, 1));
            } catch (e) {
              $reject.call(wrapper, e);
            }
          });
        } else {
          promise._v = value;
          promise._s = 1;
          notify(promise, false);
        }
      } catch (e) {
        $reject.call({
          _w: promise,
          _d: false
        }, e); // wrap
      }
    };

    // constructor polyfill
    if (!USE_NATIVE) {
      // 25.4.3.1 Promise(executor)
      $Promise = function Promise(executor) {
        anInstance(this, $Promise, PROMISE, '_h');
        aFunction(executor);
        Internal.call(this);
        try {
          executor(ctx($resolve, this, 1), ctx($reject, this, 1));
        } catch (err) {
          $reject.call(this, err);
        }
      };
      Internal = function Promise(executor) {
        this._c = []; // <- awaiting reactions
        this._a = undefined; // <- checked in isUnhandled reactions
        this._s = 0; // <- state
        this._d = false; // <- done
        this._v = undefined; // <- value
        this._h = 0; // <- rejection state, 0 - default, 1 - handled, 2 - unhandled
        this._n = false; // <- notify
      };
      Internal.prototype = require('./_redefine-all')($Promise.prototype, {
        // 25.4.5.3 Promise.prototype.then(onFulfilled, onRejected)
        then: function then(onFulfilled, onRejected) {
          var reaction = newPromiseCapability(speciesConstructor(this, $Promise));
          reaction.ok = typeof onFulfilled == 'function' ? onFulfilled : true;
          reaction.fail = typeof onRejected == 'function' && onRejected;
          reaction.domain = isNode ? process.domain : undefined;
          this._c.push(reaction);
          if (this._a) this._a.push(reaction);
          if (this._s) notify(this, false);
          return reaction.promise;
        },
        // 25.4.5.1 Promise.prototype.catch(onRejected)
        'catch': function (onRejected) {
          return this.then(undefined, onRejected);
        }
      });
      PromiseCapability = function () {
        var promise = new Internal;
        this.promise = promise;
        this.resolve = ctx($resolve, promise, 1);
        this.reject = ctx($reject, promise, 1);
      };
    }

    $export($export.G + $export.W + $export.F * !USE_NATIVE, {
      Promise: $Promise
    });
    require('./_set-to-string-tag')($Promise, PROMISE);
    require('./_set-species')(PROMISE);
    Wrapper = require('./_core')[PROMISE];

    // statics
    $export($export.S + $export.F * !USE_NATIVE, PROMISE, {
      // 25.4.4.5 Promise.reject(r)
      reject: function reject(r) {
        var capability = newPromiseCapability(this),
          $$reject = capability.reject;
        $$reject(r);
        return capability.promise;
      }
    });
    $export($export.S + $export.F * (LIBRARY || !USE_NATIVE), PROMISE, {
      // 25.4.4.6 Promise.resolve(x)
      resolve: function resolve(x) {
        // instanceof instead of internal slot check because we should fix it without replacement native Promise core
        if (x instanceof $Promise && sameConstructor(x.constructor, this)) return x;
        var capability = newPromiseCapability(this),
          $$resolve = capability.resolve;
        $$resolve(x);
        return capability.promise;
      }
    });
    $export($export.S + $export.F * !(USE_NATIVE && require('./_iter-detect')(function (iter) {
      $Promise.all(iter)['catch'](empty);
    })), PROMISE, {
      // 25.4.4.1 Promise.all(iterable)
      all: function all(iterable) {
        var C = this,
          capability = newPromiseCapability(C),
          resolve = capability.resolve,
          reject = capability.reject;
        var abrupt = perform(function () {
          var values = [],
            index = 0,
            remaining = 1;
          forOf(iterable, false, function (promise) {
            var $index = index++,
              alreadyCalled = false;
            values.push(undefined);
            remaining++;
            C.resolve(promise).then(function (value) {
              if (alreadyCalled) return;
              alreadyCalled = true;
              values[$index] = value;
              --remaining || resolve(values);
            }, reject);
          });
          --remaining || resolve(values);
        });
        if (abrupt) reject(abrupt.error);
        return capability.promise;
      },
      // 25.4.4.4 Promise.race(iterable)
      race: function race(iterable) {
        var C = this,
          capability = newPromiseCapability(C),
          reject = capability.reject;
        var abrupt = perform(function () {
          forOf(iterable, false, function (promise) {
            C.resolve(promise).then(capability.resolve, reject);
          });
        });
        if (abrupt) reject(abrupt.error);
        return capability.promise;
      }
    });
  }, {
    "./_a-function": 28,
    "./_an-instance": 31,
    "./_classof": 42,
    "./_core": 48,
    "./_ctx": 50,
    "./_export": 57,
    "./_for-of": 62,
    "./_global": 63,
    "./_is-object": 74,
    "./_iter-detect": 79,
    "./_library": 83,
    "./_microtask": 89,
    "./_redefine-all": 111,
    "./_set-species": 116,
    "./_set-to-string-tag": 117,
    "./_species-constructor": 120,
    "./_task": 129,
    "./_wks": 142
  }],
  224: [function (require, module, exports) {
    // 26.1.1 Reflect.apply(target, thisArgument, argumentsList)
    var $export = require('./_export'),
      aFunction = require('./_a-function'),
      anObject = require('./_an-object'),
      rApply = (require('./_global').Reflect || {}).apply,
      fApply = Function.apply;
    // MS Edge argumentsList argument is optional
    $export($export.S + $export.F * !require('./_fails')(function () {
      rApply(function () {});
    }), 'Reflect', {
      apply: function apply(target, thisArgument, argumentsList) {
        var T = aFunction(target),
          L = anObject(argumentsList);
        return rApply ? rApply(T, thisArgument, L) : fApply.call(T, thisArgument, L);
      }
    });
  }, {
    "./_a-function": 28,
    "./_an-object": 32,
    "./_export": 57,
    "./_fails": 59,
    "./_global": 63
  }],
  225: [function (require, module, exports) {
    // 26.1.2 Reflect.construct(target, argumentsList [, newTarget])
    var $export = require('./_export'),
      create = require('./_object-create'),
      aFunction = require('./_a-function'),
      anObject = require('./_an-object'),
      isObject = require('./_is-object'),
      fails = require('./_fails'),
      bind = require('./_bind'),
      rConstruct = (require('./_global').Reflect || {}).construct;

    // MS Edge supports only 2 arguments and argumentsList argument is optional
    // FF Nightly sets third argument as `new.target`, but does not create `this` from it
    var NEW_TARGET_BUG = fails(function () {
      function F() {}
      return !(rConstruct(function () {}, [], F) instanceof F);
    });
    var ARGS_BUG = !fails(function () {
      rConstruct(function () {});
    });

    $export($export.S + $export.F * (NEW_TARGET_BUG || ARGS_BUG), 'Reflect', {
      construct: function construct(Target, args /*, newTarget*/ ) {
        aFunction(Target);
        anObject(args);
        var newTarget = arguments.length < 3 ? Target : aFunction(arguments[2]);
        if (ARGS_BUG && !NEW_TARGET_BUG) return rConstruct(Target, args, newTarget);
        if (Target == newTarget) {
          // w/o altered newTarget, optimization for 0-4 arguments
          switch (args.length) {
            case 0:
              return new Target;
            case 1:
              return new Target(args[0]);
            case 2:
              return new Target(args[0], args[1]);
            case 3:
              return new Target(args[0], args[1], args[2]);
            case 4:
              return new Target(args[0], args[1], args[2], args[3]);
          }
          // w/o altered newTarget, lot of arguments case
          var $args = [null];
          $args.push.apply($args, args);
          return new(bind.apply(Target, $args));
        }
        // with altered newTarget, not support built-in constructors
        var proto = newTarget.prototype,
          instance = create(isObject(proto) ? proto : Object.prototype),
          result = Function.apply.call(Target, instance, args);
        return isObject(result) ? result : instance;
      }
    });
  }, {
    "./_a-function": 28,
    "./_an-object": 32,
    "./_bind": 41,
    "./_export": 57,
    "./_fails": 59,
    "./_global": 63,
    "./_is-object": 74,
    "./_object-create": 91
  }],
  226: [function (require, module, exports) {
    // 26.1.3 Reflect.defineProperty(target, propertyKey, attributes)
    var dP = require('./_object-dp'),
      $export = require('./_export'),
      anObject = require('./_an-object'),
      toPrimitive = require('./_to-primitive');

    // MS Edge has broken Reflect.defineProperty - throwing instead of returning false
    $export($export.S + $export.F * require('./_fails')(function () {
      Reflect.defineProperty(dP.f({}, 1, {
        value: 1
      }), 1, {
        value: 2
      });
    }), 'Reflect', {
      defineProperty: function defineProperty(target, propertyKey, attributes) {
        anObject(target);
        propertyKey = toPrimitive(propertyKey, true);
        anObject(attributes);
        try {
          dP.f(target, propertyKey, attributes);
          return true;
        } catch (e) {
          return false;
        }
      }
    });
  }, {
    "./_an-object": 32,
    "./_export": 57,
    "./_fails": 59,
    "./_object-dp": 92,
    "./_to-primitive": 135
  }],
  227: [function (require, module, exports) {
    // 26.1.4 Reflect.deleteProperty(target, propertyKey)
    var $export = require('./_export'),
      gOPD = require('./_object-gopd').f,
      anObject = require('./_an-object');

    $export($export.S, 'Reflect', {
      deleteProperty: function deleteProperty(target, propertyKey) {
        var desc = gOPD(anObject(target), propertyKey);
        return desc && !desc.configurable ? false : delete target[propertyKey];
      }
    });
  }, {
    "./_an-object": 32,
    "./_export": 57,
    "./_object-gopd": 95
  }],
  228: [function (require, module, exports) {
    'use strict';
    // 26.1.5 Reflect.enumerate(target)
    var $export = require('./_export'),
      anObject = require('./_an-object');
    var Enumerate = function (iterated) {
      this._t = anObject(iterated); // target
      this._i = 0; // next index
      var keys = this._k = [] // keys
        ,
        key;
      for (key in iterated) keys.push(key);
    };
    require('./_iter-create')(Enumerate, 'Object', function () {
      var that = this,
        keys = that._k,
        key;
      do {
        if (that._i >= keys.length) return {
          value: undefined,
          done: true
        };
      } while (!((key = keys[that._i++]) in that._t));
      return {
        value: key,
        done: false
      };
    });

    $export($export.S, 'Reflect', {
      enumerate: function enumerate(target) {
        return new Enumerate(target);
      }
    });
  }, {
    "./_an-object": 32,
    "./_export": 57,
    "./_iter-create": 77
  }],
  229: [function (require, module, exports) {
    // 26.1.7 Reflect.getOwnPropertyDescriptor(target, propertyKey)
    var gOPD = require('./_object-gopd'),
      $export = require('./_export'),
      anObject = require('./_an-object');

    $export($export.S, 'Reflect', {
      getOwnPropertyDescriptor: function getOwnPropertyDescriptor(target, propertyKey) {
        return gOPD.f(anObject(target), propertyKey);
      }
    });
  }, {
    "./_an-object": 32,
    "./_export": 57,
    "./_object-gopd": 95
  }],
  230: [function (require, module, exports) {
    // 26.1.8 Reflect.getPrototypeOf(target)
    var $export = require('./_export'),
      getProto = require('./_object-gpo'),
      anObject = require('./_an-object');

    $export($export.S, 'Reflect', {
      getPrototypeOf: function getPrototypeOf(target) {
        return getProto(anObject(target));
      }
    });
  }, {
    "./_an-object": 32,
    "./_export": 57,
    "./_object-gpo": 99
  }],
  231: [function (require, module, exports) {
    // 26.1.6 Reflect.get(target, propertyKey [, receiver])
    var gOPD = require('./_object-gopd'),
      getPrototypeOf = require('./_object-gpo'),
      has = require('./_has'),
      $export = require('./_export'),
      isObject = require('./_is-object'),
      anObject = require('./_an-object');

    function get(target, propertyKey /*, receiver*/ ) {
      var receiver = arguments.length < 3 ? target : arguments[2],
        desc, proto;
      if (anObject(target) === receiver) return target[propertyKey];
      if (desc = gOPD.f(target, propertyKey)) return has(desc, 'value') ?
        desc.value :
        desc.get !== undefined ?
        desc.get.call(receiver) :
        undefined;
      if (isObject(proto = getPrototypeOf(target))) return get(proto, propertyKey, receiver);
    }

    $export($export.S, 'Reflect', {
      get: get
    });
  }, {
    "./_an-object": 32,
    "./_export": 57,
    "./_has": 64,
    "./_is-object": 74,
    "./_object-gopd": 95,
    "./_object-gpo": 99
  }],
  232: [function (require, module, exports) {
    // 26.1.9 Reflect.has(target, propertyKey)
    var $export = require('./_export');

    $export($export.S, 'Reflect', {
      has: function has(target, propertyKey) {
        return propertyKey in target;
      }
    });
  }, {
    "./_export": 57
  }],
  233: [function (require, module, exports) {
    // 26.1.10 Reflect.isExtensible(target)
    var $export = require('./_export'),
      anObject = require('./_an-object'),
      $isExtensible = Object.isExtensible;

    $export($export.S, 'Reflect', {
      isExtensible: function isExtensible(target) {
        anObject(target);
        return $isExtensible ? $isExtensible(target) : true;
      }
    });
  }, {
    "./_an-object": 32,
    "./_export": 57
  }],
  234: [function (require, module, exports) {
    // 26.1.11 Reflect.ownKeys(target)
    var $export = require('./_export');

    $export($export.S, 'Reflect', {
      ownKeys: require('./_own-keys')
    });
  }, {
    "./_export": 57,
    "./_own-keys": 105
  }],
  235: [function (require, module, exports) {
    // 26.1.12 Reflect.preventExtensions(target)
    var $export = require('./_export'),
      anObject = require('./_an-object'),
      $preventExtensions = Object.preventExtensions;

    $export($export.S, 'Reflect', {
      preventExtensions: function preventExtensions(target) {
        anObject(target);
        try {
          if ($preventExtensions) $preventExtensions(target);
          return true;
        } catch (e) {
          return false;
        }
      }
    });
  }, {
    "./_an-object": 32,
    "./_export": 57
  }],
  236: [function (require, module, exports) {
    // 26.1.14 Reflect.setPrototypeOf(target, proto)
    var $export = require('./_export'),
      setProto = require('./_set-proto');

    if (setProto) $export($export.S, 'Reflect', {
      setPrototypeOf: function setPrototypeOf(target, proto) {
        setProto.check(target, proto);
        try {
          setProto.set(target, proto);
          return true;
        } catch (e) {
          return false;
        }
      }
    });
  }, {
    "./_export": 57,
    "./_set-proto": 115
  }],
  237: [function (require, module, exports) {
    // 26.1.13 Reflect.set(target, propertyKey, V [, receiver])
    var dP = require('./_object-dp'),
      gOPD = require('./_object-gopd'),
      getPrototypeOf = require('./_object-gpo'),
      has = require('./_has'),
      $export = require('./_export'),
      createDesc = require('./_property-desc'),
      anObject = require('./_an-object'),
      isObject = require('./_is-object');

    function set(target, propertyKey, V /*, receiver*/ ) {
      var receiver = arguments.length < 4 ? target : arguments[3],
        ownDesc = gOPD.f(anObject(target), propertyKey),
        existingDescriptor, proto;
      if (!ownDesc) {
        if (isObject(proto = getPrototypeOf(target))) {
          return set(proto, propertyKey, V, receiver);
        }
        ownDesc = createDesc(0);
      }
      if (has(ownDesc, 'value')) {
        if (ownDesc.writable === false || !isObject(receiver)) return false;
        existingDescriptor = gOPD.f(receiver, propertyKey) || createDesc(0);
        existingDescriptor.value = V;
        dP.f(receiver, propertyKey, existingDescriptor);
        return true;
      }
      return ownDesc.set === undefined ? false : (ownDesc.set.call(receiver, V), true);
    }

    $export($export.S, 'Reflect', {
      set: set
    });
  }, {
    "./_an-object": 32,
    "./_export": 57,
    "./_has": 64,
    "./_is-object": 74,
    "./_object-dp": 92,
    "./_object-gopd": 95,
    "./_object-gpo": 99,
    "./_property-desc": 110
  }],
  238: [function (require, module, exports) {
    var global = require('./_global'),
      inheritIfRequired = require('./_inherit-if-required'),
      dP = require('./_object-dp').f,
      gOPN = require('./_object-gopn').f,
      isRegExp = require('./_is-regexp'),
      $flags = require('./_flags'),
      $RegExp = global.RegExp,
      Base = $RegExp,
      proto = $RegExp.prototype,
      re1 = /a/g,
      re2 = /a/g
      // "new" creates a new object, old webkit buggy here
      ,
      CORRECT_NEW = new $RegExp(re1) !== re1;

    if (require('./_descriptors') && (!CORRECT_NEW || require('./_fails')(function () {
        re2[require('./_wks')('match')] = false;
        // RegExp constructor can alter flags and IsRegExp works correct with @@match
        return $RegExp(re1) != re1 || $RegExp(re2) == re2 || $RegExp(re1, 'i') != '/a/i';
      }))) {
      $RegExp = function RegExp(p, f) {
        var tiRE = this instanceof $RegExp,
          piRE = isRegExp(p),
          fiU = f === undefined;
        return !tiRE && piRE && p.constructor === $RegExp && fiU ? p :
          inheritIfRequired(CORRECT_NEW ?
            new Base(piRE && !fiU ? p.source : p, f) :
            Base((piRE = p instanceof $RegExp) ? p.source : p, piRE && fiU ? $flags.call(p) : f), tiRE ? this : proto, $RegExp);
      };
      var proxy = function (key) {
        key in $RegExp || dP($RegExp, key, {
          configurable: true,
          get: function () {
            return Base[key];
          },
          set: function (it) {
            Base[key] = it;
          }
        });
      };
      for (var keys = gOPN(Base), i = 0; keys.length > i;) proxy(keys[i++]);
      proto.constructor = $RegExp;
      $RegExp.prototype = proto;
      require('./_redefine')(global, 'RegExp', $RegExp);
    }

    require('./_set-species')('RegExp');
  }, {
    "./_descriptors": 53,
    "./_fails": 59,
    "./_flags": 61,
    "./_global": 63,
    "./_inherit-if-required": 68,
    "./_is-regexp": 75,
    "./_object-dp": 92,
    "./_object-gopn": 97,
    "./_redefine": 112,
    "./_set-species": 116,
    "./_wks": 142
  }],
  239: [function (require, module, exports) {
    // 21.2.5.3 get RegExp.prototype.flags()
    if (require('./_descriptors') && /./g.flags != 'g') require('./_object-dp').f(RegExp.prototype, 'flags', {
      configurable: true,
      get: require('./_flags')
    });
  }, {
    "./_descriptors": 53,
    "./_flags": 61,
    "./_object-dp": 92
  }],
  240: [function (require, module, exports) {
    // @@match logic
    require('./_fix-re-wks')('match', 1, function (defined, MATCH, $match) {
      // 21.1.3.11 String.prototype.match(regexp)
      return [function match(regexp) {
        'use strict';
        var O = defined(this),
          fn = regexp == undefined ? undefined : regexp[MATCH];
        return fn !== undefined ? fn.call(regexp, O) : new RegExp(regexp)[MATCH](String(O));
      }, $match];
    });
  }, {
    "./_fix-re-wks": 60
  }],
  241: [function (require, module, exports) {
    // @@replace logic
    require('./_fix-re-wks')('replace', 2, function (defined, REPLACE, $replace) {
      // 21.1.3.14 String.prototype.replace(searchValue, replaceValue)
      return [function replace(searchValue, replaceValue) {
        'use strict';
        var O = defined(this),
          fn = searchValue == undefined ? undefined : searchValue[REPLACE];
        return fn !== undefined ?
          fn.call(searchValue, O, replaceValue) :
          $replace.call(String(O), searchValue, replaceValue);
      }, $replace];
    });
  }, {
    "./_fix-re-wks": 60
  }],
  242: [function (require, module, exports) {
    // @@search logic
    require('./_fix-re-wks')('search', 1, function (defined, SEARCH, $search) {
      // 21.1.3.15 String.prototype.search(regexp)
      return [function search(regexp) {
        'use strict';
        var O = defined(this),
          fn = regexp == undefined ? undefined : regexp[SEARCH];
        return fn !== undefined ? fn.call(regexp, O) : new RegExp(regexp)[SEARCH](String(O));
      }, $search];
    });
  }, {
    "./_fix-re-wks": 60
  }],
  243: [function (require, module, exports) {
    // @@split logic
    require('./_fix-re-wks')('split', 2, function (defined, SPLIT, $split) {
      'use strict';
      var isRegExp = require('./_is-regexp'),
        _split = $split,
        $push = [].push,
        $SPLIT = 'split',
        LENGTH = 'length',
        LAST_INDEX = 'lastIndex';
      if (
        'abbc' [$SPLIT](/(b)*/)[1] == 'c' ||
        'test' [$SPLIT](/(?:)/, -1)[LENGTH] != 4 ||
        'ab' [$SPLIT](/(?:ab)*/)[LENGTH] != 2 ||
        '.' [$SPLIT](/(.?)(.?)/)[LENGTH] != 4 ||
        '.' [$SPLIT](/()()/)[LENGTH] > 1 ||
        '' [$SPLIT](/.?/)[LENGTH]
      ) {
        var NPCG = /()??/.exec('')[1] === undefined; // nonparticipating capturing group
        // based on es5-shim implementation, need to rework it
        $split = function (separator, limit) {
          var string = String(this);
          if (separator === undefined && limit === 0) return [];
          // If `separator` is not a regex, use native split
          if (!isRegExp(separator)) return _split.call(string, separator, limit);
          var output = [];
          var flags = (separator.ignoreCase ? 'i' : '') +
            (separator.multiline ? 'm' : '') +
            (separator.unicode ? 'u' : '') +
            (separator.sticky ? 'y' : '');
          var lastLastIndex = 0;
          var splitLimit = limit === undefined ? 4294967295 : limit >>> 0;
          // Make `global` and avoid `lastIndex` issues by working with a copy
          var separatorCopy = new RegExp(separator.source, flags + 'g');
          var separator2, match, lastIndex, lastLength, i;
          // Doesn't need flags gy, but they don't hurt
          if (!NPCG) separator2 = new RegExp('^' + separatorCopy.source + '$(?!\\s)', flags);
          while (match = separatorCopy.exec(string)) {
            // `separatorCopy.lastIndex` is not reliable cross-browser
            lastIndex = match.index + match[0][LENGTH];
            if (lastIndex > lastLastIndex) {
              output.push(string.slice(lastLastIndex, match.index));
              // Fix browsers whose `exec` methods don't consistently return `undefined` for NPCG
              if (!NPCG && match[LENGTH] > 1) match[0].replace(separator2, function () {
                for (i = 1; i < arguments[LENGTH] - 2; i++)
                  if (arguments[i] === undefined) match[i] = undefined;
              });
              if (match[LENGTH] > 1 && match.index < string[LENGTH]) $push.apply(output, match.slice(1));
              lastLength = match[0][LENGTH];
              lastLastIndex = lastIndex;
              if (output[LENGTH] >= splitLimit) break;
            }
            if (separatorCopy[LAST_INDEX] === match.index) separatorCopy[LAST_INDEX]++; // Avoid an infinite loop
          }
          if (lastLastIndex === string[LENGTH]) {
            if (lastLength || !separatorCopy.test('')) output.push('');
          } else output.push(string.slice(lastLastIndex));
          return output[LENGTH] > splitLimit ? output.slice(0, splitLimit) : output;
        };
        // Chakra, V8
      } else if ('0' [$SPLIT](undefined, 0)[LENGTH]) {
        $split = function (separator, limit) {
          return separator === undefined && limit === 0 ? [] : _split.call(this, separator, limit);
        };
      }
      // 21.1.3.17 String.prototype.split(separator, limit)
      return [function split(separator, limit) {
        var O = defined(this),
          fn = separator == undefined ? undefined : separator[SPLIT];
        return fn !== undefined ? fn.call(separator, O, limit) : $split.call(String(O), separator, limit);
      }, $split];
    });
  }, {
    "./_fix-re-wks": 60,
    "./_is-regexp": 75
  }],
  244: [function (require, module, exports) {
    'use strict';
    require('./es6.regexp.flags');
    var anObject = require('./_an-object'),
      $flags = require('./_flags'),
      DESCRIPTORS = require('./_descriptors'),
      TO_STRING = 'toString',
      $toString = /./ [TO_STRING];

    var define = function (fn) {
      require('./_redefine')(RegExp.prototype, TO_STRING, fn, true);
    };

    // 21.2.5.14 RegExp.prototype.toString()
    if (require('./_fails')(function () {
        return $toString.call({
          source: 'a',
          flags: 'b'
        }) != '/a/b';
      })) {
      define(function toString() {
        var R = anObject(this);
        return '/'.concat(R.source, '/',
          'flags' in R ? R.flags : !DESCRIPTORS && R instanceof RegExp ? $flags.call(R) : undefined);
      });
      // FF44- RegExp#toString has a wrong name
    } else if ($toString.name != TO_STRING) {
      define(function toString() {
        return $toString.call(this);
      });
    }
  }, {
    "./_an-object": 32,
    "./_descriptors": 53,
    "./_fails": 59,
    "./_flags": 61,
    "./_redefine": 112,
    "./es6.regexp.flags": 239
  }],
  245: [function (require, module, exports) {
    'use strict';
    var strong = require('./_collection-strong');

    // 23.2 Set Objects
    module.exports = require('./_collection')('Set', function (get) {
      return function Set() {
        return get(this, arguments.length > 0 ? arguments[0] : undefined);
      };
    }, {
      // 23.2.3.1 Set.prototype.add(value)
      add: function add(value) {
        return strong.def(this, value = value === 0 ? 0 : value, value);
      }
    }, strong);
  }, {
    "./_collection": 47,
    "./_collection-strong": 44
  }],
  246: [function (require, module, exports) {
    'use strict';
    // B.2.3.2 String.prototype.anchor(name)
    require('./_string-html')('anchor', function (createHTML) {
      return function anchor(name) {
        return createHTML(this, 'a', 'name', name);
      }
    });
  }, {
    "./_string-html": 124
  }],
  247: [function (require, module, exports) {
    'use strict';
    // B.2.3.3 String.prototype.big()
    require('./_string-html')('big', function (createHTML) {
      return function big() {
        return createHTML(this, 'big', '', '');
      }
    });
  }, {
    "./_string-html": 124
  }],
  248: [function (require, module, exports) {
    'use strict';
    // B.2.3.4 String.prototype.blink()
    require('./_string-html')('blink', function (createHTML) {
      return function blink() {
        return createHTML(this, 'blink', '', '');
      }
    });
  }, {
    "./_string-html": 124
  }],
  249: [function (require, module, exports) {
    'use strict';
    // B.2.3.5 String.prototype.bold()
    require('./_string-html')('bold', function (createHTML) {
      return function bold() {
        return createHTML(this, 'b', '', '');
      }
    });
  }, {
    "./_string-html": 124
  }],
  250: [function (require, module, exports) {
    'use strict';
    var $export = require('./_export'),
      $at = require('./_string-at')(false);
    $export($export.P, 'String', {
      // 21.1.3.3 String.prototype.codePointAt(pos)
      codePointAt: function codePointAt(pos) {
        return $at(this, pos);
      }
    });
  }, {
    "./_export": 57,
    "./_string-at": 122
  }],
  251: [function (require, module, exports) {
    // 21.1.3.6 String.prototype.endsWith(searchString [, endPosition])
    'use strict';
    var $export = require('./_export'),
      toLength = require('./_to-length'),
      context = require('./_string-context'),
      ENDS_WITH = 'endsWith',
      $endsWith = '' [ENDS_WITH];

    $export($export.P + $export.F * require('./_fails-is-regexp')(ENDS_WITH), 'String', {
      endsWith: function endsWith(searchString /*, endPosition = @length */ ) {
        var that = context(this, searchString, ENDS_WITH),
          endPosition = arguments.length > 1 ? arguments[1] : undefined,
          len = toLength(that.length),
          end = endPosition === undefined ? len : Math.min(toLength(endPosition), len),
          search = String(searchString);
        return $endsWith ?
          $endsWith.call(that, search, end) :
          that.slice(end - search.length, end) === search;
      }
    });
  }, {
    "./_export": 57,
    "./_fails-is-regexp": 58,
    "./_string-context": 123,
    "./_to-length": 133
  }],
  252: [function (require, module, exports) {
    'use strict';
    // B.2.3.6 String.prototype.fixed()
    require('./_string-html')('fixed', function (createHTML) {
      return function fixed() {
        return createHTML(this, 'tt', '', '');
      }
    });
  }, {
    "./_string-html": 124
  }],
  253: [function (require, module, exports) {
    'use strict';
    // B.2.3.7 String.prototype.fontcolor(color)
    require('./_string-html')('fontcolor', function (createHTML) {
      return function fontcolor(color) {
        return createHTML(this, 'font', 'color', color);
      }
    });
  }, {
    "./_string-html": 124
  }],
  254: [function (require, module, exports) {
    'use strict';
    // B.2.3.8 String.prototype.fontsize(size)
    require('./_string-html')('fontsize', function (createHTML) {
      return function fontsize(size) {
        return createHTML(this, 'font', 'size', size);
      }
    });
  }, {
    "./_string-html": 124
  }],
  255: [function (require, module, exports) {
    var $export = require('./_export'),
      toIndex = require('./_to-index'),
      fromCharCode = String.fromCharCode,
      $fromCodePoint = String.fromCodePoint;

    // length should be 1, old FF problem
    $export($export.S + $export.F * (!!$fromCodePoint && $fromCodePoint.length != 1), 'String', {
      // 21.1.2.2 String.fromCodePoint(...codePoints)
      fromCodePoint: function fromCodePoint(x) { // eslint-disable-line no-unused-vars
        var res = [],
          aLen = arguments.length,
          i = 0,
          code;
        while (aLen > i) {
          code = +arguments[i++];
          if (toIndex(code, 0x10ffff) !== code) throw RangeError(code + ' is not a valid code point');
          res.push(code < 0x10000 ?
            fromCharCode(code) :
            fromCharCode(((code -= 0x10000) >> 10) + 0xd800, code % 0x400 + 0xdc00)
          );
        }
        return res.join('');
      }
    });
  }, {
    "./_export": 57,
    "./_to-index": 130
  }],
  256: [function (require, module, exports) {
    // 21.1.3.7 String.prototype.includes(searchString, position = 0)
    'use strict';
    var $export = require('./_export'),
      context = require('./_string-context'),
      INCLUDES = 'includes';

    $export($export.P + $export.F * require('./_fails-is-regexp')(INCLUDES), 'String', {
      includes: function includes(searchString /*, position = 0 */ ) {
        return !!~context(this, searchString, INCLUDES)
          .indexOf(searchString, arguments.length > 1 ? arguments[1] : undefined);
      }
    });
  }, {
    "./_export": 57,
    "./_fails-is-regexp": 58,
    "./_string-context": 123
  }],
  257: [function (require, module, exports) {
    'use strict';
    // B.2.3.9 String.prototype.italics()
    require('./_string-html')('italics', function (createHTML) {
      return function italics() {
        return createHTML(this, 'i', '', '');
      }
    });
  }, {
    "./_string-html": 124
  }],
  258: [function (require, module, exports) {
    'use strict';
    var $at = require('./_string-at')(true);

    // 21.1.3.27 String.prototype[@@iterator]()
    require('./_iter-define')(String, 'String', function (iterated) {
      this._t = String(iterated); // target
      this._i = 0; // next index
      // 21.1.5.2.1 %StringIteratorPrototype%.next()
    }, function () {
      var O = this._t,
        index = this._i,
        point;
      if (index >= O.length) return {
        value: undefined,
        done: true
      };
      point = $at(O, index);
      this._i += point.length;
      return {
        value: point,
        done: false
      };
    });
  }, {
    "./_iter-define": 78,
    "./_string-at": 122
  }],
  259: [function (require, module, exports) {
    'use strict';
    // B.2.3.10 String.prototype.link(url)
    require('./_string-html')('link', function (createHTML) {
      return function link(url) {
        return createHTML(this, 'a', 'href', url);
      }
    });
  }, {
    "./_string-html": 124
  }],
  260: [function (require, module, exports) {
    var $export = require('./_export'),
      toIObject = require('./_to-iobject'),
      toLength = require('./_to-length');

    $export($export.S, 'String', {
      // 21.1.2.4 String.raw(callSite, ...substitutions)
      raw: function raw(callSite) {
        var tpl = toIObject(callSite.raw),
          len = toLength(tpl.length),
          aLen = arguments.length,
          res = [],
          i = 0;
        while (len > i) {
          res.push(String(tpl[i++]));
          if (i < aLen) res.push(String(arguments[i]));
        }
        return res.join('');
      }
    });
  }, {
    "./_export": 57,
    "./_to-iobject": 132,
    "./_to-length": 133
  }],
  261: [function (require, module, exports) {
    var $export = require('./_export');

    $export($export.P, 'String', {
      // 21.1.3.13 String.prototype.repeat(count)
      repeat: require('./_string-repeat')
    });
  }, {
    "./_export": 57,
    "./_string-repeat": 126
  }],
  262: [function (require, module, exports) {
    'use strict';
    // B.2.3.11 String.prototype.small()
    require('./_string-html')('small', function (createHTML) {
      return function small() {
        return createHTML(this, 'small', '', '');
      }
    });
  }, {
    "./_string-html": 124
  }],
  263: [function (require, module, exports) {
    // 21.1.3.18 String.prototype.startsWith(searchString [, position ])
    'use strict';
    var $export = require('./_export'),
      toLength = require('./_to-length'),
      context = require('./_string-context'),
      STARTS_WITH = 'startsWith',
      $startsWith = '' [STARTS_WITH];

    $export($export.P + $export.F * require('./_fails-is-regexp')(STARTS_WITH), 'String', {
      startsWith: function startsWith(searchString /*, position = 0 */ ) {
        var that = context(this, searchString, STARTS_WITH),
          index = toLength(Math.min(arguments.length > 1 ? arguments[1] : undefined, that.length)),
          search = String(searchString);
        return $startsWith ?
          $startsWith.call(that, search, index) :
          that.slice(index, index + search.length) === search;
      }
    });
  }, {
    "./_export": 57,
    "./_fails-is-regexp": 58,
    "./_string-context": 123,
    "./_to-length": 133
  }],
  264: [function (require, module, exports) {
    'use strict';
    // B.2.3.12 String.prototype.strike()
    require('./_string-html')('strike', function (createHTML) {
      return function strike() {
        return createHTML(this, 'strike', '', '');
      }
    });
  }, {
    "./_string-html": 124
  }],
  265: [function (require, module, exports) {
    'use strict';
    // B.2.3.13 String.prototype.sub()
    require('./_string-html')('sub', function (createHTML) {
      return function sub() {
        return createHTML(this, 'sub', '', '');
      }
    });
  }, {
    "./_string-html": 124
  }],
  266: [function (require, module, exports) {
    'use strict';
    // B.2.3.14 String.prototype.sup()
    require('./_string-html')('sup', function (createHTML) {
      return function sup() {
        return createHTML(this, 'sup', '', '');
      }
    });
  }, {
    "./_string-html": 124
  }],
  267: [function (require, module, exports) {
    'use strict';
    // 21.1.3.25 String.prototype.trim()
    require('./_string-trim')('trim', function ($trim) {
      return function trim() {
        return $trim(this, 3);
      };
    });
  }, {
    "./_string-trim": 127
  }],
  268: [function (require, module, exports) {
    'use strict';
    // ECMAScript 6 symbols shim
    var global = require('./_global'),
      has = require('./_has'),
      DESCRIPTORS = require('./_descriptors'),
      $export = require('./_export'),
      redefine = require('./_redefine'),
      META = require('./_meta').KEY,
      $fails = require('./_fails'),
      shared = require('./_shared'),
      setToStringTag = require('./_set-to-string-tag'),
      uid = require('./_uid'),
      wks = require('./_wks'),
      wksExt = require('./_wks-ext'),
      wksDefine = require('./_wks-define'),
      keyOf = require('./_keyof'),
      enumKeys = require('./_enum-keys'),
      isArray = require('./_is-array'),
      anObject = require('./_an-object'),
      toIObject = require('./_to-iobject'),
      toPrimitive = require('./_to-primitive'),
      createDesc = require('./_property-desc'),
      _create = require('./_object-create'),
      gOPNExt = require('./_object-gopn-ext'),
      $GOPD = require('./_object-gopd'),
      $DP = require('./_object-dp'),
      $keys = require('./_object-keys'),
      gOPD = $GOPD.f,
      dP = $DP.f,
      gOPN = gOPNExt.f,
      $Symbol = global.Symbol,
      $JSON = global.JSON,
      _stringify = $JSON && $JSON.stringify,
      PROTOTYPE = 'prototype',
      HIDDEN = wks('_hidden'),
      TO_PRIMITIVE = wks('toPrimitive'),
      isEnum = {}.propertyIsEnumerable,
      SymbolRegistry = shared('symbol-registry'),
      AllSymbols = shared('symbols'),
      OPSymbols = shared('op-symbols'),
      ObjectProto = Object[PROTOTYPE],
      USE_NATIVE = typeof $Symbol == 'function',
      QObject = global.QObject;
    // Don't use setters in Qt Script, https://github.com/zloirock/core-js/issues/173
    var setter = !QObject || !QObject[PROTOTYPE] || !QObject[PROTOTYPE].findChild;

    // fallback for old Android, https://code.google.com/p/v8/issues/detail?id=687
    var setSymbolDesc = DESCRIPTORS && $fails(function () {
      return _create(dP({}, 'a', {
        get: function () {
          return dP(this, 'a', {
            value: 7
          }).a;
        }
      })).a != 7;
    }) ? function (it, key, D) {
      var protoDesc = gOPD(ObjectProto, key);
      if (protoDesc) delete ObjectProto[key];
      dP(it, key, D);
      if (protoDesc && it !== ObjectProto) dP(ObjectProto, key, protoDesc);
    } : dP;

    var wrap = function (tag) {
      var sym = AllSymbols[tag] = _create($Symbol[PROTOTYPE]);
      sym._k = tag;
      return sym;
    };

    var isSymbol = USE_NATIVE && typeof $Symbol.iterator == 'symbol' ? function (it) {
      return typeof it == 'symbol';
    } : function (it) {
      return it instanceof $Symbol;
    };

    var $defineProperty = function defineProperty(it, key, D) {
      if (it === ObjectProto) $defineProperty(OPSymbols, key, D);
      anObject(it);
      key = toPrimitive(key, true);
      anObject(D);
      if (has(AllSymbols, key)) {
        if (!D.enumerable) {
          if (!has(it, HIDDEN)) dP(it, HIDDEN, createDesc(1, {}));
          it[HIDDEN][key] = true;
        } else {
          if (has(it, HIDDEN) && it[HIDDEN][key]) it[HIDDEN][key] = false;
          D = _create(D, {
            enumerable: createDesc(0, false)
          });
        }
        return setSymbolDesc(it, key, D);
      }
      return dP(it, key, D);
    };
    var $defineProperties = function defineProperties(it, P) {
      anObject(it);
      var keys = enumKeys(P = toIObject(P)),
        i = 0,
        l = keys.length,
        key;
      while (l > i) $defineProperty(it, key = keys[i++], P[key]);
      return it;
    };
    var $create = function create(it, P) {
      return P === undefined ? _create(it) : $defineProperties(_create(it), P);
    };
    var $propertyIsEnumerable = function propertyIsEnumerable(key) {
      var E = isEnum.call(this, key = toPrimitive(key, true));
      if (this === ObjectProto && has(AllSymbols, key) && !has(OPSymbols, key)) return false;
      return E || !has(this, key) || !has(AllSymbols, key) || has(this, HIDDEN) && this[HIDDEN][key] ? E : true;
    };
    var $getOwnPropertyDescriptor = function getOwnPropertyDescriptor(it, key) {
      it = toIObject(it);
      key = toPrimitive(key, true);
      if (it === ObjectProto && has(AllSymbols, key) && !has(OPSymbols, key)) return;
      var D = gOPD(it, key);
      if (D && has(AllSymbols, key) && !(has(it, HIDDEN) && it[HIDDEN][key])) D.enumerable = true;
      return D;
    };
    var $getOwnPropertyNames = function getOwnPropertyNames(it) {
      var names = gOPN(toIObject(it)),
        result = [],
        i = 0,
        key;
      while (names.length > i) {
        if (!has(AllSymbols, key = names[i++]) && key != HIDDEN && key != META) result.push(key);
      }
      return result;
    };
    var $getOwnPropertySymbols = function getOwnPropertySymbols(it) {
      var IS_OP = it === ObjectProto,
        names = gOPN(IS_OP ? OPSymbols : toIObject(it)),
        result = [],
        i = 0,
        key;
      while (names.length > i) {
        if (has(AllSymbols, key = names[i++]) && (IS_OP ? has(ObjectProto, key) : true)) result.push(AllSymbols[key]);
      }
      return result;
    };

    // 19.4.1.1 Symbol([description])
    if (!USE_NATIVE) {
      $Symbol = function Symbol() {
        if (this instanceof $Symbol) throw TypeError('Symbol is not a constructor!');
        var tag = uid(arguments.length > 0 ? arguments[0] : undefined);
        var $set = function (value) {
          if (this === ObjectProto) $set.call(OPSymbols, value);
          if (has(this, HIDDEN) && has(this[HIDDEN], tag)) this[HIDDEN][tag] = false;
          setSymbolDesc(this, tag, createDesc(1, value));
        };
        if (DESCRIPTORS && setter) setSymbolDesc(ObjectProto, tag, {
          configurable: true,
          set: $set
        });
        return wrap(tag);
      };
      redefine($Symbol[PROTOTYPE], 'toString', function toString() {
        return this._k;
      });

      $GOPD.f = $getOwnPropertyDescriptor;
      $DP.f = $defineProperty;
      require('./_object-gopn').f = gOPNExt.f = $getOwnPropertyNames;
      require('./_object-pie').f = $propertyIsEnumerable;
      require('./_object-gops').f = $getOwnPropertySymbols;

      if (DESCRIPTORS && !require('./_library')) {
        redefine(ObjectProto, 'propertyIsEnumerable', $propertyIsEnumerable, true);
      }

      wksExt.f = function (name) {
        return wrap(wks(name));
      }
    }

    $export($export.G + $export.W + $export.F * !USE_NATIVE, {
      Symbol: $Symbol
    });

    for (var symbols = (
        // 19.4.2.2, 19.4.2.3, 19.4.2.4, 19.4.2.6, 19.4.2.8, 19.4.2.9, 19.4.2.10, 19.4.2.11, 19.4.2.12, 19.4.2.13, 19.4.2.14
        'hasInstance,isConcatSpreadable,iterator,match,replace,search,species,split,toPrimitive,toStringTag,unscopables'
      ).split(','), i = 0; symbols.length > i;) wks(symbols[i++]);

    for (var symbols = $keys(wks.store), i = 0; symbols.length > i;) wksDefine(symbols[i++]);

    $export($export.S + $export.F * !USE_NATIVE, 'Symbol', {
      // 19.4.2.1 Symbol.for(key)
      'for': function (key) {
        return has(SymbolRegistry, key += '') ?
          SymbolRegistry[key] :
          SymbolRegistry[key] = $Symbol(key);
      },
      // 19.4.2.5 Symbol.keyFor(sym)
      keyFor: function keyFor(key) {
        if (isSymbol(key)) return keyOf(SymbolRegistry, key);
        throw TypeError(key + ' is not a symbol!');
      },
      useSetter: function () {
        setter = true;
      },
      useSimple: function () {
        setter = false;
      }
    });

    $export($export.S + $export.F * !USE_NATIVE, 'Object', {
      // 19.1.2.2 Object.create(O [, Properties])
      create: $create,
      // 19.1.2.4 Object.defineProperty(O, P, Attributes)
      defineProperty: $defineProperty,
      // 19.1.2.3 Object.defineProperties(O, Properties)
      defineProperties: $defineProperties,
      // 19.1.2.6 Object.getOwnPropertyDescriptor(O, P)
      getOwnPropertyDescriptor: $getOwnPropertyDescriptor,
      // 19.1.2.7 Object.getOwnPropertyNames(O)
      getOwnPropertyNames: $getOwnPropertyNames,
      // 19.1.2.8 Object.getOwnPropertySymbols(O)
      getOwnPropertySymbols: $getOwnPropertySymbols
    });

    // 24.3.2 JSON.stringify(value [, replacer [, space]])
    $JSON && $export($export.S + $export.F * (!USE_NATIVE || $fails(function () {
      var S = $Symbol();
      // MS Edge converts symbol values to JSON as {}
      // WebKit converts symbol values to JSON as null
      // V8 throws on boxed symbols
      return _stringify([S]) != '[null]' || _stringify({
        a: S
      }) != '{}' || _stringify(Object(S)) != '{}';
    })), 'JSON', {
      stringify: function stringify(it) {
        if (it === undefined || isSymbol(it)) return; // IE8 returns string on undefined
        var args = [it],
          i = 1,
          replacer, $replacer;
        while (arguments.length > i) args.push(arguments[i++]);
        replacer = args[1];
        if (typeof replacer == 'function') $replacer = replacer;
        if ($replacer || !isArray(replacer)) replacer = function (key, value) {
          if ($replacer) value = $replacer.call(this, key, value);
          if (!isSymbol(value)) return value;
        };
        args[1] = replacer;
        return _stringify.apply($JSON, args);
      }
    });

    // 19.4.3.4 Symbol.prototype[@@toPrimitive](hint)
    $Symbol[PROTOTYPE][TO_PRIMITIVE] || require('./_hide')($Symbol[PROTOTYPE], TO_PRIMITIVE, $Symbol[PROTOTYPE].valueOf);
    // 19.4.3.5 Symbol.prototype[@@toStringTag]
    setToStringTag($Symbol, 'Symbol');
    // 20.2.1.9 Math[@@toStringTag]
    setToStringTag(Math, 'Math', true);
    // 24.3.3 JSON[@@toStringTag]
    setToStringTag(global.JSON, 'JSON', true);
  }, {
    "./_an-object": 32,
    "./_descriptors": 53,
    "./_enum-keys": 56,
    "./_export": 57,
    "./_fails": 59,
    "./_global": 63,
    "./_has": 64,
    "./_hide": 65,
    "./_is-array": 72,
    "./_keyof": 82,
    "./_library": 83,
    "./_meta": 87,
    "./_object-create": 91,
    "./_object-dp": 92,
    "./_object-gopd": 95,
    "./_object-gopn": 97,
    "./_object-gopn-ext": 96,
    "./_object-gops": 98,
    "./_object-keys": 101,
    "./_object-pie": 102,
    "./_property-desc": 110,
    "./_redefine": 112,
    "./_set-to-string-tag": 117,
    "./_shared": 119,
    "./_to-iobject": 132,
    "./_to-primitive": 135,
    "./_uid": 139,
    "./_wks": 142,
    "./_wks-define": 140,
    "./_wks-ext": 141
  }],
  269: [function (require, module, exports) {
    'use strict';
    var $export = require('./_export'),
      $typed = require('./_typed'),
      buffer = require('./_typed-buffer'),
      anObject = require('./_an-object'),
      toIndex = require('./_to-index'),
      toLength = require('./_to-length'),
      isObject = require('./_is-object'),
      ArrayBuffer = require('./_global').ArrayBuffer,
      speciesConstructor = require('./_species-constructor'),
      $ArrayBuffer = buffer.ArrayBuffer,
      $DataView = buffer.DataView,
      $isView = $typed.ABV && ArrayBuffer.isView,
      $slice = $ArrayBuffer.prototype.slice,
      VIEW = $typed.VIEW,
      ARRAY_BUFFER = 'ArrayBuffer';

    $export($export.G + $export.W + $export.F * (ArrayBuffer !== $ArrayBuffer), {
      ArrayBuffer: $ArrayBuffer
    });

    $export($export.S + $export.F * !$typed.CONSTR, ARRAY_BUFFER, {
      // 24.1.3.1 ArrayBuffer.isView(arg)
      isView: function isView(it) {
        return $isView && $isView(it) || isObject(it) && VIEW in it;
      }
    });

    $export($export.P + $export.U + $export.F * require('./_fails')(function () {
      return !new $ArrayBuffer(2).slice(1, undefined).byteLength;
    }), ARRAY_BUFFER, {
      // 24.1.4.3 ArrayBuffer.prototype.slice(start, end)
      slice: function slice(start, end) {
        if ($slice !== undefined && end === undefined) return $slice.call(anObject(this), start); // FF fix
        var len = anObject(this).byteLength,
          first = toIndex(start, len),
          final = toIndex(end === undefined ? len : end, len),
          result = new(speciesConstructor(this, $ArrayBuffer))(toLength(final - first)),
          viewS = new $DataView(this),
          viewT = new $DataView(result),
          index = 0;
        while (first < final) {
          viewT.setUint8(index++, viewS.getUint8(first++));
        }
        return result;
      }
    });

    require('./_set-species')(ARRAY_BUFFER);
  }, {
    "./_an-object": 32,
    "./_export": 57,
    "./_fails": 59,
    "./_global": 63,
    "./_is-object": 74,
    "./_set-species": 116,
    "./_species-constructor": 120,
    "./_to-index": 130,
    "./_to-length": 133,
    "./_typed": 138,
    "./_typed-buffer": 137
  }],
  270: [function (require, module, exports) {
    var $export = require('./_export');
    $export($export.G + $export.W + $export.F * !require('./_typed').ABV, {
      DataView: require('./_typed-buffer').DataView
    });
  }, {
    "./_export": 57,
    "./_typed": 138,
    "./_typed-buffer": 137
  }],
  271: [function (require, module, exports) {
    require('./_typed-array')('Float32', 4, function (init) {
      return function Float32Array(data, byteOffset, length) {
        return init(this, data, byteOffset, length);
      };
    });
  }, {
    "./_typed-array": 136
  }],
  272: [function (require, module, exports) {
    require('./_typed-array')('Float64', 8, function (init) {
      return function Float64Array(data, byteOffset, length) {
        return init(this, data, byteOffset, length);
      };
    });
  }, {
    "./_typed-array": 136
  }],
  273: [function (require, module, exports) {
    require('./_typed-array')('Int16', 2, function (init) {
      return function Int16Array(data, byteOffset, length) {
        return init(this, data, byteOffset, length);
      };
    });
  }, {
    "./_typed-array": 136
  }],
  274: [function (require, module, exports) {
    require('./_typed-array')('Int32', 4, function (init) {
      return function Int32Array(data, byteOffset, length) {
        return init(this, data, byteOffset, length);
      };
    });
  }, {
    "./_typed-array": 136
  }],
  275: [function (require, module, exports) {
    require('./_typed-array')('Int8', 1, function (init) {
      return function Int8Array(data, byteOffset, length) {
        return init(this, data, byteOffset, length);
      };
    });
  }, {
    "./_typed-array": 136
  }],
  276: [function (require, module, exports) {
    require('./_typed-array')('Uint16', 2, function (init) {
      return function Uint16Array(data, byteOffset, length) {
        return init(this, data, byteOffset, length);
      };
    });
  }, {
    "./_typed-array": 136
  }],
  277: [function (require, module, exports) {
    require('./_typed-array')('Uint32', 4, function (init) {
      return function Uint32Array(data, byteOffset, length) {
        return init(this, data, byteOffset, length);
      };
    });
  }, {
    "./_typed-array": 136
  }],
  278: [function (require, module, exports) {
    require('./_typed-array')('Uint8', 1, function (init) {
      return function Uint8Array(data, byteOffset, length) {
        return init(this, data, byteOffset, length);
      };
    });
  }, {
    "./_typed-array": 136
  }],
  279: [function (require, module, exports) {
    require('./_typed-array')('Uint8', 1, function (init) {
      return function Uint8ClampedArray(data, byteOffset, length) {
        return init(this, data, byteOffset, length);
      };
    }, true);
  }, {
    "./_typed-array": 136
  }],
  280: [function (require, module, exports) {
    'use strict';
    var each = require('./_array-methods')(0),
      redefine = require('./_redefine'),
      meta = require('./_meta'),
      assign = require('./_object-assign'),
      weak = require('./_collection-weak'),
      isObject = require('./_is-object'),
      getWeak = meta.getWeak,
      isExtensible = Object.isExtensible,
      uncaughtFrozenStore = weak.ufstore,
      tmp = {},
      InternalMap;

    var wrapper = function (get) {
      return function WeakMap() {
        return get(this, arguments.length > 0 ? arguments[0] : undefined);
      };
    };

    var methods = {
      // 23.3.3.3 WeakMap.prototype.get(key)
      get: function get(key) {
        if (isObject(key)) {
          var data = getWeak(key);
          if (data === true) return uncaughtFrozenStore(this).get(key);
          return data ? data[this._i] : undefined;
        }
      },
      // 23.3.3.5 WeakMap.prototype.set(key, value)
      set: function set(key, value) {
        return weak.def(this, key, value);
      }
    };

    // 23.3 WeakMap Objects
    var $WeakMap = module.exports = require('./_collection')('WeakMap', wrapper, methods, weak, true, true);

    // IE11 WeakMap frozen keys fix
    if (new $WeakMap().set((Object.freeze || Object)(tmp), 7).get(tmp) != 7) {
      InternalMap = weak.getConstructor(wrapper);
      assign(InternalMap.prototype, methods);
      meta.NEED = true;
      each(['delete', 'has', 'get', 'set'], function (key) {
        var proto = $WeakMap.prototype,
          method = proto[key];
        redefine(proto, key, function (a, b) {
          // store frozen objects on internal weakmap shim
          if (isObject(a) && !isExtensible(a)) {
            if (!this._f) this._f = new InternalMap;
            var result = this._f[key](a, b);
            return key == 'set' ? this : result;
            // store all the rest on native weakmap
          }
          return method.call(this, a, b);
        });
      });
    }
  }, {
    "./_array-methods": 37,
    "./_collection": 47,
    "./_collection-weak": 46,
    "./_is-object": 74,
    "./_meta": 87,
    "./_object-assign": 90,
    "./_redefine": 112
  }],
  281: [function (require, module, exports) {
    'use strict';
    var weak = require('./_collection-weak');

    // 23.4 WeakSet Objects
    require('./_collection')('WeakSet', function (get) {
      return function WeakSet() {
        return get(this, arguments.length > 0 ? arguments[0] : undefined);
      };
    }, {
      // 23.4.3.1 WeakSet.prototype.add(value)
      add: function add(value) {
        return weak.def(this, value, true);
      }
    }, weak, false, true);
  }, {
    "./_collection": 47,
    "./_collection-weak": 46
  }],
  282: [function (require, module, exports) {
    'use strict';
    // https://github.com/tc39/Array.prototype.includes
    var $export = require('./_export'),
      $includes = require('./_array-includes')(true);

    $export($export.P, 'Array', {
      includes: function includes(el /*, fromIndex = 0 */ ) {
        return $includes(this, el, arguments.length > 1 ? arguments[1] : undefined);
      }
    });

    require('./_add-to-unscopables')('includes');
  }, {
    "./_add-to-unscopables": 30,
    "./_array-includes": 36,
    "./_export": 57
  }],
  283: [function (require, module, exports) {
    // https://github.com/rwaldron/tc39-notes/blob/master/es6/2014-09/sept-25.md#510-globalasap-for-enqueuing-a-microtask
    var $export = require('./_export'),
      microtask = require('./_microtask')(),
      process = require('./_global').process,
      isNode = require('./_cof')(process) == 'process';

    $export($export.G, {
      asap: function asap(fn) {
        var domain = isNode && process.domain;
        microtask(domain ? domain.bind(fn) : fn);
      }
    });
  }, {
    "./_cof": 43,
    "./_export": 57,
    "./_global": 63,
    "./_microtask": 89
  }],
  284: [function (require, module, exports) {
    // https://github.com/ljharb/proposal-is-error
    var $export = require('./_export'),
      cof = require('./_cof');

    $export($export.S, 'Error', {
      isError: function isError(it) {
        return cof(it) === 'Error';
      }
    });
  }, {
    "./_cof": 43,
    "./_export": 57
  }],
  285: [function (require, module, exports) {
    // https://github.com/DavidBruant/Map-Set.prototype.toJSON
    var $export = require('./_export');

    $export($export.P + $export.R, 'Map', {
      toJSON: require('./_collection-to-json')('Map')
    });
  }, {
    "./_collection-to-json": 45,
    "./_export": 57
  }],
  286: [function (require, module, exports) {
    // https://gist.github.com/BrendanEich/4294d5c212a6d2254703
    var $export = require('./_export');

    $export($export.S, 'Math', {
      iaddh: function iaddh(x0, x1, y0, y1) {
        var $x0 = x0 >>> 0,
          $x1 = x1 >>> 0,
          $y0 = y0 >>> 0;
        return $x1 + (y1 >>> 0) + (($x0 & $y0 | ($x0 | $y0) & ~($x0 + $y0 >>> 0)) >>> 31) | 0;
      }
    });
  }, {
    "./_export": 57
  }],
  287: [function (require, module, exports) {
    // https://gist.github.com/BrendanEich/4294d5c212a6d2254703
    var $export = require('./_export');

    $export($export.S, 'Math', {
      imulh: function imulh(u, v) {
        var UINT16 = 0xffff,
          $u = +u,
          $v = +v,
          u0 = $u & UINT16,
          v0 = $v & UINT16,
          u1 = $u >> 16,
          v1 = $v >> 16,
          t = (u1 * v0 >>> 0) + (u0 * v0 >>> 16);
        return u1 * v1 + (t >> 16) + ((u0 * v1 >>> 0) + (t & UINT16) >> 16);
      }
    });
  }, {
    "./_export": 57
  }],
  288: [function (require, module, exports) {
    // https://gist.github.com/BrendanEich/4294d5c212a6d2254703
    var $export = require('./_export');

    $export($export.S, 'Math', {
      isubh: function isubh(x0, x1, y0, y1) {
        var $x0 = x0 >>> 0,
          $x1 = x1 >>> 0,
          $y0 = y0 >>> 0;
        return $x1 - (y1 >>> 0) - ((~$x0 & $y0 | ~($x0 ^ $y0) & $x0 - $y0 >>> 0) >>> 31) | 0;
      }
    });
  }, {
    "./_export": 57
  }],
  289: [function (require, module, exports) {
    // https://gist.github.com/BrendanEich/4294d5c212a6d2254703
    var $export = require('./_export');

    $export($export.S, 'Math', {
      umulh: function umulh(u, v) {
        var UINT16 = 0xffff,
          $u = +u,
          $v = +v,
          u0 = $u & UINT16,
          v0 = $v & UINT16,
          u1 = $u >>> 16,
          v1 = $v >>> 16,
          t = (u1 * v0 >>> 0) + (u0 * v0 >>> 16);
        return u1 * v1 + (t >>> 16) + ((u0 * v1 >>> 0) + (t & UINT16) >>> 16);
      }
    });
  }, {
    "./_export": 57
  }],
  290: [function (require, module, exports) {
    'use strict';
    var $export = require('./_export'),
      toObject = require('./_to-object'),
      aFunction = require('./_a-function'),
      $defineProperty = require('./_object-dp');

    // B.2.2.2 Object.prototype.__defineGetter__(P, getter)
    require('./_descriptors') && $export($export.P + require('./_object-forced-pam'), 'Object', {
      __defineGetter__: function __defineGetter__(P, getter) {
        $defineProperty.f(toObject(this), P, {
          get: aFunction(getter),
          enumerable: true,
          configurable: true
        });
      }
    });
  }, {
    "./_a-function": 28,
    "./_descriptors": 53,
    "./_export": 57,
    "./_object-dp": 92,
    "./_object-forced-pam": 94,
    "./_to-object": 134
  }],
  291: [function (require, module, exports) {
    'use strict';
    var $export = require('./_export'),
      toObject = require('./_to-object'),
      aFunction = require('./_a-function'),
      $defineProperty = require('./_object-dp');

    // B.2.2.3 Object.prototype.__defineSetter__(P, setter)
    require('./_descriptors') && $export($export.P + require('./_object-forced-pam'), 'Object', {
      __defineSetter__: function __defineSetter__(P, setter) {
        $defineProperty.f(toObject(this), P, {
          set: aFunction(setter),
          enumerable: true,
          configurable: true
        });
      }
    });
  }, {
    "./_a-function": 28,
    "./_descriptors": 53,
    "./_export": 57,
    "./_object-dp": 92,
    "./_object-forced-pam": 94,
    "./_to-object": 134
  }],
  292: [function (require, module, exports) {
    // https://github.com/tc39/proposal-object-values-entries
    var $export = require('./_export'),
      $entries = require('./_object-to-array')(true);

    $export($export.S, 'Object', {
      entries: function entries(it) {
        return $entries(it);
      }
    });
  }, {
    "./_export": 57,
    "./_object-to-array": 104
  }],
  293: [function (require, module, exports) {
    // https://github.com/tc39/proposal-object-getownpropertydescriptors
    var $export = require('./_export'),
      ownKeys = require('./_own-keys'),
      toIObject = require('./_to-iobject'),
      gOPD = require('./_object-gopd'),
      createProperty = require('./_create-property');

    $export($export.S, 'Object', {
      getOwnPropertyDescriptors: function getOwnPropertyDescriptors(object) {
        var O = toIObject(object),
          getDesc = gOPD.f,
          keys = ownKeys(O),
          result = {},
          i = 0,
          key;
        while (keys.length > i) createProperty(result, key = keys[i++], getDesc(O, key));
        return result;
      }
    });
  }, {
    "./_create-property": 49,
    "./_export": 57,
    "./_object-gopd": 95,
    "./_own-keys": 105,
    "./_to-iobject": 132
  }],
  294: [function (require, module, exports) {
    'use strict';
    var $export = require('./_export'),
      toObject = require('./_to-object'),
      toPrimitive = require('./_to-primitive'),
      getPrototypeOf = require('./_object-gpo'),
      getOwnPropertyDescriptor = require('./_object-gopd').f;

    // B.2.2.4 Object.prototype.__lookupGetter__(P)
    require('./_descriptors') && $export($export.P + require('./_object-forced-pam'), 'Object', {
      __lookupGetter__: function __lookupGetter__(P) {
        var O = toObject(this),
          K = toPrimitive(P, true),
          D;
        do {
          if (D = getOwnPropertyDescriptor(O, K)) return D.get;
        } while (O = getPrototypeOf(O));
      }
    });
  }, {
    "./_descriptors": 53,
    "./_export": 57,
    "./_object-forced-pam": 94,
    "./_object-gopd": 95,
    "./_object-gpo": 99,
    "./_to-object": 134,
    "./_to-primitive": 135
  }],
  295: [function (require, module, exports) {
    'use strict';
    var $export = require('./_export'),
      toObject = require('./_to-object'),
      toPrimitive = require('./_to-primitive'),
      getPrototypeOf = require('./_object-gpo'),
      getOwnPropertyDescriptor = require('./_object-gopd').f;

    // B.2.2.5 Object.prototype.__lookupSetter__(P)
    require('./_descriptors') && $export($export.P + require('./_object-forced-pam'), 'Object', {
      __lookupSetter__: function __lookupSetter__(P) {
        var O = toObject(this),
          K = toPrimitive(P, true),
          D;
        do {
          if (D = getOwnPropertyDescriptor(O, K)) return D.set;
        } while (O = getPrototypeOf(O));
      }
    });
  }, {
    "./_descriptors": 53,
    "./_export": 57,
    "./_object-forced-pam": 94,
    "./_object-gopd": 95,
    "./_object-gpo": 99,
    "./_to-object": 134,
    "./_to-primitive": 135
  }],
  296: [function (require, module, exports) {
    // https://github.com/tc39/proposal-object-values-entries
    var $export = require('./_export'),
      $values = require('./_object-to-array')(false);

    $export($export.S, 'Object', {
      values: function values(it) {
        return $values(it);
      }
    });
  }, {
    "./_export": 57,
    "./_object-to-array": 104
  }],
  297: [function (require, module, exports) {
    'use strict';
    // https://github.com/zenparsing/es-observable
    var $export = require('./_export'),
      global = require('./_global'),
      core = require('./_core'),
      microtask = require('./_microtask')(),
      OBSERVABLE = require('./_wks')('observable'),
      aFunction = require('./_a-function'),
      anObject = require('./_an-object'),
      anInstance = require('./_an-instance'),
      redefineAll = require('./_redefine-all'),
      hide = require('./_hide'),
      forOf = require('./_for-of'),
      RETURN = forOf.RETURN;

    var getMethod = function (fn) {
      return fn == null ? undefined : aFunction(fn);
    };

    var cleanupSubscription = function (subscription) {
      var cleanup = subscription._c;
      if (cleanup) {
        subscription._c = undefined;
        cleanup();
      }
    };

    var subscriptionClosed = function (subscription) {
      return subscription._o === undefined;
    };

    var closeSubscription = function (subscription) {
      if (!subscriptionClosed(subscription)) {
        subscription._o = undefined;
        cleanupSubscription(subscription);
      }
    };

    var Subscription = function (observer, subscriber) {
      anObject(observer);
      this._c = undefined;
      this._o = observer;
      observer = new SubscriptionObserver(this);
      try {
        var cleanup = subscriber(observer),
          subscription = cleanup;
        if (cleanup != null) {
          if (typeof cleanup.unsubscribe === 'function') cleanup = function () {
            subscription.unsubscribe();
          };
          else aFunction(cleanup);
          this._c = cleanup;
        }
      } catch (e) {
        observer.error(e);
        return;
      }
      if (subscriptionClosed(this)) cleanupSubscription(this);
    };

    Subscription.prototype = redefineAll({}, {
      unsubscribe: function unsubscribe() {
        closeSubscription(this);
      }
    });

    var SubscriptionObserver = function (subscription) {
      this._s = subscription;
    };

    SubscriptionObserver.prototype = redefineAll({}, {
      next: function next(value) {
        var subscription = this._s;
        if (!subscriptionClosed(subscription)) {
          var observer = subscription._o;
          try {
            var m = getMethod(observer.next);
            if (m) return m.call(observer, value);
          } catch (e) {
            try {
              closeSubscription(subscription);
            } finally {
              throw e;
            }
          }
        }
      },
      error: function error(value) {
        var subscription = this._s;
        if (subscriptionClosed(subscription)) throw value;
        var observer = subscription._o;
        subscription._o = undefined;
        try {
          var m = getMethod(observer.error);
          if (!m) throw value;
          value = m.call(observer, value);
        } catch (e) {
          try {
            cleanupSubscription(subscription);
          } finally {
            throw e;
          }
        }
        cleanupSubscription(subscription);
        return value;
      },
      complete: function complete(value) {
        var subscription = this._s;
        if (!subscriptionClosed(subscription)) {
          var observer = subscription._o;
          subscription._o = undefined;
          try {
            var m = getMethod(observer.complete);
            value = m ? m.call(observer, value) : undefined;
          } catch (e) {
            try {
              cleanupSubscription(subscription);
            } finally {
              throw e;
            }
          }
          cleanupSubscription(subscription);
          return value;
        }
      }
    });

    var $Observable = function Observable(subscriber) {
      anInstance(this, $Observable, 'Observable', '_f')._f = aFunction(subscriber);
    };

    redefineAll($Observable.prototype, {
      subscribe: function subscribe(observer) {
        return new Subscription(observer, this._f);
      },
      forEach: function forEach(fn) {
        var that = this;
        return new(core.Promise || global.Promise)(function (resolve, reject) {
          aFunction(fn);
          var subscription = that.subscribe({
            next: function (value) {
              try {
                return fn(value);
              } catch (e) {
                reject(e);
                subscription.unsubscribe();
              }
            },
            error: reject,
            complete: resolve
          });
        });
      }
    });

    redefineAll($Observable, {
      from: function from(x) {
        var C = typeof this === 'function' ? this : $Observable;
        var method = getMethod(anObject(x)[OBSERVABLE]);
        if (method) {
          var observable = anObject(method.call(x));
          return observable.constructor === C ? observable : new C(function (observer) {
            return observable.subscribe(observer);
          });
        }
        return new C(function (observer) {
          var done = false;
          microtask(function () {
            if (!done) {
              try {
                if (forOf(x, false, function (it) {
                    observer.next(it);
                    if (done) return RETURN;
                  }) === RETURN) return;
              } catch (e) {
                if (done) throw e;
                observer.error(e);
                return;
              }
              observer.complete();
            }
          });
          return function () {
            done = true;
          };
        });
      },
      of: function of () {
        for (var i = 0, l = arguments.length, items = Array(l); i < l;) items[i] = arguments[i++];
        return new(typeof this === 'function' ? this : $Observable)(function (observer) {
          var done = false;
          microtask(function () {
            if (!done) {
              for (var i = 0; i < items.length; ++i) {
                observer.next(items[i]);
                if (done) return;
              }
              observer.complete();
            }
          });
          return function () {
            done = true;
          };
        });
      }
    });

    hide($Observable.prototype, OBSERVABLE, function () {
      return this;
    });

    $export($export.G, {
      Observable: $Observable
    });

    require('./_set-species')('Observable');
  }, {
    "./_a-function": 28,
    "./_an-instance": 31,
    "./_an-object": 32,
    "./_core": 48,
    "./_export": 57,
    "./_for-of": 62,
    "./_global": 63,
    "./_hide": 65,
    "./_microtask": 89,
    "./_redefine-all": 111,
    "./_set-species": 116,
    "./_wks": 142
  }],
  298: [function (require, module, exports) {
    var metadata = require('./_metadata'),
      anObject = require('./_an-object'),
      toMetaKey = metadata.key,
      ordinaryDefineOwnMetadata = metadata.set;

    metadata.exp({
      defineMetadata: function defineMetadata(metadataKey, metadataValue, target, targetKey) {
        ordinaryDefineOwnMetadata(metadataKey, metadataValue, anObject(target), toMetaKey(targetKey));
      }
    });
  }, {
    "./_an-object": 32,
    "./_metadata": 88
  }],
  299: [function (require, module, exports) {
    var metadata = require('./_metadata'),
      anObject = require('./_an-object'),
      toMetaKey = metadata.key,
      getOrCreateMetadataMap = metadata.map,
      store = metadata.store;

    metadata.exp({
      deleteMetadata: function deleteMetadata(metadataKey, target /*, targetKey */ ) {
        var targetKey = arguments.length < 3 ? undefined : toMetaKey(arguments[2]),
          metadataMap = getOrCreateMetadataMap(anObject(target), targetKey, false);
        if (metadataMap === undefined || !metadataMap['delete'](metadataKey)) return false;
        if (metadataMap.size) return true;
        var targetMetadata = store.get(target);
        targetMetadata['delete'](targetKey);
        return !!targetMetadata.size || store['delete'](target);
      }
    });
  }, {
    "./_an-object": 32,
    "./_metadata": 88
  }],
  300: [function (require, module, exports) {
    var Set = require('./es6.set'),
      from = require('./_array-from-iterable'),
      metadata = require('./_metadata'),
      anObject = require('./_an-object'),
      getPrototypeOf = require('./_object-gpo'),
      ordinaryOwnMetadataKeys = metadata.keys,
      toMetaKey = metadata.key;

    var ordinaryMetadataKeys = function (O, P) {
      var oKeys = ordinaryOwnMetadataKeys(O, P),
        parent = getPrototypeOf(O);
      if (parent === null) return oKeys;
      var pKeys = ordinaryMetadataKeys(parent, P);
      return pKeys.length ? oKeys.length ? from(new Set(oKeys.concat(pKeys))) : pKeys : oKeys;
    };

    metadata.exp({
      getMetadataKeys: function getMetadataKeys(target /*, targetKey */ ) {
        return ordinaryMetadataKeys(anObject(target), arguments.length < 2 ? undefined : toMetaKey(arguments[1]));
      }
    });
  }, {
    "./_an-object": 32,
    "./_array-from-iterable": 35,
    "./_metadata": 88,
    "./_object-gpo": 99,
    "./es6.set": 245
  }],
  301: [function (require, module, exports) {
    var metadata = require('./_metadata'),
      anObject = require('./_an-object'),
      getPrototypeOf = require('./_object-gpo'),
      ordinaryHasOwnMetadata = metadata.has,
      ordinaryGetOwnMetadata = metadata.get,
      toMetaKey = metadata.key;

    var ordinaryGetMetadata = function (MetadataKey, O, P) {
      var hasOwn = ordinaryHasOwnMetadata(MetadataKey, O, P);
      if (hasOwn) return ordinaryGetOwnMetadata(MetadataKey, O, P);
      var parent = getPrototypeOf(O);
      return parent !== null ? ordinaryGetMetadata(MetadataKey, parent, P) : undefined;
    };

    metadata.exp({
      getMetadata: function getMetadata(metadataKey, target /*, targetKey */ ) {
        return ordinaryGetMetadata(metadataKey, anObject(target), arguments.length < 3 ? undefined : toMetaKey(arguments[2]));
      }
    });
  }, {
    "./_an-object": 32,
    "./_metadata": 88,
    "./_object-gpo": 99
  }],
  302: [function (require, module, exports) {
    var metadata = require('./_metadata'),
      anObject = require('./_an-object'),
      ordinaryOwnMetadataKeys = metadata.keys,
      toMetaKey = metadata.key;

    metadata.exp({
      getOwnMetadataKeys: function getOwnMetadataKeys(target /*, targetKey */ ) {
        return ordinaryOwnMetadataKeys(anObject(target), arguments.length < 2 ? undefined : toMetaKey(arguments[1]));
      }
    });
  }, {
    "./_an-object": 32,
    "./_metadata": 88
  }],
  303: [function (require, module, exports) {
    var metadata = require('./_metadata'),
      anObject = require('./_an-object'),
      ordinaryGetOwnMetadata = metadata.get,
      toMetaKey = metadata.key;

    metadata.exp({
      getOwnMetadata: function getOwnMetadata(metadataKey, target /*, targetKey */ ) {
        return ordinaryGetOwnMetadata(metadataKey, anObject(target), arguments.length < 3 ? undefined : toMetaKey(arguments[2]));
      }
    });
  }, {
    "./_an-object": 32,
    "./_metadata": 88
  }],
  304: [function (require, module, exports) {
    var metadata = require('./_metadata'),
      anObject = require('./_an-object'),
      getPrototypeOf = require('./_object-gpo'),
      ordinaryHasOwnMetadata = metadata.has,
      toMetaKey = metadata.key;

    var ordinaryHasMetadata = function (MetadataKey, O, P) {
      var hasOwn = ordinaryHasOwnMetadata(MetadataKey, O, P);
      if (hasOwn) return true;
      var parent = getPrototypeOf(O);
      return parent !== null ? ordinaryHasMetadata(MetadataKey, parent, P) : false;
    };

    metadata.exp({
      hasMetadata: function hasMetadata(metadataKey, target /*, targetKey */ ) {
        return ordinaryHasMetadata(metadataKey, anObject(target), arguments.length < 3 ? undefined : toMetaKey(arguments[2]));
      }
    });
  }, {
    "./_an-object": 32,
    "./_metadata": 88,
    "./_object-gpo": 99
  }],
  305: [function (require, module, exports) {
    var metadata = require('./_metadata'),
      anObject = require('./_an-object'),
      ordinaryHasOwnMetadata = metadata.has,
      toMetaKey = metadata.key;

    metadata.exp({
      hasOwnMetadata: function hasOwnMetadata(metadataKey, target /*, targetKey */ ) {
        return ordinaryHasOwnMetadata(metadataKey, anObject(target), arguments.length < 3 ? undefined : toMetaKey(arguments[2]));
      }
    });
  }, {
    "./_an-object": 32,
    "./_metadata": 88
  }],
  306: [function (require, module, exports) {
    var metadata = require('./_metadata'),
      anObject = require('./_an-object'),
      aFunction = require('./_a-function'),
      toMetaKey = metadata.key,
      ordinaryDefineOwnMetadata = metadata.set;

    metadata.exp({
      metadata: function metadata(metadataKey, metadataValue) {
        return function decorator(target, targetKey) {
          ordinaryDefineOwnMetadata(
            metadataKey, metadataValue,
            (targetKey !== undefined ? anObject : aFunction)(target),
            toMetaKey(targetKey)
          );
        };
      }
    });
  }, {
    "./_a-function": 28,
    "./_an-object": 32,
    "./_metadata": 88
  }],
  307: [function (require, module, exports) {
    // https://github.com/DavidBruant/Map-Set.prototype.toJSON
    var $export = require('./_export');

    $export($export.P + $export.R, 'Set', {
      toJSON: require('./_collection-to-json')('Set')
    });
  }, {
    "./_collection-to-json": 45,
    "./_export": 57
  }],
  308: [function (require, module, exports) {
    'use strict';
    // https://github.com/mathiasbynens/String.prototype.at
    var $export = require('./_export'),
      $at = require('./_string-at')(true);

    $export($export.P, 'String', {
      at: function at(pos) {
        return $at(this, pos);
      }
    });
  }, {
    "./_export": 57,
    "./_string-at": 122
  }],
  309: [function (require, module, exports) {
    'use strict';
    // https://tc39.github.io/String.prototype.matchAll/
    var $export = require('./_export'),
      defined = require('./_defined'),
      toLength = require('./_to-length'),
      isRegExp = require('./_is-regexp'),
      getFlags = require('./_flags'),
      RegExpProto = RegExp.prototype;

    var $RegExpStringIterator = function (regexp, string) {
      this._r = regexp;
      this._s = string;
    };

    require('./_iter-create')($RegExpStringIterator, 'RegExp String', function next() {
      var match = this._r.exec(this._s);
      return {
        value: match,
        done: match === null
      };
    });

    $export($export.P, 'String', {
      matchAll: function matchAll(regexp) {
        defined(this);
        if (!isRegExp(regexp)) throw TypeError(regexp + ' is not a regexp!');
        var S = String(this),
          flags = 'flags' in RegExpProto ? String(regexp.flags) : getFlags.call(regexp),
          rx = new RegExp(regexp.source, ~flags.indexOf('g') ? flags : 'g' + flags);
        rx.lastIndex = toLength(regexp.lastIndex);
        return new $RegExpStringIterator(rx, S);
      }
    });
  }, {
    "./_defined": 52,
    "./_export": 57,
    "./_flags": 61,
    "./_is-regexp": 75,
    "./_iter-create": 77,
    "./_to-length": 133
  }],
  310: [function (require, module, exports) {
    'use strict';
    // https://github.com/tc39/proposal-string-pad-start-end
    var $export = require('./_export'),
      $pad = require('./_string-pad');

    $export($export.P, 'String', {
      padEnd: function padEnd(maxLength /*, fillString = ' ' */ ) {
        return $pad(this, maxLength, arguments.length > 1 ? arguments[1] : undefined, false);
      }
    });
  }, {
    "./_export": 57,
    "./_string-pad": 125
  }],
  311: [function (require, module, exports) {
    'use strict';
    // https://github.com/tc39/proposal-string-pad-start-end
    var $export = require('./_export'),
      $pad = require('./_string-pad');

    $export($export.P, 'String', {
      padStart: function padStart(maxLength /*, fillString = ' ' */ ) {
        return $pad(this, maxLength, arguments.length > 1 ? arguments[1] : undefined, true);
      }
    });
  }, {
    "./_export": 57,
    "./_string-pad": 125
  }],
  312: [function (require, module, exports) {
    'use strict';
    // https://github.com/sebmarkbage/ecmascript-string-left-right-trim
    require('./_string-trim')('trimLeft', function ($trim) {
      return function trimLeft() {
        return $trim(this, 1);
      };
    }, 'trimStart');
  }, {
    "./_string-trim": 127
  }],
  313: [function (require, module, exports) {
    'use strict';
    // https://github.com/sebmarkbage/ecmascript-string-left-right-trim
    require('./_string-trim')('trimRight', function ($trim) {
      return function trimRight() {
        return $trim(this, 2);
      };
    }, 'trimEnd');
  }, {
    "./_string-trim": 127
  }],
  314: [function (require, module, exports) {
    require('./_wks-define')('asyncIterator');
  }, {
    "./_wks-define": 140
  }],
  315: [function (require, module, exports) {
    require('./_wks-define')('observable');
  }, {
    "./_wks-define": 140
  }],
  316: [function (require, module, exports) {
    // https://github.com/ljharb/proposal-global
    var $export = require('./_export');

    $export($export.S, 'System', {
      global: require('./_global')
    });
  }, {
    "./_export": 57,
    "./_global": 63
  }],
  317: [function (require, module, exports) {
    var $iterators = require('./es6.array.iterator'),
      redefine = require('./_redefine'),
      global = require('./_global'),
      hide = require('./_hide'),
      Iterators = require('./_iterators'),
      wks = require('./_wks'),
      ITERATOR = wks('iterator'),
      TO_STRING_TAG = wks('toStringTag'),
      ArrayValues = Iterators.Array;

    for (var collections = ['NodeList', 'DOMTokenList', 'MediaList', 'StyleSheetList', 'CSSRuleList'], i = 0; i < 5; i++) {
      var NAME = collections[i],
        Collection = global[NAME],
        proto = Collection && Collection.prototype,
        key;
      if (proto) {
        if (!proto[ITERATOR]) hide(proto, ITERATOR, ArrayValues);
        if (!proto[TO_STRING_TAG]) hide(proto, TO_STRING_TAG, NAME);
        Iterators[NAME] = ArrayValues;
        for (key in $iterators)
          if (!proto[key]) redefine(proto, key, $iterators[key], true);
      }
    }
  }, {
    "./_global": 63,
    "./_hide": 65,
    "./_iterators": 81,
    "./_redefine": 112,
    "./_wks": 142,
    "./es6.array.iterator": 155
  }],
  318: [function (require, module, exports) {
    var $export = require('./_export'),
      $task = require('./_task');
    $export($export.G + $export.B, {
      setImmediate: $task.set,
      clearImmediate: $task.clear
    });
  }, {
    "./_export": 57,
    "./_task": 129
  }],
  319: [function (require, module, exports) {
    // ie9- setTimeout & setInterval additional parameters fix
    var global = require('./_global'),
      $export = require('./_export'),
      invoke = require('./_invoke'),
      partial = require('./_partial'),
      navigator = global.navigator,
      MSIE = !!navigator && /MSIE .\./.test(navigator.userAgent); // <- dirty ie9- check
    var wrap = function (set) {
      return MSIE ? function (fn, time /*, ...args */ ) {
        return set(invoke(
          partial,
          [].slice.call(arguments, 2),
          typeof fn == 'function' ? fn : Function(fn)
        ), time);
      } : set;
    };
    $export($export.G + $export.B + $export.F * MSIE, {
      setTimeout: wrap(global.setTimeout),
      setInterval: wrap(global.setInterval)
    });
  }, {
    "./_export": 57,
    "./_global": 63,
    "./_invoke": 69,
    "./_partial": 108
  }],
  320: [function (require, module, exports) {
    require('./modules/es6.symbol');
    require('./modules/es6.object.create');
    require('./modules/es6.object.define-property');
    require('./modules/es6.object.define-properties');
    require('./modules/es6.object.get-own-property-descriptor');
    require('./modules/es6.object.get-prototype-of');
    require('./modules/es6.object.keys');
    require('./modules/es6.object.get-own-property-names');
    require('./modules/es6.object.freeze');
    require('./modules/es6.object.seal');
    require('./modules/es6.object.prevent-extensions');
    require('./modules/es6.object.is-frozen');
    require('./modules/es6.object.is-sealed');
    require('./modules/es6.object.is-extensible');
    require('./modules/es6.object.assign');
    require('./modules/es6.object.is');
    require('./modules/es6.object.set-prototype-of');
    require('./modules/es6.object.to-string');
    require('./modules/es6.function.bind');
    require('./modules/es6.function.name');
    require('./modules/es6.function.has-instance');
    require('./modules/es6.parse-int');
    require('./modules/es6.parse-float');
    require('./modules/es6.number.constructor');
    require('./modules/es6.number.to-fixed');
    require('./modules/es6.number.to-precision');
    require('./modules/es6.number.epsilon');
    require('./modules/es6.number.is-finite');
    require('./modules/es6.number.is-integer');
    require('./modules/es6.number.is-nan');
    require('./modules/es6.number.is-safe-integer');
    require('./modules/es6.number.max-safe-integer');
    require('./modules/es6.number.min-safe-integer');
    require('./modules/es6.number.parse-float');
    require('./modules/es6.number.parse-int');
    require('./modules/es6.math.acosh');
    require('./modules/es6.math.asinh');
    require('./modules/es6.math.atanh');
    require('./modules/es6.math.cbrt');
    require('./modules/es6.math.clz32');
    require('./modules/es6.math.cosh');
    require('./modules/es6.math.expm1');
    require('./modules/es6.math.fround');
    require('./modules/es6.math.hypot');
    require('./modules/es6.math.imul');
    require('./modules/es6.math.log10');
    require('./modules/es6.math.log1p');
    require('./modules/es6.math.log2');
    require('./modules/es6.math.sign');
    require('./modules/es6.math.sinh');
    require('./modules/es6.math.tanh');
    require('./modules/es6.math.trunc');
    require('./modules/es6.string.from-code-point');
    require('./modules/es6.string.raw');
    require('./modules/es6.string.trim');
    require('./modules/es6.string.iterator');
    require('./modules/es6.string.code-point-at');
    require('./modules/es6.string.ends-with');
    require('./modules/es6.string.includes');
    require('./modules/es6.string.repeat');
    require('./modules/es6.string.starts-with');
    require('./modules/es6.string.anchor');
    require('./modules/es6.string.big');
    require('./modules/es6.string.blink');
    require('./modules/es6.string.bold');
    require('./modules/es6.string.fixed');
    require('./modules/es6.string.fontcolor');
    require('./modules/es6.string.fontsize');
    require('./modules/es6.string.italics');
    require('./modules/es6.string.link');
    require('./modules/es6.string.small');
    require('./modules/es6.string.strike');
    require('./modules/es6.string.sub');
    require('./modules/es6.string.sup');
    require('./modules/es6.date.now');
    require('./modules/es6.date.to-json');
    require('./modules/es6.date.to-iso-string');
    require('./modules/es6.date.to-string');
    require('./modules/es6.date.to-primitive');
    require('./modules/es6.array.is-array');
    require('./modules/es6.array.from');
    require('./modules/es6.array.of');
    require('./modules/es6.array.join');
    require('./modules/es6.array.slice');
    require('./modules/es6.array.sort');
    require('./modules/es6.array.for-each');
    require('./modules/es6.array.map');
    require('./modules/es6.array.filter');
    require('./modules/es6.array.some');
    require('./modules/es6.array.every');
    require('./modules/es6.array.reduce');
    require('./modules/es6.array.reduce-right');
    require('./modules/es6.array.index-of');
    require('./modules/es6.array.last-index-of');
    require('./modules/es6.array.copy-within');
    require('./modules/es6.array.fill');
    require('./modules/es6.array.find');
    require('./modules/es6.array.find-index');
    require('./modules/es6.array.species');
    require('./modules/es6.array.iterator');
    require('./modules/es6.regexp.constructor');
    require('./modules/es6.regexp.to-string');
    require('./modules/es6.regexp.flags');
    require('./modules/es6.regexp.match');
    require('./modules/es6.regexp.replace');
    require('./modules/es6.regexp.search');
    require('./modules/es6.regexp.split');
    require('./modules/es6.promise');
    require('./modules/es6.map');
    require('./modules/es6.set');
    require('./modules/es6.weak-map');
    require('./modules/es6.weak-set');
    require('./modules/es6.typed.array-buffer');
    require('./modules/es6.typed.data-view');
    require('./modules/es6.typed.int8-array');
    require('./modules/es6.typed.uint8-array');
    require('./modules/es6.typed.uint8-clamped-array');
    require('./modules/es6.typed.int16-array');
    require('./modules/es6.typed.uint16-array');
    require('./modules/es6.typed.int32-array');
    require('./modules/es6.typed.uint32-array');
    require('./modules/es6.typed.float32-array');
    require('./modules/es6.typed.float64-array');
    require('./modules/es6.reflect.apply');
    require('./modules/es6.reflect.construct');
    require('./modules/es6.reflect.define-property');
    require('./modules/es6.reflect.delete-property');
    require('./modules/es6.reflect.enumerate');
    require('./modules/es6.reflect.get');
    require('./modules/es6.reflect.get-own-property-descriptor');
    require('./modules/es6.reflect.get-prototype-of');
    require('./modules/es6.reflect.has');
    require('./modules/es6.reflect.is-extensible');
    require('./modules/es6.reflect.own-keys');
    require('./modules/es6.reflect.prevent-extensions');
    require('./modules/es6.reflect.set');
    require('./modules/es6.reflect.set-prototype-of');
    require('./modules/es7.array.includes');
    require('./modules/es7.string.at');
    require('./modules/es7.string.pad-start');
    require('./modules/es7.string.pad-end');
    require('./modules/es7.string.trim-left');
    require('./modules/es7.string.trim-right');
    require('./modules/es7.string.match-all');
    require('./modules/es7.symbol.async-iterator');
    require('./modules/es7.symbol.observable');
    require('./modules/es7.object.get-own-property-descriptors');
    require('./modules/es7.object.values');
    require('./modules/es7.object.entries');
    require('./modules/es7.object.define-getter');
    require('./modules/es7.object.define-setter');
    require('./modules/es7.object.lookup-getter');
    require('./modules/es7.object.lookup-setter');
    require('./modules/es7.map.to-json');
    require('./modules/es7.set.to-json');
    require('./modules/es7.system.global');
    require('./modules/es7.error.is-error');
    require('./modules/es7.math.iaddh');
    require('./modules/es7.math.isubh');
    require('./modules/es7.math.imulh');
    require('./modules/es7.math.umulh');
    require('./modules/es7.reflect.define-metadata');
    require('./modules/es7.reflect.delete-metadata');
    require('./modules/es7.reflect.get-metadata');
    require('./modules/es7.reflect.get-metadata-keys');
    require('./modules/es7.reflect.get-own-metadata');
    require('./modules/es7.reflect.get-own-metadata-keys');
    require('./modules/es7.reflect.has-metadata');
    require('./modules/es7.reflect.has-own-metadata');
    require('./modules/es7.reflect.metadata');
    require('./modules/es7.asap');
    require('./modules/es7.observable');
    require('./modules/web.timers');
    require('./modules/web.immediate');
    require('./modules/web.dom.iterable');
    module.exports = require('./modules/_core');
  }, {
    "./modules/_core": 48,
    "./modules/es6.array.copy-within": 145,
    "./modules/es6.array.every": 146,
    "./modules/es6.array.fill": 147,
    "./modules/es6.array.filter": 148,
    "./modules/es6.array.find": 150,
    "./modules/es6.array.find-index": 149,
    "./modules/es6.array.for-each": 151,
    "./modules/es6.array.from": 152,
    "./modules/es6.array.index-of": 153,
    "./modules/es6.array.is-array": 154,
    "./modules/es6.array.iterator": 155,
    "./modules/es6.array.join": 156,
    "./modules/es6.array.last-index-of": 157,
    "./modules/es6.array.map": 158,
    "./modules/es6.array.of": 159,
    "./modules/es6.array.reduce": 161,
    "./modules/es6.array.reduce-right": 160,
    "./modules/es6.array.slice": 162,
    "./modules/es6.array.some": 163,
    "./modules/es6.array.sort": 164,
    "./modules/es6.array.species": 165,
    "./modules/es6.date.now": 166,
    "./modules/es6.date.to-iso-string": 167,
    "./modules/es6.date.to-json": 168,
    "./modules/es6.date.to-primitive": 169,
    "./modules/es6.date.to-string": 170,
    "./modules/es6.function.bind": 171,
    "./modules/es6.function.has-instance": 172,
    "./modules/es6.function.name": 173,
    "./modules/es6.map": 174,
    "./modules/es6.math.acosh": 175,
    "./modules/es6.math.asinh": 176,
    "./modules/es6.math.atanh": 177,
    "./modules/es6.math.cbrt": 178,
    "./modules/es6.math.clz32": 179,
    "./modules/es6.math.cosh": 180,
    "./modules/es6.math.expm1": 181,
    "./modules/es6.math.fround": 182,
    "./modules/es6.math.hypot": 183,
    "./modules/es6.math.imul": 184,
    "./modules/es6.math.log10": 185,
    "./modules/es6.math.log1p": 186,
    "./modules/es6.math.log2": 187,
    "./modules/es6.math.sign": 188,
    "./modules/es6.math.sinh": 189,
    "./modules/es6.math.tanh": 190,
    "./modules/es6.math.trunc": 191,
    "./modules/es6.number.constructor": 192,
    "./modules/es6.number.epsilon": 193,
    "./modules/es6.number.is-finite": 194,
    "./modules/es6.number.is-integer": 195,
    "./modules/es6.number.is-nan": 196,
    "./modules/es6.number.is-safe-integer": 197,
    "./modules/es6.number.max-safe-integer": 198,
    "./modules/es6.number.min-safe-integer": 199,
    "./modules/es6.number.parse-float": 200,
    "./modules/es6.number.parse-int": 201,
    "./modules/es6.number.to-fixed": 202,
    "./modules/es6.number.to-precision": 203,
    "./modules/es6.object.assign": 204,
    "./modules/es6.object.create": 205,
    "./modules/es6.object.define-properties": 206,
    "./modules/es6.object.define-property": 207,
    "./modules/es6.object.freeze": 208,
    "./modules/es6.object.get-own-property-descriptor": 209,
    "./modules/es6.object.get-own-property-names": 210,
    "./modules/es6.object.get-prototype-of": 211,
    "./modules/es6.object.is": 215,
    "./modules/es6.object.is-extensible": 212,
    "./modules/es6.object.is-frozen": 213,
    "./modules/es6.object.is-sealed": 214,
    "./modules/es6.object.keys": 216,
    "./modules/es6.object.prevent-extensions": 217,
    "./modules/es6.object.seal": 218,
    "./modules/es6.object.set-prototype-of": 219,
    "./modules/es6.object.to-string": 220,
    "./modules/es6.parse-float": 221,
    "./modules/es6.parse-int": 222,
    "./modules/es6.promise": 223,
    "./modules/es6.reflect.apply": 224,
    "./modules/es6.reflect.construct": 225,
    "./modules/es6.reflect.define-property": 226,
    "./modules/es6.reflect.delete-property": 227,
    "./modules/es6.reflect.enumerate": 228,
    "./modules/es6.reflect.get": 231,
    "./modules/es6.reflect.get-own-property-descriptor": 229,
    "./modules/es6.reflect.get-prototype-of": 230,
    "./modules/es6.reflect.has": 232,
    "./modules/es6.reflect.is-extensible": 233,
    "./modules/es6.reflect.own-keys": 234,
    "./modules/es6.reflect.prevent-extensions": 235,
    "./modules/es6.reflect.set": 237,
    "./modules/es6.reflect.set-prototype-of": 236,
    "./modules/es6.regexp.constructor": 238,
    "./modules/es6.regexp.flags": 239,
    "./modules/es6.regexp.match": 240,
    "./modules/es6.regexp.replace": 241,
    "./modules/es6.regexp.search": 242,
    "./modules/es6.regexp.split": 243,
    "./modules/es6.regexp.to-string": 244,
    "./modules/es6.set": 245,
    "./modules/es6.string.anchor": 246,
    "./modules/es6.string.big": 247,
    "./modules/es6.string.blink": 248,
    "./modules/es6.string.bold": 249,
    "./modules/es6.string.code-point-at": 250,
    "./modules/es6.string.ends-with": 251,
    "./modules/es6.string.fixed": 252,
    "./modules/es6.string.fontcolor": 253,
    "./modules/es6.string.fontsize": 254,
    "./modules/es6.string.from-code-point": 255,
    "./modules/es6.string.includes": 256,
    "./modules/es6.string.italics": 257,
    "./modules/es6.string.iterator": 258,
    "./modules/es6.string.link": 259,
    "./modules/es6.string.raw": 260,
    "./modules/es6.string.repeat": 261,
    "./modules/es6.string.small": 262,
    "./modules/es6.string.starts-with": 263,
    "./modules/es6.string.strike": 264,
    "./modules/es6.string.sub": 265,
    "./modules/es6.string.sup": 266,
    "./modules/es6.string.trim": 267,
    "./modules/es6.symbol": 268,
    "./modules/es6.typed.array-buffer": 269,
    "./modules/es6.typed.data-view": 270,
    "./modules/es6.typed.float32-array": 271,
    "./modules/es6.typed.float64-array": 272,
    "./modules/es6.typed.int16-array": 273,
    "./modules/es6.typed.int32-array": 274,
    "./modules/es6.typed.int8-array": 275,
    "./modules/es6.typed.uint16-array": 276,
    "./modules/es6.typed.uint32-array": 277,
    "./modules/es6.typed.uint8-array": 278,
    "./modules/es6.typed.uint8-clamped-array": 279,
    "./modules/es6.weak-map": 280,
    "./modules/es6.weak-set": 281,
    "./modules/es7.array.includes": 282,
    "./modules/es7.asap": 283,
    "./modules/es7.error.is-error": 284,
    "./modules/es7.map.to-json": 285,
    "./modules/es7.math.iaddh": 286,
    "./modules/es7.math.imulh": 287,
    "./modules/es7.math.isubh": 288,
    "./modules/es7.math.umulh": 289,
    "./modules/es7.object.define-getter": 290,
    "./modules/es7.object.define-setter": 291,
    "./modules/es7.object.entries": 292,
    "./modules/es7.object.get-own-property-descriptors": 293,
    "./modules/es7.object.lookup-getter": 294,
    "./modules/es7.object.lookup-setter": 295,
    "./modules/es7.object.values": 296,
    "./modules/es7.observable": 297,
    "./modules/es7.reflect.define-metadata": 298,
    "./modules/es7.reflect.delete-metadata": 299,
    "./modules/es7.reflect.get-metadata": 301,
    "./modules/es7.reflect.get-metadata-keys": 300,
    "./modules/es7.reflect.get-own-metadata": 303,
    "./modules/es7.reflect.get-own-metadata-keys": 302,
    "./modules/es7.reflect.has-metadata": 304,
    "./modules/es7.reflect.has-own-metadata": 305,
    "./modules/es7.reflect.metadata": 306,
    "./modules/es7.set.to-json": 307,
    "./modules/es7.string.at": 308,
    "./modules/es7.string.match-all": 309,
    "./modules/es7.string.pad-end": 310,
    "./modules/es7.string.pad-start": 311,
    "./modules/es7.string.trim-left": 312,
    "./modules/es7.string.trim-right": 313,
    "./modules/es7.symbol.async-iterator": 314,
    "./modules/es7.symbol.observable": 315,
    "./modules/es7.system.global": 316,
    "./modules/web.dom.iterable": 317,
    "./modules/web.immediate": 318,
    "./modules/web.timers": 319
  }],
  321: [function (require, module, exports) {
    function _classCallCheck(n, e) {
      if (!(n instanceof e)) throw new TypeError("Cannot call a class as a function")
    }
    var _this = this,
      _createClass = function () {
        function n(n, e) {
          for (var t = 0; t < e.length; t++) {
            var o = e[t];
            o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(n, o.key, o)
          }
        }
        return function (e, t, o) {
          return t && n(e.prototype, t), o && n(e, o), e
        }
      }(),
      _extends = Object.assign || function (n) {
        for (var e = 1; e < arguments.length; e++) {
          var t = arguments[e];
          for (var o in t) Object.prototype.hasOwnProperty.call(t, o) && (n[o] = t[o])
        }
        return n
      },
      _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (n) {
        return typeof n
      } : function (n) {
        return n && "function" == typeof Symbol && n.constructor === Symbol && n !== Symbol.prototype ? "symbol" : typeof n
      };
    ! function () {
      var n = void 0,
        e = !1;
      "object" === ("undefined" == typeof exports ? "undefined" : _typeof(exports)) && (n = require("axios"));
      var t = function (n, t, o) {
          if (e) return t;
          var r = "",
            i = void 0;
          o && (i = new Date, i.setTime(i.getTime() + 24 * o * 60 * 60 * 1e3), r = ["; expires=", i.toGMTString()].join(""));
          var l = [n, "=", t, r, "; path=/"].join("");
          return document.cookie = l, t
        },
        o = function (n) {
          if (e) return null;
          for (var t = n + "=", o = document.cookie.split(";"), r = void 0, i = 0; i < o.length; i++) {
            for (r = o[i];
              " " === r.charAt(0);) r = r.substring(1, r.length);
            if (0 === r.indexOf(t)) return r.substring(t.length, r.length)
          }
          return null
        },
        r = function () {
          for (var n = [], e = "0123456789abcdef", t = 0; t < 36; t++) n.push(e.substr(Math.floor(16 * Math.random()), 1));
          return n[14] = "4", n[19] = e.substr(3 & n[19] | 8, 1), n[8] = n[13] = n[18] = n[23] = "-", n.join("")
        },
        i = function (n) {
          return o(n) || t(n, r(), 7)
        },
        l = function (n) {
          if (!n.clientVersion) throw console.log("Error. The clientVersion field cannot be null in the log entry"), new Error("The clientVersion field cannot be null in the log entry");
          if (!n.source) throw console.log("Error. The source field cannot be null in the log entry"), new Error("The source field cannot be null in the log entry");
          if (!n.componentId) throw console.log("Error. The componentId field cannot be null in the log entry"), new Error("The componentId field cannot be null in the log entry");
          if (!n.name) throw console.log("Error. The name field cannot be null in the log entry"), new Error("The guid field cannot be null in the log entry");
          var e = n.logVersion || "2",
            t = n.clientSystemTime || (new Date).getTime();
          return _extends({}, n, {
            logVersion: e,
            clientSystemTime: t
          })
        },
        a = function (t) {
          var o = l(t),
            r = "https://hlg.tokbox.com/prod/logging/ClientEvent";
          if (e) n.post(r, o);
          else {
            var i = new XMLHttpRequest;
            i.open("POST", r, !0), i.setRequestHeader("Content-type", "application/json"), i.send(JSON.stringify(o))
          }
        },
        s = function () {
          function n(t, o) {
            _classCallCheck(this, n), this.analyticsData = t, e = o && o.server, this.analyticsData.guid = i(t.name)
          }
          return _createClass(n, [{
            key: "addSessionInfo",
            value: function (n) {
              if (!n.sessionId) throw console.log("Error. The sessionId field cannot be null in the log entry"), new Error("The sessionId field cannot be null in the log entry");
              if (this.analyticsData.sessionId = n.sessionId, !n.connectionId) throw console.log("Error. The connectionId field cannot be null in the log entry"), new Error("The connectionId field cannot be null in the log entry");
              if (this.analyticsData.connectionId = n.connectionId, 0 === n.partnerId) throw console.log("Error. The partnerId field cannot be null in the log entry"), new Error("The partnerId field cannot be null in the log entry");
              this.analyticsData.partnerId = n.partnerId
            }
          }, {
            key: "logEvent",
            value: function (n) {
              this.analyticsData.action = n.action, this.analyticsData.variation = n.variation, this.analyticsData.clientSystemTime = (new Date).getTime(), a(this.analyticsData)
            }
          }]), n
        }();
      "object" === ("undefined" == typeof exports ? "undefined" : _typeof(exports)) ? module.exports = s: "function" == typeof define && define.amd ? define(function () {
        return s
      }) : _this.OTKAnalytics = s
    }(this);
  }, {
    "axios": 1
  }],
  322: [function (require, module, exports) {
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

    function defaultClearTimeout() {
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
    }())

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
      } catch (e) {
        try {
          // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
          return cachedSetTimeout.call(null, fun, 0);
        } catch (e) {
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
      } catch (e) {
        try {
          // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
          return cachedClearTimeout.call(null, marker);
        } catch (e) {
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
      while (len) {
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

    process.binding = function (name) {
      throw new Error('process.binding is not supported');
    };

    process.cwd = function () {
      return '/'
    };
    process.chdir = function (dir) {
      throw new Error('process.chdir is not supported');
    };
    process.umask = function () {
      return 0;
    };

  }, {}],
  323: [function (require, module, exports) {
    (function (process, global) {
      /**
       * Copyright (c) 2014, Facebook, Inc.
       * All rights reserved.
       *
       * This source code is licensed under the BSD-style license found in the
       * https://raw.github.com/facebook/regenerator/master/LICENSE file. An
       * additional grant of patent rights can be found in the PATENTS file in
       * the same directory.
       */

      !(function (global) {
        "use strict";

        var Op = Object.prototype;
        var hasOwn = Op.hasOwnProperty;
        var undefined; // More compressible than void 0.
        var $Symbol = typeof Symbol === "function" ? Symbol : {};
        var iteratorSymbol = $Symbol.iterator || "@@iterator";
        var toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag";

        var inModule = typeof module === "object";
        var runtime = global.regeneratorRuntime;
        if (runtime) {
          if (inModule) {
            // If regeneratorRuntime is defined globally and we're in a module,
            // make the exports object identical to regeneratorRuntime.
            module.exports = runtime;
          }
          // Don't bother evaluating the rest of this file if the runtime was
          // already defined globally.
          return;
        }

        // Define the runtime globally (as expected by generated code) as either
        // module.exports (if we're in a module) or a new, empty object.
        runtime = global.regeneratorRuntime = inModule ? module.exports : {};

        function wrap(innerFn, outerFn, self, tryLocsList) {
          // If outerFn provided and outerFn.prototype is a Generator, then outerFn.prototype instanceof Generator.
          var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator;
          var generator = Object.create(protoGenerator.prototype);
          var context = new Context(tryLocsList || []);

          // The ._invoke method unifies the implementations of the .next,
          // .throw, and .return methods.
          generator._invoke = makeInvokeMethod(innerFn, self, context);

          return generator;
        }
        runtime.wrap = wrap;

        // Try/catch helper to minimize deoptimizations. Returns a completion
        // record like context.tryEntries[i].completion. This interface could
        // have been (and was previously) designed to take a closure to be
        // invoked without arguments, but in all the cases we care about we
        // already have an existing method we want to call, so there's no need
        // to create a new function object. We can even get away with assuming
        // the method takes exactly one argument, since that happens to be true
        // in every case, so we don't have to touch the arguments object. The
        // only additional allocation required is the completion record, which
        // has a stable shape and so hopefully should be cheap to allocate.
        function tryCatch(fn, obj, arg) {
          try {
            return {
              type: "normal",
              arg: fn.call(obj, arg)
            };
          } catch (err) {
            return {
              type: "throw",
              arg: err
            };
          }
        }

        var GenStateSuspendedStart = "suspendedStart";
        var GenStateSuspendedYield = "suspendedYield";
        var GenStateExecuting = "executing";
        var GenStateCompleted = "completed";

        // Returning this object from the innerFn has the same effect as
        // breaking out of the dispatch switch statement.
        var ContinueSentinel = {};

        // Dummy constructor functions that we use as the .constructor and
        // .constructor.prototype properties for functions that return Generator
        // objects. For full spec compliance, you may wish to configure your
        // minifier not to mangle the names of these two functions.
        function Generator() {}

        function GeneratorFunction() {}

        function GeneratorFunctionPrototype() {}

        // This is a polyfill for %IteratorPrototype% for environments that
        // don't natively support it.
        var IteratorPrototype = {};
        IteratorPrototype[iteratorSymbol] = function () {
          return this;
        };

        var getProto = Object.getPrototypeOf;
        var NativeIteratorPrototype = getProto && getProto(getProto(values([])));
        if (NativeIteratorPrototype &&
          NativeIteratorPrototype !== Op &&
          hasOwn.call(NativeIteratorPrototype, iteratorSymbol)) {
          // This environment has a native %IteratorPrototype%; use it instead
          // of the polyfill.
          IteratorPrototype = NativeIteratorPrototype;
        }

        var Gp = GeneratorFunctionPrototype.prototype =
          Generator.prototype = Object.create(IteratorPrototype);
        GeneratorFunction.prototype = Gp.constructor = GeneratorFunctionPrototype;
        GeneratorFunctionPrototype.constructor = GeneratorFunction;
        GeneratorFunctionPrototype[toStringTagSymbol] =
          GeneratorFunction.displayName = "GeneratorFunction";

        // Helper for defining the .next, .throw, and .return methods of the
        // Iterator interface in terms of a single ._invoke method.
        function defineIteratorMethods(prototype) {
          ["next", "throw", "return"].forEach(function (method) {
            prototype[method] = function (arg) {
              return this._invoke(method, arg);
            };
          });
        }

        runtime.isGeneratorFunction = function (genFun) {
          var ctor = typeof genFun === "function" && genFun.constructor;
          return ctor ?
            ctor === GeneratorFunction ||
            // For the native GeneratorFunction constructor, the best we can
            // do is to check its .name property.
            (ctor.displayName || ctor.name) === "GeneratorFunction" :
            false;
        };

        runtime.mark = function (genFun) {
          if (Object.setPrototypeOf) {
            Object.setPrototypeOf(genFun, GeneratorFunctionPrototype);
          } else {
            genFun.__proto__ = GeneratorFunctionPrototype;
            if (!(toStringTagSymbol in genFun)) {
              genFun[toStringTagSymbol] = "GeneratorFunction";
            }
          }
          genFun.prototype = Object.create(Gp);
          return genFun;
        };

        // Within the body of any async function, `await x` is transformed to
        // `yield regeneratorRuntime.awrap(x)`, so that the runtime can test
        // `hasOwn.call(value, "__await")` to determine if the yielded value is
        // meant to be awaited.
        runtime.awrap = function (arg) {
          return {
            __await: arg
          };
        };

        function AsyncIterator(generator) {
          function invoke(method, arg, resolve, reject) {
            var record = tryCatch(generator[method], generator, arg);
            if (record.type === "throw") {
              reject(record.arg);
            } else {
              var result = record.arg;
              var value = result.value;
              if (value &&
                typeof value === "object" &&
                hasOwn.call(value, "__await")) {
                return Promise.resolve(value.__await).then(function (value) {
                  invoke("next", value, resolve, reject);
                }, function (err) {
                  invoke("throw", err, resolve, reject);
                });
              }

              return Promise.resolve(value).then(function (unwrapped) {
                // When a yielded Promise is resolved, its final value becomes
                // the .value of the Promise<{value,done}> result for the
                // current iteration. If the Promise is rejected, however, the
                // result for this iteration will be rejected with the same
                // reason. Note that rejections of yielded Promises are not
                // thrown back into the generator function, as is the case
                // when an awaited Promise is rejected. This difference in
                // behavior between yield and await is important, because it
                // allows the consumer to decide what to do with the yielded
                // rejection (swallow it and continue, manually .throw it back
                // into the generator, abandon iteration, whatever). With
                // await, by contrast, there is no opportunity to examine the
                // rejection reason outside the generator function, so the
                // only option is to throw it from the await expression, and
                // let the generator function handle the exception.
                result.value = unwrapped;
                resolve(result);
              }, reject);
            }
          }

          if (typeof process === "object" && process.domain) {
            invoke = process.domain.bind(invoke);
          }

          var previousPromise;

          function enqueue(method, arg) {
            function callInvokeWithMethodAndArg() {
              return new Promise(function (resolve, reject) {
                invoke(method, arg, resolve, reject);
              });
            }

            return previousPromise =
              // If enqueue has been called before, then we want to wait until
              // all previous Promises have been resolved before calling invoke,
              // so that results are always delivered in the correct order. If
              // enqueue has not been called before, then it is important to
              // call invoke immediately, without waiting on a callback to fire,
              // so that the async generator function has the opportunity to do
              // any necessary setup in a predictable way. This predictability
              // is why the Promise constructor synchronously invokes its
              // executor callback, and why async functions synchronously
              // execute code before the first await. Since we implement simple
              // async functions in terms of async generators, it is especially
              // important to get this right, even though it requires care.
              previousPromise ? previousPromise.then(
                callInvokeWithMethodAndArg,
                // Avoid propagating failures to Promises returned by later
                // invocations of the iterator.
                callInvokeWithMethodAndArg
              ) : callInvokeWithMethodAndArg();
          }

          // Define the unified helper method that is used to implement .next,
          // .throw, and .return (see defineIteratorMethods).
          this._invoke = enqueue;
        }

        defineIteratorMethods(AsyncIterator.prototype);
        runtime.AsyncIterator = AsyncIterator;

        // Note that simple async functions are implemented on top of
        // AsyncIterator objects; they just return a Promise for the value of
        // the final result produced by the iterator.
        runtime.async = function (innerFn, outerFn, self, tryLocsList) {
          var iter = new AsyncIterator(
            wrap(innerFn, outerFn, self, tryLocsList)
          );

          return runtime.isGeneratorFunction(outerFn) ?
            iter // If outerFn is a generator, return the full iterator.
            :
            iter.next().then(function (result) {
              return result.done ? result.value : iter.next();
            });
        };

        function makeInvokeMethod(innerFn, self, context) {
          var state = GenStateSuspendedStart;

          return function invoke(method, arg) {
            if (state === GenStateExecuting) {
              throw new Error("Generator is already running");
            }

            if (state === GenStateCompleted) {
              if (method === "throw") {
                throw arg;
              }

              // Be forgiving, per 25.3.3.3.3 of the spec:
              // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-generatorresume
              return doneResult();
            }

            while (true) {
              var delegate = context.delegate;
              if (delegate) {
                if (method === "return" ||
                  (method === "throw" && delegate.iterator[method] === undefined)) {
                  // A return or throw (when the delegate iterator has no throw
                  // method) always terminates the yield* loop.
                  context.delegate = null;

                  // If the delegate iterator has a return method, give it a
                  // chance to clean up.
                  var returnMethod = delegate.iterator["return"];
                  if (returnMethod) {
                    var record = tryCatch(returnMethod, delegate.iterator, arg);
                    if (record.type === "throw") {
                      // If the return method threw an exception, let that
                      // exception prevail over the original return or throw.
                      method = "throw";
                      arg = record.arg;
                      continue;
                    }
                  }

                  if (method === "return") {
                    // Continue with the outer return, now that the delegate
                    // iterator has been terminated.
                    continue;
                  }
                }

                var record = tryCatch(
                  delegate.iterator[method],
                  delegate.iterator,
                  arg
                );

                if (record.type === "throw") {
                  context.delegate = null;

                  // Like returning generator.throw(uncaught), but without the
                  // overhead of an extra function call.
                  method = "throw";
                  arg = record.arg;
                  continue;
                }

                // Delegate generator ran and handled its own exceptions so
                // regardless of what the method was, we continue as if it is
                // "next" with an undefined arg.
                method = "next";
                arg = undefined;

                var info = record.arg;
                if (info.done) {
                  context[delegate.resultName] = info.value;
                  context.next = delegate.nextLoc;
                } else {
                  state = GenStateSuspendedYield;
                  return info;
                }

                context.delegate = null;
              }

              if (method === "next") {
                // Setting context._sent for legacy support of Babel's
                // function.sent implementation.
                context.sent = context._sent = arg;

              } else if (method === "throw") {
                if (state === GenStateSuspendedStart) {
                  state = GenStateCompleted;
                  throw arg;
                }

                if (context.dispatchException(arg)) {
                  // If the dispatched exception was caught by a catch block,
                  // then let that catch block handle the exception normally.
                  method = "next";
                  arg = undefined;
                }

              } else if (method === "return") {
                context.abrupt("return", arg);
              }

              state = GenStateExecuting;

              var record = tryCatch(innerFn, self, context);
              if (record.type === "normal") {
                // If an exception is thrown from innerFn, we leave state ===
                // GenStateExecuting and loop back for another invocation.
                state = context.done ?
                  GenStateCompleted :
                  GenStateSuspendedYield;

                var info = {
                  value: record.arg,
                  done: context.done
                };

                if (record.arg === ContinueSentinel) {
                  if (context.delegate && method === "next") {
                    // Deliberately forget the last sent value so that we don't
                    // accidentally pass it on to the delegate.
                    arg = undefined;
                  }
                } else {
                  return info;
                }

              } else if (record.type === "throw") {
                state = GenStateCompleted;
                // Dispatch the exception by looping back around to the
                // context.dispatchException(arg) call above.
                method = "throw";
                arg = record.arg;
              }
            }
          };
        }

        // Define Generator.prototype.{next,throw,return} in terms of the
        // unified ._invoke helper method.
        defineIteratorMethods(Gp);

        Gp[toStringTagSymbol] = "Generator";

        Gp.toString = function () {
          return "[object Generator]";
        };

        function pushTryEntry(locs) {
          var entry = {
            tryLoc: locs[0]
          };

          if (1 in locs) {
            entry.catchLoc = locs[1];
          }

          if (2 in locs) {
            entry.finallyLoc = locs[2];
            entry.afterLoc = locs[3];
          }

          this.tryEntries.push(entry);
        }

        function resetTryEntry(entry) {
          var record = entry.completion || {};
          record.type = "normal";
          delete record.arg;
          entry.completion = record;
        }

        function Context(tryLocsList) {
          // The root entry object (effectively a try statement without a catch
          // or a finally block) gives us a place to store values thrown from
          // locations where there is no enclosing try statement.
          this.tryEntries = [{
            tryLoc: "root"
          }];
          tryLocsList.forEach(pushTryEntry, this);
          this.reset(true);
        }

        runtime.keys = function (object) {
          var keys = [];
          for (var key in object) {
            keys.push(key);
          }
          keys.reverse();

          // Rather than returning an object with a next method, we keep
          // things simple and return the next function itself.
          return function next() {
            while (keys.length) {
              var key = keys.pop();
              if (key in object) {
                next.value = key;
                next.done = false;
                return next;
              }
            }

            // To avoid creating an additional object, we just hang the .value
            // and .done properties off the next function object itself. This
            // also ensures that the minifier will not anonymize the function.
            next.done = true;
            return next;
          };
        };

        function values(iterable) {
          if (iterable) {
            var iteratorMethod = iterable[iteratorSymbol];
            if (iteratorMethod) {
              return iteratorMethod.call(iterable);
            }

            if (typeof iterable.next === "function") {
              return iterable;
            }

            if (!isNaN(iterable.length)) {
              var i = -1,
                next = function next() {
                  while (++i < iterable.length) {
                    if (hasOwn.call(iterable, i)) {
                      next.value = iterable[i];
                      next.done = false;
                      return next;
                    }
                  }

                  next.value = undefined;
                  next.done = true;

                  return next;
                };

              return next.next = next;
            }
          }

          // Return an iterator with no values.
          return {
            next: doneResult
          };
        }
        runtime.values = values;

        function doneResult() {
          return {
            value: undefined,
            done: true
          };
        }

        Context.prototype = {
          constructor: Context,

          reset: function (skipTempReset) {
            this.prev = 0;
            this.next = 0;
            // Resetting context._sent for legacy support of Babel's
            // function.sent implementation.
            this.sent = this._sent = undefined;
            this.done = false;
            this.delegate = null;

            this.tryEntries.forEach(resetTryEntry);

            if (!skipTempReset) {
              for (var name in this) {
                // Not sure about the optimal order of these conditions:
                if (name.charAt(0) === "t" &&
                  hasOwn.call(this, name) &&
                  !isNaN(+name.slice(1))) {
                  this[name] = undefined;
                }
              }
            }
          },

          stop: function () {
            this.done = true;

            var rootEntry = this.tryEntries[0];
            var rootRecord = rootEntry.completion;
            if (rootRecord.type === "throw") {
              throw rootRecord.arg;
            }

            return this.rval;
          },

          dispatchException: function (exception) {
            if (this.done) {
              throw exception;
            }

            var context = this;

            function handle(loc, caught) {
              record.type = "throw";
              record.arg = exception;
              context.next = loc;
              return !!caught;
            }

            for (var i = this.tryEntries.length - 1; i >= 0; --i) {
              var entry = this.tryEntries[i];
              var record = entry.completion;

              if (entry.tryLoc === "root") {
                // Exception thrown outside of any try block that could handle
                // it, so set the completion value of the entire function to
                // throw the exception.
                return handle("end");
              }

              if (entry.tryLoc <= this.prev) {
                var hasCatch = hasOwn.call(entry, "catchLoc");
                var hasFinally = hasOwn.call(entry, "finallyLoc");

                if (hasCatch && hasFinally) {
                  if (this.prev < entry.catchLoc) {
                    return handle(entry.catchLoc, true);
                  } else if (this.prev < entry.finallyLoc) {
                    return handle(entry.finallyLoc);
                  }

                } else if (hasCatch) {
                  if (this.prev < entry.catchLoc) {
                    return handle(entry.catchLoc, true);
                  }

                } else if (hasFinally) {
                  if (this.prev < entry.finallyLoc) {
                    return handle(entry.finallyLoc);
                  }

                } else {
                  throw new Error("try statement without catch or finally");
                }
              }
            }
          },

          abrupt: function (type, arg) {
            for (var i = this.tryEntries.length - 1; i >= 0; --i) {
              var entry = this.tryEntries[i];
              if (entry.tryLoc <= this.prev &&
                hasOwn.call(entry, "finallyLoc") &&
                this.prev < entry.finallyLoc) {
                var finallyEntry = entry;
                break;
              }
            }

            if (finallyEntry &&
              (type === "break" ||
                type === "continue") &&
              finallyEntry.tryLoc <= arg &&
              arg <= finallyEntry.finallyLoc) {
              // Ignore the finally entry if control is not jumping to a
              // location outside the try/catch block.
              finallyEntry = null;
            }

            var record = finallyEntry ? finallyEntry.completion : {};
            record.type = type;
            record.arg = arg;

            if (finallyEntry) {
              this.next = finallyEntry.finallyLoc;
            } else {
              this.complete(record);
            }

            return ContinueSentinel;
          },

          complete: function (record, afterLoc) {
            if (record.type === "throw") {
              throw record.arg;
            }

            if (record.type === "break" ||
              record.type === "continue") {
              this.next = record.arg;
            } else if (record.type === "return") {
              this.rval = record.arg;
              this.next = "end";
            } else if (record.type === "normal" && afterLoc) {
              this.next = afterLoc;
            }
          },

          finish: function (finallyLoc) {
            for (var i = this.tryEntries.length - 1; i >= 0; --i) {
              var entry = this.tryEntries[i];
              if (entry.finallyLoc === finallyLoc) {
                this.complete(entry.completion, entry.afterLoc);
                resetTryEntry(entry);
                return ContinueSentinel;
              }
            }
          },

          "catch": function (tryLoc) {
            for (var i = this.tryEntries.length - 1; i >= 0; --i) {
              var entry = this.tryEntries[i];
              if (entry.tryLoc === tryLoc) {
                var record = entry.completion;
                if (record.type === "throw") {
                  var thrown = record.arg;
                  resetTryEntry(entry);
                }
                return thrown;
              }
            }

            // The context.catch method must only be called with a location
            // argument that corresponds to a known catch block.
            throw new Error("illegal catch attempt");
          },

          delegateYield: function (iterable, resultName, nextLoc) {
            this.delegate = {
              iterator: values(iterable),
              resultName: resultName,
              nextLoc: nextLoc
            };

            return ContinueSentinel;
          }
        };
      })(
        // Among the various tricks for obtaining a reference to the global
        // object, this seems to be the most reliable technique that does not
        // use indirect eval (which violates Content Security Policy).
        typeof global === "object" ? global :
        typeof window === "object" ? window :
        typeof self === "object" ? self : this
      );

    }).call(this, require('_process'), typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
  }, {
    "_process": 322
  }],
  324: [function (require, module, exports) {
    (function (global) {
      'use strict';

      var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
        return typeof obj;
      } : function (obj) {
        return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
      };

      function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
          throw new TypeError("Cannot call a class as a function");
        }
      }

      require('babel-polyfill');

      /* global OT */
      /**
       * Dependencies
       */
      var util = require('./util');
      var State = require('./state').default;
      var accPackEvents = require('./events');
      var Communication = require('./communication').default;
      var OpenTokSDK = require('./sdk-wrapper/sdkWrapper');

      var _require = require('./errors'),
        CoreError = _require.CoreError;

      var _require2 = require('./logging'),
        message = _require2.message,
        Analytics = _require2.Analytics,
        logAction = _require2.logAction,
        logVariation = _require2.logVariation;

      /**
       * Helper methods
       */


      var dom = util.dom,
        path = util.path,
        pathOr = util.pathOr,
        properCase = util.properCase;

      /**
       * Ensure that we have the required credentials
       * @param {Object} credentials
       * @param {String} credentials.apiKey
       * @param {String} credentials.sessionId
       * @param {String} credentials.token
       */

      var validateCredentials = function validateCredentials() {
        var credentials = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];

        var required = ['apiKey', 'sessionId', 'token'];
        required.forEach(function (credential) {
          if (!credentials[credential]) {
            throw new CoreError(credential + ' is a required credential', 'invalidParameters');
          }
        });
      };

      var AccCore = function AccCore(options) {
        _classCallCheck(this, AccCore);

        _initialiseProps.call(this);

        // Options/credentials validation
        if (!options) {
          throw new CoreError('Missing options required for initialization', 'invalidParameters');
        }
        var credentials = options.credentials;

        validateCredentials(options.credentials);
        this.name = options.name;

        // Init analytics
        this.applicationName = options.applicationName;
        this.analytics = new Analytics(window.location.origin, credentials.sessionId, null, credentials.apiKey);
        this.analytics.log(logAction.init, logVariation.attempt);

        // Create session, setup state
        var sessionProps = options.largeScale ? {
          connectionEventsSuppressed: true
        } : undefined;
        this.session = OT.initSession(credentials.apiKey, credentials.sessionId, sessionProps);
        this.internalState = new State();
        this.internalState.setSession(this.session);
        this.internalState.setCredentials(credentials);
        this.internalState.setOptions(options);

        // Individual accelerator packs
        this.communication = null;
        this.textChat = null;
        this.screenSharing = null;
        this.annotation = null;
        this.archiving = null;

        // Create internal event listeners
        this.createEventListeners(this.session, options);

        this.analytics.log(logAction.init, logVariation.success);
      }

      // OpenTok SDK Wrapper


      // Expose utility methods


      /**
       * Get access to an accelerator pack
       * @param {String} packageName - textChat, screenSharing, annotation, or archiving
       * @returns {Object} The instance of the accelerator pack
       */


      /** Eventing */

      /**
       * Register events that can be listened to be other components/modules
       * @param {array | string} events - A list of event names. A single event may
       * also be passed as a string.
       */


      /**
       * Register a callback for a specific event or pass an object with
       * with event => callback key/value pairs to register listeners for
       * multiple events.
       * @param {String | Object} event - The name of the event
       * @param {Function} callback
       */


      /**
       * Remove a callback for a specific event.  If no parameters are passed,
       * all event listeners will be removed.
       * @param {String} event - The name of the event
       * @param {Function} callback
       */


      /**
       * Trigger an event and fire all registered callbacks
       * @param {String} event - The name of the event
       * @param {*} data - Data to be passed to callback functions
       */


      /**
       * Get the current OpenTok session object
       * @returns {Object}
       */


      /**
       * Returns the current OpenTok session credentials
       * @returns {Object}
       */


      /**
       * Returns the options used for initialization
       * @returns {Object}
       */


      /**
       * Connect to the session
       * @returns {Promise} <resolve: -, reject: Error>
       */


      /**
       * Disconnect from the session
       * @returns {Promise} <resolve: -, reject: Error>
       */


      /**
       * Force a remote connection to leave the session
       * @param {Object} connection
       * @returns {Promise} <resolve: empty, reject: Error>
       */


      /**
       * Start publishing video and subscribing to streams
       * @param {Object} publisherProps - https://goo.gl/0mL0Eo
       * @returns {Promise} <resolve: State + Publisher, reject: Error>
       */


      /**
       * Stop all publishing un unsubscribe from all streams
       * @returns {void}
       */


      /**
       * Start publishing video and subscribing to streams
       * @returns {Object} The internal state of the core session
       */


      /**
       * Manually subscribe to a stream
       * @param {Object} stream - An OpenTok stream
       * @param {Object} [subscriberProperties] - https://tokbox.com/developer/sdks/js/reference/Session.html#subscribe
       * @param {Boolean} [networkTest] - Subscribing to our own publisher as part of a network test?
       * @returns {Promise} <resolve: Subscriber, reject: Error>
       */


      /**
       * Manually unsubscribe from a stream
       * @param {Object} subscriber - An OpenTok subscriber object
       * @returns {Promise} <resolve: void, reject: Error>
       */


      /**
       * Force the publisher of a stream to stop publishing the stream
       * @param {Object} stream
       * @returns {Promise} <resolve: empty, reject: Error>
       */


      /**
       * Get the local publisher object for a stream
       * @param {Object} stream - An OpenTok stream object
       * @returns {Object} - The publisher object
       */


      /**
       * Get the local subscriber objects for a stream
       * @param {Object} stream - An OpenTok stream object
       * @returns {Array} - An array of subscriber object
       */


      /**
       * Send a signal using the OpenTok signaling apiKey
       * @param {String} type
       * @param {*} [data]
       * @param {Object} [to] - An OpenTok connection object
       * @returns {Promise} <resolve: empty, reject: Error>
       */


      /**
       * Enable or disable local audio
       * @param {Boolean} enable
       */


      /**
       * Enable or disable local video
       * @param {Boolean} enable
       */


      /**
       * Enable or disable remote audio
       * @param {String} id - Subscriber id
       * @param {Boolean} enable
       */


      /**
       * Enable or disable remote video
       * @param {String} id - Subscriber id
       * @param {Boolean} enable
       */
      ;

      AccCore.OpenTokSDK = OpenTokSDK;
      AccCore.util = util;

      var _initialiseProps = function _initialiseProps() {
        var _this = this;

        this.getAccPack = function (packageName) {
          var analytics = _this.analytics,
            textChat = _this.textChat,
            screenSharing = _this.screenSharing,
            annotation = _this.annotation,
            archiving = _this.archiving;

          analytics.log(logAction.getAccPack, logVariation.attempt);
          var packages = {
            textChat: textChat,
            screenSharing: screenSharing,
            annotation: annotation,
            archiving: archiving
          };
          analytics.log(logAction.getAccPack, logVariation.success);
          return packages[packageName];
        };

        this.registerEvents = function (events) {
          var eventListeners = _this.eventListeners;

          var eventList = Array.isArray(events) ? events : [events];
          eventList.forEach(function (event) {
            if (!eventListeners[event]) {
              eventListeners[event] = new Set();
            }
          });
        };

        this.on = function (event, callback) {
          var eventListeners = _this.eventListeners,
            on = _this.on;
          // analytics.log(logAction.on, logVariation.attempt);

          if ((typeof event === 'undefined' ? 'undefined' : _typeof(event)) === 'object') {
            Object.keys(event).forEach(function (eventName) {
              on(eventName, event[eventName]);
            });
            return;
          }
          var eventCallbacks = eventListeners[event];
          if (!eventCallbacks) {
            message(event + ' is not a registered event.');
            // analytics.log(logAction.on, logVariation.fail);
          } else {
            eventCallbacks.add(callback);
            // analytics.log(logAction.on, logVariation.success);
          }
        };

        this.off = function (event, callback) {
          var eventListeners = _this.eventListeners;
          // analytics.log(logAction.off, logVariation.attempt);

          if (!event && !callback) {
            Object.keys(eventListeners).forEach(function (eventType) {
              eventListeners[eventType].clear();
            });
          } else {
            var eventCallbacks = eventListeners[event];
            if (!eventCallbacks) {
              // analytics.log(logAction.off, logVariation.fail);
              message(event + ' is not a registered event.');
            } else {
              eventCallbacks.delete(callback);
              // analytics.log(logAction.off, logVariation.success);
            }
          }
        };

        this.triggerEvent = function (event, data) {
          var eventListeners = _this.eventListeners,
            registerEvents = _this.registerEvents;

          var eventCallbacks = eventListeners[event];
          if (!eventCallbacks) {
            registerEvents(event);
            message(event + ' has been registered as a new event.');
          } else {
            eventCallbacks.forEach(function (callback) {
              return callback(data, event);
            });
          }
        };

        this.getSession = function () {
          return _this.internalState.getSession();
        };

        this.getCredentials = function () {
          return _this.internalState.getCredentials();
        };

        this.getOptions = function () {
          return _this.internalState.getOptions();
        };

        this.createEventListeners = function (session, options) {
          _this.eventListeners = {};
          var registerEvents = _this.registerEvents,
            internalState = _this.internalState,
            triggerEvent = _this.triggerEvent,
            on = _this.on,
            getSession = _this.getSession;

          Object.keys(accPackEvents).forEach(function (type) {
            return registerEvents(accPackEvents[type]);
          });

          /**
           * If using screen sharing + annotation in an external window, the screen sharing
           * package will take care of calling annotation.start() and annotation.linkCanvas()
           */
          var usingAnnotation = path('screenSharing.annotation', options);
          var internalAnnotation = usingAnnotation && !path('screenSharing.externalWindow', options);

          /**
           * Wrap session events and update internalState when streams are created
           * or destroyed
           */
          accPackEvents.session.forEach(function (eventName) {
            session.on(eventName, function (event) {
              if (eventName === 'streamCreated') {
                internalState.addStream(event.stream);
              }
              if (eventName === 'streamDestroyed') {
                internalState.removeStream(event.stream);
              }
              triggerEvent(eventName, event);
            });
          });

          if (usingAnnotation) {
            on('subscribeToScreen', function (_ref) {
              var subscriber = _ref.subscriber;

              _this.annotation.start(getSession()).then(function () {
                var absoluteParent = dom.query(path('annotation.absoluteParent.subscriber', options));
                var linkOptions = absoluteParent ? {
                  absoluteParent: absoluteParent
                } : null;
                _this.annotation.linkCanvas(subscriber, subscriber.element.parentElement, linkOptions);
              });
            });

            on('unsubscribeFromScreen', function () {
              _this.annotation.end();
            });
          }

          on('startScreenSharing', function (publisher) {
            internalState.addPublisher('screen', publisher);
            triggerEvent('startScreenShare', Object.assign({}, {
              publisher: publisher
            }, internalState.getPubSub()));
            if (internalAnnotation) {
              _this.annotation.start(getSession()).then(function () {
                var absoluteParent = dom.query(path('annotation.absoluteParent.publisher', options));
                var linkOptions = absoluteParent ? {
                  absoluteParent: absoluteParent
                } : null;
                _this.annotation.linkCanvas(publisher, publisher.element.parentElement, linkOptions);
              });
            }
          });

          on('endScreenSharing', function (publisher) {
            // delete publishers.screen[publisher.id];
            internalState.removePublisher('screen', publisher);
            triggerEvent('endScreenShare', internalState.getPubSub());
            if (usingAnnotation) {
              _this.annotation.end();
            }
          });
        };

        this.setupExternalAnnotation = function () {
          return _this.annotation.start(_this.getSession(), {
            screensharing: true
          });
        };

        this.linkAnnotation = function (pubSub, annotationContainer, externalWindow) {
          var annotation = _this.annotation,
            internalState = _this.internalState;

          annotation.linkCanvas(pubSub, annotationContainer, {
            externalWindow: externalWindow
          });

          if (externalWindow) {
            // Add subscribers to the external window
            var streams = internalState.getStreams();
            var cameraStreams = Object.keys(streams).reduce(function (acc, streamId) {
              var stream = streams[streamId];
              return stream.videoType === 'camera' || stream.videoType === 'sip' ? acc.concat(stream) : acc;
            }, []);
            cameraStreams.forEach(annotation.addSubscriberToExternalWindow);
          }
        };

        this.initPackages = function () {
          var analytics = _this.analytics,
            getSession = _this.getSession,
            getOptions = _this.getOptions,
            internalState = _this.internalState;
          var on = _this.on,
            registerEvents = _this.registerEvents,
            setupExternalAnnotation = _this.setupExternalAnnotation,
            triggerEvent = _this.triggerEvent,
            linkAnnotation = _this.linkAnnotation;

          analytics.log(logAction.initPackages, logVariation.attempt);
          var session = getSession();
          var options = getOptions();
          /**
           * Try to require a package.  If 'require' is unavailable, look for
           * the package in global scope.  A switch ttatement is used because
           * webpack and Browserify aren't able to resolve require statements
           * that use variable names.
           * @param {String} packageName - The name of the npm package
           * @param {String} globalName - The name of the package if exposed on global/window
           * @returns {Object}
           */
          var optionalRequire = function optionalRequire(packageName, globalName) {
            var result = void 0;
            /* eslint-disable global-require, import/no-extraneous-dependencies, import/no-unresolved */
            try {
              switch (packageName) {
                case 'opentok-text-chat':
                  result = require('opentok-text-chat');
                  break;
                case 'opentok-screen-sharing':
                  result = require('opentok-screen-sharing');
                  break;
                case 'opentok-annotation':
                  result = require('opentok-annotation');
                  break;
                case 'opentok-archiving':
                  result = require('opentok-archiving');
                  break;
                default:
                  break;
              }
              /* eslint-enable global-require */
            } catch (error) {
              result = window[globalName];
            }
            if (!result) {
              analytics.log(logAction.initPackages, logVariation.fail);
              throw new CoreError('Could not load ' + packageName, 'missingDependency');
            }
            return result;
          };

          var availablePackages = {
            textChat: function textChat() {
              return optionalRequire('opentok-text-chat', 'TextChatAccPack');
            },
            screenSharing: function screenSharing() {
              return optionalRequire('opentok-screen-sharing', 'ScreenSharingAccPack');
            },
            annotation: function annotation() {
              return optionalRequire('opentok-annotation', 'AnnotationAccPack');
            },
            archiving: function archiving() {
              return optionalRequire('opentok-archiving', 'ArchivingAccPack');
            }
          };

          var packages = {};
          (path('packages', options) || []).forEach(function (acceleratorPack) {
            if (availablePackages[acceleratorPack]) {
              // eslint-disable-next-line no-param-reassign
              packages[properCase(acceleratorPack)] = availablePackages[acceleratorPack]();
            } else {
              message(acceleratorPack + ' is not a valid accelerator pack');
            }
          });

          /**
           * Get containers for streams, controls, and the chat widget
           */
          var getDefaultContainer = function getDefaultContainer(pubSub) {
            return document.getElementById(pubSub + 'Container');
          };
          var getContainerElements = function getContainerElements() {
            // Need to use path to check for null values
            var controls = pathOr('#videoControls', 'controlsContainer', options);
            var chat = pathOr('#chat', 'textChat.container', options);
            var stream = pathOr(getDefaultContainer, 'streamContainers', options);
            return {
              stream: stream,
              controls: controls,
              chat: chat
            };
          };
          /** *** *** *** *** */

          /**
           * Return options for the specified package
           * @param {String} packageName
           * @returns {Object}
           */
          var packageOptions = function packageOptions(packageName) {
            /**
             * Methods to expose to accelerator packs
             */
            var accPack = {
              registerEventListener: on, // Legacy option
              on: on,
              registerEvents: registerEvents,
              triggerEvent: triggerEvent,
              setupExternalAnnotation: setupExternalAnnotation,
              linkAnnotation: linkAnnotation
            };

            /**
             * If options.controlsContainer/containers.controls is null,
             * accelerator packs should not append their controls.
             */
            var containers = getContainerElements();
            var appendControl = !!containers.controls;
            var controlsContainer = containers.controls; // Legacy option
            var streamContainers = containers.stream;
            var baseOptions = {
              session: session,
              core: accPack,
              accPack: accPack,
              controlsContainer: controlsContainer,
              appendControl: appendControl,
              streamContainers: streamContainers
            };

            switch (packageName) {
              /* beautify ignore:start */
        case 'communication':
          {
            return Object.assign({}, baseOptions, { state: internalState, analytics: analytics }, options.communication);
          }
        case 'textChat':
          {
            var textChatOptions = {
              textChatContainer: path('textChat.container', options),
              waitingMessage: path('textChat.waitingMessage', options),
              sender: { alias: path('textChat.name', options) },
              alwaysOpen: path('textChat.alwaysOpen', options)
            };
            return Object.assign({}, baseOptions, textChatOptions);
          }
        case 'screenSharing':
          {
            var screenSharingContainer = { screenSharingContainer: streamContainers };
            return Object.assign({}, baseOptions, screenSharingContainer, options.screenSharing);
          }
        case 'annotation':
          {
            return Object.assign({}, baseOptions, options.annotation);
          }
        case 'archiving':
          {
            return Object.assign({}, baseOptions, options.archiving);
          }
        default:
          return {};
        /* beautify ignore:end */
            }
          };

          /** Create instances of each package */
          // eslint-disable-next-line global-require,import/no-extraneous-dependencies

          _this.communication = new Communication(packageOptions('communication'));
          _this.textChat = packages.TextChat ? new packages.TextChat(packageOptions('textChat')) : null;
          _this.screenSharing = packages.ScreenSharing ? new packages.ScreenSharing(packageOptions('screenSharing')) : null;
          _this.annotation = packages.Annotation ? new packages.Annotation(packageOptions('annotation')) : null;
          _this.archiving = packages.Archiving ? new packages.Archiving(packageOptions('archiving')) : null;

          analytics.log(logAction.initPackages, logVariation.success);
        };

        this.connect = function () {
          var analytics = _this.analytics,
            getSession = _this.getSession,
            initPackages = _this.initPackages,
            triggerEvent = _this.triggerEvent,
            getCredentials = _this.getCredentials;

          return new Promise(function (resolve, reject) {
            analytics.log(logAction.connect, logVariation.attempt);
            var session = getSession();

            var _getCredentials = getCredentials(),
              token = _getCredentials.token;

            session.connect(token, function (error) {
              if (error) {
                message(error);
                analytics.log(logAction.connect, logVariation.fail);
                return reject(error);
              }
              var sessionId = session.sessionId,
                apiKey = session.apiKey;

              analytics.update(sessionId, path('connection.connectionId', session), apiKey);
              analytics.log(logAction.connect, logVariation.success);
              initPackages();
              triggerEvent('connected', session);
              return resolve({
                connections: session.connections.length()
              });
            });
          });
        };

        this.disconnect = function () {
          var analytics = _this.analytics,
            getSession = _this.getSession,
            internalState = _this.internalState;

          analytics.log(logAction.disconnect, logVariation.attempt);
          getSession().disconnect();
          internalState.reset();
          analytics.log(logAction.disconnect, logVariation.success);
        };

        this.forceDisconnect = function (connection) {
          var analytics = _this.analytics,
            getSession = _this.getSession;

          return new Promise(function (resolve, reject) {
            analytics.log(logAction.forceDisconnect, logVariation.attempt);
            getSession().forceDisconnect(connection, function (error) {
              if (error) {
                analytics.log(logAction.forceDisconnect, logVariation.fail);
                reject(error);
              } else {
                analytics.log(logAction.forceDisconnect, logVariation.success);
                resolve();
              }
            });
          });
        };

        this.startCall = function (publisherProps) {
          return _this.communication.startCall(publisherProps);
        };

        this.endCall = function () {
          return _this.communication.endCall();
        };

        this.state = function () {
          return _this.internalState.all();
        };

        this.subscribe = function (stream, subscriberProperties) {
          var networkTest = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
          return _this.communication.subscribe(stream, subscriberProperties, networkTest);
        };

        this.unsubscribe = function (subscriber) {
          return _this.communication.unsubscribe(subscriber);
        };

        this.forceUnpublish = function (stream) {
          var analytics = _this.analytics,
            getSession = _this.getSession;

          return new Promise(function (resolve, reject) {
            analytics.log(logAction.forceUnpublish, logVariation.attempt);
            getSession().forceUnpublish(stream, function (error) {
              if (error) {
                analytics.log(logAction.forceUnpublish, logVariation.fail);
                reject(error);
              } else {
                analytics.log(logAction.forceUnpublish, logVariation.success);
                resolve();
              }
            });
          });
        };

        this.getPublisherForStream = function (stream) {
          return _this.getSession().getPublisherForStream(stream);
        };

        this.getSubscribersForStream = function (stream) {
          return _this.getSession().getSubscribersForStream(stream);
        };

        this.signal = function (type, data, to) {
          var analytics = _this.analytics,
            getSession = _this.getSession;

          return new Promise(function (resolve, reject) {
            analytics.log(logAction.signal, logVariation.attempt);
            var session = getSession();
            var signalObj = Object.assign({}, type ? {
                type: type
              } : null, data ? {
                data: JSON.stringify(data)
              } : null, to ? {
                to: to
              } : null // eslint-disable-line comma-dangle
            );
            session.signal(signalObj, function (error) {
              if (error) {
                analytics.log(logAction.signal, logVariation.fail);
                reject(error);
              } else {
                analytics.log(logAction.signal, logVariation.success);
                resolve();
              }
            });
          });
        };

        this.toggleLocalAudio = function (enable) {
          var analytics = _this.analytics,
            internalState = _this.internalState,
            communication = _this.communication;

          analytics.log(logAction.toggleLocalAudio, logVariation.attempt);

          var _internalState$getPub = internalState.getPubSub(),
            publishers = _internalState$getPub.publishers;

          var toggleAudio = function toggleAudio(id) {
            return communication.enableLocalAV(id, 'audio', enable);
          };
          Object.keys(publishers.camera).forEach(toggleAudio);
          analytics.log(logAction.toggleLocalAudio, logVariation.success);
        };

        this.toggleLocalVideo = function (enable) {
          var analytics = _this.analytics,
            internalState = _this.internalState,
            communication = _this.communication;

          analytics.log(logAction.toggleLocalVideo, logVariation.attempt);

          var _internalState$getPub2 = internalState.getPubSub(),
            publishers = _internalState$getPub2.publishers;

          var toggleVideo = function toggleVideo(id) {
            return communication.enableLocalAV(id, 'video', enable);
          };
          Object.keys(publishers.camera).forEach(toggleVideo);
          analytics.log(logAction.toggleLocalVideo, logVariation.success);
        };

        this.toggleRemoteAudio = function (id, enable) {
          var analytics = _this.analytics,
            communication = _this.communication;

          analytics.log(logAction.toggleRemoteAudio, logVariation.attempt);
          communication.enableRemoteAV(id, 'audio', enable);
          analytics.log(logAction.toggleRemoteAudio, logVariation.success);
        };

        this.toggleRemoteVideo = function (id, enable) {
          var analytics = _this.analytics,
            communication = _this.communication;

          analytics.log(logAction.toggleRemoteVideo, logVariation.attempt);
          communication.enableRemoteAV(id, 'video', enable);
          analytics.log(logAction.toggleRemoteVideo, logVariation.success);
        };
      };

      if (global === window) {
        window.AccCore = AccCore;
      }

      module.exports = AccCore;

    }).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
  }, {
    "./communication": 325,
    "./errors": 326,
    "./events": 327,
    "./logging": 328,
    "./sdk-wrapper/sdkWrapper": 330,
    "./state": 332,
    "./util": 333,
    "babel-polyfill": 26,
    "opentok-annotation": undefined,
    "opentok-archiving": undefined,
    "opentok-screen-sharing": undefined,
    "opentok-text-chat": undefined
  }],
  325: [function (require, module, exports) {
    'use strict';

    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    function _classCallCheck(instance, Constructor) {
      if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
      }
    }

    /* global OT */

    /** Dependencies */
    var _require = require('./errors'),
      CoreError = _require.CoreError;

    var _require2 = require('./util'),
      dom = _require2.dom,
      path = _require2.path,
      pathOr = _require2.pathOr,
      properCase = _require2.properCase;

    var _require3 = require('./logging'),
      message = _require3.message,
      logAction = _require3.logAction,
      logVariation = _require3.logVariation;

    /**
     * Default UI propties
     * https://tokbox.com/developer/guides/customize-ui/js/
     */


    var defaultCallProperties = {
      insertMode: 'append',
      width: '100%',
      height: '100%',
      showControls: false,
      style: {
        buttonDisplayMode: 'on'
      }
    };

    var Communication = function Communication(options) {
      _classCallCheck(this, Communication);

      _initialiseProps.call(this);

      this.validateOptions(options);
      this.setSession();
      this.createEventListeners();
    }
    /**
     * Trigger an event through the API layer
     * @param {String} event - The name of the event
     * @param {*} [data]
     */


    /**
     * Determine whether or not the party is able to join the call based on
     * the specified connection limit, if any.
     * @return {Boolean}
     */


    /**
     * Create a camera publisher object
     * @param {Object} publisherProperties
     * @returns {Promise} <resolve: Object, reject: Error>
     */


    /**
     * Publish the local camera stream and update state
     * @param {Object} publisherProperties
     * @returns {Promise} <resolve: empty, reject: Error>
     */


    /**
     * Subscribe to a stream and update the state
     * @param {Object} stream - An OpenTok stream object
     * @param {Object} [subsriberOptions]
     * @param {Boolean} [networkTest] - Are we subscribing to our own publisher for a network test?
     * @returns {Promise} <resolve: Object, reject: Error >
     */


    /**
     * Unsubscribe from a stream and update the state
     * @param {Object} subscriber - An OpenTok subscriber object
     * @returns {Promise} <resolve: empty>
     */


    /**
     * Set session in module scope
     */


    /**
     * Subscribe to new stream unless autoSubscribe is set to false
     * @param {Object} stream
     */


    /**
     * Update state and trigger corresponding event(s) when stream is destroyed
     * @param {Object} stream
     */


    /**
     * Listen for API-level events
     */


    /**
     * Start publishing the local camera feed and subscribing to streams in the session
     * @param {Object} publisherProperties
     * @returns {Promise} <resolve: Object, reject: Error>
     */


    /**
     * Stop publishing and unsubscribe from all streams
     */


    /**
     * Enable/disable local audio or video
     * @param {String} source - 'audio' or 'video'
     * @param {Boolean} enable
     */


    /**
     * Enable/disable remote audio or video
     * @param {String} subscriberId
     * @param {String} source - 'audio' or 'video'
     * @param {Boolean} enable
     */
    ;

    var _initialiseProps = function _initialiseProps() {
      var _this = this;

      this.validateOptions = function (options) {
        var requiredOptions = ['core', 'state', 'analytics'];
        requiredOptions.forEach(function (option) {
          if (!options[option]) {
            throw new CoreError(option + ' is a required option.', 'invalidParameters');
          }
        });
        var callProperties = options.callProperties,
          screenProperties = options.screenProperties,
          autoSubscribe = options.autoSubscribe,
          subscribeOnly = options.subscribeOnly;

        _this.active = false;
        _this.core = options.core;
        _this.state = options.state;
        _this.analytics = options.analytics;
        _this.streamContainers = options.streamContainers;
        _this.callProperties = Object.assign({}, defaultCallProperties, callProperties);
        _this.connectionLimit = options.connectionLimit || null;
        _this.autoSubscribe = options.hasOwnProperty('autoSubscribe') ? autoSubscribe : true;
        _this.subscribeOnly = options.hasOwnProperty('subscribeOnly') ? subscribeOnly : false;
        _this.screenProperties = Object.assign({}, defaultCallProperties, {
          videoSource: 'window'
        }, screenProperties);
      };

      this.triggerEvent = function (event, data) {
        return _this.core.triggerEvent(event, data);
      };

      this.ableToJoin = function () {
        var connectionLimit = _this.connectionLimit,
          state = _this.state;

        if (!connectionLimit) {
          return true;
        }
        // Not using the session here since we're concerned with number of active publishers
        var connections = Object.values(state.getStreams()).filter(function (s) {
          return s.videoType === 'camera';
        });
        return connections.length < connectionLimit;
      };

      this.createPublisher = function (publisherProperties) {
        var callProperties = _this.callProperties,
          streamContainers = _this.streamContainers;

        return new Promise(function (resolve, reject) {
          // TODO: Handle adding 'name' option to props
          var props = Object.assign({}, callProperties, publisherProperties);
          // TODO: Figure out how to handle common vs package-specific options
          // ^^^ This may already be available through package options
          var container = dom.element(streamContainers('publisher', 'camera'));
          var publisher = OT.initPublisher(container, props, function (error) {
            error ? reject(error) : resolve(publisher);
          });
        });
      };

      this.publish = function (publisherProperties) {
        var analytics = _this.analytics,
          state = _this.state,
          createPublisher = _this.createPublisher,
          session = _this.session,
          triggerEvent = _this.triggerEvent,
          subscribeOnly = _this.subscribeOnly;

        /**
         * For subscriber tokens or cases where we just don't want to be seen or heard.
         */

        if (subscribeOnly) {
          message('Instance is configured with subscribeOnly set to true. Cannot publish to session');
          return Promise.resolve();
        }

        return new Promise(function (resolve, reject) {
          var onPublish = function onPublish(publisher) {
            return function (error) {
              if (error) {
                reject(error);
                analytics.log(logAction.startCall, logVariation.fail);
              } else {
                analytics.log(logAction.startCall, logVariation.success);
                state.addPublisher('camera', publisher);
                resolve(publisher);
              }
            };
          };

          var publishToSession = function publishToSession(publisher) {
            return session.publish(publisher, onPublish(publisher));
          };

          var handleError = function handleError(error) {
            analytics.log(logAction.startCall, logVariation.fail);
            var errorMessage = error.code === 1010 ? 'Check your network connection' : error.message;
            triggerEvent('error', errorMessage);
            reject(error);
          };

          createPublisher(publisherProperties).then(publishToSession).catch(handleError);
        });
      };

      this.subscribe = function (stream) {
        var subscriberProperties = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
        var networkTest = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
        var analytics = _this.analytics,
          state = _this.state,
          streamContainers = _this.streamContainers,
          session = _this.session,
          triggerEvent = _this.triggerEvent,
          callProperties = _this.callProperties,
          screenProperties = _this.screenProperties;

        return new Promise(function (resolve, reject) {
          var connectionData = void 0;
          analytics.log(logAction.subscribe, logVariation.attempt);
          var streamMap = state.getStreamMap();
          var streamId = stream.streamId;
          // No videoType indicates SIP https://tokbox.com/developer/guides/sip/

          var type = pathOr('sip', 'videoType', stream);
          if (streamMap[streamId] && !networkTest) {
            // Are we already subscribing to the stream?
            var _state$all = state.all(),
              subscribers = _state$all.subscribers;

            resolve(subscribers[type][streamMap[streamId]]);
          } else {
            try {
              connectionData = JSON.parse(path(['connection', 'data'], stream) || null);
            } catch (e) {
              connectionData = path(['connection', 'data'], stream);
            }
            var container = dom.element(streamContainers('subscriber', type, connectionData, stream));
            var options = Object.assign({}, type === 'camera' || type === 'sip' ? callProperties : screenProperties, subscriberProperties);
            var subscriber = session.subscribe(stream, container, options, function (error) {
              if (error) {
                analytics.log(logAction.subscribe, logVariation.fail);
                reject(error);
              } else {
                state.addSubscriber(subscriber);
                triggerEvent('subscribeTo' + properCase(type), Object.assign({}, {
                  subscriber: subscriber
                }, state.all()));
                type === 'screen' && triggerEvent('startViewingSharedScreen', subscriber); // Legacy event
                analytics.log(logAction.subscribe, logVariation.success);
                resolve(subscriber);
              }
            });
          }
        });
      };

      this.unsubscribe = function (subscriber) {
        var analytics = _this.analytics,
          session = _this.session,
          state = _this.state;

        return new Promise(function (resolve) {
          analytics.log(logAction.unsubscribe, logVariation.attempt);
          var type = pathOr('sip', 'stream.videoType', subscriber);
          state.removeSubscriber(type, subscriber);
          session.unsubscribe(subscriber);
          analytics.log(logAction.unsubscribe, logVariation.success);
          resolve();
        });
      };

      this.setSession = function () {
        _this.session = _this.state.getSession();
      };

      this.onStreamCreated = function (_ref) {
        var stream = _ref.stream;
        return _this.active && _this.autoSubscribe && _this.subscribe(stream);
      };

      this.onStreamDestroyed = function (_ref2) {
        var stream = _ref2.stream;
        var state = _this.state,
          triggerEvent = _this.triggerEvent;

        state.removeStream(stream);
        var type = pathOr('sip', 'videoType', stream);
        type === 'screen' && triggerEvent('endViewingSharedScreen'); // Legacy event
        triggerEvent('unsubscribeFrom' + properCase(type), state.getPubSub());
      };

      this.createEventListeners = function () {
        var core = _this.core,
          onStreamCreated = _this.onStreamCreated,
          onStreamDestroyed = _this.onStreamDestroyed;

        core.on('streamCreated', onStreamCreated);
        core.on('streamDestroyed', onStreamDestroyed);
      };

      this.startCall = function (publisherProperties) {
        var analytics = _this.analytics,
          state = _this.state,
          subscribe = _this.subscribe,
          ableToJoin = _this.ableToJoin,
          triggerEvent = _this.triggerEvent,
          autoSubscribe = _this.autoSubscribe,
          publish = _this.publish;

        return new Promise(function (resolve, reject) {
          // eslint-disable-line consistent-return
          analytics.log(logAction.startCall, logVariation.attempt);

          _this.active = true;
          var initialStreamIds = Object.keys(state.getStreams());

          /**
           * Determine if we're able to join the session based on an existing connection limit
           */
          if (!ableToJoin()) {
            var errorMessage = 'Session has reached its connection limit';
            triggerEvent('error', errorMessage);
            analytics.log(logAction.startCall, logVariation.fail);
            return reject(new CoreError(errorMessage, 'connectionLimit'));
          }

          /**
           * Subscribe to any streams that existed before we start the call from our side.
           */
          var subscribeToInitialStreams = function subscribeToInitialStreams(publisher) {
            // Get an array of initial subscription promises
            var initialSubscriptions = function initialSubscriptions() {
              if (autoSubscribe) {
                var streams = state.getStreams();
                return initialStreamIds.map(function (id) {
                  return subscribe(streams[id]);
                });
              }
              return [Promise.resolve()];
            };

            // Handle success
            var onSubscribeToAll = function onSubscribeToAll() {
              var pubSubData = Object.assign({}, state.getPubSub(), {
                publisher: publisher
              });
              triggerEvent('startCall', pubSubData);
              resolve(pubSubData);
            };

            // Handle error
            var onError = function onError(reason) {
              message('Failed to subscribe to all existing streams: ' + reason);
              // We do not reject here in case we still successfully publish to the session
              resolve(Object.assign({}, _this.state.getPubSub(), {
                publisher: publisher
              }));
            };

            Promise.all(initialSubscriptions()).then(onSubscribeToAll).catch(onError);
          };

          publish(publisherProperties).then(subscribeToInitialStreams).catch(reject);
        });
      };

      this.endCall = function () {
        var analytics = _this.analytics,
          state = _this.state,
          session = _this.session,
          unsubscribe = _this.unsubscribe,
          triggerEvent = _this.triggerEvent;

        analytics.log(logAction.endCall, logVariation.attempt);

        var _state$getPubSub = state.getPubSub(),
          publishers = _state$getPubSub.publishers,
          subscribers = _state$getPubSub.subscribers;

        var unpublish = function unpublish(publisher) {
          return session.unpublish(publisher);
        };
        Object.values(publishers.camera).forEach(unpublish);
        Object.values(publishers.screen).forEach(unpublish);
        // TODO Promise.all for unsubsribing
        Object.values(subscribers.camera).forEach(unsubscribe);
        Object.values(subscribers.screen).forEach(unsubscribe);
        state.removeAllPublishers();
        _this.active = false;
        triggerEvent('endCall');
        analytics.log(logAction.endCall, logVariation.success);
      };

      this.enableLocalAV = function (id, source, enable) {
        var method = 'publish' + properCase(source);

        var _state$getPubSub2 = _this.state.getPubSub(),
          publishers = _state$getPubSub2.publishers;

        publishers.camera[id][method](enable);
      };

      this.enableRemoteAV = function (subscriberId, source, enable) {
        var method = 'subscribeTo' + properCase(source);

        var _state$getPubSub3 = _this.state.getPubSub(),
          subscribers = _state$getPubSub3.subscribers;

        var subscriber = subscribers.camera[subscriberId] || subscribers.sip[subscriberId];
        subscriber[method](enable);
      };
    };

    exports.default = Communication;

  }, {
    "./errors": 326,
    "./logging": 328,
    "./util": 333
  }],
  326: [function (require, module, exports) {
    "use strict";

    function _classCallCheck(instance, Constructor) {
      if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
      }
    }

    function _possibleConstructorReturn(self, call) {
      if (!self) {
        throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
      }
      return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    function _inherits(subClass, superClass) {
      if (typeof superClass !== "function" && superClass !== null) {
        throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
      }
      subClass.prototype = Object.create(superClass && superClass.prototype, {
        constructor: {
          value: subClass,
          enumerable: false,
          writable: true,
          configurable: true
        }
      });
      if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    /** Errors */
    var CoreError = function (_Error) {
      _inherits(CoreError, _Error);

      function CoreError(errorMessage, errorType) {
        _classCallCheck(this, CoreError);

        var _this = _possibleConstructorReturn(this, (CoreError.__proto__ || Object.getPrototypeOf(CoreError)).call(this, "otAccCore: " + errorMessage));

        _this.type = errorType;
        return _this;
      }

      return CoreError;
    }(Error);

    module.exports = {
      CoreError: CoreError
    };

  }, {}],
  327: [function (require, module, exports) {
    'use strict';

    var events = {
      session: ['archiveStarted', 'archiveStopped', 'connectionCreated', 'connectionDestroyed', 'sessionConnected', 'sessionDisconnected', 'sessionReconnected', 'sessionReconnecting', 'signal', 'streamCreated', 'streamDestroyed', 'streamPropertyChanged'],
      core: ['connected', 'startScreenShare', 'endScreenShare', 'error'],
      communication: ['startCall', 'endCall', 'callPropertyChanged', 'subscribeToCamera', 'subscribeToScreen', 'subscribeToSip', 'unsubscribeFromCamera', 'unsubscribeFromSip', 'unsubscribeFromScreen', 'startViewingSharedScreen', 'endViewingSharedScreen'],
      textChat: ['showTextChat', 'hideTextChat', 'messageSent', 'errorSendingMessage', 'messageReceived'],
      screenSharing: ['startScreenSharing', 'endScreenSharing', 'screenSharingError'],
      annotation: ['startAnnotation', 'linkAnnotation', 'resizeCanvas', 'annotationWindowClosed', 'endAnnotation'],
      archiving: ['startArchive', 'stopArchive', 'archiveReady', 'archiveError']
    };

    module.exports = events;

  }, {}],
  328: [function (require, module, exports) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
      if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
      }
    }

    var OTKAnalytics = require('opentok-solutions-logging');

    // eslint-disable-next-line no-console
    var message = function message(messageText) {
      return console.log('otAccCore: ' + messageText);
    };

    /** Analytics */

    var logVariation = {
      attempt: 'Attempt',
      success: 'Success',
      fail: 'Fail'
    };

    var logAction = {
      // vars for the analytics logs. Internal use
      init: 'Init',
      initPackages: 'InitPackages',
      connect: 'ConnectCoreAcc',
      disconnect: 'DisconnectCoreAcc',
      forceDisconnect: 'ForceDisconnectCoreAcc',
      forceUnpublish: 'ForceUnpublishCoreAcc',
      getAccPack: 'GetAccPack',
      signal: 'SignalCoreAcc',
      startCall: 'StartCallCoreAcc',
      endCall: 'EndCallCoreAcc',
      toggleLocalAudio: 'ToggleLocalAudio',
      toggleLocalVideo: 'ToggleLocalVideo',
      toggleRemoteAudio: 'ToggleRemoteAudio',
      toggleRemoteVideo: 'ToggleRemoteVideo',
      subscribe: 'SubscribeCoreAcc',
      unsubscribe: 'UnsubscribeCoreAcc'
    };

    var Analytics = function Analytics(source, sessionId, connectionId, apikey, applicationName) {
      _classCallCheck(this, Analytics);

      _initialiseProps.call(this);

      var otkanalyticsData = {
        clientVersion: 'js-vsol-2.0.15', // x.y.z filled by npm build script
        source: source,
        componentId: 'acceleratorCore',
        name: applicationName || 'coreAccelerator',
        partnerId: apikey
      };

      this.analytics = new OTKAnalytics(otkanalyticsData);

      if (connectionId) {
        this.update(sessionId, connectionId, apikey);
      }
    };

    var _initialiseProps = function _initialiseProps() {
      var _this = this;

      this.update = function (sessionId, connectionId, apiKey) {
        if (sessionId && connectionId && apiKey) {
          var sessionInfo = {
            sessionId: sessionId,
            connectionId: connectionId,
            partnerId: apiKey
          };
          _this.analytics.addSessionInfo(sessionInfo);
        }
      };

      this.log = function (action, variation) {
        _this.analytics.logEvent({
          action: action,
          variation: variation
        });
      };
    };

    module.exports = {
      Analytics: Analytics,
      logVariation: logVariation,
      logAction: logAction,
      message: message
    };

  }, {
    "opentok-solutions-logging": 321
  }],
  329: [function (require, module, exports) {
    "use strict";

    function _classCallCheck(instance, Constructor) {
      if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
      }
    }

    function _possibleConstructorReturn(self, call) {
      if (!self) {
        throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
      }
      return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    function _inherits(subClass, superClass) {
      if (typeof superClass !== "function" && superClass !== null) {
        throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
      }
      subClass.prototype = Object.create(superClass && superClass.prototype, {
        constructor: {
          value: subClass,
          enumerable: false,
          writable: true,
          configurable: true
        }
      });
      if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    /** Errors */
    var SDKError = function (_Error) {
      _inherits(SDKError, _Error);

      function SDKError(errorMessage, errorType) {
        _classCallCheck(this, SDKError);

        var _this = _possibleConstructorReturn(this, (SDKError.__proto__ || Object.getPrototypeOf(SDKError)).call(this, "otSDK: " + errorMessage));

        _this.type = errorType;
        return _this;
      }

      return SDKError;
    }(Error);

    module.exports = {
      SDKError: SDKError
    };

  }, {}],
  330: [function (require, module, exports) {
    (function (global) {
      'use strict';

      var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
        return typeof obj;
      } : function (obj) {
        return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
      };

      var _createClass = function () {
        function defineProperties(target, props) {
          for (var i = 0; i < props.length; i++) {
            var descriptor = props[i];
            descriptor.enumerable = descriptor.enumerable || false;
            descriptor.configurable = true;
            if ("value" in descriptor) descriptor.writable = true;
            Object.defineProperty(target, descriptor.key, descriptor);
          }
        }
        return function (Constructor, protoProps, staticProps) {
          if (protoProps) defineProperties(Constructor.prototype, protoProps);
          if (staticProps) defineProperties(Constructor, staticProps);
          return Constructor;
        };
      }();

      function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
          throw new TypeError("Cannot call a class as a function");
        }
      }

      /* global OT */

      /* Dependencies */
      var State = require('./state');

      var _require = require('./errors'),
        SDKError = _require.SDKError;

      /* Internal variables */

      var stateMap = new WeakMap();

      /* Internal methods */

      /**
       * Ensures that we have the required credentials
       * @param {Object} credentials
       * @param {String} credentials.apiKey
       * @param {String} credentials.sessionId
       * @param {String} credentials.token
       * @returns {Object}
       */
      var validateCredentials = function validateCredentials() {
        var credentials = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

        var required = ['apiKey', 'sessionId', 'token'];
        required.forEach(function (credential) {
          if (!credentials[credential]) {
            throw new SDKError(credential + ' is a required credential', 'invalidParameters');
          }
        });
        return credentials;
      };

      /**
       * Initialize an OpenTok publisher object
       * @param {String | Object} element - The target element
       * @param {Object} properties - The publisher properties
       * @returns {Promise} <resolve: Object, reject: Error>
       */
      var initPublisher = function initPublisher(element, properties) {
        return new Promise(function (resolve, reject) {
          var publisher = OT.initPublisher(element, properties, function (error) {
            error ? reject(error) : resolve(publisher);
          });
        });
      };

      /**
       * Binds and sets a single event listener on the OpenTok session
       * @param {String} event - The name of the event
       * @param {Function} callback
       */
      var bindListener = function bindListener(target, context, event, callback) {
        var paramsError = '\'on\' requires a string and a function to create an event listener.';
        if (typeof event !== 'string' || typeof callback !== 'function') {
          throw new SDKError(paramsError, 'invalidParameters');
        }
        target.on(event, callback.bind(context));
      };

      /**
       * Bind and set event listeners
       * @param {Object} target - An OpenTok session, publisher, or subscriber object
       * @param {Object} context - The context to which to bind event listeners
       * @param {Object | Array} listeners - An object (or array of objects) with
       *        eventName/callback k/v pairs
       */
      var bindListeners = function bindListeners(target, context, listeners) {
        /**
         * Create listeners from an object with event/callback k/v pairs
         * @param {Object} listeners
         */
        var createListenersFromObject = function createListenersFromObject(eventListeners) {
          Object.keys(eventListeners).forEach(function (event) {
            bindListener(target, context, event, eventListeners[event]);
          });
        };

        if (Array.isArray(listeners)) {
          listeners.forEach(function (listener) {
            return createListenersFromObject(listener);
          });
        } else {
          createListenersFromObject(listeners);
        }
      };

      /**
       * @class
       * Represents an OpenTok SDK Wrapper
       */

      var OpenTokSDK = function () {
        /**
         * Create an SDK Wrapper
         * @param {Object} credentials
         * @param {String} credentials.apiKey
         * @param {String} credentials.sessionId
         * @param {String} credentials.token
         */
        function OpenTokSDK(credentials) {
          _classCallCheck(this, OpenTokSDK);

          this.credentials = validateCredentials(credentials);
          stateMap.set(this, new State());
          this.session = OT.initSession(credentials.apiKey, credentials.sessionId);
        }

        /**
         * Determines if a connection object is my local connection
         * @param {Object} connection - An OpenTok connection object
         * @returns {Boolean}
         */


        _createClass(OpenTokSDK, [{
          key: 'isMe',
          value: function isMe(connection) {
            var session = this.session;

            return session && session.connection.connectionId === connection.connectionId;
          }

          /**
           * Wrap OpenTok session events
           */

        }, {
          key: 'setInternalListeners',
          value: function setInternalListeners() {
            /**
             * Wrap session events and update state when streams are created
             * or destroyed
             */
            var state = stateMap.get(this);
            this.session.on('streamCreated', function (_ref) {
              var stream = _ref.stream;
              return state.addStream(stream);
            });
            this.session.on('streamDestroyed', function (_ref2) {
              var stream = _ref2.stream;
              return state.removeStream(stream);
            });
            this.session.on('sessionConnected sessionReconnected', function () {
              return state.setConnected(true);
            });
            this.session.on('sessionDisconnected', function () {
              return state.setConnected(false);
            });
          }

          /**
           * Register a callback for a specific event, pass an object
           * with event => callback key/values (or an array of objects)
           * to register callbacks for multiple events.
           * @param {String | Object | Array} [events] - The name of the events
           * @param {Function} [callback]
           * https://tokbox.com/developer/sdks/js/reference/Session.html#on
           */

        }, {
          key: 'on',
          value: function on() {
            if (arguments.length === 1 && _typeof(arguments.length <= 0 ? undefined : arguments[0]) === 'object') {
              bindListeners(this.session, this, arguments.length <= 0 ? undefined : arguments[0]);
            } else if (arguments.length === 2) {
              bindListener(this.session, this, arguments.length <= 0 ? undefined : arguments[0], arguments.length <= 1 ? undefined : arguments[1]);
            }
          }

          /**
           * Remove a callback for a specific event. If no parameters are passed,
           * all callbacks for the session will be removed.
           * @param {String} [events] - The name of the events
           * @param {Function} [callback]
           * https://tokbox.com/developer/sdks/js/reference/Session.html#off
           */

        }, {
          key: 'off',
          value: function off() {
            var _session;

            (_session = this.session).off.apply(_session, arguments);
          }

          /**
           * Enable or disable local publisher audio
           * @param {Boolean} enable
           */

        }, {
          key: 'enablePublisherAudio',
          value: function enablePublisherAudio(enable) {
            var _stateMap$get$getPubS = stateMap.get(this).getPubSub(),
              publishers = _stateMap$get$getPubS.publishers;

            Object.keys(publishers.camera).forEach(function (publisherId) {
              publishers.camera[publisherId].publishAudio(enable);
            });
          }

          /**
           * Enable or disable local publisher video
           * @param {Boolean} enable
           */

        }, {
          key: 'enablePublisherVideo',
          value: function enablePublisherVideo(enable) {
            var _stateMap$get$getPubS2 = stateMap.get(this).getPubSub(),
              publishers = _stateMap$get$getPubS2.publishers;

            Object.keys(publishers.camera).forEach(function (publisherId) {
              publishers.camera[publisherId].publishVideo(enable);
            });
          }

          /**
           * Enable or disable local subscriber audio
           * @param {String} streamId
           * @param {Boolean} enable
           */

        }, {
          key: 'enableSubscriberAudio',
          value: function enableSubscriberAudio(streamId, enable) {
            var _stateMap$get$all = stateMap.get(this).all(),
              streamMap = _stateMap$get$all.streamMap,
              subscribers = _stateMap$get$all.subscribers;

            var subscriberId = streamMap[streamId];
            var subscriber = subscribers.camera[subscriberId] || subscribers.screen[subscriberId];
            subscriber && subscriber.subscribeToAudio(enable);
          }

          /**
           * Enable or disable local subscriber video
           * @param {String} streamId
           * @param {Boolean} enable
           */

        }, {
          key: 'enableSubscriberVideo',
          value: function enableSubscriberVideo(streamId, enable) {
            var _stateMap$get$all2 = stateMap.get(this).all(),
              streamMap = _stateMap$get$all2.streamMap,
              subscribers = _stateMap$get$all2.subscribers;

            var subscriberId = streamMap[streamId];
            var subscriber = subscribers.camera[subscriberId] || subscribers.screen[subscriberId];
            subscriber && subscriber.subscribeToVideo(enable);
          }

          /**
           * Create and publish a stream
           * @param {String | Object} element - The target element
           * @param {Object} properties - The publisher properties
           * @param {Array | Object} [eventListeners] - An object (or array of objects) with
           *        eventName/callback k/v pairs
           * @param {Boolean} [preview] - Create a publisher with publishing to the session
           * @returns {Promise} <resolve: Object, reject: Error>
           */

        }, {
          key: 'publish',
          value: function publish(element, properties) {
            var _this = this;

            var eventListeners = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
            var preview = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;

            return new Promise(function (resolve, reject) {
              initPublisher(element, properties) // eslint-disable-next-line no-confusing-arrow
                .then(function (publisher) {
                  eventListeners && bindListeners(publisher, _this, eventListeners);
                  if (preview) {
                    resolve(publisher);
                  } else {
                    _this.publishPreview(publisher).then(resolve).catch(reject);
                  }
                }).catch(reject);
            });
          }

          /**
           * Publish a 'preview' stream to the session
           * @param {Object} publisher - An OpenTok publisher object
           * @returns {Promise} <resolve: empty, reject: Error>
           */

        }, {
          key: 'publishPreview',
          value: function publishPreview(publisher) {
            var _this2 = this;

            return new Promise(function (resolve, reject) {
              var state = stateMap.get(_this2);
              _this2.session.publish(publisher, function (error) {
                error && reject(error);
                var type = publisher.stream.videoType;
                state.addPublisher(type, publisher);
                resolve(publisher);
              });
            });
          }

          /**
           * Stop publishing a stream
           * @param {Object} publisher - An OpenTok publisher object
           */

        }, {
          key: 'unpublish',
          value: function unpublish(publisher) {
            var type = publisher.stream.videoType;
            var state = stateMap.get(this);
            this.session.unpublish(publisher);
            state.removePublisher(type, publisher);
          }

          /**
           * Subscribe to stream
           * @param {Object} stream
           * @param {String | Object} container - The id of the container or a reference to the element
           * @param {Object} [properties]
           * @param {Array | Object} [eventListeners] - An object (or array of objects) with
           *        eventName/callback k/v pairs
           * @returns {Promise} <resolve: empty, reject: Error>
           * https://tokbox.com/developer/sdks/js/reference/Session.html#subscribe
           */

        }, {
          key: 'subscribe',
          value: function subscribe(stream, container, properties, eventListeners) {
            var _this3 = this;

            var state = stateMap.get(this);
            return new Promise(function (resolve, reject) {
              var subscriber = _this3.session.subscribe(stream, container, properties, function (error) {
                if (error) {
                  reject(error);
                } else {
                  state.addSubscriber(subscriber);
                  eventListeners && bindListeners(subscriber, _this3, eventListeners);
                  resolve(subscriber);
                }
              });
            });
          }

          /**
           * Unsubscribe from a stream and update the state
           * @param {Object} subscriber - An OpenTok subscriber object
           * @returns {Promise} <resolve: empty>
           */

        }, {
          key: 'unsubscribe',
          value: function unsubscribe(subscriber) {
            var _this4 = this;

            var state = stateMap.get(this);
            return new Promise(function (resolve) {
              _this4.session.unsubscribe(subscriber);
              state.removeSubscriber(subscriber);
              resolve();
            });
          }

          /**
           * Connect to the OpenTok session
           * @param {Array | Object} [eventListeners] - An object (or array of objects) with
           *        eventName/callback k/v pairs
           * @returns {Promise} <resolve: empty, reject: Error>
           */

        }, {
          key: 'connect',
          value: function connect(eventListeners) {
            var _this5 = this;

            this.off();
            this.setInternalListeners();
            eventListeners && this.on(eventListeners);
            return new Promise(function (resolve, reject) {
              var token = _this5.credentials.token;

              _this5.session.connect(token, function (error) {
                error ? reject(error) : resolve();
              });
            });
          }

          /**
           * Force a remote connection to leave the session
           * @param {Object} connection
           * @returns {Promise} <resolve: empty, reject: Error>
           */

        }, {
          key: 'forceDisconnect',
          value: function forceDisconnect(connection) {
            var _this6 = this;

            return new Promise(function (resolve, reject) {
              _this6.session.forceDisconnect(connection, function (error) {
                error ? reject(error) : resolve();
              });
            });
          }

          /**
           * Force the publisher of a stream to stop publishing the stream
           * @param {Object} stream
           * @returns {Promise} <resolve: empty, reject: Error>
           */

        }, {
          key: 'forceUnpublish',
          value: function forceUnpublish(stream) {
            var _this7 = this;

            return new Promise(function (resolve, reject) {
              _this7.session.forceUnpublish(stream, function (error) {
                error ? reject(error) : resolve();
              });
            });
          }

          /**
           * Send a signal using the OpenTok signaling apiKey
           * @param {String} type
           * @param {*} signalData
           * @param {Object} [to] - An OpenTok connection object
           * @returns {Promise} <resolve: empty, reject: Error>
           * https://tokbox.com/developer/guides/signaling/js/
           */

        }, {
          key: 'signal',
          value: function signal(type, signalData, to) {
            var _this8 = this;

            var data = JSON.stringify(signalData);
            var signal = to ? {
              type: type,
              data: data,
              to: to
            } : {
              type: type,
              data: data
            };
            return new Promise(function (resolve, reject) {
              _this8.session.signal(signal, function (error) {
                error ? reject(error) : resolve();
              });
            });
          }

          /**
           * Disconnect from the OpenTok session
           */

        }, {
          key: 'disconnect',
          value: function disconnect() {
            this.session.disconnect();
            stateMap.get(this).reset();
          }

          /**
           * Return the state of the OpenTok session
           * @returns {Object} Streams, publishers, subscribers, and stream map
           */

        }, {
          key: 'state',
          value: function state() {
            return stateMap.get(this).all();
          }
        }]);

        return OpenTokSDK;
      }();

      if (global === window) {
        window.OpenTokSDK = OpenTokSDK;
      }

      module.exports = OpenTokSDK;

    }).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
  }, {
    "./errors": 329,
    "./state": 331
  }],
  331: [function (require, module, exports) {
    "use strict";

    var _createClass = function () {
      function defineProperties(target, props) {
        for (var i = 0; i < props.length; i++) {
          var descriptor = props[i];
          descriptor.enumerable = descriptor.enumerable || false;
          descriptor.configurable = true;
          if ("value" in descriptor) descriptor.writable = true;
          Object.defineProperty(target, descriptor.key, descriptor);
        }
      }
      return function (Constructor, protoProps, staticProps) {
        if (protoProps) defineProperties(Constructor.prototype, protoProps);
        if (staticProps) defineProperties(Constructor, staticProps);
        return Constructor;
      };
    }();

    function _classCallCheck(instance, Constructor) {
      if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
      }
    }

    var State = function () {
      function State() {
        _classCallCheck(this, State);

        this.publishers = {
          camera: {},
          screen: {}
        };

        this.subscribers = {
          camera: {},
          screen: {}
        };

        this.streams = {};

        // Map stream ids to subscriber/publisher ids
        this.streamMap = {};

        // OpenTok session
        this.session = null;

        // OpenTok credentials
        this.credentials = null;

        // Session Connection Status
        this.connected = false;
      }

      // Set the current connection state


      _createClass(State, [{
        key: "setConnected",
        value: function setConnected(connected) {
          this.connected = connected;
        }

        // Get the current OpenTok session

      }, {
        key: "getSession",
        value: function getSession() {
          return this.session;
        }

        // Set the current OpenTok session

      }, {
        key: "setSession",
        value: function setSession(session) {
          this.session = session;
        }

        // Get the current OpenTok credentials

      }, {
        key: "getCredentials",
        value: function getCredentials() {
          return this.credentials;
        }
        // Set the current OpenTok credentials

      }, {
        key: "setCredentials",
        value: function setCredentials(credentials) {
          this.credentials = credentials;
        }

        /**
         * Returns the count of current publishers and subscribers by type
         * @retuns {Object}
         *    {
         *      publishers: {
         *        camera: 1,
         *        screen: 1,
         *        total: 2
         *      },
         *      subscribers: {
         *        camera: 3,
         *        screen: 1,
         *        total: 4
         *      }
         *   }
         */

      }, {
        key: "pubSubCount",
        value: function pubSubCount() {
          var publishers = this.publishers,
            subscribers = this.subscribers;
          /* eslint-disable no-param-reassign */

          var pubs = Object.keys(publishers).reduce(function (acc, source) {
            acc[source] = Object.keys(publishers[source]).length;
            acc.total += acc[source];
            return acc;
          }, {
            camera: 0,
            screen: 0,
            total: 0
          });

          var subs = Object.keys(subscribers).reduce(function (acc, source) {
            acc[source] = Object.keys(subscribers[source]).length;
            acc.total += acc[source];
            return acc;
          }, {
            camera: 0,
            screen: 0,
            total: 0
          });
          /* eslint-enable no-param-reassign */
          return {
            publisher: pubs,
            subscriber: subs
          };
        }

        /**
         * Returns the current publishers and subscribers, along with a count of each
         */

      }, {
        key: "getPubSub",
        value: function getPubSub() {
          var publishers = this.publishers,
            subscribers = this.subscribers;

          return {
            publishers: publishers,
            subscribers: subscribers,
            meta: this.pubSubCount()
          };
        }
      }, {
        key: "addPublisher",
        value: function addPublisher(type, publisher) {
          this.streamMap[publisher.streamId] = publisher.id;
          this.publishers[type][publisher.id] = publisher;
        }
      }, {
        key: "removePublisher",
        value: function removePublisher(type, publisher) {
          var id = publisher.id || this.streamMap[publisher.streamId];
          delete this.publishers[type][id];
        }
      }, {
        key: "removeAllPublishers",
        value: function removeAllPublishers() {
          this.publishers.camera = {};
          this.publishers.screen = {};
        }
      }, {
        key: "addSubscriber",
        value: function addSubscriber(subscriber) {
          var type = subscriber.stream.videoType;
          var streamId = subscriber.stream.id;
          this.subscribers[type][subscriber.id] = subscriber;
          this.streamMap[streamId] = subscriber.id;
        }
      }, {
        key: "removeSubscriber",
        value: function removeSubscriber() {
          var subscriber = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
          var stream = subscriber.stream;

          var type = stream && stream.videoType;
          delete this.subscribers[type][subscriber.id];
        }
      }, {
        key: "addStream",
        value: function addStream(stream) {
          this.streams[stream.id] = stream;
        }
      }, {
        key: "removeStream",
        value: function removeStream(stream) {
          var type = stream.videoType;
          var subscriberId = this.streamMap[stream.id];
          delete this.streamMap[stream.id];
          delete this.streams[stream.id];
          this.removeSubscriber(this.subscribers[type][subscriberId]);
        }
      }, {
        key: "getStreams",
        value: function getStreams() {
          return this.streams;
        }

        /** Reset streams, publishers, and subscribers */

      }, {
        key: "reset",
        value: function reset() {
          this.streams = {};
          this.streamMap = {};
          this.publishers = {
            camera: {},
            screen: {}
          };
          this.subscribers = {
            camera: {},
            screen: {}
          };
        }
      }, {
        key: "all",
        value: function all() {
          var streams = this.streams,
            streamMap = this.streamMap,
            connected = this.connected;

          return Object.assign({}, this.getPubSub(), {
            streams: streams,
            streamMap: streamMap,
            connected: connected
          });
        }
      }]);

      return State;
    }();

    module.exports = State;

  }, {}],
  332: [function (require, module, exports) {
    'use strict';

    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    function _classCallCheck(instance, Constructor) {
      if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
      }
    }

    var _require = require('./util'),
      pathOr = _require.pathOr;

    var State = function State() {
      var _this = this;

      _classCallCheck(this, State);

      this.pubSubCount = function () {
        var publishers = _this.publishers,
          subscribers = _this.subscribers;
        /* eslint-disable no-param-reassign */

        var pubs = Object.keys(publishers).reduce(function (acc, source) {
          acc[source] = Object.keys(publishers[source]).length;
          acc.total += acc[source];
          return acc;
        }, {
          camera: 0,
          screen: 0,
          total: 0
        });

        var subs = Object.keys(subscribers).reduce(function (acc, source) {
          acc[source] = Object.keys(subscribers[source]).length;
          acc.total += acc[source];
          return acc;
        }, {
          camera: 0,
          screen: 0,
          sip: 0,
          total: 0
        });
        /* eslint-enable no-param-reassign */
        return {
          publisher: pubs,
          subscriber: subs
        };
      };

      this.getPubSub = function () {
        var publishers = _this.publishers,
          subscribers = _this.subscribers,
          pubSubCount = _this.pubSubCount;

        return {
          publishers: publishers,
          subscribers: subscribers,
          meta: pubSubCount()
        };
      };

      this.all = function () {
        var streams = _this.streams,
          streamMap = _this.streamMap,
          getPubSub = _this.getPubSub;

        return Object.assign({}, {
          streams: streams,
          streamMap: streamMap
        }, getPubSub());
      };

      this.getSession = function () {
        return _this.session;
      };

      this.setSession = function (otSession) {
        _this.session = otSession;
      };

      this.getCredentials = function () {
        return _this.credentials;
      };

      this.setCredentials = function (otCredentials) {
        _this.credentials = otCredentials;
      };

      this.getOptions = function () {
        return _this.options;
      };

      this.setOptions = function (otOptions) {
        _this.options = otOptions;
      };

      this.addStream = function (stream) {
        _this.streams[stream.id] = stream;
      };

      this.removeStream = function (stream) {
        var streamMap = _this.streamMap,
          subscribers = _this.subscribers,
          streams = _this.streams;

        var type = pathOr('sip', 'videoType', stream);
        var subscriberId = streamMap[stream.id];
        delete streamMap[stream.id];
        delete subscribers[type][subscriberId];
        delete streams[stream.id];
      };

      this.getStreams = function () {
        return _this.streams;
      };

      this.getStreamMap = function () {
        return _this.streamMap;
      };

      this.addPublisher = function (type, publisher) {
        _this.streamMap[publisher.streamId] = publisher.id;
        _this.publishers[type][publisher.id] = publisher;
      };

      this.removePublisher = function (type, publisher) {
        var streamMap = _this.streamMap,
          publishers = _this.publishers;

        var id = publisher.id || streamMap[publisher.streamId];
        delete publishers[type][id];
        delete streamMap[publisher.streamId];
      };

      this.removeAllPublishers = function () {
        var publishers = _this.publishers,
          removePublisher = _this.removePublisher;

        ['camera', 'screen'].forEach(function (type) {
          Object.values(publishers[type]).forEach(function (publisher) {
            removePublisher(type, publisher);
          });
        });
      };

      this.addSubscriber = function (subscriber) {
        var subscribers = _this.subscribers,
          streamMap = _this.streamMap;

        var streamId = subscriber.stream.id;
        var type = pathOr('sip', 'stream.videoType', subscriber);
        subscribers[type][subscriber.id] = subscriber;
        streamMap[streamId] = subscriber.id;
      };

      this.removeSubscriber = function (type, subscriber) {
        var subscribers = _this.subscribers,
          streamMap = _this.streamMap;

        var id = subscriber.id || streamMap[subscriber.streamId];
        delete subscribers[type][id];
        delete streamMap[subscriber.streamId];
      };

      this.removeAllSubscribers = function () {
        ['camera', 'screen', 'sip'].forEach(function (type) {
          Object.values(_this.subscribers[type]).forEach(function (subscriber) {
            _this.removeSubscriber(type, subscriber);
          });
        });
      };

      this.reset = function () {
        var removeAllPublishers = _this.removeAllPublishers,
          removeAllSubscribers = _this.removeAllSubscribers,
          streams = _this.streams,
          streamMap = _this.streamMap;

        removeAllPublishers();
        removeAllSubscribers();
        [streams, streamMap].forEach(function (streamObj) {
          Object.keys(streamObj).forEach(function (streamId) {
            delete streamObj[streamId]; // eslint-disable-line no-param-reassign
          });
        });
      };

      this.publishers = {
        camera: {},
        screen: {}
      };

      // Map subscriber id to subscriber objects
      this.subscribers = {
        camera: {},
        screen: {},
        sip: {}
      };

      // Map stream ids to stream objects
      this.streams = {};

      // Map stream ids to subscriber/publisher ids
      this.streamMap = {};

      // The OpenTok session
      this.session = null;

      // OpenTok session credentials
      this.credentials = null;

      // Core options
      this.options = null;
    }
    /**
     * Internal methods
     */

    /**
     * Returns the count of current publishers and subscribers by type
     * @retuns {Object}
     *    {
     *      publishers: {
     *        camera: 1,
     *        screen: 1,
     *        total: 2
     *      },
     *      subscribers: {
     *        camera: 3,
     *        screen: 1,
     *        total: 4
     *      }
     *   }
     */


    /**
     * Returns the current publishers and subscribers, along with a count of each
     * @returns {Object}
     */


    /**
     * Get streams, streamMap, publishers, and subscribers
     * @return {Object}
     */


    /**
     * Get the current OpenTok session
     * @returns {Object}
     */


    /**
     * Set the current OpenTok session
     * @param {Object} otSession
     */


    /**
     * Get the current OpenTok credentials
     * @returns {Object}
     */


    /**
     * Set the current OpenTok credentials
     * @param {Object} otCredentials
     */


    /**
     * Get the options defined for core
     * @returns {Object}
     */


    /**
     * Set the options defined for core
     * @param {Object} otOptions
     */


    /**
     * Add a stream to state
     * @param {Object} stream - An OpenTok stream object
     */


    /**
     * Remove a stream from state and any associated subscribers
     * @param {Object} stream - An OpenTok stream object
     */


    /**
     * Get all remote streams
     * @returns {Object}
     */


    /**
     * Get the map of stream ids to publisher/subscriber ids
     * @returns {Object}
     */


    /**
     * Add a publisher to state
     * @param {String} type - 'camera' or 'screen'
     * @param {Object} publisher - The OpenTok publisher object
     */


    /**
     * Remove a publisher from state
     * @param {String} type - 'camera' or 'screen'
     * @param {Object} publisher - The OpenTok publisher object
     */


    /**
     * Remove all publishers from state
     */


    /**
     * Add a subscriber to state
     * @param {Object} - An OpenTok subscriber object
     */


    /**
     * Remove a publisher from state
     * @param {String} type - 'camera' or 'screen'
     * @param {Object} subscriber - The OpenTok subscriber object
     */


    /**
     * Remove all subscribers from state
     */


    /**
     * Reset state
     */
    ;

    /** Export */


    exports.default = State;

  }, {
    "./util": 333
  }],
  333: [function (require, module, exports) {
    'use strict';

    /** Wrap DOM selector methods:
     *  document.querySelector,
     *  document.getElementById,
     *  document.getElementsByClassName
     *  'element' checks for a string before returning an element with `query`
     */
    var dom = {
      query: function query(arg) {
        return document.querySelector(arg);
      },
      id: function id(arg) {
        return document.getElementById(arg);
      },
      class: function _class(arg) {
        return document.getElementsByClassName(arg);
      },
      element: function element(el) {
        return typeof el === 'string' ? this.query(el) : el;
      }
    };

    /**
     * Returns a (nested) propery from an object, or undefined if it doesn't exist
     * @param {String | Array} props - An array of properties or a single property
     * @param {Object | Array} obj
     */
    var path = function path(props, obj) {
      var nested = obj;
      var properties = typeof props === 'string' ? props.split('.') : props;

      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = properties[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var property = _step.value;

          nested = nested[property];
          if (nested === undefined) {
            return nested;
          }
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

      return nested;
    };

    /**
     * Checks for a (nested) propery in an object and returns the property if
     * it exists.  Otherwise, it returns a default value.
     * @param {*} d - Default value
     * @param {String | Array} props - An array of properties or a single property
     * @param {Object | Array} obj
     */
    var pathOr = function pathOr(d, props, obj) {
      var value = path(props, obj);
      return value === undefined ? d : value;
    };

    /**
     * Converts a string to proper case (e.g. 'camera' => 'Camera')
     * @param {String} text
     * @returns {String}
     */
    var properCase = function properCase(text) {
      return '' + text[0].toUpperCase() + text.slice(1);
    };

    module.exports = {
      dom: dom,
      path: path,
      pathOr: pathOr,
      properCase: properCase
    };

  }, {}]
}, {}, [324]);