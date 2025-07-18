;(function(window) {
	function Calendar(config, data, additionalParams)
	{
		this.DEFAULT_VIEW = 'month';
		this.RELOAD_DELAY = 500;
		this.REFRESH_DELAY = 500;
		this.id = config.id;
		this.showTasks = config.showTasks;
		this.util = new window.BXEventCalendar.Util(this, config, additionalParams);
		this.needForReload = false;
		this.pullEventList = new Set();

		if (this.util.isFilterEnabled() && config.filterId)
		{
			this.search = new BX.Calendar.Search(config.filterId);
		}

		if (config.settings && config.weekStart)
		{
			config.settings.week_start = config.weekStart;
		}

		this.externalMode = config.externalDataHandleMode;
		this.entityType = config.entityType || '';
		this.newEntryName = config.newEntryName || null;
		this.collapsedLabelMessage = config.collapsedLabelMessage || BX.message('EC_COLLAPSED_MESSAGE');
		this.viewOption = 'view' + (this.entityType ? '_' + this.entityType : '');

		BX.Calendar.Util.setCalendarContext(this);

		this.sectionManager = new BX.Calendar.SectionManager(data, config);
		this.entryManager = new BX.Calendar.EntryManager(data, config);
		this.roomsManager = new BX.Calendar.RoomsManager(data, config);
		this.categoryManager = new BX.Calendar.CategoryManager(data, config);
		// CollabManager uses it extension settings if no data.collabs presented
		this.collabManager = new BX.Calendar.CollabManager(data, config);
		if (BX.Calendar.Controls && BX.Calendar.Controls.Location)
		{
			BX.Calendar.Controls.Location.setLocationList(additionalParams.locationList);
		}

		this.entryController = new window.BXEventCalendar.EntryController(this, data);
		this.currentViewName = this.util.getUserOption(this.viewOption) || this.DEFAULT_VIEW;

		BX.Calendar.Util.setUserSettings(config.userSettings);
		BX.Calendar.Util.setOptions(config.settings);
		BX.Calendar.Util.setAccessNames(config.accessNames);
		BX.Calendar.Util.setEventWithEmailGuestEnabled(config.eventWithEmailGuestEnabled);
		BX.Calendar.Util.setProjectFeatureEnabled(config.projectFeatureEnabled);
		BX.Calendar.Util.setIsBitrix24Template(config.isBitrix24Template);

		BX.Calendar.Util.setDayMonthFormat(config.dayMonthFormat);
		BX.Calendar.Util.setLongDateFormat(config.longDateFormat);

		BX.Calendar.Util.setIphoneConnectionStatus(config.isIphoneConnected);
		BX.Calendar.Util.setMacConnectionStatus(config.isMacConnected);
		BX.Calendar.Util.setIcloudConnectionStatus(config.isIcloudConnected);
		BX.Calendar.Util.setGoogleConnectionStatus(config.isGoogleConnected);
		BX.Calendar.Util.setIsSharingFeatureEnabled(config.isSharingFeatureEnabled);
		BX.Calendar.Util.setSharingConfig(config.sharing);
		this.payAttentionToNewSharingFeature = config.payAttentionToNewSharingFeature;
		this.sharingFeatureLimitEnable = config.sharingFeatureLimitEnable;
		this.sharingSettingsCollapsed = config.sharingOptions?.sharingSettingsCollapsed;
		this.sortJointLinksByFrequentUse = config.sharingOptions?.sortJointLinksByFrequentUse;

		this.requests = {};
		this.currentUser = config.user;
		this.ownerUser = config.ownerUser || false;
		this.viewRangeDate = new Date();
		this.keyHandlerEnabled = true;
		this.isCollabUser = config.isCollabUser || false;
		this.isCollabCalendar = config.isCollabCalendar || false;
		this.isCollabFeatureEnabled = config.isCollabFeatureEnabled || false;

		// build basic DOM structure
		this.build();

		if (!this.isExternalMode())
		{
			if (config.startupEvent)
			{
				this.showStartUpEntry(config.startupEvent);
			}

			if (config.showAfterSyncAccent)
			{
				this.showAfterSyncAccent(config.showAfterSyncAccent);
			}
		}

		BX.Event.EventEmitter.subscribe('onPullEvent-calendar', this.handlePullEvent.bind(this));
		BX.Event.EventEmitter.subscribe('onPullEvent-tasks', this.handlePullEvent.bind(this));

		this.reloadDebounce = BX.Runtime.debounce(this.reload, this.RELOAD_DELAY, this);
		this.refreshDebounce = BX.Runtime.debounce(this.refresh, this.REFRESH_DELAY, this);
	}

	Calendar.prototype = {
		build: function()
		{
			this.mainCont = BX(this.id + '-main-container');
			if (this.mainCont)
			{
				// Build top block
				this.topBlock = BX.create('DIV', { props: { className: 'calendar-top-block' } });

				this.buildNavigation();

				// Top title
				this.viewTitleContainer = this.topBlock.appendChild(BX.create('DIV', { props: { className: 'calendar-top-title-container' } }));
				this.viewTitle = this.viewTitleContainer.appendChild(BX.create('H2', { props: { className: 'calendar-top-title' } }));

				this.mainCont.appendChild(this.topBlock);

				// Main views container
				this.viewsCont = BX.create('DIV', { props: { className: 'calendar-views-container calendar-disable-select' } });
				BX.bind(this.viewsCont, 'click', this.handleViewsClick.bind(this));

				this.dragDrop = new window.BXEventCalendar.DragDrop(this);

				if (this.util.isFilterEnabled() && !this.search.isFilterEmpty())
				{
					this.currentViewName = 'list';
				}

				if (this.isLocationViewDisabled())
				{
					this.currentViewName = 'month';
				}
				this.buildViews();

				// Build switch view control
				if (!this.isLocationViewDisabled())
				{
					this.buildViewSwitcher();
				}

				// Search & counters
				if (this.util.isFilterEnabled())
				{
					if (!this.search.isFilterEmpty())
					{
						this.search.applyFilter();
					}

					if (this.search && this.getCountersByCalendarContext())
					{
						this.buildCountersControl();
					}
				}

				this.mainCont.appendChild(this.viewsCont);
				this.rightBlock = this.mainCont.appendChild(BX.create('DIV', { props: { className: 'calendar-right-container' } }));

				BX.addCustomEvent(this, 'doRefresh', BX.proxy(this.refresh, this));
				BX.Event.bind(document.body, 'keyup', BX.proxy(this.keyUpHandler, this));
				BX.Event.bind(document.body, 'keydown', BX.proxy(this.keyDownHandler, this));
				BX.Event.bind(window, 'beforeunload', BX.Calendar.EntryManager.doDelayedActions);
				BX.addCustomEvent(this, 'changeViewRange', BX.Calendar.EntryManager.doDelayedActions);
				BX.Event.bind(document, 'visibilitychange', this.handleVisibilityChange.bind(this));

				this.topBlock.appendChild(BX.create('DIV', { style: { clear: 'both' } }));

				top.BX.addCustomEvent(top, 'onCalendarBeforeCustomSliderCreate', BX.proxy(this.loadCssList, this));

				top.BX.Event.EventEmitter.subscribe(
					'BX.Calendar:doRefresh',
					this.refresh.bind(this),
				);

				top.BX.Event.EventEmitter.subscribe(
					'BX.Calendar:doReloadCounters',
					top.BX.Runtime.debounce(this.updateCounters, 5000, this),
				);

				if (top !== window)
				{
					if (!top.BX.getClass('top.BX.SocNetLogDestination'))
					{
						top.BX.loadExt('socnetlogdest');
					}
					if (!top.BX.getClass('top.BX.Access'))
					{
						top.BX.loadExt('access');
					}
				}

				if (this.util.userIsOwner())
				{
					if (!this.util.isExtranetUser())
					{
						this.syncInterface = new BX.Calendar.Sync.Manager.Manager({
							wrapper: document.getElementById(this.id + '-sync-container'),
							syncInfo: this.util.config.syncInfo,
							payAttentionToNewSharingFeature: this.payAttentionToNewSharingFeature,
							userId: this.currentUser.id,
							syncLinks: this.util.config.syncLinks,
							isSetSyncGoogleSettings: this.util.config.isSetSyncGoogleSettings,
							isSetSyncOffice365Settings: this.util.config.isSetSyncOffice365Settings,
							sections: this.sectionManager.getSections(),
							portalAddress: this.util.config.caldav_link_all,
							isRuZone: this.util.config.isRuZone,
							calendar: this,
						});

						this.syncInterface.showSyncButton();
					}
				}

				if (this.util.userIsOwner() && !this.isCollabUser || this.isCollabCalendar)
				{
					this.sharingInterface = new BX.Calendar.Sharing.Interface({
						buttonWrap: document.querySelector(`#${this.id}-sharing-container`),
						userInfo: {
							id: this.currentUser.id,
							name: this.currentUser.name,
							avatar: this.currentUser.avatar,
							isCollabUser: this.isCollabUser,
						},
						payAttentionToNewFeature: this.payAttentionToNewSharingFeature,
						sharingFeatureLimit: !this.sharingFeatureLimitEnable,
						sharingSettingsCollapsed: this.sharingSettingsCollapsed,
						sortJointLinksByFrequentUse: this.sortJointLinksByFrequentUse,
						calendarContext: {
							sharingObjectType: this.util.config.type,
							sharingObjectId: this.util.config.ownerId,
						},
					});

					if (BX.Calendar.Util.checkSharingFeatureEnabled())
					{
						this.util.config.type === 'group'
							? this.sharingInterface.showGroupSharingButton()
							: this.sharingInterface.showSharingButton()
						;
					}
				}

				BX.Event.EventEmitter.subscribe('BX.Calendar.EventEditForm:onSave', function(event)
				{
					if (event instanceof BX.Event.BaseEvent)
					{
						var data = event.getData();
						if (data.options.recursionMode || data.responseData.reload)
						{
							this.reload();
						}
						else if (data.responseData && BX.Type.isArray(data.responseData.eventList))
						{
							this.entryController.handleEntriesList(data.responseData.eventList);
							this.getView().displayEntries();
						}
					}
				}.bind(this));

				BX.Event.EventEmitter.subscribe('BX.Calendar.CompactEventForm:onSave', function(event)
				{
					if (event instanceof BX.Event.BaseEvent)
					{
						var data = event.getData();
						if (data.options.recursionMode || data.responseData.reload)
						{
							this.reload();
						}
						else if (data.responseData && BX.Type.isArray(data.responseData.eventList))
						{
							this.entryController.handleEntriesList(data.responseData.eventList);
							this.getView().displayEntries();
						}
					}
				}.bind(this));

				BX.Event.EventEmitter.subscribe('BX.Calendar.Entry:onChangeMeetingStatus', function(event)
				{
					if (event instanceof BX.Event.BaseEvent)
					{
						const data = event.getData();
						if (BX.Type.isObjectLike(data.counters) && this.counters && this.getCountersByCalendarContext())
						{
							this.counters.setCountersValue(data.counters);
						}

						if (data.status === 'Y')
						{
							const section = this.sectionManager.getSection(data.entry.sectionId);
							section.show();
						}

						this.reload();
					}
				}.bind(this));

				BX.Event.EventEmitter.subscribe(
					'BX.Calendar.CompactEventForm:doRefresh',
					() => this.refreshDebounce(),
				);

				if (this.isLocationViewDisabled())
				{
					this.buildLockView();

					BX.addClass(this.mainCont, '--lock');

					if (this.lockView)
					{
						this.mainCont.appendChild(this.lockView);
					}
				}
			}
		},

		buildViews: function()
		{
			var
				avilableViews = this.util.getAvilableViews(),
				viewConstuctor = {
					day: window.BXEventCalendar.CalendarDayView,
					week: window.BXEventCalendar.CalendarWeekView,
					month: window.BXEventCalendar.CalendarMonthView,
					list: window.BXEventCalendar.CalendarListView,
				};

			this.views = [];
			if (BX.type.isArray(avilableViews))
			{
				avilableViews.forEach(function(viewName)
				{
					if (viewName && viewConstuctor[viewName])
					{
						this.views.push(new viewConstuctor[viewName](this));
					}
				}, this);
			}

			var customViews = this.util.getCustumViews();
			if (BX.type.isArray(customViews))
			{
				customViews.forEach(function(customView)
				{
					this.views.push(new window.BXEventCalendar.CalendarCustomView(this, customView));
				}, this);
			}

			BX.addCustomEvent(this, 'keydown', function(params)
			{
				if (BX.Calendar && BX.Calendar.Util && !BX.Calendar.Util.isAnyModifierKeyPressed(params.e))
				{
					this.views.forEach(function(view)
					{
						if (view.getHotkey() && BX.Calendar.Util.getKeyCode(view.getHotkey()) === params.keyCode)
						{
							BX.Calendar.Util.sendAnalyticLabel({
								calendarAction: 'viewChange',
								viewMode: 'hotkey',
								viewType: view.getName(),
							});
							this.setView(view.getName(), { animation: true });
						}
					}, this);
				}
			}.bind(this));

			BX.onCustomEvent(window, 'onCalendarBeforeBuildViews', [this.views, this]);
			this.views.forEach(this.buildView, this);
			this.viewTransition = new window.BXEventCalendar.ViewTransition(this);
			BX.onCustomEvent(window, 'onCalendarAfterBuildViews', [this]);
		},

		buildNavigation: function()
		{
			this.navigationWrap = this.topBlock.appendChild(BX.create('DIV', { props: { className: 'calendar-navigation-container' } }));
			this.navigationWrap.appendChild(BX.create('SPAN', {
				props: { className: 'calendar-navigation-previous' },
				events: { click: BX.delegate(this.showPrevious, this) },
			}));
			this.navigationWrap.appendChild(BX.create('SPAN', {
				props: { className: 'calendar-navigation-current' },
				text: BX.message('EC_TODAY'),
				events: { click: BX.delegate(this.showToday, this) },
			}));
			this.navigationWrap.appendChild(BX.create('SPAN', {
				props: { className: 'calendar-navigation-next' },
				events: { click: BX.delegate(this.showNext, this) },
			}));
		},

		showNext: function()
		{
			var viewRange = this.getView().increaseViewRangeDate();
			if (viewRange)
			{
				this.triggerEvent('changeViewDate', { viewRange: viewRange });
			}
		},

		showPrevious: function()
		{
			var viewRange = this.getView().decreaseViewRangeDate();
			if (viewRange)
			{
				this.triggerEvent('changeViewDate', { viewRange: viewRange });
			}
		},

		showToday: function()
		{
			var
				view = this.getView(),
				viewRange = view.adjustViewRangeToDate(new Date());

			if (viewRange)
			{
				this.triggerEvent('changeViewDate', { viewRange: viewRange });
			}
		},

		buildView: function(view)
		{
			var viewCont = view.getContainer();
			if (viewCont)
			{
				this.viewsCont.appendChild(viewCont);
			}

			if (this.currentViewName === view.getName())
			{
				this.setView(view.getName(), { first: true });
			}
		},

		buildViewSwitcher: function()
		{
			var views = [];
			var currentViewMode = null;
			this.views.forEach(function(view)
			{
				views.push({
					name: view.name,
					text: view.title || view.name,
					type: 'base',
					dataset: null,
					hotkey: view.getHotkey(),
				});
			}, this);

			if (BX.type.isArray(this.util.config.additionalViewModes))
			{
				this.util.config.additionalViewModes.forEach(function(view)
				{
					views.push({
						name: view.id,
						text: BX.util.htmlspecialchars(view.label),
						type: 'additional',
						dataset: view,
					});
					if (view.selected)
					{
						currentViewMode = view.id;
					}
				}, this);
			}

			this.viewSelector = new BX.Calendar.Controls.ViewSelector({
				views: views,
				currentView: this.getView(),
				currentViewMode: currentViewMode,
			});

			this.viewSelector.subscribe('onChange', function(event)
			{
				var data = event.getData();
				if (data && data.name)
				{
					if (data.type === 'base')
					{
						this.setView(data.name, { animation: true });
						BX.Calendar.Util.sendAnalyticLabel({
							calendarAction: 'viewChange',
							viewMode: 'selector',
							viewType: data.name,
						});
					}
					else if (data.type === 'additional')
					{
						this.triggerEvent('changeViewMode', data.dataset);
					}
				}
			}.bind(this));
			this.topBlock.appendChild(this.viewSelector.getOuterWrap());

			this.lineViewSelectorWrap = BX(this.id + '-view-switcher-container');
			if (this.lineViewSelectorWrap)
			{
				this.lineViewSelector = new BX.Calendar.Controls.LineViewSelector({
					views,
					currentViewMode,
					target: this.lineViewSelectorWrap,
					currentView: this.getView(),
				});

				this.lineViewSelector.subscribe('onChange', function(event)
				{
					var data = event.getData();
					if (data && data.name)
					{
						if (data.type === 'base')
						{
							this.setView(data.name, { animation: true });
							BX.Calendar.Util.sendAnalyticLabel({
								calendarAction: 'viewChange',
								viewMode: 'topmenu',
								viewType: data.name,
							});
						}
					}
				}.bind(this));
			}
		},

		buildLockView: function()
		{
			this.lockView = this.mainCont.appendChild(BX.create('DIV', {
				props: { className: 'calendar-view-locker' },
			}));
			this.lockViewContainer = this.lockView.appendChild(BX.create('DIV', {
				props: { className: 'calendar-view-locker-container' },
			}));
			this.lockViewContainer.appendChild(BX.create('DIV', {
				props: { className: 'calendar-view-locker-top' },
				html: '<div class="calendar-view-locker-icon"></div>'
					+ '<div class="calendar-view-locker-text">'
					+ BX.message('EC_LOCATION_VIEW_LOCKED')
					+ '</div>',
			}));
			this.lockViewContainer.appendChild(BX.create('DIV', {
				props: { className: 'calendar-view-locker-button' },
				html: '<a href="javascript:void(0)" '
					+ 'onclick="top.BX.UI.FeaturePromotersRegistry.getPromoter({ featureId: \'calendar_location\' }).show()" '
					+ 'class="ui-btn ui-btn-sm ui-btn-light-border ui-btn-round">'
					+ BX.message('EC_LOCATION_VIEW_UNLOCK_FEATURE')
					+ '</a>',
			}));
			top.BX.UI.FeaturePromotersRegistry.getPromoter({ featureId: 'calendar_location' }).show();
		},

		setView: function(view, params)
		{
			if (view)
			{
				if (!params)
				{
					params = {};
				}

				var
					currentView = this.getView(),
					viewRange = currentView.getViewRange(),
					newView = this.getView(view);

				if (this.viewSelector)
				{
					this.viewSelector.setValue(newView);
					this.viewSelector.closePopup();
				}

				if (this.lineViewSelector)
				{
					this.lineViewSelector.setValue(newView);
				}

				if (newView && (view !== this.currentViewName || !currentView.getIsBuilt()))
				{
					params.currentViewDate = this.getViewRangeDate();
					if (BX.type.isDate(params.date))
					{
						params.newViewDate = params.date;
					}
					else
					{
						params.newViewDate = newView.getAdjustedDate(params.date || false, viewRange, true);
					}

					params.currentView = currentView;
					params.newView = newView;
					this.setViewRangeDate(params.newViewDate);

					this.triggerEvent('beforeSetView', { currentViewName: this.currentViewName, newViewName: view });

					if (currentView.type === 'custom' || newView.type === 'custom')
					{
						params.animation = false;
					}

					if (this.rightBlock && (view === 'month' || view === 'week'))
					{
						this.rightBlock.style.display = 'none';
					}
					else if (this.rightBlock)
					{
						this.rightBlock.style.display = '';
					}

					const dayLength = 24 * 60 * 60 * 1000;
					if (view === 'day')
					{
						params.animation = params.animation
							&& this.getDisplayedViewRange().start.getTime() <= params.newViewDate.getTime()
							&& params.newViewDate.getTime() <= this.getDisplayedViewRange().end.getTime() + dayLength;
					}

					if (params.animation)
					{
						this.viewTransition.transit(params);
					}
					else
					{
						if (view !== this.currentViewName)
						{
							currentView.hide();
						}

						if (params.first === true)
						{
							this.initialViewShow = true;
							newView.adjustViewRangeToDate(params.newViewDate);
						}
						else
						{
							newView.adjustViewRangeToDate(params.newViewDate);
						}
						this.currentViewName = newView.getName();
					}

					if (params.first !== true)
					{
						this.util.setUserOption(this.viewOption, view);
					}
					this.triggerEvent('afterSetView', { viewName: view });
					BX.Calendar.Util.setCurrentView(view);
				}
			}
		},
		request: function(params)
		{
			if (!params.url)
			{
				params.url = this.util.getActionUrl();
			}
			if (params.bIter !== false)
			{
				params.bIter = true;
			}
			if (!params.data)
			{
				params.data = {};
			}

			var reqId;

			params.reqId = reqId = Math.round(Math.random() * 1000000);
			params.data.sessid = BX.bitrix_sessid();
			params.data.bx_event_calendar_request = 'Y';
			params.data.reqId = reqId;
			//params.data.action = params.action;

			var _this = this, iter = 0, handler;
			if (params.handler)
			{
				handler = function(result)
				{
					var handleRes = function()
					{
						if (_this.requests[reqId].status !== 'canceled')
						{
							var erInd = result.toLowerCase().indexOf('bx_event_calendar_action_error');
							if (!result || result.length <= 0 || erInd !== -1)
							{
								var errorText = '';
								if (erInd >= 0)
								{
									var ind1 = erInd + 'BX_EVENT_CALENDAR_ACTION_ERROR:'.length,
										ind2 = result.indexOf('-->', ind1);
									errorText = result.substr(ind1, ind2 - ind1);
								}
								if (BX.type.isFunction(params.onerror))
								{
									params.onerror();
								}

								return _this.displayError(errorText || params.errorText || '');
							}

							_this.requests[reqId].status = 'complete';

							var res = params.handler(_this.getRequestResult(reqId), result);
							if (res === false && ++iter < 20 && params.bIter)
							{
								setTimeout(handleRes, 5);
							}
							else
							{
								delete top.BXCRES[reqId];
							}
						}
					};

					setTimeout(handleRes, 50);
				};
			}
			else
			{
				handler = BX.DoNothing();
			}

			this.requests[params.reqId] = {
				status: 'sent',
				xhr: params.type === 'post' ? BX.ajax.post(params.url, params.data, handler) : BX.ajax.get(params.url, params.data, handler),
			};

			return params;
		},
		cancelRequest: function(reqId)
		{
			if (this.requests[reqId] && this.requests[reqId].status === 'sent')
			{
				this.requests[reqId].status = 'canceled';
			}
		},

		getRequestResult: function(key)
		{
			if (top.BXCRES && typeof top.BXCRES[key] != 'undefined')
			{
				return top.BXCRES[key];
			}

			return {};
		},
		displayError: function(str, bReloadPage)
		{
			if (BX.type.isArray(str) && str.length > 0)
			{
				var
					errorMessage = '',
					errors = str;
				for (var i = 0; i < errors.length; i++)
				{
					errorMessage += errors[i].message + '\n';
				}
				str = errorMessage;
			}

			var _this = this;
			setTimeout(function()
			{
				if (!_this.bOnunload)
				{
					alert(str || '[Bitrix Calendar] Request error');
					if (bReloadPage)
					{
						BX.reload();
					}
				}
			}, 200);
		},

		triggerEvent: function(eventName, params)
		{
			BX.onCustomEvent(this, eventName, [params]);
		},

		getView: function(viewName)
		{
			viewName = viewName || this.currentViewName;
			for (var i = 0; i < this.views.length; i++)
			{
				if (this.views[i].getName() === viewName)
				{
					return this.views[i];
				}
			}
			return this.views[0];
		},

		getViewRangeDate: function()
		{
			if (!this.viewRangeDate)
			{
				this.viewRangeDate = new Date();
			}
			this.viewRangeDate.setHours(0, 0, 0, 0);
			return this.viewRangeDate;
		},

		setViewRangeDate: function(date)
		{
			this.viewRangeDate = date;
			this.triggerEvent('changeViewRange', date);
		},

		getDisplayedViewRange: function()
		{
			return this.displayedRange;
		},
		setDisplayedViewRange: function(viewRange)
		{
			this.displayedRange = viewRange;
		},

		handleViewsClick: function(e)
		{
			var
				target = e.target || e.srcElement,
				specTarget = this.util.findTargetNode(target, this.viewsCont);

			if (specTarget)
			{
				if (specTarget.getAttribute('data-bx-calendar-weeknumber'))
				{
					this.setView('week', {
						date: new Date(parseInt(specTarget.getAttribute('data-bx-cal-time'))),
						animation: true,
					});
				}
				else if (specTarget.getAttribute('data-bx-calendar-date'))
				{
					// Go to day view
					this.setView('day', {
						date: new Date(parseInt(specTarget.getAttribute('data-bx-calendar-date'))),
						animation: true,
					});
				}

				this.triggerEvent('viewOnClick',
					{
						e: e,
						target: target,
						specialTarget: specTarget,
					});
			}
		},

		handleViewsMousedown: function(e)
		{
			var
				target = e.target || e.srcElement,
				specTarget = this.util.findTargetNode(target, this.viewsCont);

			if (specTarget)
			{
				this.triggerEvent('viewOnMouseDown',
					{
						e: e,
						target: target,
						specialTarget: specTarget,
					});
			}
		},

		disableKeyHandler: function()
		{
			this.keyHandlerEnabled = false;
		},

		enableKeyHandler: function()
		{
			this.keyHandlerEnabled = true;
		},

		isKeyHandlerEnabled: function(e)
		{
			var target = e.target || e.srcElement;

			if (target && BX.Type.isDomNode(target))
			{
				if ({ 'INPUT': true, 'TEXTAREA': true }[target.nodeName])
				{
					return false;
				}
			}

			var res = this.keyHandlerEnabled
				&& !BX.hasClass(document.body, 'bx-im-fullscreen-block-scroll')
				&& !BX.hasClass(document.body, 'side-panel-disable-scrollbar');

			if (res)
			{
				var i, popups = document.body.querySelectorAll('.popup-window');
				for (i = 0; i < popups.length; i++)
				{
					if (popups[i]
						&& popups[i].style.display !== 'none'
						&& !BX.hasClass(popups[i], 'calendar-view-switcher-popup'))
					{
						res = false;
						break;
					}
				}
			}

			return res;
		},

		keyUpHandler: function(e)
		{
			if (this.isKeyHandlerEnabled(e))
			{
				var keyCode = e.keyCode;
				if (keyCode === BX.Calendar.Util.getKeyCode('left'))
				{
					this.showPrevious();
				}
				else if (keyCode === BX.Calendar.Util.getKeyCode('right'))
				{
					this.showNext();
				}

				this.triggerEvent('keyup', { e: e, keyCode: keyCode });
			}
		},

		keyDownHandler: function(e)
		{
			if (this.isKeyHandlerEnabled(e))
			{
				const keyCode = e.keyCode;
				this.triggerEvent('keydown', { e, keyCode });
			}
		},

		buildCountersControl: function()
		{
			this.countersCont = BX(`${this.id}-counter-container`);

			this.counters = new BX.Calendar.Counters({
				search: this.search,
				countersWrap: this.countersCont,
				counters: this.getCountersByCalendarContext(),
				userId: this.currentUser.id,
			});

			this.counters.init();
		},

		refresh: function()
		{
			this.getView().reload();
		},

		reload: function(params)
		{
			if (BX.Calendar.Util.documentIsDisplayingNow())
			{
				this.needForReload = false;
				this.entryController.clearLoadIndexCache();
				this.refresh();
			}
			else
			{
				this.needForReload = true;
			}
		},

		handleVisibilityChange: function()
		{
			if (this.needForReload)
			{
				this.reloadDebounce();
			}

			if (this.pullEventList.size)
			{
				this.pullEventList.forEach((value, valueAgain, set) =>
				{
					if (
						this.entryManager
						&& [
							'edit_event',
							'delete_event',
							'set_meeting_status',
							'task_remove',
							'task_add',
							'task_update',
						].includes(value.command)
					)
					{
						this.entryManager.handlePullChanges(value);
						this.reloadDebounce();
					}

					if (
						this.sectionManager
						&& ['edit_section', 'delete_section', 'change_section_subscription'].includes(value.command)
					)
					{
						this.sectionManager.reloadDataDebounce();
						if (this.sectionInterface)
						{
							this.sectionInterface.close();
						}
					}

					if (
						this.syncInterface
						&& ['refresh_sync_status', 'refresh_sync_status', 'delete_sync_connection'].includes(value.command)
					)
					{
						// TODO: refresh whole sync interface
						// this.syncInterface.updateSyncStatus(value);
					}
				});

				this.pullEventList.clear();
			}
		},

		showStartUpEntry: function(startupEntry)
		{
			BX.Calendar.EntryManager.openViewSlider(startupEntry.ID,
				{
					from: BX.Calendar.Util.parseDate(startupEntry['~CURRENT_DATE']),
					timezoneOffset: startupEntry.TZ_OFFSET_FROM || null,
					link: location.href,
				},
			);
		},

		isExternalMode: function()
		{
			return this.externalMode;
		},

		showLoader: function()
		{
			if (this.viewsCont)
			{
				if (this.entryLoader)
				{
					this.entryLoader.destroy();
				}

				this.entryLoader = new BX.Loader({
					target: this.viewsCont,
				});
				this.entryLoader.layout.style.zIndex = 1000;
				this.entryLoader.show();

				this.mainCont.style.opacity = '0.5';
			}
		},

		hideLoader: function()
		{
			if (this.entryLoader)
			{
				this.entryLoader.destroy();
			}

			this.mainCont.style.opacity = '';
		},

		getCurrentViewName: function()
		{
			return this.currentViewName;
		},

		loadCssList: function()
		{
			if (window.top && window.top.BX)
			{
				window.top.BX.loadCSS([
					'/bitrix/components/bitrix/calendar.grid/templates/.default/style.css',
					'/bitrix/js/calendar/new/calendar.css',
					'/bitrix/js/calendar/cal-style.css',
				]);
			}
		},

		handlePullEvent: function(event)
		{
			if (event && BX.Type.isFunction(event.getData))
			{
				const data = {
					command: event.getData()[0],
					...event.getData()[1],
				};

				if (BX.Calendar.Util.documentIsDisplayingNow())
				{
					this.processPullEvent(data);
				}
				else
				{
					this.storePullEvent(data);
				}
			}
		},

		storePullEvent: function(data)
		{
			if (!BX.Calendar.Util.checkRequestId(data.requestUid))
			{
				return;
			}

			if (this.pullEventList.has(data))
			{
				this.pullEventList.delete(data);
			}
			this.pullEventList.add(data);
		},

		processPullEvent: function(data)
		{
			data.sections = this.sectionManager.getSections();
			switch (data.command)
			{
				case 'edit_event':
				case 'edit_event_location':
				case 'delete_event':
				case 'delete_event_location':
				case 'set_meeting_status':
					this.entryManager.handlePullChanges(data);
					break;
				case 'edit_section':
				case 'delete_section':
				case 'change_section_subscription':
				case 'hidden_sections_updated':
					this.sectionManager.handlePullChanges(data);
					break;
				case 'delete_room':
				case 'create_room':
				case 'update_room':
					this.roomsManager.handlePullRoomChanges(data);
					break;
				case 'delete_category':
				case 'create_category':
				case 'update_category':
					this.categoryManager.handlePullCategoryChanges(data);
					break;
				case 'change_section_customization':
					this.reloadDebounce();
					break;
				case 'refresh_sync_status':
				case 'add_sync_connection':
				case 'delete_sync_connection':
				case 'process_sync_connection':
					if (this.syncInterface)
					{
						this.syncInterface.handlePullEvent(data);
					}
					break;
				case 'task_remove':
				case 'task_add':
				case 'task_update':
					this.reloadDebounce();
					break;
			}
		},

		getCalendarType: function()
		{
			return this.util.type;
		},

		getOwnerId: function()
		{
			return parseInt(this.util.ownerId);
		},

		getUserId: function()
		{
			return parseInt(this.util.userId);
		},

		updateCounters()
		{
			return new Promise(
				(resolve) => {
					BX.ajax.runAction('calendar.api.calendarajax.updateCounters', {
						data: { type: this.getCalendarType(), ownerId: this.util.ownerId },
					}).then(
						(response) => {
							if (
								BX.Type.isObjectLike(response.data.counters)
								&& this.counters
								&& this.getCountersByCalendarContext()
							)
							{
								this.counters.setCountersValue(response.data.counters);
							}
							resolve();
						},
						(response) => {
							BX.Calendar.Util.displayError(response.errors);
							resolve(response);
						},
					);
				},
			);
		},

		showAfterSyncAccent: function(showAfterSyncAccent)
		{
			return;
			BX.Calendar.Sync.Interface.AfterSyncTour.createInstance(
				{
					showAfterSyncAccent: showAfterSyncAccent,
					view: this.getView(),
				})
				.show();
		},

		isLocationViewDisabled: function()
		{
			return !this.util.config.locationFeatureEnabled
				&& this.util.config.type === 'location';
		},

		getCountersByCalendarContext()
		{
			const counters = this.util.getCounters();

			if (!counters)
			{
				return null;
			}

			const counterNameByContext = this.getCountersNameByContext();

			if (!counterNameByContext)
			{
				return null;
			}

			const neededCounter = counters[counterNameByContext];

			return neededCounter ? { [counterNameByContext]: neededCounter } : null;
		},

		getCountersNameByContext()
		{
			if (this.getCalendarType() === 'user')
			{
				return BX.Calendar.Counters.TYPE_INVITATION;
			}

			if (this.getCalendarType() === 'group')
			{
				return BX.Calendar.Counters.getCounterNameByGroupId(this.util.ownerId);
			}

			return null;
		},
	};

	if (window.BXEventCalendar)
	{
		window.BXEventCalendar.Core = Calendar;
	}
	else
	{
		BX.addCustomEvent(window, 'onBXEventCalendarInit', function()
		{
			window.BXEventCalendar.Core = Calendar;
		});
	}
})(window);
