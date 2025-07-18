/* eslint-disable */
this.BX = this.BX || {};
this.BX.Tasks = this.BX.Tasks || {};
(function (exports,main_core_events,ui_sidepanel_layout,ui_label,ui_notification,main_core,ui_dialogs_messagebox) {
	'use strict';

	function _classPrivateMethodInitSpec(obj, privateSet) { _checkPrivateRedeclaration(obj, privateSet); privateSet.add(obj); }
	function _classPrivateFieldInitSpec(obj, privateMap, value) { _checkPrivateRedeclaration(obj, privateMap); privateMap.set(obj, value); }
	function _checkPrivateRedeclaration(obj, privateCollection) { if (privateCollection.has(obj)) { throw new TypeError("Cannot initialize the same private elements twice on an object"); } }
	function _classPrivateMethodGet(receiver, privateSet, fn) { if (!privateSet.has(receiver)) { throw new TypeError("attempted to get private field on non-instance"); } return fn; }
	var _props = /*#__PURE__*/new WeakMap();
	var _filter = /*#__PURE__*/new WeakMap();
	var _popupManager = /*#__PURE__*/new WeakMap();
	var _fields = /*#__PURE__*/new WeakMap();
	var _init = /*#__PURE__*/new WeakSet();
	var _updateFields = /*#__PURE__*/new WeakSet();
	var _unSubscribeToEvents = /*#__PURE__*/new WeakSet();
	var _subscribeToEvents = /*#__PURE__*/new WeakSet();
	var _applyFilterHandler = /*#__PURE__*/new WeakSet();
	var _onGetStopBlur = /*#__PURE__*/new WeakSet();
	var _resetFilter = /*#__PURE__*/new WeakSet();
	var Filter = /*#__PURE__*/function () {
	  function Filter(props) {
	    babelHelpers.classCallCheck(this, Filter);
	    _classPrivateMethodInitSpec(this, _resetFilter);
	    _classPrivateMethodInitSpec(this, _onGetStopBlur);
	    _classPrivateMethodInitSpec(this, _applyFilterHandler);
	    _classPrivateMethodInitSpec(this, _subscribeToEvents);
	    _classPrivateMethodInitSpec(this, _unSubscribeToEvents);
	    _classPrivateMethodInitSpec(this, _updateFields);
	    _classPrivateMethodInitSpec(this, _init);
	    _classPrivateFieldInitSpec(this, _props, {
	      writable: true,
	      value: void 0
	    });
	    _classPrivateFieldInitSpec(this, _filter, {
	      writable: true,
	      value: void 0
	    });
	    _classPrivateFieldInitSpec(this, _popupManager, {
	      writable: true,
	      value: void 0
	    });
	    _classPrivateFieldInitSpec(this, _fields, {
	      writable: true,
	      value: void 0
	    });
	    babelHelpers.classPrivateFieldSet(this, _props, props);
	    _classPrivateMethodGet(this, _init, _init2).call(this);
	  }
	  babelHelpers.createClass(Filter, [{
	    key: "destroyPopups",
	    value: function destroyPopups() {
	      var _babelHelpers$classPr, _babelHelpers$classPr2;
	      babelHelpers.classPrivateFieldGet(this, _filter).popup.destroy();
	      (_babelHelpers$classPr = babelHelpers.classPrivateFieldGet(this, _popupManager).getPopupById(babelHelpers.classPrivateFieldGet(this, _props).filterId + '_fields_popup')) === null || _babelHelpers$classPr === void 0 ? void 0 : _babelHelpers$classPr.destroy();
	      (_babelHelpers$classPr2 = babelHelpers.classPrivateFieldGet(this, _popupManager).getPopupById(babelHelpers.classPrivateFieldGet(this, _props).filterId + '-grid-settings-window')) === null || _babelHelpers$classPr2 === void 0 ? void 0 : _babelHelpers$classPr2.destroy();
	    }
	  }, {
	    key: "release",
	    value: function release() {
	      _classPrivateMethodGet(this, _resetFilter, _resetFilter2).call(this);
	      _classPrivateMethodGet(this, _unSubscribeToEvents, _unSubscribeToEvents2).call(this);
	      this.destroyPopups();
	    }
	  }]);
	  return Filter;
	}();
	function _init2() {
	  babelHelpers.classPrivateFieldSet(this, _filter, BX.Main.filterManager.getById(babelHelpers.classPrivateFieldGet(this, _props).filterId));
	  babelHelpers.classPrivateFieldSet(this, _popupManager, BX.Main.PopupManager);
	  _classPrivateMethodGet(this, _updateFields, _updateFields2).call(this);
	  _classPrivateMethodGet(this, _subscribeToEvents, _subscribeToEvents2).call(this);
	}
	function _updateFields2() {
	  babelHelpers.classPrivateFieldSet(this, _fields, babelHelpers.classPrivateFieldGet(this, _filter).getFilterFieldsValues());
	}
	function _unSubscribeToEvents2() {
	  main_core_events.EventEmitter.unsubscribe('BX.Main.Filter:apply', _classPrivateMethodGet(this, _applyFilterHandler, _applyFilterHandler2).bind(this));
	  main_core_events.EventEmitter.unsubscribe('BX.Main.Filter:onGetStopBlur', _classPrivateMethodGet(this, _onGetStopBlur, _onGetStopBlur2).bind(this));
	}
	function _subscribeToEvents2() {
	  main_core_events.EventEmitter.subscribe('BX.Main.Filter:apply', _classPrivateMethodGet(this, _applyFilterHandler, _applyFilterHandler2).bind(this));
	  main_core_events.EventEmitter.subscribe('BX.Main.Filter:onGetStopBlur', _classPrivateMethodGet(this, _onGetStopBlur, _onGetStopBlur2).bind(this));
	}
	function _applyFilterHandler2() {
	  _classPrivateMethodGet(this, _updateFields, _updateFields2).call(this);
	}
	function _onGetStopBlur2(event) {
	  var _event$getCompatData$ = event.getCompatData()[0],
	    target = _event$getCompatData$.target,
	    path = _event$getCompatData$.path;
	  var popupWindow = path.find(function (el) {
	    var _el$classList, _el$classList2;
	    return ((_el$classList = el.classList) === null || _el$classList === void 0 ? void 0 : _el$classList.contains('popup-window')) || ((_el$classList2 = el.classList) === null || _el$classList2 === void 0 ? void 0 : _el$classList2.contains('main-ui-square'));
	  });
	  var popups = [babelHelpers.classPrivateFieldGet(this, _filter).popup.popupContainer, babelHelpers.classPrivateFieldGet(this, _filter).getFieldsPopup().popupContainer];
	  if (babelHelpers.classPrivateFieldGet(this, _filter).popup.isShown() && !popups.some(function (el) {
	    return el.contains(target);
	  }) && !popupWindow) {
	    babelHelpers.classPrivateFieldGet(this, _filter).closePopup();
	  }
	}
	function _resetFilter2() {
	  babelHelpers.classPrivateFieldGet(this, _filter).resetFilter();
	}

	var RequestSender = /*#__PURE__*/function () {
	  function RequestSender() {
	    babelHelpers.classCallCheck(this, RequestSender);
	  }
	  babelHelpers.createClass(RequestSender, [{
	    key: "sendRequest",
	    value: function sendRequest(controller, action) {
	      var data = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
	      return new Promise(function (resolve, reject) {
	        main_core.ajax.runAction('bitrix:tasks.scrum.' + controller + '.' + action, {
	          data: data
	        }).then(resolve, reject);
	      });
	    }
	  }, {
	    key: "showErrorAlert",
	    value: function showErrorAlert(response, alertTitle) {
	      if (main_core.Type.isUndefined(response.errors)) {
	        console.error(response);
	        return;
	      }
	      if (response.errors.length) {
	        var firstError = response.errors.shift();
	        if (firstError) {
	          var errorCode = firstError.code ? firstError.code : '';
	          var message = firstError.message + ' ' + errorCode;
	          var title = alertTitle ? alertTitle : main_core.Loc.getMessage('TSE_ERROR_POPUP_TITLE');
	          ui_dialogs_messagebox.MessageBox.alert(message, title);
	        }
	      }
	    }
	  }]);
	  return RequestSender;
	}();

	var _templateObject, _templateObject2, _templateObject3, _templateObject4, _templateObject5, _templateObject6, _templateObject7, _templateObject8, _templateObject9, _templateObject10;
	function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
	function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { babelHelpers.defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
	var Epic = /*#__PURE__*/function (_EventEmitter) {
	  babelHelpers.inherits(Epic, _EventEmitter);
	  function Epic() {
	    var _this;
	    var params = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
	    babelHelpers.classCallCheck(this, Epic);
	    _this = babelHelpers.possibleConstructorReturn(this, babelHelpers.getPrototypeOf(Epic).call(this, params));
	    _this.setEventNamespace('BX.Tasks.Scrum.Epic');
	    _this.view = main_core.Type.isString(params.view) ? params.view : '';
	    _this.groupId = parseInt(params.groupId, 10);
	    _this.epicId = main_core.Type.isUndefined(params.epicId) ? 0 : parseInt(params.epicId, 10);
	    _this.gridId = main_core.Type.isUndefined(params.gridId) ? '' : params.gridId;
	    _this.pathToTask = main_core.Type.isString(params.pathToTask) ? params.pathToTask : '';
	    _this.requestSender = new RequestSender();

	    /* eslint-disable */
	    _this.sidePanelManager = BX.SidePanel.Instance;
	    /* eslint-enable */
	    _this.sidePanel = null;
	    _this.id = null;
	    _this.form = null;
	    _this.formData = null;
	    _this.listData = null;
	    _this.filterData = null;
	    _this.filter = null;
	    _this.editorHandler = null;
	    _this.colorPickers = new Map();
	    _this.defaultColor = '#69dafc';
	    _this.selectedColor = '';
	    return _this;
	  }
	  babelHelpers.createClass(Epic, [{
	    key: "show",
	    value: function show() {
	      switch (this.view) {
	        case 'add':
	          this.showAddForm();
	          break;
	        case 'list':
	          this.showList();
	          break;
	        case 'view':
	          this.showViewForm();
	          break;
	        case 'edit':
	          this.showEditForm();
	          break;
	        case 'tasks':
	          this.showTasksList();
	          break;
	        case 'completedTasks':
	          this.showTasksList(true);
	          break;
	      }
	    }
	  }, {
	    key: "showAddForm",
	    value: function showAddForm() {
	      var _this2 = this;
	      this.id = main_core.Text.getRandom();
	      this.sidePanelManager.open('tasks-scrum-epic-add-form-side-panel', {
	        cacheable: false,
	        width: 800,
	        contentCallback: function contentCallback() {
	          return ui_sidepanel_layout.Layout.createContent({
	            extensions: ['tasks.scrum.epic'],
	            title: main_core.Loc.getMessage('TASKS_SCRUM_ADD_EPIC_FORM_TITLE'),
	            content: _this2.createAddContent.bind(_this2),
	            design: {
	              section: false
	            },
	            buttons: function buttons(_ref) {
	              var cancelButton = _ref.cancelButton,
	                SaveButton = _ref.SaveButton;
	              return [new SaveButton({
	                onclick: _this2.onSaveAddForm.bind(_this2)
	              }), cancelButton];
	            }
	          });
	        },
	        events: {
	          onLoad: this.onLoadAddForm.bind(this)
	        }
	      });
	    }
	  }, {
	    key: "showList",
	    value: function showList() {
	      var _this3 = this;
	      this.id = main_core.Text.getRandom();
	      this.gridId = 'EntityEpicsGrid_' + this.groupId;
	      this.filterId = this.gridId;
	      var sidePanelId = 'tasks-scrum-epic-list-side-panel';
	      this.subscribeListToEvents(sidePanelId);
	      this.sidePanelManager.open(sidePanelId, {
	        cacheable: false,
	        contentCallback: function contentCallback() {
	          return ui_sidepanel_layout.Layout.createContent({
	            extensions: ['tasks.scrum.epic'],
	            title: main_core.Loc.getMessage('TASKS_SCRUM_SPRINT_ADD_EPIC_LIST_TITLE'),
	            content: _this3.createContainerContent.bind(_this3),
	            design: {
	              section: false
	            },
	            buttons: []
	          });
	        },
	        events: {
	          onLoad: function onLoad(event) {
	            _this3.onLoadFilter(event);
	            _this3.onLoadList(event);
	          },
	          onClose: function onClose() {
	            var _this3$filter;
	            (_this3$filter = _this3.filter) === null || _this3$filter === void 0 ? void 0 : _this3$filter.release();
	          }
	        }
	      });
	    }
	  }, {
	    key: "showTasksList",
	    value: function showTasksList() {
	      var _this4 = this;
	      var completed = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
	      this.id = main_core.Text.getRandom();
	      this.gridId = 'EpicTasksGrid_' + this.groupId;
	      this.sidePanelManager.open('tasks-scrum-epic-tasks-list-side-panel', {
	        cacheable: false,
	        contentCallback: function contentCallback() {
	          return ui_sidepanel_layout.Layout.createContent({
	            extensions: ['tasks.scrum.epic'],
	            title: completed ? main_core.Loc.getMessage('TASKS_SCRUM_SPRINT_ADD_EPIC_COMPLETED_TASKS_LIST_TITLE') : main_core.Loc.getMessage('TASKS_SCRUM_SPRINT_ADD_EPIC_TASKS_LIST_TITLE'),
	            content: _this4.createTasksListContent.bind(_this4, completed),
	            design: {
	              section: false
	            },
	            buttons: []
	          });
	        },
	        events: {
	          onLoad: this.onLoadTasksList.bind(this)
	        }
	      });
	    }
	  }, {
	    key: "showViewForm",
	    value: function showViewForm() {
	      var _this5 = this;
	      this.id = main_core.Text.getRandom();
	      this.subscribeViewToEvents();
	      this.sidePanelManager.open('tasks-scrum-epic-view-form-side-panel', {
	        cacheable: false,
	        width: 800,
	        contentCallback: function contentCallback() {
	          return new Promise(function (resolve, reject) {
	            _this5.getEpic().then(function (response) {
	              var epic = response.data;
	              resolve(ui_sidepanel_layout.Layout.createContent({
	                extensions: ['tasks.scrum.epic'],
	                title: main_core.Loc.getMessage('TASKS_SCRUM_VIEW_EPIC_FORM_TITLE'),
	                content: _this5.createViewContent.bind(_this5, epic),
	                design: {
	                  section: false
	                },
	                buttons: function buttons(_ref2) {
	                  var cancelButton = _ref2.cancelButton,
	                    SaveButton = _ref2.SaveButton;
	                  return [new SaveButton({
	                    text: main_core.Loc.getMessage('TASKS_SCRUM_EPIC_EDIT_BUTTON'),
	                    onclick: function onclick() {
	                      _this5.sidePanel.close(false, function () {
	                        main_core_events.EventEmitter.emit(_this5.getEventNamespace() + ':' + 'openEdit', epic.id);
	                      });
	                    }
	                  }), cancelButton];
	                }
	              }));
	            });
	          });
	        },
	        events: {
	          onLoad: this.onLoadViewForm.bind(this)
	        }
	      });
	    }
	  }, {
	    key: "showEditForm",
	    value: function showEditForm() {
	      var _this6 = this;
	      this.id = main_core.Text.getRandom();
	      this.sidePanelManager.open('tasks-scrum-epic-edit-form-side-panel', {
	        cacheable: false,
	        width: 800,
	        contentCallback: function contentCallback() {
	          return ui_sidepanel_layout.Layout.createContent({
	            extensions: ['tasks.scrum.epic'],
	            title: main_core.Loc.getMessage('TASKS_SCRUM_EDIT_EPIC_FORM_TITLE'),
	            content: _this6.createEditContent.bind(_this6),
	            design: {
	              section: false
	            },
	            buttons: function buttons(_ref3) {
	              var cancelButton = _ref3.cancelButton,
	                SaveButton = _ref3.SaveButton;
	              return [new SaveButton({
	                onclick: _this6.onSaveEditForm.bind(_this6)
	              }), cancelButton];
	            }
	          });
	        },
	        events: {
	          onLoad: this.onLoadEditForm.bind(this)
	        }
	      });
	    }
	  }, {
	    key: "removeEpic",
	    value: function removeEpic() {
	      var _this7 = this;
	      return main_core.ajax.runAction('bitrix:tasks.scrum.epic.removeEpic', {
	        data: {
	          groupId: this.groupId,
	          epicId: this.epicId
	        }
	      }).then(function (response) {
	        main_core_events.EventEmitter.emit(_this7.getEventNamespace() + ':' + 'afterRemove', response.data);
	        return true;
	      })["catch"](function (response) {
	        _this7.requestSender.showErrorAlert(response);
	      });
	    }
	  }, {
	    key: "showTask",
	    value: function showTask(taskId) {
	      if (this.pathToTask) {
	        this.sidePanelManager.open(this.pathToTask.replace('#action#', 'view').replace('#task_id#', parseInt(taskId, 10)));
	      }
	    }
	  }, {
	    key: "subscribeListToEvents",
	    value: function subscribeListToEvents(sidePanelId) {
	      var _this8 = this;
	      main_core_events.EventEmitter.subscribe(this.getEventNamespace() + ':' + 'afterAdd', function () {
	        return _this8.reloadGrid();
	      });
	      main_core_events.EventEmitter.subscribe(this.getEventNamespace() + ':' + 'afterEdit', function () {
	        return _this8.reloadGrid();
	      });
	    }
	  }, {
	    key: "subscribeViewToEvents",
	    value: function subscribeViewToEvents() {
	      var _this9 = this;
	      main_core_events.EventEmitter.subscribe(this.getEventNamespace() + ':' + 'openEdit', function (baseEvent) {
	        Epic.showEdit(_this9.groupId, baseEvent.getData());
	      });
	    }
	  }, {
	    key: "reloadSidePanel",
	    value: function reloadSidePanel(sidePanelId) {
	      if (main_core.Type.isUndefined(sidePanelId)) {
	        this.sidePanelManager.reload();
	      } else {
	        var openSliders = this.sidePanelManager.getOpenSliders();
	        if (openSliders.length > 0) {
	          openSliders.forEach(function (slider) {
	            if (slider.getUrl() === sidePanelId) {
	              slider.reload();
	            }
	          });
	        }
	      }
	    }
	  }, {
	    key: "createAddContent",
	    value: function createAddContent() {
	      var _this10 = this;
	      return new Promise(function (resolve, reject) {
	        main_core.ajax.runAction('bitrix:tasks.scrum.epic.getDescriptionEditor', {
	          data: {
	            groupId: _this10.groupId,
	            editorId: _this10.id
	          }
	        }).then(function (response) {
	          _this10.formData = response.data;
	          resolve(_this10.renderAddForm());
	        })["catch"](function (response) {
	          _this10.requestSender.showErrorAlert(response);
	        });
	      });
	    }
	  }, {
	    key: "createListContent",
	    value: function createListContent() {
	      var _this11 = this;
	      return new Promise(function (resolve, reject) {
	        main_core.ajax.runAction('bitrix:tasks.scrum.epic.list', {
	          data: {
	            groupId: _this11.groupId,
	            gridId: _this11.gridId
	          }
	        }).then(function (response) {
	          _this11.listData = response.data;
	          resolve(_this11.renderList());
	        })["catch"](function (response) {
	          _this11.requestSender.showErrorAlert(response);
	        });
	      });
	    }
	  }, {
	    key: "createFilterContent",
	    value: function createFilterContent() {
	      var _this12 = this;
	      return new Promise(function (resolve, reject) {
	        main_core.ajax.runAction('bitrix:tasks.scrum.epic.filter.get', {
	          data: {
	            groupId: _this12.groupId,
	            gridId: _this12.gridId
	          }
	        }).then(function (response) {
	          _this12.filterData = response.data;
	          resolve(_this12.renderFilter());
	        })["catch"](function (response) {
	          _this12.requestSender.showErrorAlert(response);
	        });
	      });
	    }
	  }, {
	    key: "createTasksListContent",
	    value: function createTasksListContent(completed) {
	      var _this13 = this;
	      return new Promise(function (resolve, reject) {
	        main_core.ajax.runAction('bitrix:tasks.scrum.epic.getTasksList', {
	          data: {
	            groupId: _this13.groupId,
	            epicId: _this13.epicId,
	            gridId: _this13.gridId,
	            completed: completed ? 'Y' : 'N'
	          }
	        }).then(function (response) {
	          _this13.listData = response.data;
	          resolve(_this13.renderTasksList());
	        })["catch"](function (response) {
	          _this13.requestSender.showErrorAlert(response);
	        });
	      });
	    }
	  }, {
	    key: "createViewContent",
	    value: function createViewContent(epic) {
	      var _this14 = this;
	      return new Promise(function (resolve, reject) {
	        main_core.ajax.runAction('bitrix:tasks.scrum.epic.getEpicFiles', {
	          data: {
	            groupId: _this14.groupId,
	            epicId: epic.id
	          }
	        }).then(function (response) {
	          _this14.epicFiles = main_core.Type.isUndefined(response.data.html) ? '' : response.data.html;
	          resolve(_this14.renderViewForm(epic));
	        })["catch"](function (response) {
	          _this14.requestSender.showErrorAlert(response);
	        });
	      });
	    }
	  }, {
	    key: "createEditContent",
	    value: function createEditContent() {
	      var _this15 = this;
	      return new Promise(function (resolve, reject) {
	        _this15.getEpic().then(function (response) {
	          var epic = response.data;
	          main_core.ajax.runAction('bitrix:tasks.scrum.epic.getDescriptionEditor', {
	            data: {
	              groupId: _this15.groupId,
	              editorId: _this15.id,
	              epicId: epic.id,
	              text: epic.description
	            }
	          }).then(function (response) {
	            _this15.currentEpic = epic;
	            _this15.formData = response.data;
	            resolve(_this15.renderEditForm(epic));
	          })["catch"](function (response) {
	            _this15.requestSender.showErrorAlert(response);
	          });
	        });
	      });
	    }
	  }, {
	    key: "createContainerContent",
	    value: function createContainerContent() {
	      var _this16 = this;
	      return Promise.all([this.createFilterContent(), this.createListContent()]).then(function (_ref4) {
	        var _ref5 = babelHelpers.slicedToArray(_ref4, 2),
	          filterContent = _ref5[0],
	          listContent = _ref5[1];
	        return _this16.renderContainer(filterContent, listContent);
	      });
	    }
	  }, {
	    key: "getEpic",
	    value: function getEpic() {
	      var _this17 = this;
	      return new Promise(function (resolve, reject) {
	        main_core.ajax.runAction('bitrix:tasks.scrum.epic.getEpic', {
	          data: {
	            groupId: _this17.groupId,
	            epicId: _this17.epicId
	          }
	        }).then(resolve, reject);
	      });
	    }
	  }, {
	    key: "onLoadAddForm",
	    value: function onLoadAddForm(event) {
	      this.sidePanel = event.getSlider();
	      this.form = this.sidePanel.getContainer().querySelector('.tasks-scrum-epic-form');
	      var descriptionContainer = this.form.querySelector('.tasks-scrum-epic-form-description');
	      if (main_core.Type.isUndefined(this.formData.html)) {
	        return;
	      }
	      this.renderEditor(descriptionContainer);
	    }
	  }, {
	    key: "onSaveAddForm",
	    value: function onSaveAddForm() {
	      var _this18 = this;
	      main_core.ajax.runAction('bitrix:tasks.scrum.epic.createEpic', {
	        data: this.getRequestData()
	      }).then(function (response) {
	        _this18.sidePanel.close(false, function () {
	          main_core_events.EventEmitter.emit(_this18.getEventNamespace() + ':' + 'afterAdd', response.data);
	          ui_notification.UI.Notification.Center.notify({
	            content: main_core.Loc.getMessage('TASKS_SCRUM_ADD_EPIC_NOTIFY')
	          });
	        });
	      })["catch"](function (response) {
	        _this18.requestSender.showErrorAlert(response);
	      });
	    }
	  }, {
	    key: "onLoadFilter",
	    value: function onLoadFilter(event) {
	      var _this$filterData,
	        _this19 = this;
	      this.sidePanel = event.getSlider();
	      var filterContainer = this.sidePanel.getContainer().querySelector('.tasks-scrum-epic-filter');
	      if ((_this$filterData = this.filterData) !== null && _this$filterData !== void 0 && _this$filterData.html) {
	        main_core.Runtime.html(filterContainer, this.filterData.html).then(function () {
	          _this19.filter = new Filter({
	            filterId: _this19.filterId
	          });
	        });
	      }
	    }
	  }, {
	    key: "onLoadList",
	    value: function onLoadList(event) {
	      var _this20 = this;
	      this.sidePanel = event.getSlider();
	      var listContainer = this.sidePanel.getContainer().querySelector('.tasks-scrum-epic-list');
	      if (main_core.Type.isUndefined(this.listData.html)) {
	        main_core.Dom.append(this.renderListBlank(), listContainer);
	        main_core.Event.bind(listContainer.querySelector('.tasks-scrum-epics-empty-button'), 'click', this.showAddForm.bind(this));
	      } else {
	        main_core.Runtime.html(listContainer, this.listData.html).then(function () {
	          main_core_events.EventEmitter.subscribe('Grid::beforeRequest', _this20.onBeforeGridRequest.bind(_this20));
	          _this20.prepareTagsList(listContainer);
	        });
	      }
	    }
	  }, {
	    key: "onLoadTasksList",
	    value: function onLoadTasksList(event) {
	      var _this21 = this;
	      this.sidePanel = event.getSlider();
	      var listContainer = this.sidePanel.getContainer().querySelector('.tasks-scrum-epic-tasks-list');
	      if (this.listData) {
	        main_core.Runtime.html(listContainer, this.listData.html).then(function () {
	          main_core_events.EventEmitter.subscribe('Grid::beforeRequest', _this21.onBeforeGridRequest.bind(_this21));
	        });
	      }
	    }
	  }, {
	    key: "onLoadViewForm",
	    value: function onLoadViewForm(event) {
	      this.sidePanel = event.getSlider();
	      if (this.epicFiles) {
	        var filesContainer = this.sidePanel.getContainer().querySelector('.tasks-scrum-epic-form-files');
	        main_core.Runtime.html(filesContainer, this.epicFiles);
	      }
	    }
	  }, {
	    key: "onLoadEditForm",
	    value: function onLoadEditForm(event) {
	      this.sidePanel = event.getSlider();
	      this.form = this.sidePanel.getContainer().querySelector('.tasks-scrum-epic-form');
	      var descriptionContainer = this.form.querySelector('.tasks-scrum-epic-form-description');
	      if (main_core.Type.isUndefined(this.formData.html)) {
	        return;
	      }
	      this.renderEditor(descriptionContainer);
	    }
	  }, {
	    key: "onSaveEditForm",
	    value: function onSaveEditForm() {
	      var _this22 = this;
	      main_core.ajax.runAction('bitrix:tasks.scrum.epic.editEpic', {
	        data: this.getRequestData()
	      }).then(function (response) {
	        _this22.sidePanel.close(false, function () {
	          main_core_events.EventEmitter.emit(_this22.getEventNamespace() + ':' + 'afterEdit', response.data);
	        });
	      })["catch"](function (response) {
	        _this22.requestSender.showErrorAlert(response);
	      });
	    }
	  }, {
	    key: "onBeforeGridRequest",
	    value: function onBeforeGridRequest(event) {
	      var _event$getCompatData = event.getCompatData(),
	        _event$getCompatData2 = babelHelpers.slicedToArray(_event$getCompatData, 2),
	        gridObject = _event$getCompatData2[0],
	        eventArgs = _event$getCompatData2[1];

	      /* eslint-disable */
	      eventArgs.sessid = BX.bitrix_sessid();
	      /* eslint-enable */

	      eventArgs.method = 'POST';
	      if (!eventArgs.url) {
	        eventArgs.url = this.getListUrl();
	      }
	      eventArgs.data = _objectSpread(_objectSpread({}, eventArgs.data), {}, {
	        groupId: this.groupId,
	        gridId: this.gridId,
	        epicId: this.epicId
	      });
	    }
	  }, {
	    key: "getListUrl",
	    value: function getListUrl() {
	      return '/bitrix/services/main/ajax.php?action=bitrix:tasks.scrum.epic.list';
	    }
	  }, {
	    key: "renderAddForm",
	    value: function renderAddForm() {
	      return main_core.Tag.render(_templateObject || (_templateObject = babelHelpers.taggedTemplateLiteral(["\n\t\t\t<div class=\"tasks-scrum-epic-form\">\n\t\t\t\t<div class=\"tasks-scrum-epic-form-container\">\n\t\t\t\t\t", "\n\t\t\t\t\t", "\n\t\t\t\t</div>\n\t\t\t</div>\n\t\t"])), this.renderNameField(0, '', this.defaultColor), this.renderDescriptionField());
	    }
	  }, {
	    key: "renderContainer",
	    value: function renderContainer(filterContent, listContent) {
	      return main_core.Tag.render(_templateObject2 || (_templateObject2 = babelHelpers.taggedTemplateLiteral(["\n\t\t\t<div class=\"tasks-scrum-epic-container\">\n\t\t\t\t<div class=\"tasks-scrum-epic-toolbar\">\n\t\t\t\t\t<button class=\"ui-btn ui-btn-success\" onclick=\"", "\">\n\t\t\t\t\t\t<span class=\"ui-btn-text\">", "</span>\n\t\t\t\t\t</button>\n\t\t\t\t\t", "\n\t\t\t\t</div>\n\t\t\t\t", "\n\t\t\t</div>\n\t\t"])), this.showAddForm.bind(this), main_core.Loc.getMessage('TASKS_SCRUM_SPRINT_ADD_EPIC_LIST_TOOLBAR_BUTTON'), filterContent, listContent);
	    }
	  }, {
	    key: "renderFilter",
	    value: function renderFilter() {
	      return main_core.Tag.render(_templateObject3 || (_templateObject3 = babelHelpers.taggedTemplateLiteral(["<div class=\"tasks-scrum-epic-filter\"></div>"])));
	    }
	  }, {
	    key: "renderList",
	    value: function renderList() {
	      return main_core.Tag.render(_templateObject4 || (_templateObject4 = babelHelpers.taggedTemplateLiteral(["<div class=\"tasks-scrum-epic-list\"></div>"])));
	    }
	  }, {
	    key: "renderTasksList",
	    value: function renderTasksList() {
	      return main_core.Tag.render(_templateObject5 || (_templateObject5 = babelHelpers.taggedTemplateLiteral(["<div class=\"tasks-scrum-epic-tasks-list\"></div>"])));
	    }
	  }, {
	    key: "renderViewForm",
	    value: function renderViewForm(epic) {
	      return main_core.Tag.render(_templateObject6 || (_templateObject6 = babelHelpers.taggedTemplateLiteral(["\n\t\t\t<div class=\"tasks-scrum-epic-form\">\n\t\t\t\t<div class=\"tasks-scrum-epic-form-container\">\n\t\t\t\t\t<div class=\"tasks-scrum-epic-form-header\">\n\t\t\t\t\t\t<div class=\"tasks-scrum-epic-form-header-title\">\n\t\t\t\t\t\t\t", "\n\t\t\t\t\t\t</div>\n\t\t\t\t\t\t<div class=\"tasks-scrum-epic-form-header-separate\"></div>\n\t\t\t\t\t\t<div class=\"tasks-scrum-epic-header-color\">\n\t\t\t\t\t\t\t<div\n\t\t\t\t\t\t\t\tclass=\"tasks-scrum-epic-header-color-current\"\n\t\t\t\t\t\t\t\tstyle=\"background-color: ", ";\"\n\t\t\t\t\t\t\t>\n\t\t\t\t\t\t\t</div>\n\t\t\t\t\t\t</div>\n\t\t\t\t\t</div>\n\t\t\t\t\t<div class=\"tasks-scrum-epic-form-body\">\n\t\t\t\t\t\t<div class=\"tasks-scrum-epic-form-description\">\n\t\t\t\t\t\t\t", "\n\t\t\t\t\t\t</div>\n\t\t\t\t\t\t<div class=\"tasks-scrum-epic-form-files\"></div>\n\t\t\t\t\t</div>\n\t\t\t\t</div>\n\t\t\t</div>\n\t\t"])), main_core.Text.encode(epic.name), main_core.Text.encode(epic.color), epic.description);
	    }
	  }, {
	    key: "renderEditForm",
	    value: function renderEditForm(epic) {
	      this.selectedColor = epic.color;
	      return main_core.Tag.render(_templateObject7 || (_templateObject7 = babelHelpers.taggedTemplateLiteral(["\n\t\t\t<div class=\"tasks-scrum-epic-form\">\n\t\t\t\t<div class=\"tasks-scrum-epic-form-container\">\n\t\t\t\t\t", "\n\t\t\t\t\t", "\n\t\t\t\t</div>\n\t\t\t</div>\n\t\t"])), this.renderNameField(epic.id, epic.name, this.selectedColor), this.renderDescriptionField());
	    }
	  }, {
	    key: "renderNameField",
	    value: function renderNameField(epicId, name, color) {
	      var _this23 = this;
	      var nameField = main_core.Tag.render(_templateObject8 || (_templateObject8 = babelHelpers.taggedTemplateLiteral(["\n\t\t\t<div class=\"tasks-scrum-epic-form-header\">\n\t\t\t\t<div class=\"tasks-scrum-epic-form-header-title\">\n\t\t\t\t\t<input\n\t\t\t\t\t\ttype=\"text\"\n\t\t\t\t\t\tname=\"name\"\n\t\t\t\t\t\tvalue=\"", "\"\n\t\t\t\t\t\tclass=\"tasks-scrum-epic-form-header-title-control\"\n\t\t\t\t\t\tplaceholder=\"", "\"\n\t\t\t\t\t>\n\t\t\t\t</div>\n\t\t\t\t<div class=\"tasks-scrum-epic-form-header-separate\"></div>\n\t\t\t\t<div class=\"tasks-scrum-epic-header-color\">\n\t\t\t\t\t<div\n\t\t\t\t\t\tdata-epic-id=\"", "\"\n\t\t\t\t\t\tclass=\"tasks-scrum-epic-header-color-current\"\n\t\t\t\t\t\tstyle=\"background-color: ", ";\"\n\t\t\t\t\t>\n\t\t\t\t\t</div>\n\t\t\t\t\t<div class=\"tasks-scrum-epic-header-color-btn-angle\"></div>\n\t\t\t\t</div>\n\t\t\t</div>\n\t\t"])), main_core.Text.encode(name), main_core.Loc.getMessage('TASKS_SCRUM_SPRINT_ADD_EPIC_NAME_PLACEHOLDER'), parseInt(epicId, 10), main_core.Text.encode(color));
	      var pickerContainer = nameField.querySelector('.tasks-scrum-epic-header-color');
	      main_core.Event.bind(pickerContainer, 'click', function () {
	        var colorNode = pickerContainer.querySelector('.tasks-scrum-epic-header-color-current');
	        var picker = _this23.getColorPicker(colorNode);
	        picker.open();
	      });
	      return nameField;
	    }
	  }, {
	    key: "renderDescriptionField",
	    value: function renderDescriptionField() {
	      return main_core.Tag.render(_templateObject9 || (_templateObject9 = babelHelpers.taggedTemplateLiteral(["\n\t\t\t<div class=\"tasks-scrum-epic-form-body\">\n\t\t\t\t<div class=\"tasks-scrum-epic-form-description --editing\"></div>\n\t\t\t</div>\n\t\t"])));
	    }
	  }, {
	    key: "renderEditor",
	    value: function renderEditor(container) {
	      var _this24 = this;
	      setTimeout(function () {
	        main_core.Runtime.html(container, _this24.formData.html).then(function () {
	          if (window.LHEPostForm) {
	            _this24.editorHandler = window.LHEPostForm.getHandler(_this24.id);
	            main_core_events.EventEmitter.emit(_this24.editorHandler.eventNode, 'OnShowLHE', [true]);
	          }
	          _this24.focusToName();
	        });
	      }, 300);
	    }
	  }, {
	    key: "renderListBlank",
	    value: function renderListBlank() {
	      return main_core.Tag.render(_templateObject10 || (_templateObject10 = babelHelpers.taggedTemplateLiteral(["\n\t\t\t<div class=\"tasks-scrum-epics-empty\">\n\t\t\t\t<div class=\"tasks-scrum-epics-empty-first-title\">\n\t\t\t\t\t", "\n\t\t\t\t</div>\n\t\t\t\t<div class=\"tasks-scrum-epics-empty-image\">\n\t\t\t\t\t<svg width=\"124px\" height=\"123px\" viewBox=\"0 0 124 123\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n\t\t\t\t\t\t<g stroke=\"none\" stroke-width=\"1\" fill=\"none\" fill-rule=\"evenodd\" opacity=\"0.28\">\n\t\t\t\t\t\t\t<path d=\"M83,105 L83,81.4375 L105,81.4375 L105,18 L17,18 L17,81.4375 L39,81.4375 L39,105 L83,105 Z M10.9411765,0 L113.058824,0 C119.101468,0 124,4.85902727 124,10.8529412 L124,112.147059 C124,118.140973 119.101468,123 113.058824,123 L10.9411765,123 C4.89853156,123 0,118.140973 0,112.147059 L0,10.8529412 C0,4.85902727 4.89853156,0 10.9411765,0 Z M44.0142862,47.0500004 L54.2142857,57.4416671 L79.7142857,32 L87,42.75 L54.2142857,75 L36,57.0833333 L44.0142862,47.0500004 Z\" fill=\"#A8ADB4\" />\n\t\t\t\t\t\t</g>\n\t\t\t\t\t</svg>\n\t\t\t\t</div>\n\t\t\t\t<div class=\"tasks-scrum-epics-empty-second-title\">\n\t\t\t\t\t", "\n\t\t\t\t</div>\n\t\t\t\t<div class=\"tasks-scrum-epics-empty-button\">\n\t\t\t\t\t<button class=\"ui-btn ui-btn-primary ui-btn-lg\">\n\t\t\t\t\t\t", "\n\t\t\t\t\t</button>\n\t\t\t\t</div>\n\t\t\t</div>\n\t\t"])), main_core.Loc.getMessage('TASKS_SCRUM_EPICS_EMPTY_FIRST_TITLE'), main_core.Loc.getMessage('TASKS_SCRUM_EPICS_EMPTY_SECOND_TITLE'), main_core.Loc.getMessage('TASKS_SCRUM_SPRINT_ADD_EPIC_LIST_TOOLBAR_BUTTON'));
	    }
	  }, {
	    key: "getGrid",
	    value: function getGrid() {
	      /* eslint-disable */
	      if (BX && BX.Main && BX.Main.gridManager) {
	        return BX.Main.gridManager.getById(this.gridId);
	      }
	      /* eslint-enable */

	      return null;
	    }
	  }, {
	    key: "reloadGrid",
	    value: function reloadGrid() {
	      if (BX && BX.Main && BX.Main.gridManager) {
	        BX.Main.gridManager.reload(this.gridId);
	      }
	    }
	  }, {
	    key: "prepareTagsList",
	    value: function prepareTagsList(container) {
	      var _this25 = this;
	      var tagsContainers = container.querySelectorAll('.tasks-scrum-epic-grid-tags');
	      tagsContainers.forEach(function (tagsContainer) {
	        var tags = _this25.getTagsFromNode(tagsContainer);
	        main_core.Dom.clean(tagsContainer);
	        tags.forEach(function (tag) {
	          main_core.Dom.append(_this25.getTagNode(tag), tagsContainer);
	        });
	      });
	    }
	  }, {
	    key: "getTagsFromNode",
	    value: function getTagsFromNode(node) {
	      var tags = [];
	      node.childNodes.forEach(function (childNode) {
	        tags.push(childNode.textContent.trim());
	      });
	      return tags;
	    }
	  }, {
	    key: "getTagNode",
	    value: function getTagNode(tag) {
	      var tagLabel = new ui_label.Label({
	        text: tag,
	        color: ui_label.Label.Color.TAG_LIGHT,
	        fill: true,
	        size: ui_label.Label.Size.SM,
	        customClass: ''
	      });
	      return tagLabel.getContainer();
	    }
	  }, {
	    key: "getColorPicker",
	    value: function getColorPicker(colorNode) {
	      var _this26 = this;
	      var epicId = main_core.Dom.attr(colorNode, 'data-epic-id');
	      if (!this.colorPickers.has(epicId)) {
	        /* eslint-disable */
	        var picker = new BX.ColorPicker({
	          bindElement: colorNode,
	          defaultColor: this.defaultColor,
	          selectedColor: this.selectedColor ? this.selectedColor : this.defaultColor,
	          onColorSelected: function onColorSelected(color, picker) {
	            _this26.selectedColor = color;
	            colorNode.style.backgroundColor = color;
	          },
	          popupOptions: {
	            angle: {
	              position: 'top',
	              offset: 33
	            },
	            className: 'tasks-scrum-epic-color-popup'
	          },
	          allowCustomColor: false,
	          colors: [['#aae9fc', '#bbecf1', '#98e1dc', '#e3f299', '#ffee95', '#ffdd93', '#dfd3b6', '#e3c6bb'], ['#ffad97', '#ffbdbb', '#ffcbd8', '#ffc4e4', '#c4baed', '#dbdde0', '#bfc5cd', '#a2a8b0']]
	        });
	        this.colorPickers.set(epicId, picker);
	        /* eslint-enable */
	      }

	      return this.colorPickers.get(epicId);
	    }
	  }, {
	    key: "focusToName",
	    value: function focusToName() {
	      var _this27 = this;
	      setTimeout(function () {
	        _this27.form.querySelector('.tasks-scrum-epic-form-header-title-control').focus();
	      }, 50);
	    }
	  }, {
	    key: "getRequestData",
	    value: function getRequestData() {
	      var requestData = {};
	      if (this.currentEpic) {
	        requestData.epicId = this.currentEpic.id;
	      }
	      requestData.groupId = this.groupId;
	      requestData.name = this.form.querySelector('[name=name]').value.trim();
	      requestData.description = this.editorHandler.getEditor().GetContent();
	      requestData.color = this.selectedColor ? this.selectedColor : this.defaultColor;
	      requestData.files = this.getAttachmentsFiles();
	      return requestData;
	    }
	  }, {
	    key: "getAttachmentsFiles",
	    value: function getAttachmentsFiles() {
	      var _this28 = this;
	      var files = [];
	      if (!this.editorHandler || !main_core.Type.isPlainObject(this.editorHandler.arFiles) || !main_core.Type.isPlainObject(this.editorHandler.controllers)) {
	        return files;
	      }
	      var fileControllers = [];
	      Object.values(this.editorHandler.arFiles).forEach(function (controller) {
	        if (!fileControllers.includes(controller)) {
	          fileControllers.push(controller);
	        }
	      });
	      fileControllers.forEach(function (fileController) {
	        if (_this28.editorHandler.controllers[fileController] && main_core.Type.isPlainObject(_this28.editorHandler.controllers[fileController].values)) {
	          Object.keys(_this28.editorHandler.controllers[fileController].values).forEach(function (fileId) {
	            if (!files.includes(fileId)) {
	              files.push(fileId);
	            }
	          });
	        }
	      });
	      return files;
	    }
	  }], [{
	    key: "showView",
	    value: function showView(groupId, epicId) {
	      var epic = new Epic({
	        view: 'view',
	        groupId: groupId,
	        epicId: epicId
	      });
	      epic.show();
	    }
	  }, {
	    key: "showEdit",
	    value: function showEdit(groupId, epicId) {
	      var epic = new Epic({
	        view: 'edit',
	        groupId: groupId,
	        epicId: epicId
	      });
	      epic.show();
	    }
	  }, {
	    key: "removeEpic",
	    value: function removeEpic(groupId, epicId, gridId) {
	      var epic = new Epic({
	        view: 'edit',
	        groupId: groupId,
	        gridId: gridId,
	        epicId: epicId
	      });
	      epic.removeEpic().then(function () {
	        epic.reloadGrid();
	      });
	    }
	  }, {
	    key: "showTasks",
	    value: function showTasks(groupId, epicId) {
	      var epic = new Epic({
	        view: 'tasks',
	        groupId: groupId,
	        epicId: epicId
	      });
	      epic.show();
	    }
	  }, {
	    key: "showCompletedTasks",
	    value: function showCompletedTasks(groupId, epicId) {
	      var epic = new Epic({
	        view: 'completedTasks',
	        groupId: groupId,
	        epicId: epicId
	      });
	      epic.show();
	    }
	  }, {
	    key: "showTask",
	    value: function showTask(taskId) {
	      var sidePanelManager = BX.SidePanel.Instance;
	      sidePanelManager.getOpenSliders().forEach(function (openSlider) {
	        var frameWindow = openSlider.getWindow();
	        if (!main_core.Type.isNil(frameWindow) && !main_core.Type.isNil(frameWindow.BX.Tasks.Scrum.EpicInstance)) {
	          frameWindow.BX.Tasks.Scrum.EpicInstance.showTask(taskId);
	        }
	      });
	    }
	  }]);
	  return Epic;
	}(main_core_events.EventEmitter);

	exports.Filter = Filter;
	exports.Epic = Epic;

}((this.BX.Tasks.Scrum = this.BX.Tasks.Scrum || {}),BX.Event,BX.UI.SidePanel,BX.UI,BX,BX,BX.UI.Dialogs));
//# sourceMappingURL=epic.bundle.js.map
