/* eslint-disable */
this.BX = this.BX || {};
(function (exports,main_core) {
	'use strict';

	/**
	 * @memberOf BX.Landing
	 */
	var Metrika = /*#__PURE__*/function () {
	  function Metrika(light) {
	    babelHelpers.classCallCheck(this, Metrika);
	    this.sendedLabel = [];
	    if (light === true) {
	      return;
	    }
	    this.formSelector = '.bitrix24forms';
	    this.widgetBlockItemSelector = '.landing-b24-widget-button-social-item';
	    this.formBlocks = babelHelpers.toConsumableArray(document.querySelectorAll(this.formSelector));
	    this.siteType = this.getSiteType();
	    this.formsLoaded = [];
	    this.widgetOpened = false;
	    this.widgetBlockHover = false;

	    /*if (this.isFormsExists())
	    {
	    	this.waitForForms();
	    }*/
	    this.waitForWidget();
	    this.detectAnchor();
	  }

	  /**
	   * Returns site type.
	   * @return {string|null}
	   */
	  babelHelpers.createClass(Metrika, [{
	    key: "getSiteType",
	    value: function getSiteType() {
	      var metaSiteType = document.querySelector('meta[property="Bitrix24SiteType"]');
	      if (metaSiteType) {
	        return metaSiteType.getAttribute('content');
	      }
	      return null;
	    }
	    /**
	     * Is any form exists into the page.
	     * @return {boolean}
	     */
	  }, {
	    key: "isFormsExists",
	    value: function isFormsExists() {
	      return this.formBlocks.length > 0;
	    }
	    /**
	     * Listener for address links on the page.
	     */
	  }, {
	    key: "detectAnchor",
	    value: function detectAnchor() {
	      var _this = this;
	      babelHelpers.toConsumableArray(document.querySelectorAll('a')).map(function (node) {
	        var href = main_core.Dom.attr(node, 'href');
	        if (href) {
	          href = href.toString();
	        }
	        if (href && href.indexOf(':')) {
	          var hrefPref = href.split(':')[0];
	          if (['callto', 'tel', 'mailto'].includes(hrefPref)) {
	            main_core.Event.bind(node, 'click', function () {
	              _this.sendLabel('', 'addressClick', hrefPref);
	            });
	          }
	        }
	      });
	    }
	    /**
	     * Listener for widget commands.
	     */
	  }, {
	    key: "waitForWidget",
	    value: function waitForWidget() {
	      var _this2 = this;
	      babelHelpers.toConsumableArray(document.querySelectorAll(this.widgetBlockItemSelector)).map(function (node) {
	        main_core.Event.bind(node, 'mouseover', function () {
	          _this2.widgetBlockHover = true;
	        });
	        main_core.Event.bind(node, 'mouseout', function () {
	          _this2.widgetBlockHover = false;
	        });
	        main_core.Event.bind(node, 'click', function () {
	          babelHelpers.toConsumableArray(node.classList).map(function (className) {
	            if (className.indexOf('ui-icon-service-') === 0) {
	              var ol = className.substr('ui-icon-service-'.length);
	              _this2.sendLabel('', 'olOpenedFromWidget', ol);
	            }
	          });
	        });
	      });
	      window.addEventListener('onBitrixLiveChat', function (event) {
	        var _event$detail = event.detail,
	          widget = _event$detail.widget,
	          widgetHost = _event$detail.widgetHost;
	        widget.subscribe({
	          type: BX.LiveChatWidget.SubscriptionType.every,
	          callback: function callback(event) {
	            if (event.type === BX.LiveChatWidget.SubscriptionType.widgetOpen) {
	              if (_this2.widgetBlockHover) {
	                _this2.sendLabel(widgetHost, 'chatOpenedFromWidget');
	              } else {
	                _this2.sendLabel(widgetHost, 'chatOpened');
	              }
	            }
	          }
	        });
	      });
	    }
	    /**
	     * Sends analytic label when form is loaded, otherwise sends fail label.
	     */
	  }, {
	    key: "waitForForms",
	    value: function waitForForms() {
	      var _this3 = this;
	      window.addEventListener('b24:form:show:first', function (event) {
	        var _event$detail$object$ = event.detail.object.identification,
	          id = _event$detail$object$.id,
	          sec = _event$detail$object$.sec,
	          address = _event$detail$object$.address;
	        var disabled = event.detail.object.disabled;
	        _this3.formsLoaded.push(id + '|' + sec);
	        if (disabled) {
	          _this3.sendLabel(address, 'formDisabledLoad', id + '|' + sec);
	        } else {
	          _this3.sendLabel(address, 'formSuccessLoad', id + '|' + sec);
	        }
	      });
	      setTimeout(function () {
	        _this3.formBlocks.map(function (node) {
	          var dataAttr = main_core.Dom.attr(node, 'data-b24form');
	          if (dataAttr && dataAttr.indexOf('|')) {
	            var formData = dataAttr.split('|');
	            if (!_this3.formsLoaded.includes(formData[0] + '|' + formData[1])) {
	              _this3.sendLabel(null, 'formFailLoad', formData[1] ? formData[0] + '|' + formData[1] : formData[0]);
	            }
	          }
	        });
	      }, 5000);
	    }
	    /**
	     * Clears already sent labels.
	     */
	  }, {
	    key: "clearSendedLabel",
	    value: function clearSendedLabel() {
	      this.sendedLabel = [];
	    }
	    /**
	     * Send label to the portal.
	     * @param {string|null} portalUrl
	     * @param {string} label
	     * @param {string|null} value
	     */
	  }, {
	    key: "sendLabel",
	    value: function sendLabel(portalUrl, label, value) {
	      if (this.sendedLabel.includes(label + value)) {
	        return;
	      }
	      if (value && value.substr(0, 1) === '#') {
	        value = value.substr(1);
	      }
	      this.sendedLabel.push(label + value);
	      BX.ajax({
	        url: (portalUrl ? portalUrl : '') + '/bitrix/images/landing/analytics/pixel.gif?action=' + label + (value ? '&value=' + value : '') + (this.siteType ? '&siteType=' + this.siteType : '') + '&time=' + new Date().getTime()
	      });
	    }
	    /**
	     * For new analytic scheme
	     * @param data
	     */
	  }, {
	    key: "sendData",
	    value: function sendData(data) {
	      main_core.Runtime.loadExtension('ui.analytics').then(function (exports) {
	        var preparedData = {
	          tool: Metrika.TOOL_NAME
	        };
	        ['category', 'event', 'type', 'c_section', 'c_sub_section', 'c_element', 'status'].forEach(function (key) {
	          if (data[key]) {
	            preparedData[key] = data[key];
	          }
	        });
	        if (data.params && main_core.Type.isObject(data.params)) {
	          var i = 1;
	          var maxParams = 5;
	          Object.keys(data.params).forEach(function (param) {
	            if (i <= maxParams) {
	              var key = 'p' + i++;
	              main_core.Text.toCamelCase(param);
	              preparedData[key] = main_core.Text.toCamelCase(param) + '_' + main_core.Text.toCamelCase(data.params[param]);
	            }
	          });
	          delete preparedData.params;
	        }
	        var sendData = exports.sendData;
	        sendData(preparedData);
	      })["catch"](function (err) {
	        console.error('Metrika send error', err);
	      });
	    }
	  }]);
	  return Metrika;
	}();
	babelHelpers.defineProperty(Metrika, "TOOL_NAME", 'landing');

	exports.Metrika = Metrika;

}((this.BX.Landing = this.BX.Landing || {}),BX));
//# sourceMappingURL=metrika.bundle.js.map
