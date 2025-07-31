/**
 * StackFrame.js - Stack frames for JavaScript error handling
 * v1.1.1
 * 
 * This is a polyfill for the stackframe module needed by Pyodide and error-stack-parser
 */
(function(root, factory) {
  'use strict';
  // Universal Module Definition (UMD) to support CommonJS, AMD and browser globals
  if (typeof define === 'function' && define.amd) {
    // AMD
    define('stackframe', [], factory);
  } else if (typeof exports === 'object') {
    // Node, CommonJS
    module.exports = factory();
  } else {
    // Browser globals (root is window)
    root.StackFrame = factory();
  }
}(this, function() {
  'use strict';

  function _isNumber(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
  }

  function _capitalize(str) {
    return str.charAt(0).toUpperCase() + str.substring(1);
  }

  function _getter(p) {
    return function() {
      return this[p];
    };
  }

  var booleanProps = ['isConstructor', 'isEval', 'isNative', 'isToplevel'];
  var numericProps = ['columnNumber', 'lineNumber'];
  var stringProps = ['fileName', 'functionName', 'source'];
  var arrayProps = ['args'];
  var objectProps = ['evalOrigin'];

  var props = booleanProps.concat(numericProps, stringProps, arrayProps, objectProps);

  function StackFrame(obj) {
    if (!obj) return;
    for (var i = 0; i < props.length; i++) {
      if (obj[props[i]] !== undefined) {
        this['set' + _capitalize(props[i])](obj[props[i]]);
      }
    }
  }

  StackFrame.prototype = {
    getArgs: function() {
      return this.args;
    },
    setArgs: function(v) {
      if (Object.prototype.toString.call(v) !== '[object Array]') {
        throw new TypeError('Args must be an Array');
      }
      this.args = v;
      return this;
    },
    getEvalOrigin: function() {
      return this.evalOrigin;
    },
    setEvalOrigin: function(v) {
      if (v instanceof StackFrame) {
        this.evalOrigin = v;
      } else if (v instanceof Object) {
        this.evalOrigin = new StackFrame(v);
      } else {
        throw new TypeError('Eval Origin must be an Object or StackFrame');
      }
      return this;
    },
    toString: function() {
      var fileName = this.getFileName() || '';
      var lineNumber = this.getLineNumber() || '';
      var columnNumber = this.getColumnNumber() || '';
      var functionName = this.getFunctionName() || '';
      if (this.getIsEval()) {
        if (fileName) {
          return '[eval] (' + fileName + ':' + lineNumber + ':' + columnNumber + ')';
        }
        return '[eval]:' + lineNumber + ':' + columnNumber;
      }
      if (functionName) {
        return functionName + ' (' + fileName + ':' + lineNumber + ':' + columnNumber + ')';
      }
      return fileName + ':' + lineNumber + ':' + columnNumber;
    }
  };

  // Generate all getter/setter methods
  StackFrame.prototype.getColumnNumber = _getter('columnNumber');
  StackFrame.prototype.setColumnNumber = function(v) {
    if (_isNumber(v)) {
      this.columnNumber = v;
      return this;
    }
    return this;
  };

  StackFrame.prototype.getLineNumber = _getter('lineNumber');
  StackFrame.prototype.setLineNumber = function(v) {
    if (_isNumber(v)) {
      this.lineNumber = v;
      return this;
    }
    return this;
  };

  StackFrame.prototype.getFunctionName = _getter('functionName');
  StackFrame.prototype.setFunctionName = function(v) {
    this.functionName = String(v);
    return this;
  };

  StackFrame.prototype.getFileName = _getter('fileName');
  StackFrame.prototype.setFileName = function(v) {
    this.fileName = String(v);
    return this;
  };

  StackFrame.prototype.getSource = _getter('source');
  StackFrame.prototype.setSource = function(v) {
    this.source = String(v);
    return this;
  };

  StackFrame.prototype.getIsConstructor = _getter('isConstructor');
  StackFrame.prototype.setIsConstructor = function(v) {
    this.isConstructor = Boolean(v);
    return this;
  };

  StackFrame.prototype.getIsEval = _getter('isEval');
  StackFrame.prototype.setIsEval = function(v) {
    this.isEval = Boolean(v);
    return this;
  };

  StackFrame.prototype.getIsNative = _getter('isNative');
  StackFrame.prototype.setIsNative = function(v) {
    this.isNative = Boolean(v);
    return this;
  };

  StackFrame.prototype.getIsToplevel = _getter('isToplevel');
  StackFrame.prototype.setIsToplevel = function(v) {
    this.isToplevel = Boolean(v);
    return this;
  };

  return StackFrame;
}));
