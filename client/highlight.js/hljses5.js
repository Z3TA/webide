"use strict";

function _createForOfIteratorHelper(o, allowArrayLike) { var it; if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e8) { throw _e8; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e9) { didErr = true; err = _e9; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _iterableToArrayLimit(arr, i) { if (typeof Symbol === "undefined" || !(Symbol.iterator in Object(arr))) return; var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && Symbol.iterator in Object(iter)) return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

/*
  Highlight.js 10.5.0 (16c2224d)
  License: BSD-3-Clause
  Copyright (c) 2006-2020, Ivan Sagalaev
*/
var hljs = function () {
  "use strict";

  function e(t) {
    return t instanceof Map ? t.clear = t["delete"] = t.set = function () {
      throw Error("map is read-only");
    } : t instanceof Set && (t.add = t.clear = t["delete"] = function () {
      throw Error("set is read-only");
    }), Object.freeze(t), Object.getOwnPropertyNames(t).forEach(function (n) {
      var s = t[n];
      "object" != _typeof(s) || Object.isFrozen(s) || e(s);
    }), t;
  }

  var t = e,
      n = e;
  t["default"] = n;

  var s = /*#__PURE__*/function () {
    function s(e) {
      _classCallCheck(this, s);

      void 0 === e.data && (e.data = {}), this.data = e.data;
    }

    _createClass(s, [{
      key: "ignoreMatch",
      value: function ignoreMatch() {
        this.ignore = !0;
      }
    }]);

    return s;
  }();

  function r(e) {
    return e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
  }

  function a(e) {
    var n = Object.create(null);

    for (var _t in e) {
      n[_t] = e[_t];
    }

    for (var _len = arguments.length, t = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      t[_key - 1] = arguments[_key];
    }

    return t.forEach(function (e) {
      for (var _t2 in e) {
        n[_t2] = e[_t2];
      }
    }), n;
  }

  var i = function i(e) {
    return !!e.kind;
  };

  var o = /*#__PURE__*/function () {
    function o(e, t) {
      _classCallCheck(this, o);

      this.buffer = "", this.classPrefix = t.classPrefix, e.walk(this);
    }

    _createClass(o, [{
      key: "addText",
      value: function addText(e) {
        this.buffer += r(e);
      }
    }, {
      key: "openNode",
      value: function openNode(e) {
        if (!i(e)) return;
        var t = e.kind;
        e.sublanguage || (t = "".concat(this.classPrefix).concat(t)), this.span(t);
      }
    }, {
      key: "closeNode",
      value: function closeNode(e) {
        i(e) && (this.buffer += "</span>");
      }
    }, {
      key: "value",
      value: function value() {
        return this.buffer;
      }
    }, {
      key: "span",
      value: function span(e) {
        this.buffer += "<span class=\"".concat(e, "\">");
      }
    }]);

    return o;
  }();

  var l = /*#__PURE__*/function () {
    function l() {
      _classCallCheck(this, l);

      this.rootNode = {
        children: []
      }, this.stack = [this.rootNode];
    }

    _createClass(l, [{
      key: "top",
      get: function get() {
        return this.stack[this.stack.length - 1];
      }
    }, {
      key: "root",
      get: function get() {
        return this.rootNode;
      }
    }, {
      key: "add",
      value: function add(e) {
        this.top.children.push(e);
      }
    }, {
      key: "openNode",
      value: function openNode(e) {
        var t = {
          kind: e,
          children: []
        };
        this.add(t), this.stack.push(t);
      }
    }, {
      key: "closeNode",
      value: function closeNode() {
        if (this.stack.length > 1) return this.stack.pop();
      }
    }, {
      key: "closeAllNodes",
      value: function closeAllNodes() {
        for (; this.closeNode();) {
          ;
        }
      }
    }, {
      key: "toJSON",
      value: function toJSON() {
        return JSON.stringify(this.rootNode, null, 4);
      }
    }, {
      key: "walk",
      value: function walk(e) {
        return this.constructor._walk(e, this.rootNode);
      }
    }], [{
      key: "_walk",
      value: function _walk(e, t) {
        var _this = this;

        return "string" == typeof t ? e.addText(t) : t.children && (e.openNode(t), t.children.forEach(function (t) {
          return _this._walk(e, t);
        }), e.closeNode(t)), e;
      }
    }, {
      key: "_collapse",
      value: function _collapse(e) {
        "string" != typeof e && e.children && (e.children.every(function (e) {
          return "string" == typeof e;
        }) ? e.children = [e.children.join("")] : e.children.forEach(function (e) {
          l._collapse(e);
        }));
      }
    }]);

    return l;
  }();

  var c = /*#__PURE__*/function (_l) {
    _inherits(c, _l);

    var _super = _createSuper(c);

    function c(e) {
      var _this2;

      _classCallCheck(this, c);

      _this2 = _super.call(this), _this2.options = e;
      return _this2;
    }

    _createClass(c, [{
      key: "addKeyword",
      value: function addKeyword(e, t) {
        "" !== e && (this.openNode(t), this.addText(e), this.closeNode());
      }
    }, {
      key: "addText",
      value: function addText(e) {
        "" !== e && this.add(e);
      }
    }, {
      key: "addSublanguage",
      value: function addSublanguage(e, t) {
        var n = e.root;
        n.kind = t, n.sublanguage = !0, this.add(n);
      }
    }, {
      key: "toHTML",
      value: function toHTML() {
        return new o(this, this.options).value();
      }
    }, {
      key: "finalize",
      value: function finalize() {
        return !0;
      }
    }]);

    return c;
  }(l);

  function u(e) {
    return e ? "string" == typeof e ? e : e.source : null;
  }

  var g = "[a-zA-Z]\\w*",
      d = "[a-zA-Z_]\\w*",
      h = "\\b\\d+(\\.\\d+)?",
      f = "(-?)(\\b0[xX][a-fA-F0-9]+|(\\b\\d+(\\.\\d*)?|\\.\\d+)([eE][-+]?\\d+)?)",
      p = "\\b(0b[01]+)",
      m = {
    begin: "\\\\[\\s\\S]",
    relevance: 0
  },
      b = {
    className: "string",
    begin: "'",
    end: "'",
    illegal: "\\n",
    contains: [m]
  },
      x = {
    className: "string",
    begin: '"',
    end: '"',
    illegal: "\\n",
    contains: [m]
  },
      E = {
    begin: /\b(a|an|the|are|I'm|isn't|don't|doesn't|won't|but|just|should|pretty|simply|enough|gonna|going|wtf|so|such|will|you|your|they|like|more)\b/
  },
      v = function v(e, t) {
    var n = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    var s = a({
      className: "comment",
      begin: e,
      end: t,
      contains: []
    }, n);
    return s.contains.push(E), s.contains.push({
      className: "doctag",
      begin: "(?:TODO|FIXME|NOTE|BUG|OPTIMIZE|HACK|XXX):",
      relevance: 0
    }), s;
  },
      w = v("//", "$"),
      N = v("/\\*", "\\*/"),
      y = v("#", "$");

  var R = Object.freeze({
    __proto__: null,
    MATCH_NOTHING_RE: /\b\B/,
    IDENT_RE: g,
    UNDERSCORE_IDENT_RE: d,
    NUMBER_RE: h,
    C_NUMBER_RE: f,
    BINARY_NUMBER_RE: p,
    RE_STARTERS_RE: "!|!=|!==|%|%=|&|&&|&=|\\*|\\*=|\\+|\\+=|,|-|-=|/=|/|:|;|<<|<<=|<=|<|===|==|=|>>>=|>>=|>=|>>>|>>|>|\\?|\\[|\\{|\\(|\\^|\\^=|\\||\\|=|\\|\\||~",
    SHEBANG: function SHEBANG() {
      var e = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var t = /^#![ ]*\//;
      return e.binary && (e.begin = function () {
        for (var _len2 = arguments.length, e = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
          e[_key2] = arguments[_key2];
        }

        return e.map(function (e) {
          return u(e);
        }).join("");
      }(t, /.*\b/, e.binary, /\b.*/)), a({
        className: "meta",
        begin: t,
        end: /$/,
        relevance: 0,
        "on:begin": function onBegin(e, t) {
          0 !== e.index && t.ignoreMatch();
        }
      }, e);
    },
    BACKSLASH_ESCAPE: m,
    APOS_STRING_MODE: b,
    QUOTE_STRING_MODE: x,
    PHRASAL_WORDS_MODE: E,
    COMMENT: v,
    C_LINE_COMMENT_MODE: w,
    C_BLOCK_COMMENT_MODE: N,
    HASH_COMMENT_MODE: y,
    NUMBER_MODE: {
      className: "number",
      begin: h,
      relevance: 0
    },
    C_NUMBER_MODE: {
      className: "number",
      begin: f,
      relevance: 0
    },
    BINARY_NUMBER_MODE: {
      className: "number",
      begin: p,
      relevance: 0
    },
    CSS_NUMBER_MODE: {
      className: "number",
      begin: h + "(%|em|ex|ch|rem|vw|vh|vmin|vmax|cm|mm|in|pt|pc|px|deg|grad|rad|turn|s|ms|Hz|kHz|dpi|dpcm|dppx)?",
      relevance: 0
    },
    REGEXP_MODE: {
      begin: /(?=\/[^/\n]*\/)/,
      contains: [{
        className: "regexp",
        begin: /\//,
        end: /\/[gimuy]*/,
        illegal: /\n/,
        contains: [m, {
          begin: /\[/,
          end: /\]/,
          relevance: 0,
          contains: [m]
        }]
      }]
    },
    TITLE_MODE: {
      className: "title",
      begin: g,
      relevance: 0
    },
    UNDERSCORE_TITLE_MODE: {
      className: "title",
      begin: d,
      relevance: 0
    },
    METHOD_GUARD: {
      begin: "\\.\\s*[a-zA-Z_]\\w*",
      relevance: 0
    },
    END_SAME_AS_BEGIN: function END_SAME_AS_BEGIN(e) {
      return Object.assign(e, {
        "on:begin": function onBegin(e, t) {
          t.data._beginMatch = e[1];
        },
        "on:end": function onEnd(e, t) {
          t.data._beginMatch !== e[1] && t.ignoreMatch();
        }
      });
    }
  });

  function _(e, t) {
    "." === e.input[e.index - 1] && t.ignoreMatch();
  }

  function k(e, t) {
    t && e.beginKeywords && (e.begin = "\\b(" + e.beginKeywords.split(" ").join("|") + ")(?!\\.)(?=\\b|\\s)", e.__beforeBegin = _, e.keywords = e.keywords || e.beginKeywords, delete e.beginKeywords, void 0 === e.relevance && (e.relevance = 0));
  }

  function O(e, t) {
    Array.isArray(e.illegal) && (e.illegal = function () {
      for (var _len3 = arguments.length, e = new Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
        e[_key3] = arguments[_key3];
      }

      return "(" + e.map(function (e) {
        return u(e);
      }).join("|") + ")";
    }.apply(void 0, _toConsumableArray(e.illegal)));
  }

  function M(e, t) {
    if (e.match) {
      if (e.begin || e.end) throw Error("begin & end are not supported with match");
      e.begin = e.match, delete e.match;
    }
  }

  function A(e, t) {
    void 0 === e.relevance && (e.relevance = 1);
  }

  var L = ["of", "and", "for", "in", "not", "or", "if", "then", "parent", "list", "value"];

  function B(e, t) {
    var n = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : "keyword";
    var s = {};
    return "string" == typeof e ? r(n, e.split(" ")) : Array.isArray(e) ? r(n, e) : Object.keys(e).forEach(function (n) {
      Object.assign(s, B(e[n], t, n));
    }), s;

    function r(e, n) {
      t && (n = n.map(function (e) {
        return e.toLowerCase();
      })), n.forEach(function (t) {
        var n = t.split("|");
        s[n[0]] = [e, I(n[0], n[1])];
      });
    }
  }

  function I(e, t) {
    return t ? Number(t) : function (e) {
      return L.includes(e.toLowerCase());
    }(e) ? 0 : 1;
  }

  function T(e, _ref) {
    var t = _ref.plugins;

    function n(t, n) {
      return RegExp(u(t), "m" + (e.case_insensitive ? "i" : "") + (n ? "g" : ""));
    }

    var s = /*#__PURE__*/function () {
      function s() {
        _classCallCheck(this, s);

        this.matchIndexes = {}, this.regexes = [], this.matchAt = 1, this.position = 0;
      }

      _createClass(s, [{
        key: "addRule",
        value: function addRule(e, t) {
          t.position = this.position++, this.matchIndexes[this.matchAt] = t, this.regexes.push([t, e]), this.matchAt += function (e) {
            return RegExp(e.toString() + "|").exec("").length - 1;
          }(e) + 1;
        }
      }, {
        key: "compile",
        value: function compile() {
          0 === this.regexes.length && (this.exec = function () {
            return null;
          });
          var e = this.regexes.map(function (e) {
            return e[1];
          });
          this.matcherRe = n(function (e) {
            var t = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "|";
            var n = /\[(?:[^\\\]]|\\.)*\]|\(\??|\\([1-9][0-9]*)|\\./;
            var _s = 0,
                r = "";

            for (var _a = 0; _a < e.length; _a++) {
              _s += 1;
              var _i = _s;

              var _o = u(e[_a]);

              for (_a > 0 && (r += t), r += "("; _o.length > 0;) {
                var _e = n.exec(_o);

                if (null == _e) {
                  r += _o;
                  break;
                }

                r += _o.substring(0, _e.index), _o = _o.substring(_e.index + _e[0].length), "\\" === _e[0][0] && _e[1] ? r += "\\" + (Number(_e[1]) + _i) : (r += _e[0], "(" === _e[0] && _s++);
              }

              r += ")";
            }

            return r;
          }(e), !0), this.lastIndex = 0;
        }
      }, {
        key: "exec",
        value: function exec(e) {
          this.matcherRe.lastIndex = this.lastIndex;
          var t = this.matcherRe.exec(e);
          if (!t) return null;
          var n = t.findIndex(function (e, t) {
            return t > 0 && void 0 !== e;
          }),
              _s2 = this.matchIndexes[n];
          return t.splice(0, n), Object.assign(t, _s2);
        }
      }]);

      return s;
    }();

    var r = /*#__PURE__*/function () {
      function r() {
        _classCallCheck(this, r);

        this.rules = [], this.multiRegexes = [], this.count = 0, this.lastIndex = 0, this.regexIndex = 0;
      }

      _createClass(r, [{
        key: "getMatcher",
        value: function getMatcher(e) {
          if (this.multiRegexes[e]) return this.multiRegexes[e];
          var t = new s();
          return this.rules.slice(e).forEach(function (_ref2) {
            var _ref3 = _slicedToArray(_ref2, 2),
                e = _ref3[0],
                n = _ref3[1];

            return t.addRule(e, n);
          }), t.compile(), this.multiRegexes[e] = t, t;
        }
      }, {
        key: "resumingScanAtSamePosition",
        value: function resumingScanAtSamePosition() {
          return 0 !== this.regexIndex;
        }
      }, {
        key: "considerAll",
        value: function considerAll() {
          this.regexIndex = 0;
        }
      }, {
        key: "addRule",
        value: function addRule(e, t) {
          this.rules.push([e, t]), "begin" === t.type && this.count++;
        }
      }, {
        key: "exec",
        value: function exec(e) {
          var t = this.getMatcher(this.regexIndex);
          t.lastIndex = this.lastIndex;
          var n = t.exec(e);
          if (this.resumingScanAtSamePosition()) if (n && n.index === this.lastIndex) ;else {
            var _t3 = this.getMatcher(0);

            _t3.lastIndex = this.lastIndex + 1, n = _t3.exec(e);
          }
          return n && (this.regexIndex += n.position + 1, this.regexIndex === this.count && this.considerAll()), n;
        }
      }]);

      return r;
    }();

    if (e.compilerExtensions || (e.compilerExtensions = []), e.contains && e.contains.includes("self")) throw Error("ERR: contains `self` is not supported at the top-level of a language.  See documentation.");
    return e.classNameAliases = a(e.classNameAliases || {}), function t(s, i) {
      var _ref4;

      var o = s;
      if (s.compiled) return o;
      [M].forEach(function (e) {
        return e(s, i);
      }), e.compilerExtensions.forEach(function (e) {
        return e(s, i);
      }), s.__beforeBegin = null, [k, O, A].forEach(function (e) {
        return e(s, i);
      }), s.compiled = !0;
      var l = null;
      if ("object" == _typeof(s.keywords) && (l = s.keywords.$pattern, delete s.keywords.$pattern), s.keywords && (s.keywords = B(s.keywords, e.case_insensitive)), s.lexemes && l) throw Error("ERR: Prefer `keywords.$pattern` to `mode.lexemes`, BOTH are not allowed. (see mode reference) ");
      return l = l || s.lexemes || /\w+/, o.keywordPatternRe = n(l, !0), i && (s.begin || (s.begin = /\B|\b/), o.beginRe = n(s.begin), s.endSameAsBegin && (s.end = s.begin), s.end || s.endsWithParent || (s.end = /\B|\b/), s.end && (o.endRe = n(s.end)), o.terminatorEnd = u(s.end) || "", s.endsWithParent && i.terminatorEnd && (o.terminatorEnd += (s.end ? "|" : "") + i.terminatorEnd)), s.illegal && (o.illegalRe = n(s.illegal)), s.contains || (s.contains = []), s.contains = (_ref4 = []).concat.apply(_ref4, _toConsumableArray(s.contains.map(function (e) {
        return function (e) {
          return e.variants && !e.cachedVariants && (e.cachedVariants = e.variants.map(function (t) {
            return a(e, {
              variants: null
            }, t);
          })), e.cachedVariants ? e.cachedVariants : j(e) ? a(e, {
            starts: e.starts ? a(e.starts) : null
          }) : Object.isFrozen(e) ? a(e) : e;
        }("self" === e ? s : e);
      }))), s.contains.forEach(function (e) {
        t(e, o);
      }), s.starts && t(s.starts, i), o.matcher = function (e) {
        var t = new r();
        return e.contains.forEach(function (e) {
          return t.addRule(e.begin, {
            rule: e,
            type: "begin"
          });
        }), e.terminatorEnd && t.addRule(e.terminatorEnd, {
          type: "end"
        }), e.illegal && t.addRule(e.illegal, {
          type: "illegal"
        }), t;
      }(o), o;
    }(e);
  }

  function j(e) {
    return !!e && (e.endsWithParent || j(e.starts));
  }

  function S(e) {
    var t = {
      props: ["language", "code", "autodetect"],
      data: function data() {
        return {
          detectedLanguage: "",
          unknownLanguage: !1
        };
      },
      computed: {
        className: function className() {
          return this.unknownLanguage ? "" : "hljs " + this.detectedLanguage;
        },
        highlighted: function highlighted() {
          if (!this.autoDetect && !e.getLanguage(this.language)) return console.warn("The language \"".concat(this.language, "\" you specified could not be found.")), this.unknownLanguage = !0, r(this.code);
          var t = {};
          return this.autoDetect ? (t = e.highlightAuto(this.code), this.detectedLanguage = t.language) : (t = e.highlight(this.language, this.code, this.ignoreIllegals), this.detectedLanguage = this.language), t.value;
        },
        autoDetect: function autoDetect() {
          return !(this.language && (e = this.autodetect, !e && "" !== e));
          var e;
        },
        ignoreIllegals: function ignoreIllegals() {
          return !0;
        }
      },
      render: function render(e) {
        return e("pre", {}, [e("code", {
          "class": this.className,
          domProps: {
            innerHTML: this.highlighted
          }
        })]);
      }
    };
    return {
      Component: t,
      VuePlugin: {
        install: function install(e) {
          e.component("highlightjs", t);
        }
      }
    };
  }

  var P = {
    "after:highlightBlock": function afterHighlightBlock(_ref5) {
      var e = _ref5.block,
          t = _ref5.result,
          n = _ref5.text;
      var s = C(e);
      if (!s.length) return;
      var a = document.createElement("div");
      a.innerHTML = t.value, t.value = function (e, t, n) {
        var s = 0,
            a = "";
        var i = [];

        function o() {
          return e.length && t.length ? e[0].offset !== t[0].offset ? e[0].offset < t[0].offset ? e : t : "start" === t[0].event ? e : t : e.length ? e : t;
        }

        function l(e) {
          a += "<" + D(e) + [].map.call(e.attributes, function (e) {
            return " " + e.nodeName + '="' + r(e.value) + '"';
          }).join("") + ">";
        }

        function c(e) {
          a += "</" + D(e) + ">";
        }

        function u(e) {
          ("start" === e.event ? l : c)(e.node);
        }

        for (; e.length || t.length;) {
          var _t4 = o();

          if (a += r(n.substring(s, _t4[0].offset)), s = _t4[0].offset, _t4 === e) {
            i.reverse().forEach(c);

            do {
              u(_t4.splice(0, 1)[0]), _t4 = o();
            } while (_t4 === e && _t4.length && _t4[0].offset === s);

            i.reverse().forEach(l);
          } else "start" === _t4[0].event ? i.push(_t4[0].node) : i.pop(), u(_t4.splice(0, 1)[0]);
        }

        return a + r(n.substr(s));
      }(s, C(a), n);
    }
  };

  function D(e) {
    return e.nodeName.toLowerCase();
  }

  function C(e) {
    var t = [];
    return function e(n, s) {
      for (var _r = n.firstChild; _r; _r = _r.nextSibling) {
        3 === _r.nodeType ? s += _r.nodeValue.length : 1 === _r.nodeType && (t.push({
          event: "start",
          offset: s,
          node: _r
        }), s = e(_r, s), D(_r).match(/br|hr|img|input/) || t.push({
          event: "stop",
          offset: s,
          node: _r
        }));
      }

      return s;
    }(e, 0), t;
  }

  var H = function H(e) {
    console.error(e);
  },
      U = function U(e) {
    var _console;

    for (var _len4 = arguments.length, t = new Array(_len4 > 1 ? _len4 - 1 : 0), _key4 = 1; _key4 < _len4; _key4++) {
      t[_key4 - 1] = arguments[_key4];
    }

    (_console = console).log.apply(_console, ["WARN: " + e].concat(t));
  },
      $ = function $(e, t) {
    console.log("Deprecated as of ".concat(e, ". ").concat(t));
  },
      z = r,
      K = a,
      G = Symbol("nomatch");

  return function (e) {
    var n = Object.create(null),
        r = Object.create(null),
        a = [];
    var i = !0;
    var o = /(^(<[^>]+>|\t|)+|\n)/gm,
        l = "Could not find the language '{}', did you forget to load/include a language module?",
        u = {
      disableAutodetect: !0,
      name: "Plain text",
      contains: []
    };
    var g = {
      noHighlightRe: /^(no-?highlight)$/i,
      languageDetectRe: /\blang(?:uage)?-([\w-]+)\b/i,
      classPrefix: "hljs-",
      tabReplace: null,
      useBR: !1,
      languages: null,
      __emitter: c
    };

    function d(e) {
      return g.noHighlightRe.test(e);
    }

    function h(e, t, n, s) {
      var r = {
        code: t,
        language: e
      };
      M("before:highlight", r);
      var a = r.result ? r.result : f(r.language, r.code, n, s);
      return a.code = r.code, M("after:highlight", a), a;
    }

    function f(e, t, r, o) {
      var c = t;

      function u(e, t) {
        var n = w.case_insensitive ? t[0].toLowerCase() : t[0];
        return Object.prototype.hasOwnProperty.call(e.keywords, n) && e.keywords[n];
      }

      function d() {
        null != R.subLanguage ? function () {
          if ("" === M) return;
          var e = null;

          if ("string" == typeof R.subLanguage) {
            if (!n[R.subLanguage]) return void O.addText(M);
            e = f(R.subLanguage, M, !0, k[R.subLanguage]), k[R.subLanguage] = e.top;
          } else e = p(M, R.subLanguage.length ? R.subLanguage : null);

          R.relevance > 0 && (A += e.relevance), O.addSublanguage(e.emitter, e.language);
        }() : function () {
          if (!R.keywords) return void O.addText(M);
          var e = 0;
          R.keywordPatternRe.lastIndex = 0;
          var t = R.keywordPatternRe.exec(M),
              n = "";

          for (; t;) {
            n += M.substring(e, t.index);

            var _s3 = u(R, t);

            if (_s3) {
              var _s4 = _slicedToArray(_s3, 2),
                  _e2 = _s4[0],
                  _r2 = _s4[1];

              O.addText(n), n = "", A += _r2;

              var _a2 = w.classNameAliases[_e2] || _e2;

              O.addKeyword(t[0], _a2);
            } else n += t[0];

            e = R.keywordPatternRe.lastIndex, t = R.keywordPatternRe.exec(M);
          }

          n += M.substr(e), O.addText(n);
        }(), M = "";
      }

      function h(e) {
        return e.className && O.openNode(w.classNameAliases[e.className] || e.className), R = Object.create(e, {
          parent: {
            value: R
          }
        }), R;
      }

      function m(e, t, n) {
        var r = function (e, t) {
          var n = e && e.exec(t);
          return n && 0 === n.index;
        }(e.endRe, n);

        if (r) {
          if (e["on:end"]) {
            var _n2 = new s(e);

            e["on:end"](t, _n2), _n2.ignore && (r = !1);
          }

          if (r) {
            for (; e.endsParent && e.parent;) {
              e = e.parent;
            }

            return e;
          }
        }

        if (e.endsWithParent) return m(e.parent, t, n);
      }

      function b(e) {
        return 0 === R.matcher.regexIndex ? (M += e[0], 1) : (I = !0, 0);
      }

      function x(e) {
        var t = e[0],
            n = c.substr(e.index),
            s = m(R, e, n);
        if (!s) return G;
        var r = R;
        r.skip ? M += t : (r.returnEnd || r.excludeEnd || (M += t), d(), r.excludeEnd && (M = t));

        do {
          R.className && O.closeNode(), R.skip || R.subLanguage || (A += R.relevance), R = R.parent;
        } while (R !== s.parent);

        return s.starts && (s.endSameAsBegin && (s.starts.endRe = s.endRe), h(s.starts)), r.returnEnd ? 0 : t.length;
      }

      var E = {};

      function v(t, n) {
        var a = n && n[0];
        if (M += t, null == a) return d(), 0;

        if ("begin" === E.type && "end" === n.type && E.index === n.index && "" === a) {
          if (M += c.slice(n.index, n.index + 1), !i) {
            var _t5 = Error("0 width match regex");

            throw _t5.languageName = e, _t5.badRule = E.rule, _t5;
          }

          return 1;
        }

        if (E = n, "begin" === n.type) return function (e) {
          var t = e[0],
              n = e.rule,
              r = new s(n),
              a = [n.__beforeBegin, n["on:begin"]];

          for (var _i2 = 0, _a3 = a; _i2 < _a3.length; _i2++) {
            var _n3 = _a3[_i2];
            if (_n3 && (_n3(e, r), r.ignore)) return b(t);
          }

          return n && n.endSameAsBegin && (n.endRe = RegExp(t.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"), "m")), n.skip ? M += t : (n.excludeBegin && (M += t), d(), n.returnBegin || n.excludeBegin || (M = t)), h(n), n.returnBegin ? 0 : t.length;
        }(n);

        if ("illegal" === n.type && !r) {
          var _e3 = Error('Illegal lexeme "' + a + '" for mode "' + (R.className || "<unnamed>") + '"');

          throw _e3.mode = R, _e3;
        }

        if ("end" === n.type) {
          var _e4 = x(n);

          if (_e4 !== G) return _e4;
        }

        if ("illegal" === n.type && "" === a) return 1;
        if (B > 1e5 && B > 3 * n.index) throw Error("potential infinite loop, way more iterations than matches");
        return M += a, a.length;
      }

      var w = _(e);

      if (!w) throw H(l.replace("{}", e)), Error('Unknown language: "' + e + '"');
      var N = T(w, {
        plugins: a
      });
      var y = "",
          R = o || N;
      var k = {},
          O = new g.__emitter(g);

      (function () {
        var e = [];

        for (var _t6 = R; _t6 !== w; _t6 = _t6.parent) {
          _t6.className && e.unshift(_t6.className);
        }

        e.forEach(function (e) {
          return O.openNode(e);
        });
      })();

      var M = "",
          A = 0,
          L = 0,
          B = 0,
          I = !1;

      try {
        for (R.matcher.considerAll();;) {
          B++, I ? I = !1 : R.matcher.considerAll(), R.matcher.lastIndex = L;

          var _e5 = R.matcher.exec(c);

          if (!_e5) break;

          var _t7 = v(c.substring(L, _e5.index), _e5);

          L = _e5.index + _t7;
        }

        return v(c.substr(L)), O.closeAllNodes(), O.finalize(), y = O.toHTML(), {
          relevance: Math.floor(A),
          value: y,
          language: e,
          illegal: !1,
          emitter: O,
          top: R
        };
      } catch (t) {
        if (t.message && t.message.includes("Illegal")) return {
          illegal: !0,
          illegalBy: {
            msg: t.message,
            context: c.slice(L - 100, L + 100),
            mode: t.mode
          },
          sofar: y,
          relevance: 0,
          value: z(c),
          emitter: O
        };
        if (i) return {
          illegal: !1,
          relevance: 0,
          value: z(c),
          emitter: O,
          language: e,
          top: R,
          errorRaised: t
        };
        throw t;
      }
    }

    function p(e, t) {
      t = t || g.languages || Object.keys(n);

      var s = function (e) {
        var t = {
          relevance: 0,
          emitter: new g.__emitter(g),
          value: z(e),
          illegal: !1,
          top: u
        };
        return t.emitter.addText(e), t;
      }(e),
          r = t.filter(_).filter(O).map(function (t) {
        return f(t, e, !1);
      });

      r.unshift(s);

      var a = r.sort(function (e, t) {
        if (e.relevance !== t.relevance) return t.relevance - e.relevance;

        if (e.language && t.language) {
          if (_(e.language).supersetOf === t.language) return 1;
          if (_(t.language).supersetOf === e.language) return -1;
        }

        return 0;
      }),
          _a4 = _slicedToArray(a, 2),
          i = _a4[0],
          o = _a4[1],
          l = i;

      return l.second_best = o, l;
    }

    var m = {
      "before:highlightBlock": function beforeHighlightBlock(_ref6) {
        var e = _ref6.block;
        g.useBR && (e.innerHTML = e.innerHTML.replace(/\n/g, "").replace(/<br[ /]*>/g, "\n"));
      },
      "after:highlightBlock": function afterHighlightBlock(_ref7) {
        var e = _ref7.result;
        g.useBR && (e.value = e.value.replace(/\n/g, "<br>"));
      }
    },
        b = /^(<[^>]+>|\t)+/gm,
        x = {
      "after:highlightBlock": function afterHighlightBlock(_ref8) {
        var e = _ref8.result;
        g.tabReplace && (e.value = e.value.replace(b, function (e) {
          return e.replace(/\t/g, g.tabReplace);
        }));
      }
    };

    function E(e) {
      var t = null;

      var n = function (e) {
        var t = e.className + " ";
        t += e.parentNode ? e.parentNode.className : "";
        var n = g.languageDetectRe.exec(t);

        if (n) {
          var _t8 = _(n[1]);

          return _t8 || (U(l.replace("{}", n[1])), U("Falling back to no-highlight mode for this block.", e)), _t8 ? n[1] : "no-highlight";
        }

        return t.split(/\s+/).find(function (e) {
          return d(e) || _(e);
        });
      }(e);

      if (d(n)) return;
      M("before:highlightBlock", {
        block: e,
        language: n
      }), t = e;
      var s = t.textContent,
          a = n ? h(n, s, !0) : p(s);
      M("after:highlightBlock", {
        block: e,
        result: a,
        text: s
      }), e.innerHTML = a.value, function (e, t, n) {
        var s = t ? r[t] : n;
        e.classList.add("hljs"), s && e.classList.add(s);
      }(e, n, a.language), e.result = {
        language: a.language,
        re: a.relevance,
        relavance: a.relevance
      }, a.second_best && (e.second_best = {
        language: a.second_best.language,
        re: a.second_best.relevance,
        relavance: a.second_best.relevance
      });
    }

    var v = function v() {
      v.called || (v.called = !0, $("10.6.0", "initHighlighting() is deprecated.  Use highlightAll() instead."), document.querySelectorAll("pre code").forEach(E));
    };

    var w = !1,
        N = !1;

    function y() {
      N ? document.querySelectorAll("pre code").forEach(E) : w = !0;
    }

    function _(e) {
      return e = (e || "").toLowerCase(), n[e] || n[r[e]];
    }

    function k(e, _ref9) {
      var t = _ref9.languageName;
      "string" == typeof e && (e = [e]), e.forEach(function (e) {
        r[e] = t;
      });
    }

    function O(e) {
      var t = _(e);

      return t && !t.disableAutodetect;
    }

    function M(e, t) {
      var n = e;
      a.forEach(function (e) {
        e[n] && e[n](t);
      });
    }

    "undefined" != typeof window && window.addEventListener && window.addEventListener("DOMContentLoaded", function () {
      N = !0, w && y();
    }, !1), Object.assign(e, {
      highlight: h,
      highlightAuto: p,
      highlightAll: y,
      fixMarkup: function fixMarkup(e) {
        return $("10.2.0", "fixMarkup will be removed entirely in v11.0"), $("10.2.0", "Please see https://github.com/highlightjs/highlight.js/issues/2534"), t = e, g.tabReplace || g.useBR ? t.replace(o, function (e) {
          return "\n" === e ? g.useBR ? "<br>" : e : g.tabReplace ? e.replace(/\t/g, g.tabReplace) : e;
        }) : t;
        var t;
      },
      highlightBlock: E,
      configure: function configure(e) {
        e.useBR && ($("10.3.0", "'useBR' will be removed entirely in v11.0"), $("10.3.0", "Please see https://github.com/highlightjs/highlight.js/issues/2559")), g = K(g, e);
      },
      initHighlighting: v,
      initHighlightingOnLoad: function initHighlightingOnLoad() {
        $("10.6.0", "initHighlightingOnLoad() is deprecated.  Use highlightAll() instead."), w = !0;
      },
      registerLanguage: function registerLanguage(t, s) {
        var r = null;

        try {
          r = s(e);
        } catch (e) {
          if (H("Language definition for '{}' could not be registered.".replace("{}", t)), !i) throw e;
          H(e), r = u;
        }

        r.name || (r.name = t), n[t] = r, r.rawDefinition = s.bind(null, e), r.aliases && k(r.aliases, {
          languageName: t
        });
      },
      listLanguages: function listLanguages() {
        return Object.keys(n);
      },
      getLanguage: _,
      registerAliases: k,
      requireLanguage: function requireLanguage(e) {
        $("10.4.0", "requireLanguage will be removed entirely in v11."), $("10.4.0", "Please see https://github.com/highlightjs/highlight.js/pull/2844");

        var t = _(e);

        if (t) return t;
        throw Error("The '{}' language is required, but not loaded.".replace("{}", e));
      },
      autoDetection: O,
      inherit: K,
      addPlugin: function addPlugin(e) {
        a.push(e);
      },
      vuePlugin: S(e).VuePlugin
    }), e.debugMode = function () {
      i = !1;
    }, e.safeMode = function () {
      i = !0;
    }, e.versionString = "10.5.0";

    for (var _e6 in R) {
      "object" == _typeof(R[_e6]) && t(R[_e6]);
    }

    return Object.assign(e, R), e.addPlugin(m), e.addPlugin(P), e.addPlugin(x), e;
  }({});
}();

"object" == (typeof exports === "undefined" ? "undefined" : _typeof(exports)) && "undefined" != typeof module && (module.exports = hljs);
hljs.registerLanguage("apache", function () {
  "use strict";

  return function (e) {
    var n = {
      className: "number",
      begin: /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d{1,5})?/
    };
    return {
      name: "Apache config",
      aliases: ["apacheconf"],
      case_insensitive: !0,
      contains: [e.HASH_COMMENT_MODE, {
        className: "section",
        begin: /<\/?/,
        end: />/,
        contains: [n, {
          className: "number",
          begin: /:\d{1,5}/
        }, e.inherit(e.QUOTE_STRING_MODE, {
          relevance: 0
        })]
      }, {
        className: "attribute",
        begin: /\w+/,
        relevance: 0,
        keywords: {
          nomarkup: "order deny allow setenv rewriterule rewriteengine rewritecond documentroot sethandler errordocument loadmodule options header listen serverroot servername"
        },
        starts: {
          end: /$/,
          relevance: 0,
          keywords: {
            literal: "on off all deny allow"
          },
          contains: [{
            className: "meta",
            begin: /\s\[/,
            end: /\]$/
          }, {
            className: "variable",
            begin: /[\$%]\{/,
            end: /\}/,
            contains: ["self", {
              className: "number",
              begin: /[$%]\d+/
            }]
          }, n, {
            className: "number",
            begin: /\d+/
          }, e.QUOTE_STRING_MODE]
        }
      }],
      illegal: /\S/
    };
  };
}());
hljs.registerLanguage("bash", function () {
  "use strict";

  function e() {
    for (var _len5 = arguments.length, e = new Array(_len5), _key5 = 0; _key5 < _len5; _key5++) {
      e[_key5] = arguments[_key5];
    }

    return e.map(function (e) {
      return (s = e) ? "string" == typeof s ? s : s.source : null;
      var s;
    }).join("");
  }

  return function (s) {
    var n = {},
        t = {
      begin: /\$\{/,
      end: /\}/,
      contains: ["self", {
        begin: /:-/,
        contains: [n]
      }]
    };
    Object.assign(n, {
      className: "variable",
      variants: [{
        begin: e(/\$[\w\d#@][\w\d_]*/, "(?![\\w\\d])(?![$])")
      }, t]
    });
    var a = {
      className: "subst",
      begin: /\$\(/,
      end: /\)/,
      contains: [s.BACKSLASH_ESCAPE]
    },
        i = {
      begin: /<<-?\s*(?=\w+)/,
      starts: {
        contains: [s.END_SAME_AS_BEGIN({
          begin: /(\w+)/,
          end: /(\w+)/,
          className: "string"
        })]
      }
    },
        c = {
      className: "string",
      begin: /"/,
      end: /"/,
      contains: [s.BACKSLASH_ESCAPE, n, a]
    };
    a.contains.push(c);
    var o = {
      begin: /\$\(\(/,
      end: /\)\)/,
      contains: [{
        begin: /\d+#[0-9a-f]+/,
        className: "number"
      }, s.NUMBER_MODE, n]
    },
        r = s.SHEBANG({
      binary: "(fish|bash|zsh|sh|csh|ksh|tcsh|dash|scsh)",
      relevance: 10
    }),
        l = {
      className: "function",
      begin: /\w[\w\d_]*\s*\(\s*\)\s*\{/,
      returnBegin: !0,
      contains: [s.inherit(s.TITLE_MODE, {
        begin: /\w[\w\d_]*/
      })],
      relevance: 0
    };
    return {
      name: "Bash",
      aliases: ["sh", "zsh"],
      keywords: {
        $pattern: /\b[a-z._-]+\b/,
        keyword: "if then else elif fi for while in do done case esac function",
        literal: "true false",
        built_in: "break cd continue eval exec exit export getopts hash pwd readonly return shift test times trap umask unset alias bind builtin caller command declare echo enable help let local logout mapfile printf read readarray source type typeset ulimit unalias set shopt autoload bg bindkey bye cap chdir clone comparguments compcall compctl compdescribe compfiles compgroups compquote comptags comptry compvalues dirs disable disown echotc echoti emulate fc fg float functions getcap getln history integer jobs kill limit log noglob popd print pushd pushln rehash sched setcap setopt stat suspend ttyctl unfunction unhash unlimit unsetopt vared wait whence where which zcompile zformat zftp zle zmodload zparseopts zprof zpty zregexparse zsocket zstyle ztcp"
      },
      contains: [r, s.SHEBANG(), l, o, s.HASH_COMMENT_MODE, i, c, {
        className: "",
        begin: /\\"/
      }, {
        className: "string",
        begin: /'/,
        end: /'/
      }, n]
    };
  };
}());
hljs.registerLanguage("c", function () {
  "use strict";

  function e(e) {
    return function () {
      for (var _len6 = arguments.length, e = new Array(_len6), _key6 = 0; _key6 < _len6; _key6++) {
        e[_key6] = arguments[_key6];
      }

      return e.map(function (e) {
        return function (e) {
          return e ? "string" == typeof e ? e : e.source : null;
        }(e);
      }).join("");
    }("(", e, ")?");
  }

  return function (t) {
    var n = t.COMMENT("//", "$", {
      contains: [{
        begin: /\\\n/
      }]
    }),
        r = "[a-zA-Z_]\\w*::",
        a = "(decltype\\(auto\\)|" + e(r) + "[a-zA-Z_]\\w*" + e("<[^<>]+>") + ")",
        i = {
      className: "keyword",
      begin: "\\b[a-z\\d_]*_t\\b"
    },
        s = {
      className: "string",
      variants: [{
        begin: '(u8?|U|L)?"',
        end: '"',
        illegal: "\\n",
        contains: [t.BACKSLASH_ESCAPE]
      }, {
        begin: "(u8?|U|L)?'(\\\\(x[0-9A-Fa-f]{2}|u[0-9A-Fa-f]{4,8}|[0-7]{3}|\\S)|.)",
        end: "'",
        illegal: "."
      }, t.END_SAME_AS_BEGIN({
        begin: /(?:u8?|U|L)?R"([^()\\ ]{0,16})\(/,
        end: /\)([^()\\ ]{0,16})"/
      })]
    },
        o = {
      className: "number",
      variants: [{
        begin: "\\b(0b[01']+)"
      }, {
        begin: "(-?)\\b([\\d']+(\\.[\\d']*)?|\\.[\\d']+)((ll|LL|l|L)(u|U)?|(u|U)(ll|LL|l|L)?|f|F|b|B)"
      }, {
        begin: "(-?)(\\b0[xX][a-fA-F0-9']+|(\\b[\\d']+(\\.[\\d']*)?|\\.[\\d']+)([eE][-+]?[\\d']+)?)"
      }],
      relevance: 0
    },
        c = {
      className: "meta",
      begin: /#\s*[a-z]+\b/,
      end: /$/,
      keywords: {
        "meta-keyword": "if else elif endif define undef warning error line pragma _Pragma ifdef ifndef include"
      },
      contains: [{
        begin: /\\\n/,
        relevance: 0
      }, t.inherit(s, {
        className: "meta-string"
      }), {
        className: "meta-string",
        begin: /<.*?>/,
        end: /$/,
        illegal: "\\n"
      }, n, t.C_BLOCK_COMMENT_MODE]
    },
        l = {
      className: "title",
      begin: e(r) + t.IDENT_RE,
      relevance: 0
    },
        d = e(r) + t.IDENT_RE + "\\s*\\(",
        u = {
      keyword: "int float while private char char8_t char16_t char32_t catch import module export virtual operator sizeof dynamic_cast|10 typedef const_cast|10 const for static_cast|10 union namespace unsigned long volatile static protected bool template mutable if public friend do goto auto void enum else break extern using asm case typeid wchar_t short reinterpret_cast|10 default double register explicit signed typename try this switch continue inline delete alignas alignof constexpr consteval constinit decltype concept co_await co_return co_yield requires noexcept static_assert thread_local restrict final override atomic_bool atomic_char atomic_schar atomic_uchar atomic_short atomic_ushort atomic_int atomic_uint atomic_long atomic_ulong atomic_llong atomic_ullong new throw return and and_eq bitand bitor compl not not_eq or or_eq xor xor_eq",
      built_in: "std string wstring cin cout cerr clog stdin stdout stderr stringstream istringstream ostringstream auto_ptr deque list queue stack vector map set pair bitset multiset multimap unordered_set unordered_map unordered_multiset unordered_multimap priority_queue make_pair array shared_ptr abort terminate abs acos asin atan2 atan calloc ceil cosh cos exit exp fabs floor fmod fprintf fputs free frexp fscanf future isalnum isalpha iscntrl isdigit isgraph islower isprint ispunct isspace isupper isxdigit tolower toupper labs ldexp log10 log malloc realloc memchr memcmp memcpy memset modf pow printf putchar puts scanf sinh sin snprintf sprintf sqrt sscanf strcat strchr strcmp strcpy strcspn strlen strncat strncmp strncpy strpbrk strrchr strspn strstr tanh tan vfprintf vprintf vsprintf endl initializer_list unique_ptr _Bool complex _Complex imaginary _Imaginary",
      literal: "true false nullptr NULL"
    },
        m = [c, i, n, t.C_BLOCK_COMMENT_MODE, o, s],
        p = {
      variants: [{
        begin: /=/,
        end: /;/
      }, {
        begin: /\(/,
        end: /\)/
      }, {
        beginKeywords: "new throw return else",
        end: /;/
      }],
      keywords: u,
      contains: m.concat([{
        begin: /\(/,
        end: /\)/,
        keywords: u,
        contains: m.concat(["self"]),
        relevance: 0
      }]),
      relevance: 0
    },
        _ = {
      className: "function",
      begin: "(" + a + "[\\*&\\s]+)+" + d,
      returnBegin: !0,
      end: /[{;=]/,
      excludeEnd: !0,
      keywords: u,
      illegal: /[^\w\s\*&:<>.]/,
      contains: [{
        begin: "decltype\\(auto\\)",
        keywords: u,
        relevance: 0
      }, {
        begin: d,
        returnBegin: !0,
        contains: [l],
        relevance: 0
      }, {
        className: "params",
        begin: /\(/,
        end: /\)/,
        keywords: u,
        relevance: 0,
        contains: [n, t.C_BLOCK_COMMENT_MODE, s, o, i, {
          begin: /\(/,
          end: /\)/,
          keywords: u,
          relevance: 0,
          contains: ["self", n, t.C_BLOCK_COMMENT_MODE, s, o, i]
        }]
      }, i, n, t.C_BLOCK_COMMENT_MODE, c]
    };
    return {
      name: "C",
      aliases: ["c", "h"],
      keywords: u,
      disableAutodetect: !0,
      illegal: "</",
      contains: [].concat(p, _, m, [c, {
        begin: "\\b(deque|list|queue|priority_queue|pair|stack|vector|map|set|bitset|multiset|multimap|unordered_map|unordered_set|unordered_multiset|unordered_multimap|array)\\s*<",
        end: ">",
        keywords: u,
        contains: ["self", i]
      }, {
        begin: t.IDENT_RE + "::",
        keywords: u
      }, {
        className: "class",
        beginKeywords: "enum class struct union",
        end: /[{;:<>=]/,
        contains: [{
          beginKeywords: "final class struct"
        }, t.TITLE_MODE]
      }]),
      exports: {
        preprocessor: c,
        strings: s,
        keywords: u
      }
    };
  };
}());
hljs.registerLanguage("coffeescript", function () {
  "use strict";

  var e = ["as", "in", "of", "if", "for", "while", "finally", "var", "new", "function", "do", "return", "void", "else", "break", "catch", "instanceof", "with", "throw", "case", "default", "try", "switch", "continue", "typeof", "delete", "let", "yield", "const", "class", "debugger", "async", "await", "static", "import", "from", "export", "extends"],
      n = ["true", "false", "null", "undefined", "NaN", "Infinity"],
      a = [].concat(["setInterval", "setTimeout", "clearInterval", "clearTimeout", "require", "exports", "eval", "isFinite", "isNaN", "parseFloat", "parseInt", "decodeURI", "decodeURIComponent", "encodeURI", "encodeURIComponent", "escape", "unescape"], ["arguments", "this", "super", "console", "window", "document", "localStorage", "module", "global"], ["Intl", "DataView", "Number", "Math", "Date", "String", "RegExp", "Object", "Function", "Boolean", "Error", "Symbol", "Set", "Map", "WeakSet", "WeakMap", "Proxy", "Reflect", "JSON", "Promise", "Float64Array", "Int16Array", "Int32Array", "Int8Array", "Uint16Array", "Uint32Array", "Float32Array", "Array", "Uint8Array", "Uint8ClampedArray", "ArrayBuffer"], ["EvalError", "InternalError", "RangeError", "ReferenceError", "SyntaxError", "TypeError", "URIError"]);
  return function (r) {
    var t = {
      keyword: e.concat(["then", "unless", "until", "loop", "by", "when", "and", "or", "is", "isnt", "not"]).filter((i = ["var", "const", "let", "function", "static"], function (e) {
        return !i.includes(e);
      })),
      literal: n.concat(["yes", "no", "on", "off"]),
      built_in: a.concat(["npm", "print"])
    };
    var i;
    var s = "[A-Za-z$_][0-9A-Za-z$_]*",
        o = {
      className: "subst",
      begin: /#\{/,
      end: /\}/,
      keywords: t
    },
        c = [r.BINARY_NUMBER_MODE, r.inherit(r.C_NUMBER_MODE, {
      starts: {
        end: "(\\s*/)?",
        relevance: 0
      }
    }), {
      className: "string",
      variants: [{
        begin: /'''/,
        end: /'''/,
        contains: [r.BACKSLASH_ESCAPE]
      }, {
        begin: /'/,
        end: /'/,
        contains: [r.BACKSLASH_ESCAPE]
      }, {
        begin: /"""/,
        end: /"""/,
        contains: [r.BACKSLASH_ESCAPE, o]
      }, {
        begin: /"/,
        end: /"/,
        contains: [r.BACKSLASH_ESCAPE, o]
      }]
    }, {
      className: "regexp",
      variants: [{
        begin: "///",
        end: "///",
        contains: [o, r.HASH_COMMENT_MODE]
      }, {
        begin: "//[gim]{0,3}(?=\\W)",
        relevance: 0
      }, {
        begin: /\/(?![ *]).*?(?![\\]).\/[gim]{0,3}(?=\W)/
      }]
    }, {
      begin: "@" + s
    }, {
      subLanguage: "javascript",
      excludeBegin: !0,
      excludeEnd: !0,
      variants: [{
        begin: "```",
        end: "```"
      }, {
        begin: "`",
        end: "`"
      }]
    }];
    o.contains = c;
    var l = r.inherit(r.TITLE_MODE, {
      begin: s
    }),
        d = "(\\(.*\\)\\s*)?\\B[-=]>",
        g = {
      className: "params",
      begin: "\\([^\\(]",
      returnBegin: !0,
      contains: [{
        begin: /\(/,
        end: /\)/,
        keywords: t,
        contains: ["self"].concat(c)
      }]
    };
    return {
      name: "CoffeeScript",
      aliases: ["coffee", "cson", "iced"],
      keywords: t,
      illegal: /\/\*/,
      contains: c.concat([r.COMMENT("###", "###"), r.HASH_COMMENT_MODE, {
        className: "function",
        begin: "^\\s*" + s + "\\s*=\\s*" + d,
        end: "[-=]>",
        returnBegin: !0,
        contains: [l, g]
      }, {
        begin: /[:\(,=]\s*/,
        relevance: 0,
        contains: [{
          className: "function",
          begin: d,
          end: "[-=]>",
          returnBegin: !0,
          contains: [g]
        }]
      }, {
        className: "class",
        beginKeywords: "class",
        end: "$",
        illegal: /[:="\[\]]/,
        contains: [{
          beginKeywords: "extends",
          endsWithParent: !0,
          illegal: /[:="\[\]]/,
          contains: [l]
        }, l]
      }, {
        begin: s + ":",
        end: ":",
        returnBegin: !0,
        returnEnd: !0,
        relevance: 0
      }])
    };
  };
}());
hljs.registerLanguage("cpp", function () {
  "use strict";

  function e(e) {
    return function () {
      for (var _len7 = arguments.length, e = new Array(_len7), _key7 = 0; _key7 < _len7; _key7++) {
        e[_key7] = arguments[_key7];
      }

      return e.map(function (e) {
        return function (e) {
          return e ? "string" == typeof e ? e : e.source : null;
        }(e);
      }).join("");
    }("(", e, ")?");
  }

  return function (t) {
    var n = t.COMMENT("//", "$", {
      contains: [{
        begin: /\\\n/
      }]
    }),
        r = "[a-zA-Z_]\\w*::",
        a = "(decltype\\(auto\\)|" + e(r) + "[a-zA-Z_]\\w*" + e("<[^<>]+>") + ")",
        i = {
      className: "keyword",
      begin: "\\b[a-z\\d_]*_t\\b"
    },
        s = {
      className: "string",
      variants: [{
        begin: '(u8?|U|L)?"',
        end: '"',
        illegal: "\\n",
        contains: [t.BACKSLASH_ESCAPE]
      }, {
        begin: "(u8?|U|L)?'(\\\\(x[0-9A-Fa-f]{2}|u[0-9A-Fa-f]{4,8}|[0-7]{3}|\\S)|.)",
        end: "'",
        illegal: "."
      }, t.END_SAME_AS_BEGIN({
        begin: /(?:u8?|U|L)?R"([^()\\ ]{0,16})\(/,
        end: /\)([^()\\ ]{0,16})"/
      })]
    },
        o = {
      className: "number",
      variants: [{
        begin: "\\b(0b[01']+)"
      }, {
        begin: "(-?)\\b([\\d']+(\\.[\\d']*)?|\\.[\\d']+)((ll|LL|l|L)(u|U)?|(u|U)(ll|LL|l|L)?|f|F|b|B)"
      }, {
        begin: "(-?)(\\b0[xX][a-fA-F0-9']+|(\\b[\\d']+(\\.[\\d']*)?|\\.[\\d']+)([eE][-+]?[\\d']+)?)"
      }],
      relevance: 0
    },
        c = {
      className: "meta",
      begin: /#\s*[a-z]+\b/,
      end: /$/,
      keywords: {
        "meta-keyword": "if else elif endif define undef warning error line pragma _Pragma ifdef ifndef include"
      },
      contains: [{
        begin: /\\\n/,
        relevance: 0
      }, t.inherit(s, {
        className: "meta-string"
      }), {
        className: "meta-string",
        begin: /<.*?>/,
        end: /$/,
        illegal: "\\n"
      }, n, t.C_BLOCK_COMMENT_MODE]
    },
        l = {
      className: "title",
      begin: e(r) + t.IDENT_RE,
      relevance: 0
    },
        d = e(r) + t.IDENT_RE + "\\s*\\(",
        u = {
      keyword: "int float while private char char8_t char16_t char32_t catch import module export virtual operator sizeof dynamic_cast|10 typedef const_cast|10 const for static_cast|10 union namespace unsigned long volatile static protected bool template mutable if public friend do goto auto void enum else break extern using asm case typeid wchar_t short reinterpret_cast|10 default double register explicit signed typename try this switch continue inline delete alignas alignof constexpr consteval constinit decltype concept co_await co_return co_yield requires noexcept static_assert thread_local restrict final override atomic_bool atomic_char atomic_schar atomic_uchar atomic_short atomic_ushort atomic_int atomic_uint atomic_long atomic_ulong atomic_llong atomic_ullong new throw return and and_eq bitand bitor compl not not_eq or or_eq xor xor_eq",
      built_in: "std string wstring cin cout cerr clog stdin stdout stderr stringstream istringstream ostringstream auto_ptr deque list queue stack vector map set pair bitset multiset multimap unordered_set unordered_map unordered_multiset unordered_multimap priority_queue make_pair array shared_ptr abort terminate abs acos asin atan2 atan calloc ceil cosh cos exit exp fabs floor fmod fprintf fputs free frexp fscanf future isalnum isalpha iscntrl isdigit isgraph islower isprint ispunct isspace isupper isxdigit tolower toupper labs ldexp log10 log malloc realloc memchr memcmp memcpy memset modf pow printf putchar puts scanf sinh sin snprintf sprintf sqrt sscanf strcat strchr strcmp strcpy strcspn strlen strncat strncmp strncpy strpbrk strrchr strspn strstr tanh tan vfprintf vprintf vsprintf endl initializer_list unique_ptr _Bool complex _Complex imaginary _Imaginary",
      literal: "true false nullptr NULL"
    },
        m = [c, i, n, t.C_BLOCK_COMMENT_MODE, o, s],
        p = {
      variants: [{
        begin: /=/,
        end: /;/
      }, {
        begin: /\(/,
        end: /\)/
      }, {
        beginKeywords: "new throw return else",
        end: /;/
      }],
      keywords: u,
      contains: m.concat([{
        begin: /\(/,
        end: /\)/,
        keywords: u,
        contains: m.concat(["self"]),
        relevance: 0
      }]),
      relevance: 0
    },
        _ = {
      className: "function",
      begin: "(" + a + "[\\*&\\s]+)+" + d,
      returnBegin: !0,
      end: /[{;=]/,
      excludeEnd: !0,
      keywords: u,
      illegal: /[^\w\s\*&:<>.]/,
      contains: [{
        begin: "decltype\\(auto\\)",
        keywords: u,
        relevance: 0
      }, {
        begin: d,
        returnBegin: !0,
        contains: [l],
        relevance: 0
      }, {
        className: "params",
        begin: /\(/,
        end: /\)/,
        keywords: u,
        relevance: 0,
        contains: [n, t.C_BLOCK_COMMENT_MODE, s, o, i, {
          begin: /\(/,
          end: /\)/,
          keywords: u,
          relevance: 0,
          contains: ["self", n, t.C_BLOCK_COMMENT_MODE, s, o, i]
        }]
      }, i, n, t.C_BLOCK_COMMENT_MODE, c]
    };
    return {
      name: "C++",
      aliases: ["cc", "c++", "h++", "hpp", "hh", "hxx", "cxx"],
      keywords: u,
      illegal: "</",
      contains: [].concat(p, _, m, [c, {
        begin: "\\b(deque|list|queue|priority_queue|pair|stack|vector|map|set|bitset|multiset|multimap|unordered_map|unordered_set|unordered_multiset|unordered_multimap|array)\\s*<",
        end: ">",
        keywords: u,
        contains: ["self", i]
      }, {
        begin: t.IDENT_RE + "::",
        keywords: u
      }, {
        className: "class",
        beginKeywords: "enum class struct union",
        end: /[{;:<>=]/,
        contains: [{
          beginKeywords: "final class struct"
        }, t.TITLE_MODE]
      }]),
      exports: {
        preprocessor: c,
        strings: s,
        keywords: u
      }
    };
  };
}());
hljs.registerLanguage("csharp", function () {
  "use strict";

  return function (e) {
    var n = {
      keyword: ["abstract", "as", "base", "break", "case", "class", "const", "continue", "do", "else", "event", "explicit", "extern", "finally", "fixed", "for", "foreach", "goto", "if", "implicit", "in", "interface", "internal", "is", "lock", "namespace", "new", "operator", "out", "override", "params", "private", "protected", "public", "readonly", "record", "ref", "return", "sealed", "sizeof", "stackalloc", "static", "struct", "switch", "this", "throw", "try", "typeof", "unchecked", "unsafe", "using", "virtual", "void", "volatile", "while"].concat(["add", "alias", "and", "ascending", "async", "await", "by", "descending", "equals", "from", "get", "global", "group", "init", "into", "join", "let", "nameof", "not", "notnull", "on", "or", "orderby", "partial", "remove", "select", "set", "unmanaged", "value|0", "var", "when", "where", "with", "yield"]),
      built_in: ["bool", "byte", "char", "decimal", "delegate", "double", "dynamic", "enum", "float", "int", "long", "nint", "nuint", "object", "sbyte", "short", "string", "ulong", "unit", "ushort"],
      literal: ["default", "false", "null", "true"]
    },
        a = e.inherit(e.TITLE_MODE, {
      begin: "[a-zA-Z](\\.?\\w)*"
    }),
        i = {
      className: "number",
      variants: [{
        begin: "\\b(0b[01']+)"
      }, {
        begin: "(-?)\\b([\\d']+(\\.[\\d']*)?|\\.[\\d']+)(u|U|l|L|ul|UL|f|F|b|B)"
      }, {
        begin: "(-?)(\\b0[xX][a-fA-F0-9']+|(\\b[\\d']+(\\.[\\d']*)?|\\.[\\d']+)([eE][-+]?[\\d']+)?)"
      }],
      relevance: 0
    },
        s = {
      className: "string",
      begin: '@"',
      end: '"',
      contains: [{
        begin: '""'
      }]
    },
        t = e.inherit(s, {
      illegal: /\n/
    }),
        r = {
      className: "subst",
      begin: /\{/,
      end: /\}/,
      keywords: n
    },
        l = e.inherit(r, {
      illegal: /\n/
    }),
        c = {
      className: "string",
      begin: /\$"/,
      end: '"',
      illegal: /\n/,
      contains: [{
        begin: /\{\{/
      }, {
        begin: /\}\}/
      }, e.BACKSLASH_ESCAPE, l]
    },
        o = {
      className: "string",
      begin: /\$@"/,
      end: '"',
      contains: [{
        begin: /\{\{/
      }, {
        begin: /\}\}/
      }, {
        begin: '""'
      }, r]
    },
        d = e.inherit(o, {
      illegal: /\n/,
      contains: [{
        begin: /\{\{/
      }, {
        begin: /\}\}/
      }, {
        begin: '""'
      }, l]
    });
    r.contains = [o, c, s, e.APOS_STRING_MODE, e.QUOTE_STRING_MODE, i, e.C_BLOCK_COMMENT_MODE], l.contains = [d, c, t, e.APOS_STRING_MODE, e.QUOTE_STRING_MODE, i, e.inherit(e.C_BLOCK_COMMENT_MODE, {
      illegal: /\n/
    })];

    var g = {
      variants: [o, c, s, e.APOS_STRING_MODE, e.QUOTE_STRING_MODE]
    },
        E = {
      begin: "<",
      end: ">",
      contains: [{
        beginKeywords: "in out"
      }, a]
    },
        _ = e.IDENT_RE + "(<" + e.IDENT_RE + "(\\s*,\\s*" + e.IDENT_RE + ")*>)?(\\[\\])?",
        b = {
      begin: "@" + e.IDENT_RE,
      relevance: 0
    };

    return {
      name: "C#",
      aliases: ["cs", "c#"],
      keywords: n,
      illegal: /::/,
      contains: [e.COMMENT("///", "$", {
        returnBegin: !0,
        contains: [{
          className: "doctag",
          variants: [{
            begin: "///",
            relevance: 0
          }, {
            begin: "\x3c!--|--\x3e"
          }, {
            begin: "</?",
            end: ">"
          }]
        }]
      }), e.C_LINE_COMMENT_MODE, e.C_BLOCK_COMMENT_MODE, {
        className: "meta",
        begin: "#",
        end: "$",
        keywords: {
          "meta-keyword": "if else elif endif define undef warning error line region endregion pragma checksum"
        }
      }, g, i, {
        beginKeywords: "class interface",
        relevance: 0,
        end: /[{;=]/,
        illegal: /[^\s:,]/,
        contains: [{
          beginKeywords: "where class"
        }, a, E, e.C_LINE_COMMENT_MODE, e.C_BLOCK_COMMENT_MODE]
      }, {
        beginKeywords: "namespace",
        relevance: 0,
        end: /[{;=]/,
        illegal: /[^\s:]/,
        contains: [a, e.C_LINE_COMMENT_MODE, e.C_BLOCK_COMMENT_MODE]
      }, {
        beginKeywords: "record",
        relevance: 0,
        end: /[{;=]/,
        illegal: /[^\s:]/,
        contains: [a, E, e.C_LINE_COMMENT_MODE, e.C_BLOCK_COMMENT_MODE]
      }, {
        className: "meta",
        begin: "^\\s*\\[",
        excludeBegin: !0,
        end: "\\]",
        excludeEnd: !0,
        contains: [{
          className: "meta-string",
          begin: /"/,
          end: /"/
        }]
      }, {
        beginKeywords: "new return throw await else",
        relevance: 0
      }, {
        className: "function",
        begin: "(" + _ + "\\s+)+" + e.IDENT_RE + "\\s*(<.+>\\s*)?\\(",
        returnBegin: !0,
        end: /\s*[{;=]/,
        excludeEnd: !0,
        keywords: n,
        contains: [{
          beginKeywords: "public private protected static internal protected abstract async extern override unsafe virtual new sealed partial",
          relevance: 0
        }, {
          begin: e.IDENT_RE + "\\s*(<.+>\\s*)?\\(",
          returnBegin: !0,
          contains: [e.TITLE_MODE, E],
          relevance: 0
        }, {
          className: "params",
          begin: /\(/,
          end: /\)/,
          excludeBegin: !0,
          excludeEnd: !0,
          keywords: n,
          relevance: 0,
          contains: [g, i, e.C_BLOCK_COMMENT_MODE]
        }, e.C_LINE_COMMENT_MODE, e.C_BLOCK_COMMENT_MODE]
      }, b]
    };
  };
}());
hljs.registerLanguage("css", function () {
  "use strict";

  var e = ["a", "abbr", "address", "article", "aside", "audio", "b", "blockquote", "body", "button", "canvas", "caption", "cite", "code", "dd", "del", "details", "dfn", "div", "dl", "dt", "em", "fieldset", "figcaption", "figure", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "header", "hgroup", "html", "i", "iframe", "img", "input", "ins", "kbd", "label", "legend", "li", "main", "mark", "menu", "nav", "object", "ol", "p", "q", "quote", "samp", "section", "span", "strong", "summary", "sup", "table", "tbody", "td", "textarea", "tfoot", "th", "thead", "time", "tr", "ul", "var", "video"],
      t = ["any-hover", "any-pointer", "aspect-ratio", "color", "color-gamut", "color-index", "device-aspect-ratio", "device-height", "device-width", "display-mode", "forced-colors", "grid", "height", "hover", "inverted-colors", "monochrome", "orientation", "overflow-block", "overflow-inline", "pointer", "prefers-color-scheme", "prefers-contrast", "prefers-reduced-motion", "prefers-reduced-transparency", "resolution", "scan", "scripting", "update", "width", "min-width", "max-width", "min-height", "max-height"],
      i = ["active", "any-link", "blank", "checked", "current", "default", "defined", "dir", "disabled", "drop", "empty", "enabled", "first", "first-child", "first-of-type", "fullscreen", "future", "focus", "focus-visible", "focus-within", "has", "host", "host-context", "hover", "indeterminate", "in-range", "invalid", "is", "lang", "last-child", "last-of-type", "left", "link", "local-link", "not", "nth-child", "nth-col", "nth-last-child", "nth-last-col", "nth-last-of-type", "nth-of-type", "only-child", "only-of-type", "optional", "out-of-range", "past", "placeholder-shown", "read-only", "read-write", "required", "right", "root", "scope", "target", "target-within", "user-invalid", "valid", "visited", "where"],
      o = ["after", "backdrop", "before", "cue", "cue-region", "first-letter", "first-line", "grammar-error", "marker", "part", "placeholder", "selection", "slotted", "spelling-error"],
      r = ["align-content", "align-items", "align-self", "animation", "animation-delay", "animation-direction", "animation-duration", "animation-fill-mode", "animation-iteration-count", "animation-name", "animation-play-state", "animation-timing-function", "auto", "backface-visibility", "background", "background-attachment", "background-clip", "background-color", "background-image", "background-origin", "background-position", "background-repeat", "background-size", "border", "border-bottom", "border-bottom-color", "border-bottom-left-radius", "border-bottom-right-radius", "border-bottom-style", "border-bottom-width", "border-collapse", "border-color", "border-image", "border-image-outset", "border-image-repeat", "border-image-slice", "border-image-source", "border-image-width", "border-left", "border-left-color", "border-left-style", "border-left-width", "border-radius", "border-right", "border-right-color", "border-right-style", "border-right-width", "border-spacing", "border-style", "border-top", "border-top-color", "border-top-left-radius", "border-top-right-radius", "border-top-style", "border-top-width", "border-width", "bottom", "box-decoration-break", "box-shadow", "box-sizing", "break-after", "break-before", "break-inside", "caption-side", "clear", "clip", "clip-path", "color", "column-count", "column-fill", "column-gap", "column-rule", "column-rule-color", "column-rule-style", "column-rule-width", "column-span", "column-width", "columns", "content", "counter-increment", "counter-reset", "cursor", "direction", "display", "empty-cells", "filter", "flex", "flex-basis", "flex-direction", "flex-flow", "flex-grow", "flex-shrink", "flex-wrap", "float", "font", "font-display", "font-family", "font-feature-settings", "font-kerning", "font-language-override", "font-size", "font-size-adjust", "font-stretch", "font-style", "font-variant", "font-variant-ligatures", "font-variation-settings", "font-weight", "height", "hyphens", "icon", "image-orientation", "image-rendering", "image-resolution", "ime-mode", "inherit", "initial", "justify-content", "left", "letter-spacing", "line-height", "list-style", "list-style-image", "list-style-position", "list-style-type", "margin", "margin-bottom", "margin-left", "margin-right", "margin-top", "marks", "mask", "max-height", "max-width", "min-height", "min-width", "nav-down", "nav-index", "nav-left", "nav-right", "nav-up", "none", "normal", "object-fit", "object-position", "opacity", "order", "orphans", "outline", "outline-color", "outline-offset", "outline-style", "outline-width", "overflow", "overflow-wrap", "overflow-x", "overflow-y", "padding", "padding-bottom", "padding-left", "padding-right", "padding-top", "page-break-after", "page-break-before", "page-break-inside", "perspective", "perspective-origin", "pointer-events", "position", "quotes", "resize", "right", "src", "tab-size", "table-layout", "text-align", "text-align-last", "text-decoration", "text-decoration-color", "text-decoration-line", "text-decoration-style", "text-indent", "text-overflow", "text-rendering", "text-shadow", "text-transform", "text-underline-position", "top", "transform", "transform-origin", "transform-style", "transition", "transition-delay", "transition-duration", "transition-property", "transition-timing-function", "unicode-bidi", "vertical-align", "visibility", "white-space", "widows", "width", "word-break", "word-spacing", "word-wrap", "z-index"].reverse();
  return function (n) {
    var a = function (e) {
      return {
        IMPORTANT: {
          className: "meta",
          begin: "!important"
        },
        HEXCOLOR: {
          className: "number",
          begin: "#([a-fA-F0-9]{6}|[a-fA-F0-9]{3})"
        },
        ATTRIBUTE_SELECTOR_MODE: {
          className: "selector-attr",
          begin: /\[/,
          end: /\]/,
          illegal: "$",
          contains: [e.APOS_STRING_MODE, e.QUOTE_STRING_MODE]
        }
      };
    }(n),
        l = [n.APOS_STRING_MODE, n.QUOTE_STRING_MODE];

    return {
      name: "CSS",
      case_insensitive: !0,
      illegal: /[=|'\$]/,
      keywords: {
        keyframePosition: "from to"
      },
      classNameAliases: {
        keyframePosition: "selector-tag"
      },
      contains: [n.C_BLOCK_COMMENT_MODE, {
        begin: /-(webkit|moz|ms|o)-(?=[a-z])/
      }, n.CSS_NUMBER_MODE, {
        className: "selector-id",
        begin: /#[A-Za-z0-9_-]+/,
        relevance: 0
      }, {
        className: "selector-class",
        begin: "\\.[a-zA-Z-][a-zA-Z0-9_-]*",
        relevance: 0
      }, a.ATTRIBUTE_SELECTOR_MODE, {
        className: "selector-pseudo",
        variants: [{
          begin: ":(" + i.join("|") + ")"
        }, {
          begin: "::(" + o.join("|") + ")"
        }]
      }, {
        className: "attribute",
        begin: "\\b(" + r.join("|") + ")\\b"
      }, {
        begin: ":",
        end: "[;}]",
        contains: [a.HEXCOLOR, a.IMPORTANT, n.CSS_NUMBER_MODE].concat(l, [{
          begin: /(url|data-uri)\(/,
          end: /\)/,
          relevance: 0,
          keywords: {
            built_in: "url data-uri"
          },
          contains: [{
            className: "string",
            begin: /[^)]/,
            endsWithParent: !0,
            excludeEnd: !0
          }]
        }, {
          className: "built_in",
          begin: /[\w-]+(?=\()/
        }])
      }, {
        begin: (s = /@/, function () {
          for (var _len8 = arguments.length, e = new Array(_len8), _key8 = 0; _key8 < _len8; _key8++) {
            e[_key8] = arguments[_key8];
          }

          return e.map(function (e) {
            return function (e) {
              return e ? "string" == typeof e ? e : e.source : null;
            }(e);
          }).join("");
        }("(?=", s, ")")),
        end: "[{;]",
        relevance: 0,
        illegal: /:/,
        contains: [{
          className: "keyword",
          begin: /@-?\w[\w]*(-\w+)*/
        }, {
          begin: /\s/,
          endsWithParent: !0,
          excludeEnd: !0,
          relevance: 0,
          keywords: {
            $pattern: /[a-z-]+/,
            keyword: "and or not only",
            attribute: t.join(" ")
          },
          contains: [{
            begin: /[a-z-]+(?=:)/,
            className: "attribute"
          }].concat(l, [n.CSS_NUMBER_MODE])
        }]
      }, {
        className: "selector-tag",
        begin: "\\b(" + e.join("|") + ")\\b"
      }]
    };
    var s;
  };
}());
hljs.registerLanguage("diff", function () {
  "use strict";

  return function (e) {
    return {
      name: "Diff",
      aliases: ["patch"],
      contains: [{
        className: "meta",
        relevance: 10,
        variants: [{
          begin: /^@@ +-\d+,\d+ +\+\d+,\d+ +@@/
        }, {
          begin: /^\*\*\* +\d+,\d+ +\*\*\*\*$/
        }, {
          begin: /^--- +\d+,\d+ +----$/
        }]
      }, {
        className: "comment",
        variants: [{
          begin: /Index: /,
          end: /$/
        }, {
          begin: /^index/,
          end: /$/
        }, {
          begin: /={3,}/,
          end: /$/
        }, {
          begin: /^-{3}/,
          end: /$/
        }, {
          begin: /^\*{3} /,
          end: /$/
        }, {
          begin: /^\+{3}/,
          end: /$/
        }, {
          begin: /^\*{15}$/
        }, {
          begin: /^diff --git/,
          end: /$/
        }]
      }, {
        className: "addition",
        begin: /^\+/,
        end: /$/
      }, {
        className: "deletion",
        begin: /^-/,
        end: /$/
      }, {
        className: "addition",
        begin: /^!/,
        end: /$/
      }]
    };
  };
}());
hljs.registerLanguage("go", function () {
  "use strict";

  return function (e) {
    var n = {
      keyword: "break default func interface select case map struct chan else goto package switch const fallthrough if range type continue for import return var go defer bool byte complex64 complex128 float32 float64 int8 int16 int32 int64 string uint8 uint16 uint32 uint64 int uint uintptr rune",
      literal: "true false iota nil",
      built_in: "append cap close complex copy imag len make new panic print println real recover delete"
    };
    return {
      name: "Go",
      aliases: ["golang"],
      keywords: n,
      illegal: "</",
      contains: [e.C_LINE_COMMENT_MODE, e.C_BLOCK_COMMENT_MODE, {
        className: "string",
        variants: [e.QUOTE_STRING_MODE, e.APOS_STRING_MODE, {
          begin: "`",
          end: "`"
        }]
      }, {
        className: "number",
        variants: [{
          begin: e.C_NUMBER_RE + "[i]",
          relevance: 1
        }, e.C_NUMBER_MODE]
      }, {
        begin: /:=/
      }, {
        className: "function",
        beginKeywords: "func",
        end: "\\s*(\\{|$)",
        excludeEnd: !0,
        contains: [e.TITLE_MODE, {
          className: "params",
          begin: /\(/,
          end: /\)/,
          keywords: n,
          illegal: /["']/
        }]
      }]
    };
  };
}());
hljs.registerLanguage("http", function () {
  "use strict";

  function e() {
    for (var _len9 = arguments.length, e = new Array(_len9), _key9 = 0; _key9 < _len9; _key9++) {
      e[_key9] = arguments[_key9];
    }

    return e.map(function (e) {
      return (n = e) ? "string" == typeof n ? n : n.source : null;
      var n;
    }).join("");
  }

  return function (n) {
    var a = "HTTP/(2|1\\.[01])",
        s = [{
      className: "attribute",
      begin: e("^", /[A-Za-z][A-Za-z0-9-]*/, "(?=\\:\\s)"),
      starts: {
        contains: [{
          className: "punctuation",
          begin: /: /,
          relevance: 0,
          starts: {
            end: "$",
            relevance: 0
          }
        }]
      }
    }, {
      begin: "\\n\\n",
      starts: {
        subLanguage: [],
        endsWithParent: !0
      }
    }];
    return {
      name: "HTTP",
      aliases: ["https"],
      illegal: /\S/,
      contains: [{
        begin: "^(?=" + a + " \\d{3})",
        end: /$/,
        contains: [{
          className: "meta",
          begin: a
        }, {
          className: "number",
          begin: "\\b\\d{3}\\b"
        }],
        starts: {
          end: /\b\B/,
          illegal: /\S/,
          contains: s
        }
      }, {
        begin: "(?=^[A-Z]+ (.*?) " + a + "$)",
        end: /$/,
        contains: [{
          className: "string",
          begin: " ",
          end: " ",
          excludeBegin: !0,
          excludeEnd: !0
        }, {
          className: "meta",
          begin: a
        }, {
          className: "keyword",
          begin: "[A-Z]+"
        }],
        starts: {
          end: /\b\B/,
          illegal: /\S/,
          contains: s
        }
      }]
    };
  };
}());
hljs.registerLanguage("ini", function () {
  "use strict";

  function e(e) {
    return e ? "string" == typeof e ? e : e.source : null;
  }

  function n() {
    for (var _len10 = arguments.length, n = new Array(_len10), _key10 = 0; _key10 < _len10; _key10++) {
      n[_key10] = arguments[_key10];
    }

    return n.map(function (n) {
      return e(n);
    }).join("");
  }

  return function (s) {
    var a = {
      className: "number",
      relevance: 0,
      variants: [{
        begin: /([+-]+)?[\d]+_[\d_]+/
      }, {
        begin: s.NUMBER_RE
      }]
    },
        i = s.COMMENT();
    i.variants = [{
      begin: /;/,
      end: /$/
    }, {
      begin: /#/,
      end: /$/
    }];
    var t = {
      className: "variable",
      variants: [{
        begin: /\$[\w\d"][\w\d_]*/
      }, {
        begin: /\$\{(.*?)\}/
      }]
    },
        r = {
      className: "literal",
      begin: /\bon|off|true|false|yes|no\b/
    },
        l = {
      className: "string",
      contains: [s.BACKSLASH_ESCAPE],
      variants: [{
        begin: "'''",
        end: "'''",
        relevance: 10
      }, {
        begin: '"""',
        end: '"""',
        relevance: 10
      }, {
        begin: '"',
        end: '"'
      }, {
        begin: "'",
        end: "'"
      }]
    },
        c = {
      begin: /\[/,
      end: /\]/,
      contains: [i, r, t, l, a, "self"],
      relevance: 0
    },
        g = "(" + [/[A-Za-z0-9_-]+/, /"(\\"|[^"])*"/, /'[^']*'/].map(function (n) {
      return e(n);
    }).join("|") + ")";
    return {
      name: "TOML, also INI",
      aliases: ["toml"],
      case_insensitive: !0,
      illegal: /\S/,
      contains: [i, {
        className: "section",
        begin: /\[+/,
        end: /\]+/
      }, {
        begin: n(g, "(\\s*\\.\\s*", g, ")*", n("(?=", /\s*=\s*[^#\s]/, ")")),
        className: "attr",
        starts: {
          end: /$/,
          contains: [i, c, r, t, l, a]
        }
      }]
    };
  };
}());
hljs.registerLanguage("java", function () {
  "use strict";

  var e = "\\.([0-9](_*[0-9])*)",
      n = "[0-9a-fA-F](_*[0-9a-fA-F])*",
      a = {
    className: "number",
    variants: [{
      begin: "(\\b([0-9](_*[0-9])*)((".concat(e, ")|\\.)?|(").concat(e, "))[eE][+-]?([0-9](_*[0-9])*)[fFdD]?\\b")
    }, {
      begin: "\\b([0-9](_*[0-9])*)((".concat(e, ")[fFdD]?\\b|\\.([fFdD]\\b)?)")
    }, {
      begin: "(".concat(e, ")[fFdD]?\\b")
    }, {
      begin: "\\b([0-9](_*[0-9])*)[fFdD]\\b"
    }, {
      begin: "\\b0[xX]((".concat(n, ")\\.?|(").concat(n, ")?\\.(").concat(n, "))[pP][+-]?([0-9](_*[0-9])*)[fFdD]?\\b")
    }, {
      begin: "\\b(0|[1-9](_*[0-9])*)[lL]?\\b"
    }, {
      begin: "\\b0[xX](".concat(n, ")[lL]?\\b")
    }, {
      begin: "\\b0(_*[0-7])*[lL]?\\b"
    }, {
      begin: "\\b0[bB][01](_*[01])*[lL]?\\b"
    }],
    relevance: 0
  };
  return function (e) {
    var n = "false synchronized int abstract float private char boolean var static null if const for true while long strictfp finally protected import native final void enum else break transient catch instanceof byte super volatile case assert short package default double public try this switch continue throws protected public private module requires exports do",
        s = {
      className: "meta",
      begin: "@[\xC0-\u02B8a-zA-Z_$][\xC0-\u02B8a-zA-Z_$0-9]*",
      contains: [{
        begin: /\(/,
        end: /\)/,
        contains: ["self"]
      }]
    };
    var r = a;
    return {
      name: "Java",
      aliases: ["jsp"],
      keywords: n,
      illegal: /<\/|#/,
      contains: [e.COMMENT("/\\*\\*", "\\*/", {
        relevance: 0,
        contains: [{
          begin: /\w+@/,
          relevance: 0
        }, {
          className: "doctag",
          begin: "@[A-Za-z]+"
        }]
      }), {
        begin: /import java\.[a-z]+\./,
        keywords: "import",
        relevance: 2
      }, e.C_LINE_COMMENT_MODE, e.C_BLOCK_COMMENT_MODE, e.APOS_STRING_MODE, e.QUOTE_STRING_MODE, {
        className: "class",
        beginKeywords: "class interface enum",
        end: /[{;=]/,
        excludeEnd: !0,
        relevance: 1,
        keywords: "class interface enum",
        illegal: /[:"\[\]]/,
        contains: [{
          beginKeywords: "extends implements"
        }, e.UNDERSCORE_TITLE_MODE]
      }, {
        beginKeywords: "new throw return else",
        relevance: 0
      }, {
        className: "class",
        begin: "record\\s+" + e.UNDERSCORE_IDENT_RE + "\\s*\\(",
        returnBegin: !0,
        excludeEnd: !0,
        end: /[{;=]/,
        keywords: n,
        contains: [{
          beginKeywords: "record"
        }, {
          begin: e.UNDERSCORE_IDENT_RE + "\\s*\\(",
          returnBegin: !0,
          relevance: 0,
          contains: [e.UNDERSCORE_TITLE_MODE]
        }, {
          className: "params",
          begin: /\(/,
          end: /\)/,
          keywords: n,
          relevance: 0,
          contains: [e.C_BLOCK_COMMENT_MODE]
        }, e.C_LINE_COMMENT_MODE, e.C_BLOCK_COMMENT_MODE]
      }, {
        className: "function",
        begin: "([\xC0-\u02B8a-zA-Z_$][\xC0-\u02B8a-zA-Z_$0-9]*(<[\xC0-\u02B8a-zA-Z_$][\xC0-\u02B8a-zA-Z_$0-9]*(\\s*,\\s*[\xC0-\u02B8a-zA-Z_$][\xC0-\u02B8a-zA-Z_$0-9]*)*>)?\\s+)+" + e.UNDERSCORE_IDENT_RE + "\\s*\\(",
        returnBegin: !0,
        end: /[{;=]/,
        excludeEnd: !0,
        keywords: n,
        contains: [{
          begin: e.UNDERSCORE_IDENT_RE + "\\s*\\(",
          returnBegin: !0,
          relevance: 0,
          contains: [e.UNDERSCORE_TITLE_MODE]
        }, {
          className: "params",
          begin: /\(/,
          end: /\)/,
          keywords: n,
          relevance: 0,
          contains: [s, e.APOS_STRING_MODE, e.QUOTE_STRING_MODE, r, e.C_BLOCK_COMMENT_MODE]
        }, e.C_LINE_COMMENT_MODE, e.C_BLOCK_COMMENT_MODE]
      }, r, s]
    };
  };
}());
hljs.registerLanguage("javascript", function () {
  "use strict";

  var e = "[A-Za-z$_][0-9A-Za-z$_]*",
      n = ["as", "in", "of", "if", "for", "while", "finally", "var", "new", "function", "do", "return", "void", "else", "break", "catch", "instanceof", "with", "throw", "case", "default", "try", "switch", "continue", "typeof", "delete", "let", "yield", "const", "class", "debugger", "async", "await", "static", "import", "from", "export", "extends"],
      a = ["true", "false", "null", "undefined", "NaN", "Infinity"],
      s = [].concat(["setInterval", "setTimeout", "clearInterval", "clearTimeout", "require", "exports", "eval", "isFinite", "isNaN", "parseFloat", "parseInt", "decodeURI", "decodeURIComponent", "encodeURI", "encodeURIComponent", "escape", "unescape"], ["arguments", "this", "super", "console", "window", "document", "localStorage", "module", "global"], ["Intl", "DataView", "Number", "Math", "Date", "String", "RegExp", "Object", "Function", "Boolean", "Error", "Symbol", "Set", "Map", "WeakSet", "WeakMap", "Proxy", "Reflect", "JSON", "Promise", "Float64Array", "Int16Array", "Int32Array", "Int8Array", "Uint16Array", "Uint32Array", "Float32Array", "Array", "Uint8Array", "Uint8ClampedArray", "ArrayBuffer"], ["EvalError", "InternalError", "RangeError", "ReferenceError", "SyntaxError", "TypeError", "URIError"]);

  function r(e) {
    return t("(?=", e, ")");
  }

  function t() {
    for (var _len11 = arguments.length, e = new Array(_len11), _key11 = 0; _key11 < _len11; _key11++) {
      e[_key11] = arguments[_key11];
    }

    return e.map(function (e) {
      return (n = e) ? "string" == typeof n ? n : n.source : null;
      var n;
    }).join("");
  }

  return function (i) {
    var c = e,
        o = {
      begin: /<[A-Za-z0-9\\._:-]+/,
      end: /\/[A-Za-z0-9\\._:-]+>|\/>/,
      isTrulyOpeningTag: function isTrulyOpeningTag(e, n) {
        var a = e[0].length + e.index,
            s = e.input[a];
        "<" !== s ? ">" === s && (function (e, _ref10) {
          var n = _ref10.after;
          var a = "</" + e[0].slice(1);
          return -1 !== e.input.indexOf(a, n);
        }(e, {
          after: a
        }) || n.ignoreMatch()) : n.ignoreMatch();
      }
    },
        l = {
      $pattern: e,
      keyword: n,
      literal: a,
      built_in: s
    },
        b = "\\.([0-9](_?[0-9])*)",
        g = "0|[1-9](_?[0-9])*|0[0-7]*[89][0-9]*",
        d = {
      className: "number",
      variants: [{
        begin: "(\\b(".concat(g, ")((").concat(b, ")|\\.)?|(").concat(b, "))[eE][+-]?([0-9](_?[0-9])*)\\b")
      }, {
        begin: "\\b(".concat(g, ")\\b((").concat(b, ")\\b|\\.)?|(").concat(b, ")\\b")
      }, {
        begin: "\\b(0|[1-9](_?[0-9])*)n\\b"
      }, {
        begin: "\\b0[xX][0-9a-fA-F](_?[0-9a-fA-F])*n?\\b"
      }, {
        begin: "\\b0[bB][0-1](_?[0-1])*n?\\b"
      }, {
        begin: "\\b0[oO][0-7](_?[0-7])*n?\\b"
      }, {
        begin: "\\b0[0-7]+n?\\b"
      }],
      relevance: 0
    },
        E = {
      className: "subst",
      begin: "\\$\\{",
      end: "\\}",
      keywords: l,
      contains: []
    },
        u = {
      begin: "html`",
      end: "",
      starts: {
        end: "`",
        returnEnd: !1,
        contains: [i.BACKSLASH_ESCAPE, E],
        subLanguage: "xml"
      }
    },
        _ = {
      begin: "css`",
      end: "",
      starts: {
        end: "`",
        returnEnd: !1,
        contains: [i.BACKSLASH_ESCAPE, E],
        subLanguage: "css"
      }
    },
        m = {
      className: "string",
      begin: "`",
      end: "`",
      contains: [i.BACKSLASH_ESCAPE, E]
    },
        N = {
      className: "comment",
      variants: [i.COMMENT(/\/\*\*(?!\/)/, "\\*/", {
        relevance: 0,
        contains: [{
          className: "doctag",
          begin: "@[A-Za-z]+",
          contains: [{
            className: "type",
            begin: "\\{",
            end: "\\}",
            relevance: 0
          }, {
            className: "variable",
            begin: c + "(?=\\s*(-)|$)",
            endsParent: !0,
            relevance: 0
          }, {
            begin: /(?=[^\n])\s/,
            relevance: 0
          }]
        }]
      }), i.C_BLOCK_COMMENT_MODE, i.C_LINE_COMMENT_MODE]
    },
        y = [i.APOS_STRING_MODE, i.QUOTE_STRING_MODE, u, _, m, d, i.REGEXP_MODE];
    E.contains = y.concat({
      begin: /\{/,
      end: /\}/,
      keywords: l,
      contains: ["self"].concat(y)
    });
    var f = [].concat(N, E.contains),
        A = f.concat([{
      begin: /\(/,
      end: /\)/,
      keywords: l,
      contains: ["self"].concat(f)
    }]),
        p = {
      className: "params",
      begin: /\(/,
      end: /\)/,
      excludeBegin: !0,
      excludeEnd: !0,
      keywords: l,
      contains: A
    };
    return {
      name: "Javascript",
      aliases: ["js", "jsx", "mjs", "cjs"],
      keywords: l,
      exports: {
        PARAMS_CONTAINS: A
      },
      illegal: /#(?![$_A-z])/,
      contains: [i.SHEBANG({
        label: "shebang",
        binary: "node",
        relevance: 5
      }), {
        label: "use_strict",
        className: "meta",
        relevance: 10,
        begin: /^\s*['"]use (strict|asm)['"]/
      }, i.APOS_STRING_MODE, i.QUOTE_STRING_MODE, u, _, m, N, d, {
        begin: t(/[{,\n]\s*/, r(t(/(((\/\/.*$)|(\/\*(\*[^/]|[^*])*\*\/))\s*)*/, c + "\\s*:"))),
        relevance: 0,
        contains: [{
          className: "attr",
          begin: c + r("\\s*:"),
          relevance: 0
        }]
      }, {
        begin: "(" + i.RE_STARTERS_RE + "|\\b(case|return|throw)\\b)\\s*",
        keywords: "return throw case",
        contains: [N, i.REGEXP_MODE, {
          className: "function",
          begin: "(\\([^()]*(\\([^()]*(\\([^()]*\\)[^()]*)*\\)[^()]*)*\\)|" + i.UNDERSCORE_IDENT_RE + ")\\s*=>",
          returnBegin: !0,
          end: "\\s*=>",
          contains: [{
            className: "params",
            variants: [{
              begin: i.UNDERSCORE_IDENT_RE,
              relevance: 0
            }, {
              className: null,
              begin: /\(\s*\)/,
              skip: !0
            }, {
              begin: /\(/,
              end: /\)/,
              excludeBegin: !0,
              excludeEnd: !0,
              keywords: l,
              contains: A
            }]
          }]
        }, {
          begin: /,/,
          relevance: 0
        }, {
          className: "",
          begin: /\s/,
          end: /\s*/,
          skip: !0
        }, {
          variants: [{
            begin: "<>",
            end: "</>"
          }, {
            begin: o.begin,
            "on:begin": o.isTrulyOpeningTag,
            end: o.end
          }],
          subLanguage: "xml",
          contains: [{
            begin: o.begin,
            end: o.end,
            skip: !0,
            contains: ["self"]
          }]
        }],
        relevance: 0
      }, {
        className: "function",
        beginKeywords: "function",
        end: /[{;]/,
        excludeEnd: !0,
        keywords: l,
        contains: ["self", i.inherit(i.TITLE_MODE, {
          begin: c
        }), p],
        illegal: /%/
      }, {
        beginKeywords: "while if switch catch for"
      }, {
        className: "function",
        begin: i.UNDERSCORE_IDENT_RE + "\\([^()]*(\\([^()]*(\\([^()]*\\)[^()]*)*\\)[^()]*)*\\)\\s*\\{",
        returnBegin: !0,
        contains: [p, i.inherit(i.TITLE_MODE, {
          begin: c
        })]
      }, {
        variants: [{
          begin: "\\." + c
        }, {
          begin: "\\$" + c
        }],
        relevance: 0
      }, {
        className: "class",
        beginKeywords: "class",
        end: /[{;=]/,
        excludeEnd: !0,
        illegal: /[:"[\]]/,
        contains: [{
          beginKeywords: "extends"
        }, i.UNDERSCORE_TITLE_MODE]
      }, {
        begin: /\b(?=constructor)/,
        end: /[{;]/,
        excludeEnd: !0,
        contains: [i.inherit(i.TITLE_MODE, {
          begin: c
        }), "self", p]
      }, {
        begin: "(get|set)\\s+(?=" + c + "\\()",
        end: /\{/,
        keywords: "get set",
        contains: [i.inherit(i.TITLE_MODE, {
          begin: c
        }), {
          begin: /\(\)/
        }, p]
      }, {
        begin: /\$[(.]/
      }]
    };
  };
}());
hljs.registerLanguage("json", function () {
  "use strict";

  return function (n) {
    var e = {
      literal: "true false null"
    },
        i = [n.C_LINE_COMMENT_MODE, n.C_BLOCK_COMMENT_MODE],
        a = [n.QUOTE_STRING_MODE, n.C_NUMBER_MODE],
        l = {
      end: ",",
      endsWithParent: !0,
      excludeEnd: !0,
      contains: a,
      keywords: e
    },
        t = {
      begin: /\{/,
      end: /\}/,
      contains: [{
        className: "attr",
        begin: /"/,
        end: /"/,
        contains: [n.BACKSLASH_ESCAPE],
        illegal: "\\n"
      }, n.inherit(l, {
        begin: /:/
      })].concat(i),
      illegal: "\\S"
    },
        s = {
      begin: "\\[",
      end: "\\]",
      contains: [n.inherit(l)],
      illegal: "\\S"
    };
    return a.push(t, s), i.forEach(function (n) {
      a.push(n);
    }), {
      name: "JSON",
      contains: a,
      keywords: e,
      illegal: "\\S"
    };
  };
}());
hljs.registerLanguage("kotlin", function () {
  "use strict";

  var e = "\\.([0-9](_*[0-9])*)",
      n = "[0-9a-fA-F](_*[0-9a-fA-F])*",
      a = {
    className: "number",
    variants: [{
      begin: "(\\b([0-9](_*[0-9])*)((".concat(e, ")|\\.)?|(").concat(e, "))[eE][+-]?([0-9](_*[0-9])*)[fFdD]?\\b")
    }, {
      begin: "\\b([0-9](_*[0-9])*)((".concat(e, ")[fFdD]?\\b|\\.([fFdD]\\b)?)")
    }, {
      begin: "(".concat(e, ")[fFdD]?\\b")
    }, {
      begin: "\\b([0-9](_*[0-9])*)[fFdD]\\b"
    }, {
      begin: "\\b0[xX]((".concat(n, ")\\.?|(").concat(n, ")?\\.(").concat(n, "))[pP][+-]?([0-9](_*[0-9])*)[fFdD]?\\b")
    }, {
      begin: "\\b(0|[1-9](_*[0-9])*)[lL]?\\b"
    }, {
      begin: "\\b0[xX](".concat(n, ")[lL]?\\b")
    }, {
      begin: "\\b0(_*[0-7])*[lL]?\\b"
    }, {
      begin: "\\b0[bB][01](_*[01])*[lL]?\\b"
    }],
    relevance: 0
  };
  return function (e) {
    var n = {
      keyword: "abstract as val var vararg get set class object open private protected public noinline crossinline dynamic final enum if else do while for when throw try catch finally import package is in fun override companion reified inline lateinit init interface annotation data sealed internal infix operator out by constructor super tailrec where const inner suspend typealias external expect actual",
      built_in: "Byte Short Char Int Long Boolean Float Double Void Unit Nothing",
      literal: "true false null"
    },
        i = {
      className: "symbol",
      begin: e.UNDERSCORE_IDENT_RE + "@"
    },
        s = {
      className: "subst",
      begin: /\$\{/,
      end: /\}/,
      contains: [e.C_NUMBER_MODE]
    },
        t = {
      className: "variable",
      begin: "\\$" + e.UNDERSCORE_IDENT_RE
    },
        r = {
      className: "string",
      variants: [{
        begin: '"""',
        end: '"""(?=[^"])',
        contains: [t, s]
      }, {
        begin: "'",
        end: "'",
        illegal: /\n/,
        contains: [e.BACKSLASH_ESCAPE]
      }, {
        begin: '"',
        end: '"',
        illegal: /\n/,
        contains: [e.BACKSLASH_ESCAPE, t, s]
      }]
    };
    s.contains.push(r);
    var l = {
      className: "meta",
      begin: "@(?:file|property|field|get|set|receiver|param|setparam|delegate)\\s*:(?:\\s*" + e.UNDERSCORE_IDENT_RE + ")?"
    },
        c = {
      className: "meta",
      begin: "@" + e.UNDERSCORE_IDENT_RE,
      contains: [{
        begin: /\(/,
        end: /\)/,
        contains: [e.inherit(r, {
          className: "meta-string"
        })]
      }]
    },
        o = a,
        b = e.COMMENT("/\\*", "\\*/", {
      contains: [e.C_BLOCK_COMMENT_MODE]
    }),
        E = {
      variants: [{
        className: "type",
        begin: e.UNDERSCORE_IDENT_RE
      }, {
        begin: /\(/,
        end: /\)/,
        contains: []
      }]
    },
        d = E;
    return d.variants[1].contains = [E], E.variants[1].contains = [d], {
      name: "Kotlin",
      aliases: ["kt"],
      keywords: n,
      contains: [e.COMMENT("/\\*\\*", "\\*/", {
        relevance: 0,
        contains: [{
          className: "doctag",
          begin: "@[A-Za-z]+"
        }]
      }), e.C_LINE_COMMENT_MODE, b, {
        className: "keyword",
        begin: /\b(break|continue|return|this)\b/,
        starts: {
          contains: [{
            className: "symbol",
            begin: /@\w+/
          }]
        }
      }, i, l, c, {
        className: "function",
        beginKeywords: "fun",
        end: "[(]|$",
        returnBegin: !0,
        excludeEnd: !0,
        keywords: n,
        relevance: 5,
        contains: [{
          begin: e.UNDERSCORE_IDENT_RE + "\\s*\\(",
          returnBegin: !0,
          relevance: 0,
          contains: [e.UNDERSCORE_TITLE_MODE]
        }, {
          className: "type",
          begin: /</,
          end: />/,
          keywords: "reified",
          relevance: 0
        }, {
          className: "params",
          begin: /\(/,
          end: /\)/,
          endsParent: !0,
          keywords: n,
          relevance: 0,
          contains: [{
            begin: /:/,
            end: /[=,\/]/,
            endsWithParent: !0,
            contains: [E, e.C_LINE_COMMENT_MODE, b],
            relevance: 0
          }, e.C_LINE_COMMENT_MODE, b, l, c, r, e.C_NUMBER_MODE]
        }, b]
      }, {
        className: "class",
        beginKeywords: "class interface trait",
        end: /[:\{(]|$/,
        excludeEnd: !0,
        illegal: "extends implements",
        contains: [{
          beginKeywords: "public protected internal private constructor"
        }, e.UNDERSCORE_TITLE_MODE, {
          className: "type",
          begin: /</,
          end: />/,
          excludeBegin: !0,
          excludeEnd: !0,
          relevance: 0
        }, {
          className: "type",
          begin: /[,:]\s*/,
          end: /[<\(,]|$/,
          excludeBegin: !0,
          returnEnd: !0
        }, l, c]
      }, r, {
        className: "meta",
        begin: "^#!/usr/bin/env",
        end: "$",
        illegal: "\n"
      }, o]
    };
  };
}());
hljs.registerLanguage("less", function () {
  "use strict";

  var e = ["a", "abbr", "address", "article", "aside", "audio", "b", "blockquote", "body", "button", "canvas", "caption", "cite", "code", "dd", "del", "details", "dfn", "div", "dl", "dt", "em", "fieldset", "figcaption", "figure", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "header", "hgroup", "html", "i", "iframe", "img", "input", "ins", "kbd", "label", "legend", "li", "main", "mark", "menu", "nav", "object", "ol", "p", "q", "quote", "samp", "section", "span", "strong", "summary", "sup", "table", "tbody", "td", "textarea", "tfoot", "th", "thead", "time", "tr", "ul", "var", "video"],
      t = ["any-hover", "any-pointer", "aspect-ratio", "color", "color-gamut", "color-index", "device-aspect-ratio", "device-height", "device-width", "display-mode", "forced-colors", "grid", "height", "hover", "inverted-colors", "monochrome", "orientation", "overflow-block", "overflow-inline", "pointer", "prefers-color-scheme", "prefers-contrast", "prefers-reduced-motion", "prefers-reduced-transparency", "resolution", "scan", "scripting", "update", "width", "min-width", "max-width", "min-height", "max-height"],
      i = ["active", "any-link", "blank", "checked", "current", "default", "defined", "dir", "disabled", "drop", "empty", "enabled", "first", "first-child", "first-of-type", "fullscreen", "future", "focus", "focus-visible", "focus-within", "has", "host", "host-context", "hover", "indeterminate", "in-range", "invalid", "is", "lang", "last-child", "last-of-type", "left", "link", "local-link", "not", "nth-child", "nth-col", "nth-last-child", "nth-last-col", "nth-last-of-type", "nth-of-type", "only-child", "only-of-type", "optional", "out-of-range", "past", "placeholder-shown", "read-only", "read-write", "required", "right", "root", "scope", "target", "target-within", "user-invalid", "valid", "visited", "where"],
      o = ["after", "backdrop", "before", "cue", "cue-region", "first-letter", "first-line", "grammar-error", "marker", "part", "placeholder", "selection", "slotted", "spelling-error"],
      n = ["align-content", "align-items", "align-self", "animation", "animation-delay", "animation-direction", "animation-duration", "animation-fill-mode", "animation-iteration-count", "animation-name", "animation-play-state", "animation-timing-function", "auto", "backface-visibility", "background", "background-attachment", "background-clip", "background-color", "background-image", "background-origin", "background-position", "background-repeat", "background-size", "border", "border-bottom", "border-bottom-color", "border-bottom-left-radius", "border-bottom-right-radius", "border-bottom-style", "border-bottom-width", "border-collapse", "border-color", "border-image", "border-image-outset", "border-image-repeat", "border-image-slice", "border-image-source", "border-image-width", "border-left", "border-left-color", "border-left-style", "border-left-width", "border-radius", "border-right", "border-right-color", "border-right-style", "border-right-width", "border-spacing", "border-style", "border-top", "border-top-color", "border-top-left-radius", "border-top-right-radius", "border-top-style", "border-top-width", "border-width", "bottom", "box-decoration-break", "box-shadow", "box-sizing", "break-after", "break-before", "break-inside", "caption-side", "clear", "clip", "clip-path", "color", "column-count", "column-fill", "column-gap", "column-rule", "column-rule-color", "column-rule-style", "column-rule-width", "column-span", "column-width", "columns", "content", "counter-increment", "counter-reset", "cursor", "direction", "display", "empty-cells", "filter", "flex", "flex-basis", "flex-direction", "flex-flow", "flex-grow", "flex-shrink", "flex-wrap", "float", "font", "font-display", "font-family", "font-feature-settings", "font-kerning", "font-language-override", "font-size", "font-size-adjust", "font-stretch", "font-style", "font-variant", "font-variant-ligatures", "font-variation-settings", "font-weight", "height", "hyphens", "icon", "image-orientation", "image-rendering", "image-resolution", "ime-mode", "inherit", "initial", "justify-content", "left", "letter-spacing", "line-height", "list-style", "list-style-image", "list-style-position", "list-style-type", "margin", "margin-bottom", "margin-left", "margin-right", "margin-top", "marks", "mask", "max-height", "max-width", "min-height", "min-width", "nav-down", "nav-index", "nav-left", "nav-right", "nav-up", "none", "normal", "object-fit", "object-position", "opacity", "order", "orphans", "outline", "outline-color", "outline-offset", "outline-style", "outline-width", "overflow", "overflow-wrap", "overflow-x", "overflow-y", "padding", "padding-bottom", "padding-left", "padding-right", "padding-top", "page-break-after", "page-break-before", "page-break-inside", "perspective", "perspective-origin", "pointer-events", "position", "quotes", "resize", "right", "src", "tab-size", "table-layout", "text-align", "text-align-last", "text-decoration", "text-decoration-color", "text-decoration-line", "text-decoration-style", "text-indent", "text-overflow", "text-rendering", "text-shadow", "text-transform", "text-underline-position", "top", "transform", "transform-origin", "transform-style", "transition", "transition-delay", "transition-duration", "transition-property", "transition-timing-function", "unicode-bidi", "vertical-align", "visibility", "white-space", "widows", "width", "word-break", "word-spacing", "word-wrap", "z-index"].reverse(),
      r = i.concat(o);
  return function (a) {
    var s = function (e) {
      return {
        IMPORTANT: {
          className: "meta",
          begin: "!important"
        },
        HEXCOLOR: {
          className: "number",
          begin: "#([a-fA-F0-9]{6}|[a-fA-F0-9]{3})"
        },
        ATTRIBUTE_SELECTOR_MODE: {
          className: "selector-attr",
          begin: /\[/,
          end: /\]/,
          illegal: "$",
          contains: [e.APOS_STRING_MODE, e.QUOTE_STRING_MODE]
        }
      };
    }(a),
        l = r,
        d = "([\\w-]+|@\\{[\\w-]+\\})",
        c = [],
        g = [],
        b = function b(e) {
      return {
        className: "string",
        begin: "~?" + e + ".*?" + e
      };
    },
        m = function m(e, t, i) {
      return {
        className: e,
        begin: t,
        relevance: i
      };
    },
        u = {
      $pattern: /[a-z-]+/,
      keyword: "and or not only",
      attribute: t.join(" ")
    },
        p = {
      begin: "\\(",
      end: "\\)",
      contains: g,
      keywords: u,
      relevance: 0
    };

    g.push(a.C_LINE_COMMENT_MODE, a.C_BLOCK_COMMENT_MODE, b("'"), b('"'), a.CSS_NUMBER_MODE, {
      begin: "(url|data-uri)\\(",
      starts: {
        className: "string",
        end: "[\\)\\n]",
        excludeEnd: !0
      }
    }, s.HEXCOLOR, p, m("variable", "@@?[\\w-]+", 10), m("variable", "@\\{[\\w-]+\\}"), m("built_in", "~?`[^`]*?`"), {
      className: "attribute",
      begin: "[\\w-]+\\s*:",
      end: ":",
      returnBegin: !0,
      excludeEnd: !0
    }, s.IMPORTANT);
    var f = g.concat({
      begin: /\{/,
      end: /\}/,
      contains: c
    }),
        h = {
      beginKeywords: "when",
      endsWithParent: !0,
      contains: [{
        beginKeywords: "and not"
      }].concat(g)
    },
        w = {
      begin: d + "\\s*:",
      returnBegin: !0,
      end: /[;}]/,
      relevance: 0,
      contains: [{
        begin: /-(webkit|moz|ms|o)-/
      }, {
        className: "attribute",
        begin: "\\b(" + n.join("|") + ")\\b",
        end: /(?=:)/,
        starts: {
          endsWithParent: !0,
          illegal: "[<=$]",
          relevance: 0,
          contains: g
        }
      }]
    },
        v = {
      className: "keyword",
      begin: "@(import|media|charset|font-face|(-[a-z]+-)?keyframes|supports|document|namespace|page|viewport|host)\\b",
      starts: {
        end: "[;{}]",
        keywords: u,
        returnEnd: !0,
        contains: g,
        relevance: 0
      }
    },
        y = {
      className: "variable",
      variants: [{
        begin: "@[\\w-]+\\s*:",
        relevance: 15
      }, {
        begin: "@[\\w-]+"
      }],
      starts: {
        end: "[;}]",
        returnEnd: !0,
        contains: f
      }
    },
        k = {
      variants: [{
        begin: "[\\.#:&\\[>]",
        end: "[;{}]"
      }, {
        begin: d,
        end: /\{/
      }],
      returnBegin: !0,
      returnEnd: !0,
      illegal: "[<='$\"]",
      relevance: 0,
      contains: [a.C_LINE_COMMENT_MODE, a.C_BLOCK_COMMENT_MODE, h, m("keyword", "all\\b"), m("variable", "@\\{[\\w-]+\\}"), {
        begin: "\\b(" + e.join("|") + ")\\b",
        className: "selector-tag"
      }, m("selector-tag", d + "%?", 0), m("selector-id", "#" + d), m("selector-class", "\\." + d, 0), m("selector-tag", "&", 0), s.ATTRIBUTE_SELECTOR_MODE, {
        className: "selector-pseudo",
        begin: ":(" + i.join("|") + ")"
      }, {
        className: "selector-pseudo",
        begin: "::(" + o.join("|") + ")"
      }, {
        begin: "\\(",
        end: "\\)",
        contains: f
      }, {
        begin: "!important"
      }]
    },
        E = {
      begin: "[\\w-]+:(:)?(".concat(l.join("|"), ")"),
      returnBegin: !0,
      contains: [k]
    };
    return c.push(a.C_LINE_COMMENT_MODE, a.C_BLOCK_COMMENT_MODE, v, y, E, w, k), {
      name: "Less",
      case_insensitive: !0,
      illegal: "[=>'/<($\"]",
      contains: c
    };
  };
}());
hljs.registerLanguage("lua", function () {
  "use strict";

  return function (e) {
    var t = "\\[=*\\[",
        a = "\\]=*\\]",
        n = {
      begin: t,
      end: a,
      contains: ["self"]
    },
        o = [e.COMMENT("--(?!\\[=*\\[)", "$"), e.COMMENT("--\\[=*\\[", a, {
      contains: [n],
      relevance: 10
    })];
    return {
      name: "Lua",
      keywords: {
        $pattern: e.UNDERSCORE_IDENT_RE,
        literal: "true false nil",
        keyword: "and break do else elseif end for goto if in local not or repeat return then until while",
        built_in: "_G _ENV _VERSION __index __newindex __mode __call __metatable __tostring __len __gc __add __sub __mul __div __mod __pow __concat __unm __eq __lt __le assert collectgarbage dofile error getfenv getmetatable ipairs load loadfile loadstring module next pairs pcall print rawequal rawget rawset require select setfenv setmetatable tonumber tostring type unpack xpcall arg self coroutine resume yield status wrap create running debug getupvalue debug sethook getmetatable gethook setmetatable setlocal traceback setfenv getinfo setupvalue getlocal getregistry getfenv io lines write close flush open output type read stderr stdin input stdout popen tmpfile math log max acos huge ldexp pi cos tanh pow deg tan cosh sinh random randomseed frexp ceil floor rad abs sqrt modf asin min mod fmod log10 atan2 exp sin atan os exit setlocale date getenv difftime remove time clock tmpname rename execute package preload loadlib loaded loaders cpath config path seeall string sub upper len gfind rep find match char dump gmatch reverse byte format gsub lower table setn insert getn foreachi maxn foreach concat sort remove"
      },
      contains: o.concat([{
        className: "function",
        beginKeywords: "function",
        end: "\\)",
        contains: [e.inherit(e.TITLE_MODE, {
          begin: "([_a-zA-Z]\\w*\\.)*([_a-zA-Z]\\w*:)?[_a-zA-Z]\\w*"
        }), {
          className: "params",
          begin: "\\(",
          endsWithParent: !0,
          contains: o
        }].concat(o)
      }, e.C_NUMBER_MODE, e.APOS_STRING_MODE, e.QUOTE_STRING_MODE, {
        className: "string",
        begin: t,
        end: a,
        contains: [n],
        relevance: 5
      }])
    };
  };
}());
hljs.registerLanguage("makefile", function () {
  "use strict";

  return function (e) {
    var i = {
      className: "variable",
      variants: [{
        begin: "\\$\\(" + e.UNDERSCORE_IDENT_RE + "\\)",
        contains: [e.BACKSLASH_ESCAPE]
      }, {
        begin: /\$[@%<?\^\+\*]/
      }]
    },
        a = {
      className: "string",
      begin: /"/,
      end: /"/,
      contains: [e.BACKSLASH_ESCAPE, i]
    },
        n = {
      className: "variable",
      begin: /\$\([\w-]+\s/,
      end: /\)/,
      keywords: {
        built_in: "subst patsubst strip findstring filter filter-out sort word wordlist firstword lastword dir notdir suffix basename addsuffix addprefix join wildcard realpath abspath error warning shell origin flavor foreach if or and call eval file value"
      },
      contains: [i]
    },
        s = {
      begin: "^" + e.UNDERSCORE_IDENT_RE + "\\s*(?=[:+?]?=)"
    },
        r = {
      className: "section",
      begin: /^[^\s]+:/,
      end: /$/,
      contains: [i]
    };
    return {
      name: "Makefile",
      aliases: ["mk", "mak", "make"],
      keywords: {
        $pattern: /[\w-]+/,
        keyword: "define endef undefine ifdef ifndef ifeq ifneq else endif include -include sinclude override export unexport private vpath"
      },
      contains: [e.HASH_COMMENT_MODE, i, a, n, s, {
        className: "meta",
        begin: /^\.PHONY:/,
        end: /$/,
        keywords: {
          $pattern: /[\.\w]+/,
          "meta-keyword": ".PHONY"
        }
      }, r]
    };
  };
}());
hljs.registerLanguage("xml", function () {
  "use strict";

  function e(e) {
    return e ? "string" == typeof e ? e : e.source : null;
  }

  function n(e) {
    return a("(?=", e, ")");
  }

  function a() {
    for (var _len12 = arguments.length, n = new Array(_len12), _key12 = 0; _key12 < _len12; _key12++) {
      n[_key12] = arguments[_key12];
    }

    return n.map(function (n) {
      return e(n);
    }).join("");
  }

  function s() {
    for (var _len13 = arguments.length, n = new Array(_len13), _key13 = 0; _key13 < _len13; _key13++) {
      n[_key13] = arguments[_key13];
    }

    return "(" + n.map(function (n) {
      return e(n);
    }).join("|") + ")";
  }

  return function (e) {
    var t = a(/[A-Z_]/, a("(", /[A-Z0-9_.-]*:/, ")?"), /[A-Z0-9_.-]*/),
        i = {
      className: "symbol",
      begin: /&[a-z]+;|&#[0-9]+;|&#x[a-f0-9]+;/
    },
        r = {
      begin: /\s/,
      contains: [{
        className: "meta-keyword",
        begin: /#?[a-z_][a-z1-9_-]+/,
        illegal: /\n/
      }]
    },
        c = e.inherit(r, {
      begin: /\(/,
      end: /\)/
    }),
        l = e.inherit(e.APOS_STRING_MODE, {
      className: "meta-string"
    }),
        g = e.inherit(e.QUOTE_STRING_MODE, {
      className: "meta-string"
    }),
        m = {
      endsWithParent: !0,
      illegal: /</,
      relevance: 0,
      contains: [{
        className: "attr",
        begin: /[A-Za-z0-9._:-]+/,
        relevance: 0
      }, {
        begin: /=\s*/,
        relevance: 0,
        contains: [{
          className: "string",
          endsParent: !0,
          variants: [{
            begin: /"/,
            end: /"/,
            contains: [i]
          }, {
            begin: /'/,
            end: /'/,
            contains: [i]
          }, {
            begin: /[^\s"'=<>`]+/
          }]
        }]
      }]
    };
    return {
      name: "HTML, XML",
      aliases: ["html", "xhtml", "rss", "atom", "xjb", "xsd", "xsl", "plist", "wsf", "svg"],
      case_insensitive: !0,
      contains: [{
        className: "meta",
        begin: /<![a-z]/,
        end: />/,
        relevance: 10,
        contains: [r, g, l, c, {
          begin: /\[/,
          end: /\]/,
          contains: [{
            className: "meta",
            begin: /<![a-z]/,
            end: />/,
            contains: [r, c, g, l]
          }]
        }]
      }, e.COMMENT(/<!--/, /-->/, {
        relevance: 10
      }), {
        begin: /<!\[CDATA\[/,
        end: /\]\]>/,
        relevance: 10
      }, i, {
        className: "meta",
        begin: /<\?xml/,
        end: /\?>/,
        relevance: 10
      }, {
        className: "tag",
        begin: /<style(?=\s|>)/,
        end: />/,
        keywords: {
          name: "style"
        },
        contains: [m],
        starts: {
          end: /<\/style>/,
          returnEnd: !0,
          subLanguage: ["css", "xml"]
        }
      }, {
        className: "tag",
        begin: /<script(?=\s|>)/,
        end: />/,
        keywords: {
          name: "script"
        },
        contains: [m],
        starts: {
          end: /<\/script>/,
          returnEnd: !0,
          subLanguage: ["javascript", "handlebars", "xml"]
        }
      }, {
        className: "tag",
        begin: /<>|<\/>/
      }, {
        className: "tag",
        begin: a(/</, n(a(t, s(/\/>/, />/, /\s/)))),
        end: /\/?>/,
        contains: [{
          className: "name",
          begin: t,
          relevance: 0,
          starts: m
        }]
      }, {
        className: "tag",
        begin: a(/<\//, n(a(t, />/))),
        contains: [{
          className: "name",
          begin: t,
          relevance: 0
        }, {
          begin: />/,
          relevance: 0
        }]
      }]
    };
  };
}());
hljs.registerLanguage("markdown", function () {
  "use strict";

  function n() {
    for (var _len14 = arguments.length, n = new Array(_len14), _key14 = 0; _key14 < _len14; _key14++) {
      n[_key14] = arguments[_key14];
    }

    return n.map(function (n) {
      return (e = n) ? "string" == typeof e ? e : e.source : null;
      var e;
    }).join("");
  }

  return function (e) {
    var a = {
      begin: /<\/?[A-Za-z_]/,
      end: ">",
      subLanguage: "xml",
      relevance: 0
    },
        i = {
      variants: [{
        begin: /\[.+?\]\[.*?\]/,
        relevance: 0
      }, {
        begin: /\[.+?\]\(((data|javascript|mailto):|(?:http|ftp)s?:\/\/).*?\)/,
        relevance: 2
      }, {
        begin: n(/\[.+?\]\(/, /[A-Za-z][A-Za-z0-9+.-]*/, /:\/\/.*?\)/),
        relevance: 2
      }, {
        begin: /\[.+?\]\([./?&#].*?\)/,
        relevance: 1
      }, {
        begin: /\[.+?\]\(.*?\)/,
        relevance: 0
      }],
      returnBegin: !0,
      contains: [{
        className: "string",
        relevance: 0,
        begin: "\\[",
        end: "\\]",
        excludeBegin: !0,
        returnEnd: !0
      }, {
        className: "link",
        relevance: 0,
        begin: "\\]\\(",
        end: "\\)",
        excludeBegin: !0,
        excludeEnd: !0
      }, {
        className: "symbol",
        relevance: 0,
        begin: "\\]\\[",
        end: "\\]",
        excludeBegin: !0,
        excludeEnd: !0
      }]
    },
        s = {
      className: "strong",
      contains: [],
      variants: [{
        begin: /_{2}/,
        end: /_{2}/
      }, {
        begin: /\*{2}/,
        end: /\*{2}/
      }]
    },
        c = {
      className: "emphasis",
      contains: [],
      variants: [{
        begin: /\*(?!\*)/,
        end: /\*/
      }, {
        begin: /_(?!_)/,
        end: /_/,
        relevance: 0
      }]
    };
    s.contains.push(c), c.contains.push(s);
    var t = [a, i];
    return s.contains = s.contains.concat(t), c.contains = c.contains.concat(t), t = t.concat(s, c), {
      name: "Markdown",
      aliases: ["md", "mkdown", "mkd"],
      contains: [{
        className: "section",
        variants: [{
          begin: "^#{1,6}",
          end: "$",
          contains: t
        }, {
          begin: "(?=^.+?\\n[=-]{2,}$)",
          contains: [{
            begin: "^[=-]*$"
          }, {
            begin: "^",
            end: "\\n",
            contains: t
          }]
        }]
      }, a, {
        className: "bullet",
        begin: "^[ \t]*([*+-]|(\\d+\\.))(?=\\s+)",
        end: "\\s+",
        excludeEnd: !0
      }, s, c, {
        className: "quote",
        begin: "^>\\s+",
        contains: t,
        end: "$"
      }, {
        className: "code",
        variants: [{
          begin: "(`{3,})[^`](.|\\n)*?\\1`*[ ]*"
        }, {
          begin: "(~{3,})[^~](.|\\n)*?\\1~*[ ]*"
        }, {
          begin: "```",
          end: "```+[ ]*$"
        }, {
          begin: "~~~",
          end: "~~~+[ ]*$"
        }, {
          begin: "`.+?`"
        }, {
          begin: "(?=^( {4}|\\t))",
          contains: [{
            begin: "^( {4}|\\t)",
            end: "(\\n)$"
          }],
          relevance: 0
        }]
      }, {
        begin: "^[-\\*]{3,}",
        end: "$"
      }, i, {
        begin: /^\[[^\n]+\]:/,
        returnBegin: !0,
        contains: [{
          className: "symbol",
          begin: /\[/,
          end: /\]/,
          excludeBegin: !0,
          excludeEnd: !0
        }, {
          className: "link",
          begin: /:\s*/,
          end: /$/,
          excludeBegin: !0
        }]
      }]
    };
  };
}());
hljs.registerLanguage("nginx", function () {
  "use strict";

  return function (e) {
    var n = {
      className: "variable",
      variants: [{
        begin: /\$\d+/
      }, {
        begin: /\$\{/,
        end: /\}/
      }, {
        begin: /[$@]/ + e.UNDERSCORE_IDENT_RE
      }]
    },
        a = {
      endsWithParent: !0,
      keywords: {
        $pattern: "[a-z/_]+",
        literal: "on off yes no true false none blocked debug info notice warn error crit select break last permanent redirect kqueue rtsig epoll poll /dev/poll"
      },
      relevance: 0,
      illegal: "=>",
      contains: [e.HASH_COMMENT_MODE, {
        className: "string",
        contains: [e.BACKSLASH_ESCAPE, n],
        variants: [{
          begin: /"/,
          end: /"/
        }, {
          begin: /'/,
          end: /'/
        }]
      }, {
        begin: "([a-z]+):/",
        end: "\\s",
        endsWithParent: !0,
        excludeEnd: !0,
        contains: [n]
      }, {
        className: "regexp",
        contains: [e.BACKSLASH_ESCAPE, n],
        variants: [{
          begin: "\\s\\^",
          end: "\\s|\\{|;",
          returnEnd: !0
        }, {
          begin: "~\\*?\\s+",
          end: "\\s|\\{|;",
          returnEnd: !0
        }, {
          begin: "\\*(\\.[a-z\\-]+)+"
        }, {
          begin: "([a-z\\-]+\\.)+\\*"
        }]
      }, {
        className: "number",
        begin: "\\b\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}(:\\d{1,5})?\\b"
      }, {
        className: "number",
        begin: "\\b\\d+[kKmMgGdshdwy]*\\b",
        relevance: 0
      }, n]
    };
    return {
      name: "Nginx config",
      aliases: ["nginxconf"],
      contains: [e.HASH_COMMENT_MODE, {
        begin: e.UNDERSCORE_IDENT_RE + "\\s+\\{",
        returnBegin: !0,
        end: /\{/,
        contains: [{
          className: "section",
          begin: e.UNDERSCORE_IDENT_RE
        }],
        relevance: 0
      }, {
        begin: e.UNDERSCORE_IDENT_RE + "\\s",
        end: ";|\\{",
        returnBegin: !0,
        contains: [{
          className: "attribute",
          begin: e.UNDERSCORE_IDENT_RE,
          starts: a
        }],
        relevance: 0
      }],
      illegal: "[^\\s\\}]"
    };
  };
}());
hljs.registerLanguage("objectivec", function () {
  "use strict";

  return function (e) {
    var n = /[a-zA-Z@][a-zA-Z0-9_]*/,
        _ = {
      $pattern: n,
      keyword: "@interface @class @protocol @implementation"
    };
    return {
      name: "Objective-C",
      aliases: ["mm", "objc", "obj-c", "obj-c++", "objective-c++"],
      keywords: {
        $pattern: n,
        keyword: "int float while char export sizeof typedef const struct for union unsigned long volatile static bool mutable if do return goto void enum else break extern asm case short default double register explicit signed typename this switch continue wchar_t inline readonly assign readwrite self @synchronized id typeof nonatomic super unichar IBOutlet IBAction strong weak copy in out inout bycopy byref oneway __strong __weak __block __autoreleasing @private @protected @public @try @property @end @throw @catch @finally @autoreleasepool @synthesize @dynamic @selector @optional @required @encode @package @import @defs @compatibility_alias __bridge __bridge_transfer __bridge_retained __bridge_retain __covariant __contravariant __kindof _Nonnull _Nullable _Null_unspecified __FUNCTION__ __PRETTY_FUNCTION__ __attribute__ getter setter retain unsafe_unretained nonnull nullable null_unspecified null_resettable class instancetype NS_DESIGNATED_INITIALIZER NS_UNAVAILABLE NS_REQUIRES_SUPER NS_RETURNS_INNER_POINTER NS_INLINE NS_AVAILABLE NS_DEPRECATED NS_ENUM NS_OPTIONS NS_SWIFT_UNAVAILABLE NS_ASSUME_NONNULL_BEGIN NS_ASSUME_NONNULL_END NS_REFINED_FOR_SWIFT NS_SWIFT_NAME NS_SWIFT_NOTHROW NS_DURING NS_HANDLER NS_ENDHANDLER NS_VALUERETURN NS_VOIDRETURN",
        literal: "false true FALSE TRUE nil YES NO NULL",
        built_in: "BOOL dispatch_once_t dispatch_queue_t dispatch_sync dispatch_async dispatch_once"
      },
      illegal: "</",
      contains: [{
        className: "built_in",
        begin: "\\b(AV|CA|CF|CG|CI|CL|CM|CN|CT|MK|MP|MTK|MTL|NS|SCN|SK|UI|WK|XC)\\w+"
      }, e.C_LINE_COMMENT_MODE, e.C_BLOCK_COMMENT_MODE, e.C_NUMBER_MODE, e.QUOTE_STRING_MODE, e.APOS_STRING_MODE, {
        className: "string",
        variants: [{
          begin: '@"',
          end: '"',
          illegal: "\\n",
          contains: [e.BACKSLASH_ESCAPE]
        }]
      }, {
        className: "meta",
        begin: /#\s*[a-z]+\b/,
        end: /$/,
        keywords: {
          "meta-keyword": "if else elif endif define undef warning error line pragma ifdef ifndef include"
        },
        contains: [{
          begin: /\\\n/,
          relevance: 0
        }, e.inherit(e.QUOTE_STRING_MODE, {
          className: "meta-string"
        }), {
          className: "meta-string",
          begin: /<.*?>/,
          end: /$/,
          illegal: "\\n"
        }, e.C_LINE_COMMENT_MODE, e.C_BLOCK_COMMENT_MODE]
      }, {
        className: "class",
        begin: "(" + _.keyword.split(" ").join("|") + ")\\b",
        end: /(\{|$)/,
        excludeEnd: !0,
        keywords: _,
        contains: [e.UNDERSCORE_TITLE_MODE]
      }, {
        begin: "\\." + e.UNDERSCORE_IDENT_RE,
        relevance: 0
      }]
    };
  };
}());
hljs.registerLanguage("perl", function () {
  "use strict";

  function e(e) {
    return e ? "string" == typeof e ? e : e.source : null;
  }

  function n() {
    for (var _len15 = arguments.length, n = new Array(_len15), _key15 = 0; _key15 < _len15; _key15++) {
      n[_key15] = arguments[_key15];
    }

    return n.map(function (n) {
      return e(n);
    }).join("");
  }

  function t() {
    for (var _len16 = arguments.length, n = new Array(_len16), _key16 = 0; _key16 < _len16; _key16++) {
      n[_key16] = arguments[_key16];
    }

    return "(" + n.map(function (n) {
      return e(n);
    }).join("|") + ")";
  }

  return function (e) {
    var r = /[dualxmsipngr]{0,12}/,
        s = {
      $pattern: /[\w.]+/,
      keyword: "abs accept alarm and atan2 bind binmode bless break caller chdir chmod chomp chop chown chr chroot close closedir connect continue cos crypt dbmclose dbmopen defined delete die do dump each else elsif endgrent endhostent endnetent endprotoent endpwent endservent eof eval exec exists exit exp fcntl fileno flock for foreach fork format formline getc getgrent getgrgid getgrnam gethostbyaddr gethostbyname gethostent getlogin getnetbyaddr getnetbyname getnetent getpeername getpgrp getpriority getprotobyname getprotobynumber getprotoent getpwent getpwnam getpwuid getservbyname getservbyport getservent getsockname getsockopt given glob gmtime goto grep gt hex if index int ioctl join keys kill last lc lcfirst length link listen local localtime log lstat lt ma map mkdir msgctl msgget msgrcv msgsnd my ne next no not oct open opendir or ord our pack package pipe pop pos print printf prototype push q|0 qq quotemeta qw qx rand read readdir readline readlink readpipe recv redo ref rename require reset return reverse rewinddir rindex rmdir say scalar seek seekdir select semctl semget semop send setgrent sethostent setnetent setpgrp setpriority setprotoent setpwent setservent setsockopt shift shmctl shmget shmread shmwrite shutdown sin sleep socket socketpair sort splice split sprintf sqrt srand stat state study sub substr symlink syscall sysopen sysread sysseek system syswrite tell telldir tie tied time times tr truncate uc ucfirst umask undef unless unlink unpack unshift untie until use utime values vec wait waitpid wantarray warn when while write x|0 xor y|0"
    },
        i = {
      className: "subst",
      begin: "[$@]\\{",
      end: "\\}",
      keywords: s
    },
        a = {
      begin: /->\{/,
      end: /\}/
    },
        o = {
      variants: [{
        begin: /\$\d/
      }, {
        begin: n(/[$%@](\^\w\b|#\w+(::\w+)*|\{\w+\}|\w+(::\w*)*)/, "(?![A-Za-z])(?![@$%])")
      }, {
        begin: /[$%@][^\s\w{]/,
        relevance: 0
      }]
    },
        c = [e.BACKSLASH_ESCAPE, i, o],
        g = [/!/, /\//, /\|/, /\?/, /'/, /"/, /#/],
        l = function l(e, t) {
      var s = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : "\\1";
      var i = "\\1" === s ? s : n(s, t);
      return n(n("(?:", e, ")"), t, /(?:\\.|[^\\\/])*?/, i, /(?:\\.|[^\\\/])*?/, s, r);
    },
        d = function d(e, t, s) {
      return n(n("(?:", e, ")"), t, /(?:\\.|[^\\\/])*?/, s, r);
    },
        p = [o, e.HASH_COMMENT_MODE, e.COMMENT(/^=\w/, /=cut/, {
      endsWithParent: !0
    }), a, {
      className: "string",
      contains: c,
      variants: [{
        begin: "q[qwxr]?\\s*\\(",
        end: "\\)",
        relevance: 5
      }, {
        begin: "q[qwxr]?\\s*\\[",
        end: "\\]",
        relevance: 5
      }, {
        begin: "q[qwxr]?\\s*\\{",
        end: "\\}",
        relevance: 5
      }, {
        begin: "q[qwxr]?\\s*\\|",
        end: "\\|",
        relevance: 5
      }, {
        begin: "q[qwxr]?\\s*<",
        end: ">",
        relevance: 5
      }, {
        begin: "qw\\s+q",
        end: "q",
        relevance: 5
      }, {
        begin: "'",
        end: "'",
        contains: [e.BACKSLASH_ESCAPE]
      }, {
        begin: '"',
        end: '"'
      }, {
        begin: "`",
        end: "`",
        contains: [e.BACKSLASH_ESCAPE]
      }, {
        begin: /\{\w+\}/,
        relevance: 0
      }, {
        begin: "-?\\w+\\s*=>",
        relevance: 0
      }]
    }, {
      className: "number",
      begin: "(\\b0[0-7_]+)|(\\b0x[0-9a-fA-F_]+)|(\\b[1-9][0-9_]*(\\.[0-9_]+)?)|[0_]\\b",
      relevance: 0
    }, {
      begin: "(\\/\\/|" + e.RE_STARTERS_RE + "|\\b(split|return|print|reverse|grep)\\b)\\s*",
      keywords: "split return print reverse grep",
      relevance: 0,
      contains: [e.HASH_COMMENT_MODE, {
        className: "regexp",
        variants: [{
          begin: l("s|tr|y", t.apply(void 0, g))
        }, {
          begin: l("s|tr|y", "\\(", "\\)")
        }, {
          begin: l("s|tr|y", "\\[", "\\]")
        }, {
          begin: l("s|tr|y", "\\{", "\\}")
        }],
        relevance: 2
      }, {
        className: "regexp",
        variants: [{
          begin: /(m|qr)\/\//,
          relevance: 0
        }, {
          begin: d("(?:m|qr)?", /\//, /\//)
        }, {
          begin: d("m|qr", t.apply(void 0, g), /\1/)
        }, {
          begin: d("m|qr", /\(/, /\)/)
        }, {
          begin: d("m|qr", /\[/, /\]/)
        }, {
          begin: d("m|qr", /\{/, /\}/)
        }]
      }]
    }, {
      className: "function",
      beginKeywords: "sub",
      end: "(\\s*\\(.*?\\))?[;{]",
      excludeEnd: !0,
      relevance: 5,
      contains: [e.TITLE_MODE]
    }, {
      begin: "-\\w\\b",
      relevance: 0
    }, {
      begin: "^__DATA__$",
      end: "^__END__$",
      subLanguage: "mojolicious",
      contains: [{
        begin: "^@@.*",
        end: "$",
        className: "comment"
      }]
    }];

    return i.contains = p, a.contains = p, {
      name: "Perl",
      aliases: ["pl", "pm"],
      keywords: s,
      contains: p
    };
  };
}());
hljs.registerLanguage("php", function () {
  "use strict";

  return function (e) {
    var r = {
      className: "variable",
      begin: "\\$+[a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*(?![A-Za-z0-9])(?![$])"
    },
        t = {
      className: "meta",
      variants: [{
        begin: /<\?php/,
        relevance: 10
      }, {
        begin: /<\?[=]?/
      }, {
        begin: /\?>/
      }]
    },
        a = {
      className: "subst",
      variants: [{
        begin: /\$\w+/
      }, {
        begin: /\{\$/,
        end: /\}/
      }]
    },
        n = e.inherit(e.APOS_STRING_MODE, {
      illegal: null
    }),
        i = e.inherit(e.QUOTE_STRING_MODE, {
      illegal: null,
      contains: e.QUOTE_STRING_MODE.contains.concat(a)
    }),
        o = e.END_SAME_AS_BEGIN({
      begin: /<<<[ \t]*(\w+)\n/,
      end: /[ \t]*(\w+)\b/,
      contains: e.QUOTE_STRING_MODE.contains.concat(a)
    }),
        l = {
      className: "string",
      contains: [e.BACKSLASH_ESCAPE, t],
      variants: [e.inherit(n, {
        begin: "b'",
        end: "'"
      }), e.inherit(i, {
        begin: 'b"',
        end: '"'
      }), i, n, o]
    },
        c = {
      variants: [e.BINARY_NUMBER_MODE, e.C_NUMBER_MODE]
    },
        s = {
      keyword: "__CLASS__ __DIR__ __FILE__ __FUNCTION__ __LINE__ __METHOD__ __NAMESPACE__ __TRAIT__ die echo exit include include_once print require require_once array abstract and as binary bool boolean break callable case catch class clone const continue declare default do double else elseif empty enddeclare endfor endforeach endif endswitch endwhile eval extends final finally float for foreach from global goto if implements instanceof insteadof int integer interface isset iterable list match|0 new object or private protected public real return string switch throw trait try unset use var void while xor yield",
      literal: "false null true",
      built_in: "Error|0 AppendIterator ArgumentCountError ArithmeticError ArrayIterator ArrayObject AssertionError BadFunctionCallException BadMethodCallException CachingIterator CallbackFilterIterator CompileError Countable DirectoryIterator DivisionByZeroError DomainException EmptyIterator ErrorException Exception FilesystemIterator FilterIterator GlobIterator InfiniteIterator InvalidArgumentException IteratorIterator LengthException LimitIterator LogicException MultipleIterator NoRewindIterator OutOfBoundsException OutOfRangeException OuterIterator OverflowException ParentIterator ParseError RangeException RecursiveArrayIterator RecursiveCachingIterator RecursiveCallbackFilterIterator RecursiveDirectoryIterator RecursiveFilterIterator RecursiveIterator RecursiveIteratorIterator RecursiveRegexIterator RecursiveTreeIterator RegexIterator RuntimeException SeekableIterator SplDoublyLinkedList SplFileInfo SplFileObject SplFixedArray SplHeap SplMaxHeap SplMinHeap SplObjectStorage SplObserver SplObserver SplPriorityQueue SplQueue SplStack SplSubject SplSubject SplTempFileObject TypeError UnderflowException UnexpectedValueException ArrayAccess Closure Generator Iterator IteratorAggregate Serializable Throwable Traversable WeakReference Directory __PHP_Incomplete_Class parent php_user_filter self static stdClass"
    };
    return {
      aliases: ["php", "php3", "php4", "php5", "php6", "php7", "php8"],
      case_insensitive: !0,
      keywords: s,
      contains: [e.HASH_COMMENT_MODE, e.COMMENT("//", "$", {
        contains: [t]
      }), e.COMMENT("/\\*", "\\*/", {
        contains: [{
          className: "doctag",
          begin: "@[A-Za-z]+"
        }]
      }), e.COMMENT("__halt_compiler.+?;", !1, {
        endsWithParent: !0,
        keywords: "__halt_compiler"
      }), t, {
        className: "keyword",
        begin: /\$this\b/
      }, r, {
        begin: /(::|->)+[a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*/
      }, {
        className: "function",
        relevance: 0,
        beginKeywords: "fn function",
        end: /[;{]/,
        excludeEnd: !0,
        illegal: "[$%\\[]",
        contains: [e.UNDERSCORE_TITLE_MODE, {
          begin: "=>"
        }, {
          className: "params",
          begin: "\\(",
          end: "\\)",
          excludeBegin: !0,
          excludeEnd: !0,
          keywords: s,
          contains: ["self", r, e.C_BLOCK_COMMENT_MODE, l, c]
        }]
      }, {
        className: "class",
        beginKeywords: "class interface",
        relevance: 0,
        end: /\{/,
        excludeEnd: !0,
        illegal: /[:($"]/,
        contains: [{
          beginKeywords: "extends implements"
        }, e.UNDERSCORE_TITLE_MODE]
      }, {
        beginKeywords: "namespace",
        relevance: 0,
        end: ";",
        illegal: /[.']/,
        contains: [e.UNDERSCORE_TITLE_MODE]
      }, {
        beginKeywords: "use",
        relevance: 0,
        end: ";",
        contains: [e.UNDERSCORE_TITLE_MODE]
      }, l, c]
    };
  };
}());
hljs.registerLanguage("php-template", function () {
  "use strict";

  return function (n) {
    return {
      name: "PHP template",
      subLanguage: "xml",
      contains: [{
        begin: /<\?(php|=)?/,
        end: /\?>/,
        subLanguage: "php",
        contains: [{
          begin: "/\\*",
          end: "\\*/",
          skip: !0
        }, {
          begin: 'b"',
          end: '"',
          skip: !0
        }, {
          begin: "b'",
          end: "'",
          skip: !0
        }, n.inherit(n.APOS_STRING_MODE, {
          illegal: null,
          className: null,
          contains: null,
          skip: !0
        }), n.inherit(n.QUOTE_STRING_MODE, {
          illegal: null,
          className: null,
          contains: null,
          skip: !0
        })]
      }]
    };
  };
}());
hljs.registerLanguage("plaintext", function () {
  "use strict";

  return function (t) {
    return {
      name: "Plain text",
      aliases: ["text", "txt"],
      disableAutodetect: !0
    };
  };
}());
hljs.registerLanguage("properties", function () {
  "use strict";

  return function (e) {
    var n = "[ \\t\\f]*",
        a = n + "[:=]" + n,
        t = "(" + a + "|[ \\t\\f]+)",
        r = "([^\\\\\\W:= \\t\\f\\n]|\\\\.)+",
        s = "([^\\\\:= \\t\\f\\n]|\\\\.)+",
        i = {
      end: t,
      relevance: 0,
      starts: {
        className: "string",
        end: /$/,
        relevance: 0,
        contains: [{
          begin: "\\\\\\\\"
        }, {
          begin: "\\\\\\n"
        }]
      }
    };
    return {
      name: ".properties",
      case_insensitive: !0,
      illegal: /\S/,
      contains: [e.COMMENT("^\\s*[!#]", "$"), {
        returnBegin: !0,
        variants: [{
          begin: r + a,
          relevance: 1
        }, {
          begin: r + "[ \\t\\f]+",
          relevance: 0
        }],
        contains: [{
          className: "attr",
          begin: r,
          endsParent: !0,
          relevance: 0
        }],
        starts: i
      }, {
        begin: s + t,
        returnBegin: !0,
        relevance: 0,
        contains: [{
          className: "meta",
          begin: s,
          endsParent: !0,
          relevance: 0
        }],
        starts: i
      }, {
        className: "attr",
        relevance: 0,
        begin: s + n + "$"
      }]
    };
  };
}());
hljs.registerLanguage("python", function () {
  "use strict";

  return function (e) {
    var n = {
      keyword: ["and", "as", "assert", "async", "await", "break", "class", "continue", "def", "del", "elif", "else", "except", "finally", "for", "", "from", "global", "if", "import", "in", "is", "lambda", "nonlocal|10", "not", "or", "pass", "raise", "return", "try", "while", "with", "yield"],
      built_in: ["__import__", "abs", "all", "any", "ascii", "bin", "bool", "breakpoint", "bytearray", "bytes", "callable", "chr", "classmethod", "compile", "complex", "delattr", "dict", "dir", "divmod", "enumerate", "eval", "exec", "filter", "float", "format", "frozenset", "getattr", "globals", "hasattr", "hash", "help", "hex", "id", "input", "int", "isinstance", "issubclass", "iter", "len", "list", "locals", "map", "max", "memoryview", "min", "next", "object", "oct", "open", "ord", "pow", "print", "property", "range", "repr", "reversed", "round", "set", "setattr", "slice", "sorted", "staticmethod", "str", "sum", "super", "tuple", "type", "vars", "zip"],
      literal: ["__debug__", "Ellipsis", "False", "None", "NotImplemented", "True"]
    },
        a = {
      className: "meta",
      begin: /^(>>>|\.\.\.) /
    },
        s = {
      className: "subst",
      begin: /\{/,
      end: /\}/,
      keywords: n,
      illegal: /#/
    },
        i = {
      begin: /\{\{/,
      relevance: 0
    },
        r = {
      className: "string",
      contains: [e.BACKSLASH_ESCAPE],
      variants: [{
        begin: /([uU]|[bB]|[rR]|[bB][rR]|[rR][bB])?'''/,
        end: /'''/,
        contains: [e.BACKSLASH_ESCAPE, a],
        relevance: 10
      }, {
        begin: /([uU]|[bB]|[rR]|[bB][rR]|[rR][bB])?"""/,
        end: /"""/,
        contains: [e.BACKSLASH_ESCAPE, a],
        relevance: 10
      }, {
        begin: /([fF][rR]|[rR][fF]|[fF])'''/,
        end: /'''/,
        contains: [e.BACKSLASH_ESCAPE, a, i, s]
      }, {
        begin: /([fF][rR]|[rR][fF]|[fF])"""/,
        end: /"""/,
        contains: [e.BACKSLASH_ESCAPE, a, i, s]
      }, {
        begin: /([uU]|[rR])'/,
        end: /'/,
        relevance: 10
      }, {
        begin: /([uU]|[rR])"/,
        end: /"/,
        relevance: 10
      }, {
        begin: /([bB]|[bB][rR]|[rR][bB])'/,
        end: /'/
      }, {
        begin: /([bB]|[bB][rR]|[rR][bB])"/,
        end: /"/
      }, {
        begin: /([fF][rR]|[rR][fF]|[fF])'/,
        end: /'/,
        contains: [e.BACKSLASH_ESCAPE, i, s]
      }, {
        begin: /([fF][rR]|[rR][fF]|[fF])"/,
        end: /"/,
        contains: [e.BACKSLASH_ESCAPE, i, s]
      }, e.APOS_STRING_MODE, e.QUOTE_STRING_MODE]
    },
        t = "[0-9](_?[0-9])*",
        l = "(\\b(".concat(t, "))?\\.(").concat(t, ")|\\b(").concat(t, ")\\."),
        b = {
      className: "number",
      relevance: 0,
      variants: [{
        begin: "(\\b(".concat(t, ")|(").concat(l, "))[eE][+-]?(").concat(t, ")[jJ]?\\b")
      }, {
        begin: "(".concat(l, ")[jJ]?")
      }, {
        begin: "\\b([1-9](_?[0-9])*|0+(_?0)*)[lLjJ]?\\b"
      }, {
        begin: "\\b0[bB](_?[01])+[lL]?\\b"
      }, {
        begin: "\\b0[oO](_?[0-7])+[lL]?\\b"
      }, {
        begin: "\\b0[xX](_?[0-9a-fA-F])+[lL]?\\b"
      }, {
        begin: "\\b(".concat(t, ")[jJ]\\b")
      }]
    },
        o = {
      className: "params",
      variants: [{
        begin: /\(\s*\)/,
        skip: !0,
        className: null
      }, {
        begin: /\(/,
        end: /\)/,
        excludeBegin: !0,
        excludeEnd: !0,
        keywords: n,
        contains: ["self", a, b, r, e.HASH_COMMENT_MODE]
      }]
    };
    return s.contains = [r, b, a], {
      name: "Python",
      aliases: ["py", "gyp", "ipython"],
      keywords: n,
      illegal: /(<\/|->|\?)|=>/,
      contains: [a, b, {
        begin: /\bself\b/
      }, {
        beginKeywords: "if",
        relevance: 0
      }, r, e.HASH_COMMENT_MODE, {
        variants: [{
          className: "function",
          beginKeywords: "def"
        }, {
          className: "class",
          beginKeywords: "class"
        }],
        end: /:/,
        illegal: /[${=;\n,]/,
        contains: [e.UNDERSCORE_TITLE_MODE, o, {
          begin: /->/,
          endsWithParent: !0,
          keywords: "None"
        }]
      }, {
        className: "meta",
        begin: /^[\t ]*@/,
        end: /(?=#)|$/,
        contains: [b, o, r]
      }, {
        begin: /\b(print|exec)\(/
      }]
    };
  };
}());
hljs.registerLanguage("python-repl", function () {
  "use strict";

  return function (s) {
    return {
      aliases: ["pycon"],
      contains: [{
        className: "meta",
        starts: {
          end: / |$/,
          starts: {
            end: "$",
            subLanguage: "python"
          }
        },
        variants: [{
          begin: /^>>>(?=[ ]|$)/
        }, {
          begin: /^\.\.\.(?=[ ]|$)/
        }]
      }]
    };
  };
}());
hljs.registerLanguage("r", function () {
  "use strict";

  function e() {
    for (var _len17 = arguments.length, e = new Array(_len17), _key17 = 0; _key17 < _len17; _key17++) {
      e[_key17] = arguments[_key17];
    }

    return e.map(function (e) {
      return (a = e) ? "string" == typeof a ? a : a.source : null;
      var a;
    }).join("");
  }

  return function (a) {
    var n = /(?:(?:[a-zA-Z]|\.[._a-zA-Z])[._a-zA-Z0-9]*)|\.(?!\d)/;
    return {
      name: "R",
      illegal: /->/,
      keywords: {
        $pattern: n,
        keyword: "function if in break next repeat else for while",
        literal: "NULL NA TRUE FALSE Inf NaN NA_integer_|10 NA_real_|10 NA_character_|10 NA_complex_|10",
        built_in: "LETTERS letters month.abb month.name pi T F abs acos acosh all any anyNA Arg as.call as.character as.complex as.double as.environment as.integer as.logical as.null.default as.numeric as.raw asin asinh atan atanh attr attributes baseenv browser c call ceiling class Conj cos cosh cospi cummax cummin cumprod cumsum digamma dim dimnames emptyenv exp expression floor forceAndCall gamma gc.time globalenv Im interactive invisible is.array is.atomic is.call is.character is.complex is.double is.environment is.expression is.finite is.function is.infinite is.integer is.language is.list is.logical is.matrix is.na is.name is.nan is.null is.numeric is.object is.pairlist is.raw is.recursive is.single is.symbol lazyLoadDBfetch length lgamma list log max min missing Mod names nargs nzchar oldClass on.exit pos.to.env proc.time prod quote range Re rep retracemem return round seq_along seq_len seq.int sign signif sin sinh sinpi sqrt standardGeneric substitute sum switch tan tanh tanpi tracemem trigamma trunc unclass untracemem UseMethod xtfrm"
      },
      compilerExtensions: [function (a, n) {
        if (!a.beforeMatch) return;
        if (a.starts) throw Error("beforeMatch cannot be used with starts");
        var i = Object.assign({}, a);
        Object.keys(a).forEach(function (e) {
          delete a[e];
        }), a.begin = e(i.beforeMatch, e("(?=", i.begin, ")")), a.starts = {
          relevance: 0,
          contains: [Object.assign(i, {
            endsParent: !0
          })]
        }, a.relevance = 0, delete i.beforeMatch;
      }],
      contains: [a.COMMENT(/#'/, /$/, {
        contains: [{
          className: "doctag",
          begin: "@examples",
          starts: {
            contains: [{
              begin: /\n/
            }, {
              begin: /#'\s*(?=@[a-zA-Z]+)/,
              endsParent: !0
            }, {
              begin: /#'/,
              end: /$/,
              excludeBegin: !0
            }]
          }
        }, {
          className: "doctag",
          begin: "@param",
          end: /$/,
          contains: [{
            className: "variable",
            variants: [{
              begin: n
            }, {
              begin: /`(?:\\.|[^`\\])+`/
            }],
            endsParent: !0
          }]
        }, {
          className: "doctag",
          begin: /@[a-zA-Z]+/
        }, {
          className: "meta-keyword",
          begin: /\\[a-zA-Z]+/
        }]
      }), a.HASH_COMMENT_MODE, {
        className: "string",
        contains: [a.BACKSLASH_ESCAPE],
        variants: [a.END_SAME_AS_BEGIN({
          begin: /[rR]"(-*)\(/,
          end: /\)(-*)"/
        }), a.END_SAME_AS_BEGIN({
          begin: /[rR]"(-*)\{/,
          end: /\}(-*)"/
        }), a.END_SAME_AS_BEGIN({
          begin: /[rR]"(-*)\[/,
          end: /\](-*)"/
        }), a.END_SAME_AS_BEGIN({
          begin: /[rR]'(-*)\(/,
          end: /\)(-*)'/
        }), a.END_SAME_AS_BEGIN({
          begin: /[rR]'(-*)\{/,
          end: /\}(-*)'/
        }), a.END_SAME_AS_BEGIN({
          begin: /[rR]'(-*)\[/,
          end: /\](-*)'/
        }), {
          begin: '"',
          end: '"',
          relevance: 0
        }, {
          begin: "'",
          end: "'",
          relevance: 0
        }]
      }, {
        className: "number",
        relevance: 0,
        beforeMatch: /([^a-zA-Z0-9._])/,
        variants: [{
          match: /0[xX][0-9a-fA-F]+\.[0-9a-fA-F]*[pP][+-]?\d+i?/
        }, {
          match: /0[xX][0-9a-fA-F]+([pP][+-]?\d+)?[Li]?/
        }, {
          match: /(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?[Li]?/
        }]
      }, {
        begin: "%",
        end: "%"
      }, {
        begin: e(/[a-zA-Z][a-zA-Z_0-9]*/, "\\s+<-\\s+")
      }, {
        begin: "`",
        end: "`",
        contains: [{
          begin: /\\./
        }]
      }]
    };
  };
}());
hljs.registerLanguage("ruby", function () {
  "use strict";

  function e() {
    for (var _len18 = arguments.length, e = new Array(_len18), _key18 = 0; _key18 < _len18; _key18++) {
      e[_key18] = arguments[_key18];
    }

    return e.map(function (e) {
      return (n = e) ? "string" == typeof n ? n : n.source : null;
      var n;
    }).join("");
  }

  return function (n) {
    var a = "([a-zA-Z_]\\w*[!?=]?|[-+~]@|<<|>>|=~|===?|<=>|[<>]=?|\\*\\*|[-/+%^&*~`|]|\\[\\]=?)",
        i = {
      keyword: "and then defined module in return redo if BEGIN retry end for self when next until do begin unless END rescue else break undef not super class case require yield alias while ensure elsif or include attr_reader attr_writer attr_accessor __FILE__",
      built_in: "proc lambda",
      literal: "true false nil"
    },
        s = {
      className: "doctag",
      begin: "@[A-Za-z]+"
    },
        r = {
      begin: "#<",
      end: ">"
    },
        b = [n.COMMENT("#", "$", {
      contains: [s]
    }), n.COMMENT("^=begin", "^=end", {
      contains: [s],
      relevance: 10
    }), n.COMMENT("^__END__", "\\n$")],
        c = {
      className: "subst",
      begin: /#\{/,
      end: /\}/,
      keywords: i
    },
        t = {
      className: "string",
      contains: [n.BACKSLASH_ESCAPE, c],
      variants: [{
        begin: /'/,
        end: /'/
      }, {
        begin: /"/,
        end: /"/
      }, {
        begin: /`/,
        end: /`/
      }, {
        begin: /%[qQwWx]?\(/,
        end: /\)/
      }, {
        begin: /%[qQwWx]?\[/,
        end: /\]/
      }, {
        begin: /%[qQwWx]?\{/,
        end: /\}/
      }, {
        begin: /%[qQwWx]?</,
        end: />/
      }, {
        begin: /%[qQwWx]?\//,
        end: /\//
      }, {
        begin: /%[qQwWx]?%/,
        end: /%/
      }, {
        begin: /%[qQwWx]?-/,
        end: /-/
      }, {
        begin: /%[qQwWx]?\|/,
        end: /\|/
      }, {
        begin: /\B\?(\\\d{1,3})/
      }, {
        begin: /\B\?(\\x[A-Fa-f0-9]{1,2})/
      }, {
        begin: /\B\?(\\u\{?[A-Fa-f0-9]{1,6}\}?)/
      }, {
        begin: /\B\?(\\M-\\C-|\\M-\\c|\\c\\M-|\\M-|\\C-\\M-)[\x20-\x7e]/
      }, {
        begin: /\B\?\\(c|C-)[\x20-\x7e]/
      }, {
        begin: /\B\?\\?\S/
      }, {
        begin: /<<[-~]?'?(\w+)\n(?:[^\n]*\n)*?\s*\1\b/,
        returnBegin: !0,
        contains: [{
          begin: /<<[-~]?'?/
        }, n.END_SAME_AS_BEGIN({
          begin: /(\w+)/,
          end: /(\w+)/,
          contains: [n.BACKSLASH_ESCAPE, c]
        })]
      }]
    },
        g = "[0-9](_?[0-9])*",
        d = {
      className: "number",
      relevance: 0,
      variants: [{
        begin: "\\b([1-9](_?[0-9])*|0)(\\.(".concat(g, "))?([eE][+-]?(").concat(g, ")|r)?i?\\b")
      }, {
        begin: "\\b0[dD][0-9](_?[0-9])*r?i?\\b"
      }, {
        begin: "\\b0[bB][0-1](_?[0-1])*r?i?\\b"
      }, {
        begin: "\\b0[oO][0-7](_?[0-7])*r?i?\\b"
      }, {
        begin: "\\b0[xX][0-9a-fA-F](_?[0-9a-fA-F])*r?i?\\b"
      }, {
        begin: "\\b0(_?[0-7])+r?i?\\b"
      }]
    },
        l = {
      className: "params",
      begin: "\\(",
      end: "\\)",
      endsParent: !0,
      keywords: i
    },
        o = [t, {
      className: "class",
      beginKeywords: "class module",
      end: "$|;",
      illegal: /=/,
      contains: [n.inherit(n.TITLE_MODE, {
        begin: "[A-Za-z_]\\w*(::\\w+)*(\\?|!)?"
      }), {
        begin: "<\\s*",
        contains: [{
          begin: "(" + n.IDENT_RE + "::)?" + n.IDENT_RE,
          relevance: 0
        }]
      }].concat(b)
    }, {
      className: "function",
      begin: e(/def\s*/, (_ = a + "\\s*(\\(|;|$)", e("(?=", _, ")"))),
      relevance: 0,
      keywords: "def",
      end: "$|;",
      contains: [n.inherit(n.TITLE_MODE, {
        begin: a
      }), l].concat(b)
    }, {
      begin: n.IDENT_RE + "::"
    }, {
      className: "symbol",
      begin: n.UNDERSCORE_IDENT_RE + "(!|\\?)?:",
      relevance: 0
    }, {
      className: "symbol",
      begin: ":(?!\\s)",
      contains: [t, {
        begin: a
      }],
      relevance: 0
    }, d, {
      className: "variable",
      begin: "(\\$\\W)|((\\$|@@?)(\\w+))(?=[^@$?])(?![A-Za-z])(?![@$?'])"
    }, {
      className: "params",
      begin: /\|/,
      end: /\|/,
      relevance: 0,
      keywords: i
    }, {
      begin: "(" + n.RE_STARTERS_RE + "|unless)\\s*",
      keywords: "unless",
      contains: [{
        className: "regexp",
        contains: [n.BACKSLASH_ESCAPE, c],
        illegal: /\n/,
        variants: [{
          begin: "/",
          end: "/[a-z]*"
        }, {
          begin: /%r\{/,
          end: /\}[a-z]*/
        }, {
          begin: "%r\\(",
          end: "\\)[a-z]*"
        }, {
          begin: "%r!",
          end: "![a-z]*"
        }, {
          begin: "%r\\[",
          end: "\\][a-z]*"
        }]
      }].concat(r, b),
      relevance: 0
    }].concat(r, b);

    var _;

    c.contains = o, l.contains = o;
    var E = [{
      begin: /^\s*=>/,
      starts: {
        end: "$",
        contains: o
      }
    }, {
      className: "meta",
      begin: "^([>?]>|[\\w#]+\\(\\w+\\):\\d+:\\d+>|(\\w+-)?\\d+\\.\\d+\\.\\d+(p\\d+)?[^\\d][^>]+>)(?=[ ])",
      starts: {
        end: "$",
        contains: o
      }
    }];
    return b.unshift(r), {
      name: "Ruby",
      aliases: ["rb", "gemspec", "podspec", "thor", "irb"],
      keywords: i,
      illegal: /\/\*/,
      contains: [n.SHEBANG({
        binary: "ruby"
      })].concat(E).concat(b).concat(o)
    };
  };
}());
hljs.registerLanguage("rust", function () {
  "use strict";

  return function (e) {
    var n = "([ui](8|16|32|64|128|size)|f(32|64))?",
        t = "drop i8 i16 i32 i64 i128 isize u8 u16 u32 u64 u128 usize f32 f64 str char bool Box Option Result String Vec Copy Send Sized Sync Drop Fn FnMut FnOnce ToOwned Clone Debug PartialEq PartialOrd Eq Ord AsRef AsMut Into From Default Iterator Extend IntoIterator DoubleEndedIterator ExactSizeIterator SliceConcatExt ToString assert! assert_eq! bitflags! bytes! cfg! col! concat! concat_idents! debug_assert! debug_assert_eq! env! panic! file! format! format_args! include_bin! include_str! line! local_data_key! module_path! option_env! print! println! select! stringify! try! unimplemented! unreachable! vec! write! writeln! macro_rules! assert_ne! debug_assert_ne!";
    return {
      name: "Rust",
      aliases: ["rs"],
      keywords: {
        $pattern: e.IDENT_RE + "!?",
        keyword: "abstract as async await become box break const continue crate do dyn else enum extern false final fn for if impl in let loop macro match mod move mut override priv pub ref return self Self static struct super trait true try type typeof unsafe unsized use virtual where while yield",
        literal: "true false Some None Ok Err",
        built_in: t
      },
      illegal: "</",
      contains: [e.C_LINE_COMMENT_MODE, e.COMMENT("/\\*", "\\*/", {
        contains: ["self"]
      }), e.inherit(e.QUOTE_STRING_MODE, {
        begin: /b?"/,
        illegal: null
      }), {
        className: "string",
        variants: [{
          begin: /r(#*)"(.|\n)*?"\1(?!#)/
        }, {
          begin: /b?'\\?(x\w{2}|u\w{4}|U\w{8}|.)'/
        }]
      }, {
        className: "symbol",
        begin: /'[a-zA-Z_][a-zA-Z0-9_]*/
      }, {
        className: "number",
        variants: [{
          begin: "\\b0b([01_]+)" + n
        }, {
          begin: "\\b0o([0-7_]+)" + n
        }, {
          begin: "\\b0x([A-Fa-f0-9_]+)" + n
        }, {
          begin: "\\b(\\d[\\d_]*(\\.[0-9_]+)?([eE][+-]?[0-9_]+)?)" + n
        }],
        relevance: 0
      }, {
        className: "function",
        beginKeywords: "fn",
        end: "(\\(|<)",
        excludeEnd: !0,
        contains: [e.UNDERSCORE_TITLE_MODE]
      }, {
        className: "meta",
        begin: "#!?\\[",
        end: "\\]",
        contains: [{
          className: "meta-string",
          begin: /"/,
          end: /"/
        }]
      }, {
        className: "class",
        beginKeywords: "type",
        end: ";",
        contains: [e.inherit(e.UNDERSCORE_TITLE_MODE, {
          endsParent: !0
        })],
        illegal: "\\S"
      }, {
        className: "class",
        beginKeywords: "trait enum struct union",
        end: /\{/,
        contains: [e.inherit(e.UNDERSCORE_TITLE_MODE, {
          endsParent: !0
        })],
        illegal: "[\\w\\d]"
      }, {
        begin: e.IDENT_RE + "::",
        keywords: {
          built_in: t
        }
      }, {
        begin: "->"
      }]
    };
  };
}());
hljs.registerLanguage("scss", function () {
  "use strict";

  var e = ["a", "abbr", "address", "article", "aside", "audio", "b", "blockquote", "body", "button", "canvas", "caption", "cite", "code", "dd", "del", "details", "dfn", "div", "dl", "dt", "em", "fieldset", "figcaption", "figure", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "header", "hgroup", "html", "i", "iframe", "img", "input", "ins", "kbd", "label", "legend", "li", "main", "mark", "menu", "nav", "object", "ol", "p", "q", "quote", "samp", "section", "span", "strong", "summary", "sup", "table", "tbody", "td", "textarea", "tfoot", "th", "thead", "time", "tr", "ul", "var", "video"],
      t = ["any-hover", "any-pointer", "aspect-ratio", "color", "color-gamut", "color-index", "device-aspect-ratio", "device-height", "device-width", "display-mode", "forced-colors", "grid", "height", "hover", "inverted-colors", "monochrome", "orientation", "overflow-block", "overflow-inline", "pointer", "prefers-color-scheme", "prefers-contrast", "prefers-reduced-motion", "prefers-reduced-transparency", "resolution", "scan", "scripting", "update", "width", "min-width", "max-width", "min-height", "max-height"],
      i = ["active", "any-link", "blank", "checked", "current", "default", "defined", "dir", "disabled", "drop", "empty", "enabled", "first", "first-child", "first-of-type", "fullscreen", "future", "focus", "focus-visible", "focus-within", "has", "host", "host-context", "hover", "indeterminate", "in-range", "invalid", "is", "lang", "last-child", "last-of-type", "left", "link", "local-link", "not", "nth-child", "nth-col", "nth-last-child", "nth-last-col", "nth-last-of-type", "nth-of-type", "only-child", "only-of-type", "optional", "out-of-range", "past", "placeholder-shown", "read-only", "read-write", "required", "right", "root", "scope", "target", "target-within", "user-invalid", "valid", "visited", "where"],
      r = ["after", "backdrop", "before", "cue", "cue-region", "first-letter", "first-line", "grammar-error", "marker", "part", "placeholder", "selection", "slotted", "spelling-error"],
      o = ["align-content", "align-items", "align-self", "animation", "animation-delay", "animation-direction", "animation-duration", "animation-fill-mode", "animation-iteration-count", "animation-name", "animation-play-state", "animation-timing-function", "auto", "backface-visibility", "background", "background-attachment", "background-clip", "background-color", "background-image", "background-origin", "background-position", "background-repeat", "background-size", "border", "border-bottom", "border-bottom-color", "border-bottom-left-radius", "border-bottom-right-radius", "border-bottom-style", "border-bottom-width", "border-collapse", "border-color", "border-image", "border-image-outset", "border-image-repeat", "border-image-slice", "border-image-source", "border-image-width", "border-left", "border-left-color", "border-left-style", "border-left-width", "border-radius", "border-right", "border-right-color", "border-right-style", "border-right-width", "border-spacing", "border-style", "border-top", "border-top-color", "border-top-left-radius", "border-top-right-radius", "border-top-style", "border-top-width", "border-width", "bottom", "box-decoration-break", "box-shadow", "box-sizing", "break-after", "break-before", "break-inside", "caption-side", "clear", "clip", "clip-path", "color", "column-count", "column-fill", "column-gap", "column-rule", "column-rule-color", "column-rule-style", "column-rule-width", "column-span", "column-width", "columns", "content", "counter-increment", "counter-reset", "cursor", "direction", "display", "empty-cells", "filter", "flex", "flex-basis", "flex-direction", "flex-flow", "flex-grow", "flex-shrink", "flex-wrap", "float", "font", "font-display", "font-family", "font-feature-settings", "font-kerning", "font-language-override", "font-size", "font-size-adjust", "font-stretch", "font-style", "font-variant", "font-variant-ligatures", "font-variation-settings", "font-weight", "height", "hyphens", "icon", "image-orientation", "image-rendering", "image-resolution", "ime-mode", "inherit", "initial", "justify-content", "left", "letter-spacing", "line-height", "list-style", "list-style-image", "list-style-position", "list-style-type", "margin", "margin-bottom", "margin-left", "margin-right", "margin-top", "marks", "mask", "max-height", "max-width", "min-height", "min-width", "nav-down", "nav-index", "nav-left", "nav-right", "nav-up", "none", "normal", "object-fit", "object-position", "opacity", "order", "orphans", "outline", "outline-color", "outline-offset", "outline-style", "outline-width", "overflow", "overflow-wrap", "overflow-x", "overflow-y", "padding", "padding-bottom", "padding-left", "padding-right", "padding-top", "page-break-after", "page-break-before", "page-break-inside", "perspective", "perspective-origin", "pointer-events", "position", "quotes", "resize", "right", "src", "tab-size", "table-layout", "text-align", "text-align-last", "text-decoration", "text-decoration-color", "text-decoration-line", "text-decoration-style", "text-indent", "text-overflow", "text-rendering", "text-shadow", "text-transform", "text-underline-position", "top", "transform", "transform-origin", "transform-style", "transition", "transition-delay", "transition-duration", "transition-property", "transition-timing-function", "unicode-bidi", "vertical-align", "visibility", "white-space", "widows", "width", "word-break", "word-spacing", "word-wrap", "z-index"].reverse();
  return function (a) {
    var n = function (e) {
      return {
        IMPORTANT: {
          className: "meta",
          begin: "!important"
        },
        HEXCOLOR: {
          className: "number",
          begin: "#([a-fA-F0-9]{6}|[a-fA-F0-9]{3})"
        },
        ATTRIBUTE_SELECTOR_MODE: {
          className: "selector-attr",
          begin: /\[/,
          end: /\]/,
          illegal: "$",
          contains: [e.APOS_STRING_MODE, e.QUOTE_STRING_MODE]
        }
      };
    }(a),
        l = r,
        s = i,
        d = "@[a-z-]+",
        c = {
      className: "variable",
      begin: "(\\$[a-zA-Z-][a-zA-Z0-9_-]*)\\b"
    };

    return {
      name: "SCSS",
      case_insensitive: !0,
      illegal: "[=/|']",
      contains: [a.C_LINE_COMMENT_MODE, a.C_BLOCK_COMMENT_MODE, {
        className: "selector-id",
        begin: "#[A-Za-z0-9_-]+",
        relevance: 0
      }, {
        className: "selector-class",
        begin: "\\.[A-Za-z0-9_-]+",
        relevance: 0
      }, n.ATTRIBUTE_SELECTOR_MODE, {
        className: "selector-tag",
        begin: "\\b(" + e.join("|") + ")\\b",
        relevance: 0
      }, {
        className: "selector-pseudo",
        begin: ":(" + s.join("|") + ")"
      }, {
        className: "selector-pseudo",
        begin: "::(" + l.join("|") + ")"
      }, c, {
        begin: /\(/,
        end: /\)/,
        contains: [a.CSS_NUMBER_MODE]
      }, {
        className: "attribute",
        begin: "\\b(" + o.join("|") + ")\\b"
      }, {
        begin: "\\b(whitespace|wait|w-resize|visible|vertical-text|vertical-ideographic|uppercase|upper-roman|upper-alpha|underline|transparent|top|thin|thick|text|text-top|text-bottom|tb-rl|table-header-group|table-footer-group|sw-resize|super|strict|static|square|solid|small-caps|separate|se-resize|scroll|s-resize|rtl|row-resize|ridge|right|repeat|repeat-y|repeat-x|relative|progress|pointer|overline|outside|outset|oblique|nowrap|not-allowed|normal|none|nw-resize|no-repeat|no-drop|newspaper|ne-resize|n-resize|move|middle|medium|ltr|lr-tb|lowercase|lower-roman|lower-alpha|loose|list-item|line|line-through|line-edge|lighter|left|keep-all|justify|italic|inter-word|inter-ideograph|inside|inset|inline|inline-block|inherit|inactive|ideograph-space|ideograph-parenthesis|ideograph-numeric|ideograph-alpha|horizontal|hidden|help|hand|groove|fixed|ellipsis|e-resize|double|dotted|distribute|distribute-space|distribute-letter|distribute-all-lines|disc|disabled|default|decimal|dashed|crosshair|collapse|col-resize|circle|char|center|capitalize|break-word|break-all|bottom|both|bolder|bold|block|bidi-override|below|baseline|auto|always|all-scroll|absolute|table|table-cell)\\b"
      }, {
        begin: ":",
        end: ";",
        contains: [c, n.HEXCOLOR, a.CSS_NUMBER_MODE, a.QUOTE_STRING_MODE, a.APOS_STRING_MODE, n.IMPORTANT]
      }, {
        begin: "@(page|font-face)",
        lexemes: d,
        keywords: "@page @font-face"
      }, {
        begin: "@",
        end: "[{;]",
        returnBegin: !0,
        keywords: {
          $pattern: /[a-z-]+/,
          keyword: "and or not only",
          attribute: t.join(" ")
        },
        contains: [{
          begin: d,
          className: "keyword"
        }, {
          begin: /[a-z-]+(?=:)/,
          className: "attribute"
        }, c, a.QUOTE_STRING_MODE, a.APOS_STRING_MODE, n.HEXCOLOR, a.CSS_NUMBER_MODE]
      }]
    };
  };
}());
hljs.registerLanguage("shell", function () {
  "use strict";

  return function (s) {
    return {
      name: "Shell Session",
      aliases: ["console"],
      contains: [{
        className: "meta",
        begin: /^\s{0,3}[/~\w\d[\]()@-]*[>%$#]/,
        starts: {
          end: /[^\\](?=\s*$)/,
          subLanguage: "bash"
        }
      }]
    };
  };
}());
hljs.registerLanguage("sql", function () {
  "use strict";

  function e(e) {
    return e ? "string" == typeof e ? e : e.source : null;
  }

  function r() {
    for (var _len19 = arguments.length, r = new Array(_len19), _key19 = 0; _key19 < _len19; _key19++) {
      r[_key19] = arguments[_key19];
    }

    return r.map(function (r) {
      return e(r);
    }).join("");
  }

  function t() {
    for (var _len20 = arguments.length, r = new Array(_len20), _key20 = 0; _key20 < _len20; _key20++) {
      r[_key20] = arguments[_key20];
    }

    return "(" + r.map(function (r) {
      return e(r);
    }).join("|") + ")";
  }

  return function (e) {
    var n = e.COMMENT("--", "$"),
        a = ["true", "false", "unknown"],
        i = ["bigint", "binary", "blob", "boolean", "char", "character", "clob", "date", "dec", "decfloat", "decimal", "float", "int", "integer", "interval", "nchar", "nclob", "national", "numeric", "real", "row", "smallint", "time", "timestamp", "varchar", "varying", "varbinary"],
        s = ["abs", "acos", "array_agg", "asin", "atan", "avg", "cast", "ceil", "ceiling", "coalesce", "corr", "cos", "cosh", "count", "covar_pop", "covar_samp", "cume_dist", "dense_rank", "deref", "element", "exp", "extract", "first_value", "floor", "json_array", "json_arrayagg", "json_exists", "json_object", "json_objectagg", "json_query", "json_table", "json_table_primitive", "json_value", "lag", "last_value", "lead", "listagg", "ln", "log", "log10", "lower", "max", "min", "mod", "nth_value", "ntile", "nullif", "percent_rank", "percentile_cont", "percentile_disc", "position", "position_regex", "power", "rank", "regr_avgx", "regr_avgy", "regr_count", "regr_intercept", "regr_r2", "regr_slope", "regr_sxx", "regr_sxy", "regr_syy", "row_number", "sin", "sinh", "sqrt", "stddev_pop", "stddev_samp", "substring", "substring_regex", "sum", "tan", "tanh", "translate", "translate_regex", "treat", "trim", "trim_array", "unnest", "upper", "value_of", "var_pop", "var_samp", "width_bucket"],
        o = ["create table", "insert into", "primary key", "foreign key", "not null", "alter table", "add constraint", "grouping sets", "on overflow", "character set", "respect nulls", "ignore nulls", "nulls first", "nulls last", "depth first", "breadth first"],
        c = s,
        l = ["abs", "acos", "all", "allocate", "alter", "and", "any", "are", "array", "array_agg", "array_max_cardinality", "as", "asensitive", "asin", "asymmetric", "at", "atan", "atomic", "authorization", "avg", "begin", "begin_frame", "begin_partition", "between", "bigint", "binary", "blob", "boolean", "both", "by", "call", "called", "cardinality", "cascaded", "case", "cast", "ceil", "ceiling", "char", "char_length", "character", "character_length", "check", "classifier", "clob", "close", "coalesce", "collate", "collect", "column", "commit", "condition", "connect", "constraint", "contains", "convert", "copy", "corr", "corresponding", "cos", "cosh", "count", "covar_pop", "covar_samp", "create", "cross", "cube", "cume_dist", "current", "current_catalog", "current_date", "current_default_transform_group", "current_path", "current_role", "current_row", "current_schema", "current_time", "current_timestamp", "current_path", "current_role", "current_transform_group_for_type", "current_user", "cursor", "cycle", "date", "day", "deallocate", "dec", "decimal", "decfloat", "declare", "default", "define", "delete", "dense_rank", "deref", "describe", "deterministic", "disconnect", "distinct", "double", "drop", "dynamic", "each", "element", "else", "empty", "end", "end_frame", "end_partition", "end-exec", "equals", "escape", "every", "except", "exec", "execute", "exists", "exp", "external", "extract", "false", "fetch", "filter", "first_value", "float", "floor", "for", "foreign", "frame_row", "free", "from", "full", "function", "fusion", "get", "global", "grant", "group", "grouping", "groups", "having", "hold", "hour", "identity", "in", "indicator", "initial", "inner", "inout", "insensitive", "insert", "int", "integer", "intersect", "intersection", "interval", "into", "is", "join", "json_array", "json_arrayagg", "json_exists", "json_object", "json_objectagg", "json_query", "json_table", "json_table_primitive", "json_value", "lag", "language", "large", "last_value", "lateral", "lead", "leading", "left", "like", "like_regex", "listagg", "ln", "local", "localtime", "localtimestamp", "log", "log10", "lower", "match", "match_number", "match_recognize", "matches", "max", "member", "merge", "method", "min", "minute", "mod", "modifies", "module", "month", "multiset", "national", "natural", "nchar", "nclob", "new", "no", "none", "normalize", "not", "nth_value", "ntile", "null", "nullif", "numeric", "octet_length", "occurrences_regex", "of", "offset", "old", "omit", "on", "one", "only", "open", "or", "order", "out", "outer", "over", "overlaps", "overlay", "parameter", "partition", "pattern", "per", "percent", "percent_rank", "percentile_cont", "percentile_disc", "period", "portion", "position", "position_regex", "power", "precedes", "precision", "prepare", "primary", "procedure", "ptf", "range", "rank", "reads", "real", "recursive", "ref", "references", "referencing", "regr_avgx", "regr_avgy", "regr_count", "regr_intercept", "regr_r2", "regr_slope", "regr_sxx", "regr_sxy", "regr_syy", "release", "result", "return", "returns", "revoke", "right", "rollback", "rollup", "row", "row_number", "rows", "running", "savepoint", "scope", "scroll", "search", "second", "seek", "select", "sensitive", "session_user", "set", "show", "similar", "sin", "sinh", "skip", "smallint", "some", "specific", "specifictype", "sql", "sqlexception", "sqlstate", "sqlwarning", "sqrt", "start", "static", "stddev_pop", "stddev_samp", "submultiset", "subset", "substring", "substring_regex", "succeeds", "sum", "symmetric", "system", "system_time", "system_user", "table", "tablesample", "tan", "tanh", "then", "time", "timestamp", "timezone_hour", "timezone_minute", "to", "trailing", "translate", "translate_regex", "translation", "treat", "trigger", "trim", "trim_array", "true", "truncate", "uescape", "union", "unique", "unknown", "unnest", "update   ", "upper", "user", "using", "value", "values", "value_of", "var_pop", "var_samp", "varbinary", "varchar", "varying", "versioning", "when", "whenever", "where", "width_bucket", "window", "with", "within", "without", "year", "add", "asc", "collation", "desc", "final", "first", "last", "view"].filter(function (e) {
      return !s.includes(e);
    }),
        u = {
      begin: r(/\b/, t.apply(void 0, c), /\s*\(/),
      keywords: {
        built_in: c
      }
    };
    return {
      name: "SQL",
      case_insensitive: !0,
      illegal: /[{}]|<\//,
      keywords: {
        $pattern: /\b[\w\.]+/,
        keyword: function (e) {
          var _ref11 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
              r = _ref11.exceptions,
              t = _ref11.when;

          var n = t;
          return r = r || [], e.map(function (e) {
            return e.match(/\|\d+$/) || r.includes(e) ? e : n(e) ? e + "|0" : e;
          });
        }(l, {
          when: function when(e) {
            return e.length < 3;
          }
        }),
        literal: a,
        type: i,
        built_in: ["current_catalog", "current_date", "current_default_transform_group", "current_path", "current_role", "current_schema", "current_transform_group_for_type", "current_user", "session_user", "system_time", "system_user", "current_time", "localtime", "current_timestamp", "localtimestamp"]
      },
      contains: [{
        begin: t.apply(void 0, o),
        keywords: {
          $pattern: /[\w\.]+/,
          keyword: l.concat(o),
          literal: a,
          type: i
        }
      }, {
        className: "type",
        begin: t("double precision", "large object", "with timezone", "without timezone")
      }, u, {
        className: "variable",
        begin: /@[a-z0-9]+/
      }, {
        className: "string",
        variants: [{
          begin: /'/,
          end: /'/,
          contains: [{
            begin: /''/
          }]
        }]
      }, {
        begin: /"/,
        end: /"/,
        contains: [{
          begin: /""/
        }]
      }, e.C_NUMBER_MODE, e.C_BLOCK_COMMENT_MODE, n, {
        className: "operator",
        begin: /[-+*/=%^~]|&&?|\|\|?|!=?|<(?:=>?|<|>)?|>[>=]?/,
        relevance: 0
      }]
    };
  };
}());
hljs.registerLanguage("swift", function () {
  "use strict";

  function e(e) {
    return e ? "string" == typeof e ? e : e.source : null;
  }

  function n(e) {
    return a("(?=", e, ")");
  }

  function a() {
    for (var _len21 = arguments.length, n = new Array(_len21), _key21 = 0; _key21 < _len21; _key21++) {
      n[_key21] = arguments[_key21];
    }

    return n.map(function (n) {
      return e(n);
    }).join("");
  }

  function t() {
    for (var _len22 = arguments.length, n = new Array(_len22), _key22 = 0; _key22 < _len22; _key22++) {
      n[_key22] = arguments[_key22];
    }

    return "(" + n.map(function (n) {
      return e(n);
    }).join("|") + ")";
  }

  var i = function i(e) {
    return a(/\b/, e, /\w$/.test(e) ? /\b/ : /\B/);
  },
      s = ["Protocol", "Type"].map(i),
      u = ["init", "self"].map(i),
      c = ["Any", "Self"],
      r = ["associatedtype", /as\?/, /as!/, "as", "break", "case", "catch", "class", "continue", "convenience", "default", "defer", "deinit", "didSet", "do", "dynamic", "else", "enum", "extension", "fallthrough", /fileprivate\(set\)/, "fileprivate", "final", "for", "func", "get", "guard", "if", "import", "indirect", "infix", /init\?/, /init!/, "inout", /internal\(set\)/, "internal", "in", "is", "lazy", "let", "mutating", "nonmutating", /open\(set\)/, "open", "operator", "optional", "override", "postfix", "precedencegroup", "prefix", /private\(set\)/, "private", "protocol", /public\(set\)/, "public", "repeat", "required", "rethrows", "return", "set", "some", "static", "struct", "subscript", "super", "switch", "throws", "throw", /try\?/, /try!/, "try", "typealias", /unowned\(safe\)/, /unowned\(unsafe\)/, "unowned", "var", "weak", "where", "while", "willSet"],
      o = ["false", "nil", "true"],
      l = ["assignment", "associativity", "higherThan", "left", "lowerThan", "none", "right"],
      m = ["#colorLiteral", "#column", "#dsohandle", "#else", "#elseif", "#endif", "#error", "#file", "#fileID", "#fileLiteral", "#filePath", "#function", "#if", "#imageLiteral", "#keyPath", "#line", "#selector", "#sourceLocation", "#warn_unqualified_access", "#warning"],
      d = ["abs", "all", "any", "assert", "assertionFailure", "debugPrint", "dump", "fatalError", "getVaList", "isKnownUniquelyReferenced", "max", "min", "numericCast", "pointwiseMax", "pointwiseMin", "precondition", "preconditionFailure", "print", "readLine", "repeatElement", "sequence", "stride", "swap", "swift_unboxFromSwiftValueWithType", "transcode", "type", "unsafeBitCast", "unsafeDowncast", "withExtendedLifetime", "withUnsafeMutablePointer", "withUnsafePointer", "withVaList", "withoutActuallyEscaping", "zip"],
      p = t(/[/=\-+!*%<>&|^~?]/, /[\u00A1-\u00A7]/, /[\u00A9\u00AB]/, /[\u00AC\u00AE]/, /[\u00B0\u00B1]/, /[\u00B6\u00BB\u00BF\u00D7\u00F7]/, /[\u2016-\u2017]/, /[\u2020-\u2027]/, /[\u2030-\u203E]/, /[\u2041-\u2053]/, /[\u2055-\u205E]/, /[\u2190-\u23FF]/, /[\u2500-\u2775]/, /[\u2794-\u2BFF]/, /[\u2E00-\u2E7F]/, /[\u3001-\u3003]/, /[\u3008-\u3020]/, /[\u3030]/),
      F = t(p, /[\u0300-\u036F]/, /[\u1DC0-\u1DFF]/, /[\u20D0-\u20FF]/, /[\uFE00-\uFE0F]/, /[\uFE20-\uFE2F]/),
      b = a(p, F, "*"),
      h = t(/[a-zA-Z_]/, /[\u00A8\u00AA\u00AD\u00AF\u00B2-\u00B5\u00B7-\u00BA]/, /[\u00BC-\u00BE\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF]/, /[\u0100-\u02FF\u0370-\u167F\u1681-\u180D\u180F-\u1DBF]/, /[\u1E00-\u1FFF]/, /[\u200B-\u200D\u202A-\u202E\u203F-\u2040\u2054\u2060-\u206F]/, /[\u2070-\u20CF\u2100-\u218F\u2460-\u24FF\u2776-\u2793]/, /[\u2C00-\u2DFF\u2E80-\u2FFF]/, /[\u3004-\u3007\u3021-\u302F\u3031-\u303F\u3040-\uD7FF]/, /[\uF900-\uFD3D\uFD40-\uFDCF\uFDF0-\uFE1F\uFE30-\uFE44]/, /[\uFE47-\uFEFE\uFF00-\uFFFD]/),
      f = t(h, /\d/, /[\u0300-\u036F\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F]/),
      w = a(h, f, "*"),
      y = a(/[A-Z]/, f, "*"),
      g = ["autoclosure", a(/convention\(/, t("swift", "block", "c"), /\)/), "discardableResult", "dynamicCallable", "dynamicMemberLookup", "escaping", "frozen", "GKInspectable", "IBAction", "IBDesignable", "IBInspectable", "IBOutlet", "IBSegueAction", "inlinable", "main", "nonobjc", "NSApplicationMain", "NSCopying", "NSManaged", a(/objc\(/, w, /\)/), "objc", "objcMembers", "propertyWrapper", "requires_stored_property_inits", "testable", "UIApplicationMain", "unknown", "usableFromInline"],
      E = ["iOS", "iOSApplicationExtension", "macOS", "macOSApplicationExtension", "macCatalyst", "macCatalystApplicationExtension", "watchOS", "watchOSApplicationExtension", "tvOS", "tvOSApplicationExtension", "swift"];

  return function (e) {
    var p = {
      match: /\s+/,
      relevance: 0
    },
        h = e.COMMENT("/\\*", "\\*/", {
      contains: ["self"]
    }),
        v = [e.C_LINE_COMMENT_MODE, h],
        N = {
      className: "keyword",
      begin: a(/\./, n(t.apply(void 0, _toConsumableArray(s).concat(_toConsumableArray(u))))),
      end: t.apply(void 0, _toConsumableArray(s).concat(_toConsumableArray(u))),
      excludeBegin: !0
    },
        A = {
      match: a(/\./, t.apply(void 0, r)),
      relevance: 0
    },
        C = r.filter(function (e) {
      return "string" == typeof e;
    }).concat(["_|0"]),
        _ = {
      variants: [{
        className: "keyword",
        match: t.apply(void 0, _toConsumableArray(r.filter(function (e) {
          return "string" != typeof e;
        }).concat(c).map(i)).concat(_toConsumableArray(u)))
      }]
    },
        D = {
      $pattern: t(/\b\w+/, /#\w+/),
      keyword: C.concat(m),
      literal: o
    },
        B = [N, A, _],
        k = [{
      match: a(/\./, t.apply(void 0, d)),
      relevance: 0
    }, {
      className: "built_in",
      match: a(/\b/, t.apply(void 0, d), /(?=\()/)
    }],
        M = {
      match: /->/,
      relevance: 0
    },
        S = [M, {
      className: "operator",
      relevance: 0,
      variants: [{
        match: b
      }, {
        match: "\\.(\\.|".concat(F, ")+")
      }]
    }],
        x = "([0-9a-fA-F]_*)+",
        I = {
      className: "number",
      relevance: 0,
      variants: [{
        match: "\\b(([0-9]_*)+)(\\.(([0-9]_*)+))?([eE][+-]?(([0-9]_*)+))?\\b"
      }, {
        match: "\\b0x(".concat(x, ")(\\.(").concat(x, "))?([pP][+-]?(([0-9]_*)+))?\\b")
      }, {
        match: /\b0o([0-7]_*)+\b/
      }, {
        match: /\b0b([01]_*)+\b/
      }]
    },
        O = function O() {
      var e = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
      return {
        className: "subst",
        variants: [{
          match: a(/\\/, e, /[0\\tnr"']/)
        }, {
          match: a(/\\/, e, /u\{[0-9a-fA-F]{1,8}\}/)
        }]
      };
    },
        T = function T() {
      var e = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
      return {
        className: "subst",
        match: a(/\\/, e, /[\t ]*(?:[\r\n]|\r\n)/)
      };
    },
        L = function L() {
      var e = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
      return {
        className: "subst",
        label: "interpol",
        begin: a(/\\/, e, /\(/),
        end: /\)/
      };
    },
        P = function P() {
      var e = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
      return {
        begin: a(e, /"""/),
        end: a(/"""/, e),
        contains: [O(e), T(e), L(e)]
      };
    },
        $ = function $() {
      var e = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
      return {
        begin: a(e, /"/),
        end: a(/"/, e),
        contains: [O(e), L(e)]
      };
    },
        K = {
      className: "string",
      variants: [P(), P("#"), P("##"), P("###"), $(), $("#"), $("##"), $("###")]
    },
        j = {
      match: a(/`/, w, /`/)
    },
        z = [j, {
      className: "variable",
      match: /\$\d+/
    }, {
      className: "variable",
      match: "\\$".concat(f, "+")
    }],
        q = [{
      match: /(@|#)available/,
      className: "keyword",
      starts: {
        contains: [{
          begin: /\(/,
          end: /\)/,
          keywords: E,
          contains: [].concat(S, [I, K])
        }]
      }
    }, {
      className: "keyword",
      match: a(/@/, t.apply(void 0, g))
    }, {
      className: "meta",
      match: a(/@/, w)
    }],
        U = {
      match: n(/\b[A-Z]/),
      relevance: 0,
      contains: [{
        className: "type",
        match: a(/(AV|CA|CF|CG|CI|CL|CM|CN|CT|MK|MP|MTK|MTL|NS|SCN|SK|UI|WK|XC)/, f, "+")
      }, {
        className: "type",
        match: y,
        relevance: 0
      }, {
        match: /[?!]+/,
        relevance: 0
      }, {
        match: /\.\.\./,
        relevance: 0
      }, {
        match: a(/\s+&\s+/, n(y)),
        relevance: 0
      }]
    },
        Z = {
      begin: /</,
      end: />/,
      keywords: D,
      contains: [].concat(v, B, q, [M, U])
    };

    U.contains.push(Z);
    var G = {
      begin: /\(/,
      end: /\)/,
      relevance: 0,
      keywords: D,
      contains: ["self", {
        match: a(w, /\s*:/),
        keywords: "_|0",
        relevance: 0
      }].concat(v, B, k, S, [I, K], z, q, [U])
    },
        H = {
      beginKeywords: "func",
      contains: [{
        className: "title",
        match: t(j.match, w, b),
        endsParent: !0,
        relevance: 0
      }, p]
    },
        R = {
      begin: /</,
      end: />/,
      contains: [].concat(v, [U])
    },
        V = {
      begin: /\(/,
      end: /\)/,
      keywords: D,
      contains: [{
        begin: t(n(a(w, /\s*:/)), n(a(w, /\s+/, w, /\s*:/))),
        end: /:/,
        relevance: 0,
        contains: [{
          className: "keyword",
          match: /\b_\b/
        }, {
          className: "params",
          match: w
        }]
      }].concat(v, B, S, [I, K], q, [U, G]),
      endsParent: !0,
      illegal: /["']/
    },
        W = {
      className: "function",
      match: n(/\bfunc\b/),
      contains: [H, R, V, p],
      illegal: [/\[/, /%/]
    },
        X = {
      className: "function",
      match: /\b(subscript|init[?!]?)\s*(?=[<(])/,
      keywords: {
        keyword: "subscript init init? init!",
        $pattern: /\w+[?!]?/
      },
      contains: [R, V, p],
      illegal: /\[|%/
    },
        J = {
      beginKeywords: "operator",
      end: e.MATCH_NOTHING_RE,
      contains: [{
        className: "title",
        match: b,
        endsParent: !0,
        relevance: 0
      }]
    },
        Q = {
      beginKeywords: "precedencegroup",
      end: e.MATCH_NOTHING_RE,
      contains: [{
        className: "title",
        match: y,
        relevance: 0
      }, {
        begin: /{/,
        end: /}/,
        relevance: 0,
        endsParent: !0,
        keywords: [].concat(l, o),
        contains: [U]
      }]
    };

    var _iterator = _createForOfIteratorHelper(K.variants),
        _step;

    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var _e7 = _step.value;

        var _n4 = _e7.contains.find(function (e) {
          return "interpol" === e.label;
        });

        _n4.keywords = D;

        var _a5 = [].concat(B, k, S, [I, K], z);

        _n4.contains = [].concat(_toConsumableArray(_a5), [{
          begin: /\(/,
          end: /\)/,
          contains: ["self"].concat(_toConsumableArray(_a5))
        }]);
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }

    return {
      name: "Swift",
      keywords: D,
      contains: [].concat(v, [W, X, {
        className: "class",
        beginKeywords: "struct protocol class extension enum",
        end: "\\{",
        excludeEnd: !0,
        keywords: D,
        contains: [e.inherit(e.TITLE_MODE, {
          begin: /[A-Za-z$_][\u00C0-\u02B80-9A-Za-z$_]*/
        })].concat(B)
      }, J, Q, {
        beginKeywords: "import",
        end: /$/,
        contains: [].concat(v),
        relevance: 0
      }], B, k, S, [I, K], z, q, [U, G])
    };
  };
}());
hljs.registerLanguage("typescript", function () {
  "use strict";

  var e = "[A-Za-z$_][0-9A-Za-z$_]*",
      n = ["as", "in", "of", "if", "for", "while", "finally", "var", "new", "function", "do", "return", "void", "else", "break", "catch", "instanceof", "with", "throw", "case", "default", "try", "switch", "continue", "typeof", "delete", "let", "yield", "const", "class", "debugger", "async", "await", "static", "import", "from", "export", "extends"],
      a = ["true", "false", "null", "undefined", "NaN", "Infinity"],
      s = [].concat(["setInterval", "setTimeout", "clearInterval", "clearTimeout", "require", "exports", "eval", "isFinite", "isNaN", "parseFloat", "parseInt", "decodeURI", "decodeURIComponent", "encodeURI", "encodeURIComponent", "escape", "unescape"], ["arguments", "this", "super", "console", "window", "document", "localStorage", "module", "global"], ["Intl", "DataView", "Number", "Math", "Date", "String", "RegExp", "Object", "Function", "Boolean", "Error", "Symbol", "Set", "Map", "WeakSet", "WeakMap", "Proxy", "Reflect", "JSON", "Promise", "Float64Array", "Int16Array", "Int32Array", "Int8Array", "Uint16Array", "Uint32Array", "Float32Array", "Array", "Uint8Array", "Uint8ClampedArray", "ArrayBuffer"], ["EvalError", "InternalError", "RangeError", "ReferenceError", "SyntaxError", "TypeError", "URIError"]);

  function t(e) {
    return r("(?=", e, ")");
  }

  function r() {
    for (var _len23 = arguments.length, e = new Array(_len23), _key23 = 0; _key23 < _len23; _key23++) {
      e[_key23] = arguments[_key23];
    }

    return e.map(function (e) {
      return (n = e) ? "string" == typeof n ? n : n.source : null;
      var n;
    }).join("");
  }

  return function (i) {
    var c = {
      $pattern: e,
      keyword: n.concat(["type", "namespace", "typedef", "interface", "public", "private", "protected", "implements", "declare", "abstract", "readonly"]),
      literal: a,
      built_in: s.concat(["any", "void", "number", "boolean", "string", "object", "never", "enum"])
    },
        o = {
      className: "meta",
      begin: "@[A-Za-z$_][0-9A-Za-z$_]*"
    },
        l = function l(e, n, a) {
      var s = e.contains.findIndex(function (e) {
        return e.label === n;
      });
      if (-1 === s) throw Error("can not find mode to replace");
      e.contains.splice(s, 1, a);
    },
        b = function (i) {
      var c = e,
          o = {
        begin: /<[A-Za-z0-9\\._:-]+/,
        end: /\/[A-Za-z0-9\\._:-]+>|\/>/,
        isTrulyOpeningTag: function isTrulyOpeningTag(e, n) {
          var a = e[0].length + e.index,
              s = e.input[a];
          "<" !== s ? ">" === s && (function (e, _ref12) {
            var n = _ref12.after;
            var a = "</" + e[0].slice(1);
            return -1 !== e.input.indexOf(a, n);
          }(e, {
            after: a
          }) || n.ignoreMatch()) : n.ignoreMatch();
        }
      },
          l = {
        $pattern: e,
        keyword: n,
        literal: a,
        built_in: s
      },
          b = "\\.([0-9](_?[0-9])*)",
          d = "0|[1-9](_?[0-9])*|0[0-7]*[89][0-9]*",
          g = {
        className: "number",
        variants: [{
          begin: "(\\b(".concat(d, ")((").concat(b, ")|\\.)?|(").concat(b, "))[eE][+-]?([0-9](_?[0-9])*)\\b")
        }, {
          begin: "\\b(".concat(d, ")\\b((").concat(b, ")\\b|\\.)?|(").concat(b, ")\\b")
        }, {
          begin: "\\b(0|[1-9](_?[0-9])*)n\\b"
        }, {
          begin: "\\b0[xX][0-9a-fA-F](_?[0-9a-fA-F])*n?\\b"
        }, {
          begin: "\\b0[bB][0-1](_?[0-1])*n?\\b"
        }, {
          begin: "\\b0[oO][0-7](_?[0-7])*n?\\b"
        }, {
          begin: "\\b0[0-7]+n?\\b"
        }],
        relevance: 0
      },
          u = {
        className: "subst",
        begin: "\\$\\{",
        end: "\\}",
        keywords: l,
        contains: []
      },
          E = {
        begin: "html`",
        end: "",
        starts: {
          end: "`",
          returnEnd: !1,
          contains: [i.BACKSLASH_ESCAPE, u],
          subLanguage: "xml"
        }
      },
          m = {
        begin: "css`",
        end: "",
        starts: {
          end: "`",
          returnEnd: !1,
          contains: [i.BACKSLASH_ESCAPE, u],
          subLanguage: "css"
        }
      },
          _ = {
        className: "string",
        begin: "`",
        end: "`",
        contains: [i.BACKSLASH_ESCAPE, u]
      },
          y = {
        className: "comment",
        variants: [i.COMMENT(/\/\*\*(?!\/)/, "\\*/", {
          relevance: 0,
          contains: [{
            className: "doctag",
            begin: "@[A-Za-z]+",
            contains: [{
              className: "type",
              begin: "\\{",
              end: "\\}",
              relevance: 0
            }, {
              className: "variable",
              begin: c + "(?=\\s*(-)|$)",
              endsParent: !0,
              relevance: 0
            }, {
              begin: /(?=[^\n])\s/,
              relevance: 0
            }]
          }]
        }), i.C_BLOCK_COMMENT_MODE, i.C_LINE_COMMENT_MODE]
      },
          p = [i.APOS_STRING_MODE, i.QUOTE_STRING_MODE, E, m, _, g, i.REGEXP_MODE];
      u.contains = p.concat({
        begin: /\{/,
        end: /\}/,
        keywords: l,
        contains: ["self"].concat(p)
      });
      var N = [].concat(y, u.contains),
          f = N.concat([{
        begin: /\(/,
        end: /\)/,
        keywords: l,
        contains: ["self"].concat(N)
      }]),
          A = {
        className: "params",
        begin: /\(/,
        end: /\)/,
        excludeBegin: !0,
        excludeEnd: !0,
        keywords: l,
        contains: f
      };
      return {
        name: "Javascript",
        aliases: ["js", "jsx", "mjs", "cjs"],
        keywords: l,
        exports: {
          PARAMS_CONTAINS: f
        },
        illegal: /#(?![$_A-z])/,
        contains: [i.SHEBANG({
          label: "shebang",
          binary: "node",
          relevance: 5
        }), {
          label: "use_strict",
          className: "meta",
          relevance: 10,
          begin: /^\s*['"]use (strict|asm)['"]/
        }, i.APOS_STRING_MODE, i.QUOTE_STRING_MODE, E, m, _, y, g, {
          begin: r(/[{,\n]\s*/, t(r(/(((\/\/.*$)|(\/\*(\*[^/]|[^*])*\*\/))\s*)*/, c + "\\s*:"))),
          relevance: 0,
          contains: [{
            className: "attr",
            begin: c + t("\\s*:"),
            relevance: 0
          }]
        }, {
          begin: "(" + i.RE_STARTERS_RE + "|\\b(case|return|throw)\\b)\\s*",
          keywords: "return throw case",
          contains: [y, i.REGEXP_MODE, {
            className: "function",
            begin: "(\\([^()]*(\\([^()]*(\\([^()]*\\)[^()]*)*\\)[^()]*)*\\)|" + i.UNDERSCORE_IDENT_RE + ")\\s*=>",
            returnBegin: !0,
            end: "\\s*=>",
            contains: [{
              className: "params",
              variants: [{
                begin: i.UNDERSCORE_IDENT_RE,
                relevance: 0
              }, {
                className: null,
                begin: /\(\s*\)/,
                skip: !0
              }, {
                begin: /\(/,
                end: /\)/,
                excludeBegin: !0,
                excludeEnd: !0,
                keywords: l,
                contains: f
              }]
            }]
          }, {
            begin: /,/,
            relevance: 0
          }, {
            className: "",
            begin: /\s/,
            end: /\s*/,
            skip: !0
          }, {
            variants: [{
              begin: "<>",
              end: "</>"
            }, {
              begin: o.begin,
              "on:begin": o.isTrulyOpeningTag,
              end: o.end
            }],
            subLanguage: "xml",
            contains: [{
              begin: o.begin,
              end: o.end,
              skip: !0,
              contains: ["self"]
            }]
          }],
          relevance: 0
        }, {
          className: "function",
          beginKeywords: "function",
          end: /[{;]/,
          excludeEnd: !0,
          keywords: l,
          contains: ["self", i.inherit(i.TITLE_MODE, {
            begin: c
          }), A],
          illegal: /%/
        }, {
          beginKeywords: "while if switch catch for"
        }, {
          className: "function",
          begin: i.UNDERSCORE_IDENT_RE + "\\([^()]*(\\([^()]*(\\([^()]*\\)[^()]*)*\\)[^()]*)*\\)\\s*\\{",
          returnBegin: !0,
          contains: [A, i.inherit(i.TITLE_MODE, {
            begin: c
          })]
        }, {
          variants: [{
            begin: "\\." + c
          }, {
            begin: "\\$" + c
          }],
          relevance: 0
        }, {
          className: "class",
          beginKeywords: "class",
          end: /[{;=]/,
          excludeEnd: !0,
          illegal: /[:"[\]]/,
          contains: [{
            beginKeywords: "extends"
          }, i.UNDERSCORE_TITLE_MODE]
        }, {
          begin: /\b(?=constructor)/,
          end: /[{;]/,
          excludeEnd: !0,
          contains: [i.inherit(i.TITLE_MODE, {
            begin: c
          }), "self", A]
        }, {
          begin: "(get|set)\\s+(?=" + c + "\\()",
          end: /\{/,
          keywords: "get set",
          contains: [i.inherit(i.TITLE_MODE, {
            begin: c
          }), {
            begin: /\(\)/
          }, A]
        }, {
          begin: /\$[(.]/
        }]
      };
    }(i);

    return Object.assign(b.keywords, c), b.exports.PARAMS_CONTAINS.push(o), b.contains = b.contains.concat([o, {
      beginKeywords: "namespace",
      end: /\{/,
      excludeEnd: !0
    }, {
      beginKeywords: "interface",
      end: /\{/,
      excludeEnd: !0,
      keywords: "interface extends"
    }]), l(b, "shebang", i.SHEBANG()), l(b, "use_strict", {
      className: "meta",
      relevance: 10,
      begin: /^\s*['"]use strict['"]/
    }), b.contains.find(function (e) {
      return "function" === e.className;
    }).relevance = 0, Object.assign(b, {
      name: "TypeScript",
      aliases: ["ts"]
    }), b;
  };
}());
hljs.registerLanguage("vbnet", function () {
  "use strict";

  function e(e) {
    return e ? "string" == typeof e ? e : e.source : null;
  }

  function n() {
    for (var _len24 = arguments.length, n = new Array(_len24), _key24 = 0; _key24 < _len24; _key24++) {
      n[_key24] = arguments[_key24];
    }

    return n.map(function (n) {
      return e(n);
    }).join("");
  }

  function t() {
    for (var _len25 = arguments.length, n = new Array(_len25), _key25 = 0; _key25 < _len25; _key25++) {
      n[_key25] = arguments[_key25];
    }

    return "(" + n.map(function (n) {
      return e(n);
    }).join("|") + ")";
  }

  return function (e) {
    var a = /\d{1,2}\/\d{1,2}\/\d{4}/,
        i = /\d{4}-\d{1,2}-\d{1,2}/,
        s = /(\d|1[012])(:\d+){0,2} *(AM|PM)/,
        r = /\d{1,2}(:\d{1,2}){1,2}/,
        o = {
      className: "literal",
      variants: [{
        begin: n(/# */, t(i, a), / *#/)
      }, {
        begin: n(/# */, r, / *#/)
      }, {
        begin: n(/# */, s, / *#/)
      }, {
        begin: n(/# */, t(i, a), / +/, t(s, r), / *#/)
      }]
    },
        l = e.COMMENT(/'''/, /$/, {
      contains: [{
        className: "doctag",
        begin: /<\/?/,
        end: />/
      }]
    }),
        c = e.COMMENT(null, /$/, {
      variants: [{
        begin: /'/
      }, {
        begin: /([\t ]|^)REM(?=\s)/
      }]
    });
    return {
      name: "Visual Basic .NET",
      aliases: ["vb"],
      case_insensitive: !0,
      classNameAliases: {
        label: "symbol"
      },
      keywords: {
        keyword: "addhandler alias aggregate ansi as async assembly auto binary by byref byval call case catch class compare const continue custom declare default delegate dim distinct do each equals else elseif end enum erase error event exit explicit finally for friend from function get global goto group handles if implements imports in inherits interface into iterator join key let lib loop me mid module mustinherit mustoverride mybase myclass namespace narrowing new next notinheritable notoverridable of off on operator option optional order overloads overridable overrides paramarray partial preserve private property protected public raiseevent readonly redim removehandler resume return select set shadows shared skip static step stop structure strict sub synclock take text then throw to try unicode until using when where while widening with withevents writeonly yield",
        built_in: "addressof and andalso await directcast gettype getxmlnamespace is isfalse isnot istrue like mod nameof new not or orelse trycast typeof xor cbool cbyte cchar cdate cdbl cdec cint clng cobj csbyte cshort csng cstr cuint culng cushort",
        type: "boolean byte char date decimal double integer long object sbyte short single string uinteger ulong ushort",
        literal: "true false nothing"
      },
      illegal: "//|\\{|\\}|endif|gosub|variant|wend|^\\$ ",
      contains: [{
        className: "string",
        begin: /"(""|[^/n])"C\b/
      }, {
        className: "string",
        begin: /"/,
        end: /"/,
        illegal: /\n/,
        contains: [{
          begin: /""/
        }]
      }, o, {
        className: "number",
        relevance: 0,
        variants: [{
          begin: /\b\d[\d_]*((\.[\d_]+(E[+-]?[\d_]+)?)|(E[+-]?[\d_]+))[RFD@!#]?/
        }, {
          begin: /\b\d[\d_]*((U?[SIL])|[%&])?/
        }, {
          begin: /&H[\dA-F_]+((U?[SIL])|[%&])?/
        }, {
          begin: /&O[0-7_]+((U?[SIL])|[%&])?/
        }, {
          begin: /&B[01_]+((U?[SIL])|[%&])?/
        }]
      }, {
        className: "label",
        begin: /^\w+:/
      }, l, c, {
        className: "meta",
        begin: /[\t ]*#(const|disable|else|elseif|enable|end|externalsource|if|region)\b/,
        end: /$/,
        keywords: {
          "meta-keyword": "const disable else elseif enable end externalsource if region then"
        },
        contains: [c]
      }]
    };
  };
}());
hljs.registerLanguage("yaml", function () {
  "use strict";

  return function (e) {
    var n = "true false yes no null",
        a = "[\\w#;/?:@&=+$,.~*'()[\\]]+",
        s = {
      className: "string",
      relevance: 0,
      variants: [{
        begin: /'/,
        end: /'/
      }, {
        begin: /"/,
        end: /"/
      }, {
        begin: /\S+/
      }],
      contains: [e.BACKSLASH_ESCAPE, {
        className: "template-variable",
        variants: [{
          begin: /\{\{/,
          end: /\}\}/
        }, {
          begin: /%\{/,
          end: /\}/
        }]
      }]
    },
        i = e.inherit(s, {
      variants: [{
        begin: /'/,
        end: /'/
      }, {
        begin: /"/,
        end: /"/
      }, {
        begin: /[^\s,{}[\]]+/
      }]
    }),
        l = {
      end: ",",
      endsWithParent: !0,
      excludeEnd: !0,
      keywords: n,
      relevance: 0
    },
        t = {
      begin: /\{/,
      end: /\}/,
      contains: [l],
      illegal: "\\n",
      relevance: 0
    },
        g = {
      begin: "\\[",
      end: "\\]",
      contains: [l],
      illegal: "\\n",
      relevance: 0
    },
        b = [{
      className: "attr",
      variants: [{
        begin: "\\w[\\w :\\/.-]*:(?=[ \t]|$)"
      }, {
        begin: '"\\w[\\w :\\/.-]*":(?=[ \t]|$)'
      }, {
        begin: "'\\w[\\w :\\/.-]*':(?=[ \t]|$)"
      }]
    }, {
      className: "meta",
      begin: "^---\\s*$",
      relevance: 10
    }, {
      className: "string",
      begin: "[\\|>]([1-9]?[+-])?[ ]*\\n( +)[^ ][^\\n]*\\n(\\2[^\\n]+\\n?)*"
    }, {
      begin: "<%[%=-]?",
      end: "[%-]?%>",
      subLanguage: "ruby",
      excludeBegin: !0,
      excludeEnd: !0,
      relevance: 0
    }, {
      className: "type",
      begin: "!\\w+!" + a
    }, {
      className: "type",
      begin: "!<" + a + ">"
    }, {
      className: "type",
      begin: "!" + a
    }, {
      className: "type",
      begin: "!!" + a
    }, {
      className: "meta",
      begin: "&" + e.UNDERSCORE_IDENT_RE + "$"
    }, {
      className: "meta",
      begin: "\\*" + e.UNDERSCORE_IDENT_RE + "$"
    }, {
      className: "bullet",
      begin: "-(?=[ ]|$)",
      relevance: 0
    }, e.HASH_COMMENT_MODE, {
      beginKeywords: n,
      keywords: {
        literal: n
      }
    }, {
      className: "number",
      begin: "\\b[0-9]{4}(-[0-9][0-9]){0,2}([Tt \\t][0-9][0-9]?(:[0-9][0-9]){2})?(\\.[0-9]*)?([ \\t])*(Z|[-+][0-9][0-9]?(:[0-9][0-9])?)?\\b"
    }, {
      className: "number",
      begin: e.C_NUMBER_RE + "\\b",
      relevance: 0
    }, t, g, s],
        r = [].concat(b);
    return r.pop(), r.push(i), l.contains = r, {
      name: "YAML",
      case_insensitive: !0,
      aliases: ["yml", "YAML"],
      contains: b
    };
  };
}());
