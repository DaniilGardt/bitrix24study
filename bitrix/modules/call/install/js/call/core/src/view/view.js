import { Browser, Dom, Runtime, Text, Type, Loc } from 'main.core';
import {BaseEvent, EventEmitter} from 'main.core.events';
import {Popup} from 'main.popup';
import {DesktopApi} from 'im.v2.lib.desktop-api';

import {UserModel, UserRegistry} from './user-registry'
import * as Buttons from './buttons';
import {BackgroundDialog} from '../dialogs/background_dialog';
import {CallUserMobile, MobileMenu, MobileSlider, UserSelectorMobile} from './mobile';
import {CallUser} from './call-user';
import {Hardware} from '../hardware';
import {FloorRequest} from './floor-request';
import {NotificationManager} from './notifications';
import {DeviceSelector} from './device-selector';
import {EndpointDirection, UserState} from '../engine/engine';
import Util from '../util';
import { CallAI } from '../call_ai';
import { CopilotNotify, CopilotNotifyType } from './copilot-notify';
import { MediaRenderer } from './media-renderer';
import { PictureInPictureWindow } from './pictureInPictureWindow';
import { Utils } from 'im.v2.lib.utils';
import {UserSelector} from './user-selector';

import { PromoManager } from 'im.v2.lib.promo';
import { AhaMomentNotify } from './aha-moment-notify';

import '../css/view.css';

const Layouts = {
	Grid: 1,
	Centered: 2,
	Mobile: 3
};

const RerenderReason = {
	VideoEnabled: 'videoEnabled',
	VideoDisabled: 'videoDisabled',
	UserDisconnected: 'userDisconnected',
};

const SwapType = {
	Direct: 'direct',
	Replace: 'replace',
};

const UiState = {
	Preparing: 1,
	Initializing: 2,
	Calling: 3,
	Connected: 4,
	Error: 5
};

const Size = {
	Folded: 'folded',
	Full: 'full'
};

const RecordState = {
	Started: 'started',
	Resumed: 'resumed',
	Paused: 'paused',
	Stopped: 'stopped'
};

const RecordType = {
	None: 'none',
	Video: 'video',
	Audio: 'audio',
};

const RoomState = {
	None: 1,
	Speaker: 2,
	NonSpeaker: 3,
}

const EventName = {
	onShow: 'onShow',
	onClose: 'onClose',
	onDestroy: 'onDestroy',
	onButtonClick: 'onButtonClick',
	onBodyClick: 'onBodyClick',
	onReplaceCamera: 'onReplaceCamera',
	onReplaceMicrophone: 'onReplaceMicrophone',
	onReplaceSpeaker: 'onReplaceSpeaker',
	onSetCentralUser: 'onSetCentralUser',
	onLayoutChange: 'onLayoutChange',
	onChangeHdVideo: 'onChangeHdVideo',
	onChangeMicAutoParams: 'onChangeMicAutoParams',
	onChangeFaceImprove: 'onChangeFaceImprove',
	onUserClick: 'onUserClick',
	onUserRename: 'onUserRename',
	onUserPinned: 'onUserPinned',
	onDeviceSelectorShow: 'onDeviceSelectorShow',
	onOpenAdvancedSettings: 'onOpenAdvancedSettings',
	onHasMainStream: 'onHasMainStream',
	onTurnOffParticipantMic: 'onTurnOffParticipantMic',
	onTurnOffParticipantCam: 'onTurnOffParticipantCam',
	onTurnOffParticipantScreenshare: 'onTurnOffParticipantScreenshare',
	onAllowSpeakPermission: 'onAllowSpeakPermission',
	onDisallowSpeakPermission: 'onDisallowSpeakPermission',
	onToggleSubscribe: 'onToggleSubscribe',
	onUnfold: 'onUnfold',
};

const beginingPosition = -1;
const newUserPosition = 999;
const addButtonPosition = 1001;

const MIN_WIDTH = 250;

const SIDE_USER_WIDTH = 160; // keep in sync with .bx-messenger-videocall-user-block .bx-messenger-videocall-user width
const SIDE_USER_HEIGHT = 90; // keep in sync with .bx-messenger-videocall-user height

const MAX_USERS_PER_PAGE = 19;
const MIN_GRID_USER_WIDTH = 180;
const MIN_GRID_USER_HEIGHT = 100;

const CHANGE_VIDEO_RERENDER_DELAY = 3000;
const WAITING_VIDEO_DELAY = 3000;

const CALLCONTROL_PROMO_ID = 'call:callcontrol-notify-promo:07052025:all';

type ViewOptions = {
	title: ?string,
	container: HTMLElement,
	baseZIndex: number,
	cameraId: string,
	microphoneId: string,
	showChatButtons: boolean,
	showUsersButton: boolean,
	showShareButton: boolean,
	showRecordButton: boolean,
	showDocumentButton: boolean,
	showButtonPanel: boolean,
	broadcastingMode: boolean,
	broadcastingPresenters: number[],
	language: string,
	userData: {},
	userLimit: number,
	isIntranetOrExtranet: boolean,
	mediaSelectionBlocked: boolean,
	blockedButtons: string[],
	hiddenButtons: string[],
	hiddenTopButtons: string[],
	uiState: string,
	layout: string,
	userStates: {},
	showAddUserButtonInList?: boolean,
	isCopilotFeaturesEnabled: boolean,
	isCopilotActive: boolean,
	isWindowFocus?: boolean,
	isVideoconf: boolean,
}

export class View
{
	centralUser: CallUser
	callMenu: ?MobileMenu
	participantsMenu: ?MobileMenu
	pinnedUser: ?CallUser
	userMenu: ?MobileMenu
	userRegistry: UserRegistry
	users: { [key: number]: CallUser; }
	screenUsers: { [key: number]: CallUser; }

	constructor(config: ViewOptions)
	{
		this.title = config.title;
		this.container = config.container;
		this.baseZIndex = config.baseZIndex;
		this.cameraId = config.cameraId;
		this.microphoneId = config.microphoneId;

		this.speakerId = '';
		this.speakerMuted = false;
		this.showChatButtons = (config.showChatButtons === true);
		this.showUsersButton = (config.showUsersButton === true);
		this.showShareButton = (config.showShareButton !== false);
		this.showRecordButton = (config.showRecordButton !== false);
		this.showDocumentButton = (config.showDocumentButton !== false);
		this.showCopilotButton = (config.showCopilotButton !== false);
		this.showButtonPanel = (config.showButtonPanel !== false);
		this.showAddUserButtonInList = config.showAddUserButtonInList || false;
		this.preferInitialWindowPlacementPictureInPicture = true;

		this.limitation = null;
		this.inactiveUsers = [];
		this.activeUsers = [];
		this.rerenderTimeout = null;
		this.waitingForUserMediaTimeouts = new Map();
		this.rerenderQueue = new Map();
		this.shelvedRerenderQueue = new Map();

		this.broadcastingMode = BX.prop.getBoolean(config, "broadcastingMode", false);
		this.broadcastingPresenters = BX.prop.getArray(config, "broadcastingPresenters", []);

		this.currentPage = 1;
		this.pagesCount = 1;

		this.usersPerPage = 0; // initializes after rendering and on resize

		this.language = config.language || '';

		this.lastPosition = 1;

		this.userData = {};
		if (config.userData)
		{
			this.updateUserData(config.userData);
		}
		this.userLimit = config.userLimit || 1;
		this.userId = BX.message('USER_ID');
		this.isIntranetOrExtranet = BX.prop.getBoolean(config, "isIntranetOrExtranet", true);
		this.users = {}; // Call participants. The key is the user id.
		this.screenUsers = {}; // Screen sharing participants. The key is the user id.
		this.userRegistry = new UserRegistry();

		let localUserModel = new UserModel({
			id: this.userId,
			state: BX.prop.getString(config, "localUserState", UserState.Connected),
			localUser: true,
			order: beginingPosition,
			name: this.userData[this.userId] ? this.userData[this.userId].name : '',
			avatar: this.userData[this.userId] ? this.userData[this.userId].avatar_hr : '',
		});
		this.userRegistry.push(localUserModel);

		this.localUser = new CallUser({
			parentContainer: this.container,
			userModel: localUserModel,
			allowBackgroundItem: BackgroundDialog.isAvailable() && this.isIntranetOrExtranet,
			allowMaskItem: BackgroundDialog.isMaskAvailable() && this.isIntranetOrExtranet,
			onUserRename: this._onUserRename.bind(this),
			onUserRenameInputFocus: this._onUserRenameInputFocus.bind(this),
			onUserRenameInputBlur: this._onUserRenameInputBlur.bind(this),
			onClick: this._onUserClick.bind(this),
			onTurnOffParticipantMic: this._onTurnOffParticipantMic.bind(this),
			onTurnOffParticipantCam: this._onTurnOffParticipantCam.bind(this),
			onTurnOffParticipantScreenshare: this._onTurnOffParticipantScreenshare.bind(this),
			onPin: this._onUserPin.bind(this),
			onUnPin: this._onUserUnPin.bind(this),
		});

		this.centralUser = this.localUser; //show local user until someone is connected
		this.centralUserMobile = null;
		this.pinnedUser = null;
		this.presenterId = null;

		this.returnToGridAfterScreenStopped = false;

		this.mediaSelectionBlocked = (config.mediaSelectionBlocked === true);

		this.visible = false;
		this.elements = {
			root: null,
			wrap: null,
			watermark: null,
			container: null,
			overlay: null,
			topPanel: null,
			bottom: null,
			notificationPanel: null,
			panel: null,
			audioContainer: null,
			screenAudioContainer: null,
			audio: {
				// userId: <audio> for this user's stream
			},
			screenAudio: {
				// userId: <audio> for this user's stream
			},
			center: null,
			localUserMobile: null,
			userBlock: null,
			ear: {
				left: null,
				right: null
			},
			userList: {
				container: null,
				addButton: null
			},
			userSelectorContainer: null,
			pinnedUserContainer: null,
			renameSlider: {
				input: null,
				button: null
			},
			pageNavigatorLeft: null,
			pageNavigatorLeftCounter: null,
			pageNavigatorRight: null,
			pageNavigatorRightCounter: null,
		};

		this.buttons = {
			title: null,
			grid: null,
			add: null,
			share: null,
			record: null,
			document: null,
			copilot: null,
			microphone: null,
			camera: null,
			speaker: null,
			screen: null,
			mobileMenu: null,
			chat: null,
			users: null,
			history: null,
			hangup: null,
			fullscreen: null,
			overlay: null,
			status: null,
			returnToCall: null,
			recordStatus: null,
			participants: null,
			participantsMobile: null,
			watermark: null,
			hd: null,
			protected: null,
			more: null,
			hangupOptions: null,
		};

		this.size = Size.Full;
		this.maxWidth = null;
		this.isMuted = Hardware.isMicrophoneMuted;
		this.isCameraOn = Hardware.isCameraOn;
		this.isFullScreen = false;
		this.isUserBlockFolded = false;

		this.recordState = this.getDefaultRecordState();

		this.blockedButtons = {};
		let configBlockedButtons = BX.prop.getArray(config, "blockedButtons", []);
		configBlockedButtons.forEach(buttonCode => this.blockedButtons[buttonCode] = true);

		this.hiddenButtons = {};
		this.overflownButtons = {};
		if (!this.showUsersButton)
		{
			this.hiddenButtons['users'] = true;
		}
		let configHiddenButtons = BX.prop.getArray(config, "hiddenButtons", []);
		configHiddenButtons.forEach(buttonCode => this.hiddenButtons[buttonCode] = true);

		this.hiddenTopButtons = {};
		let configHiddenTopButtons = BX.prop.getArray(config, "hiddenTopButtons", []);
		configHiddenTopButtons.forEach(buttonCode => this.hiddenTopButtons[buttonCode] = true);

		this.uiState = config.uiState || UiState.Calling;
		this.layout = config.layout || Layouts.Centered;
		this.whiteSpaceInUserGrid = 0;
		this.roomState = RoomState.None;

		this.eventEmitter = new EventEmitter(this, 'BX.Call.View');

		this.scrollInterval = 0;

		// Event handlers
		this._onFullScreenChangeHandler = this._onFullScreenChange.bind(this);
		//this._onResizeHandler = BX.throttle(this._onResize.bind(this), 500);
		this._onResizeHandler = this._onResize.bind(this);
		this._onOrientationChangeHandler = BX.debounce(this._onOrientationChange.bind(this), 500);
		this._onKeyDownHandler = this._onKeyDown.bind(this);
		this._onKeyUpHandler = this._onKeyUp.bind(this);

		this.resizeObserver = new BX.ResizeObserver(this._onResizeHandler);
		this.intersectionObserver = null;

		// timers
		this.switchPresenterTimeout = 0;

		this.deviceSelector = null;
		this.userSelector = null;
		this.pinnedUserContainer = null;

		this.renameSlider = null;

		this.userSize = {width: 0, height: 0};

		this.hintManager = BX.UI.Hint.createInstance({
			popupParameters: {
				targetContainer: document.body,
				className: 'bx-messenger-videocall-panel-item-hotkey-hint',
				bindOptions: {forceBindPosition: true},
				angle: false
			}
		});

		this.hotKey = {
			all: Util.isDesktop(),
			microphone: true,
			microphoneSpace: true,
			camera: true,
			screen: true,
			record: true,
			speaker: true,
			chat: true,
			users: true,
			floorRequest: true,
			muteSpeaker: true,
			grid: true,
		};
		this.hotKeyTemporaryBlock = 0;

		this._isPreparing = false;
		this._videoRerenderDelay = 0;

		this.isWindowFocus = config.isWindowFocus || false;
		this.isDocumentHidden = false;
		this._isActivePiPFromController = false;

		this.init();
		this.subscribeEvents(config);
		if (Type.isPlainObject(config.userStates))
		{
			this.appendUsers(config.userStates);
		}

		/*this.resizeCalled = 0;
		this.reportResizeCalled = BX.debounce(function()
		{
			console.log('resizeCalled ' + this.resizeCalled + ' times');
			this.resizeCalled = 0;
		}.bind(this), 100)*/

		this.hideEarTimer = null;

		this.isCopilotFeaturesEnabled = config.isCopilotFeaturesEnabled || false;
		this.isCopilotActive = config.isCopilotActive || false;
		this.copilotNotify = null;

		this.ahaMomentNotify = null;

		this.pictureInPictureCallWindow = null;

		this.floorRequestNotifications = [];
		this.currentPiPUserId = null;

		this.isVideoconf = config.isVideoconf || false;

		this.needToShowCallcontrolPromo = this.isVideoconf ? false : PromoManager.getInstance().needToShow(CALLCONTROL_PROMO_ID);
	};

	openArticle(articleCode)
	{
		const infoHelper = BX.UI.InfoHelper;

		if (infoHelper.isOpen())
		{
			infoHelper.close()
		}

		infoHelper.show(articleCode);
	}

	onClickButtonWithLimit(limitObj, handle)
	{
		const {enabled, articleCode} = limitObj;

		if (enabled && typeof handle === "function") {
			handle()

			return;
		}

		if (!enabled && articleCode) {
			if (this.size === View.Size.Folded)
			{
				this._onBodyClick();
			}

			this.openArticle(articleCode)
		}
	}

	getLimitation()
	{
		this.limitation = Util.getCallFeatures();
	}

	getLimitationByType(type)
	{
		const defaultLimitation = {enable: true};

		const currentLimitation = this.limitation?.[`call_${type}`];

		if (!currentLimitation) {
			return defaultLimitation;
		}

		return {
			enabled: currentLimitation.enable,
			articleCode: currentLimitation.articleCode
		}
	}

	getBackgroundLimitation()
	{
		return this.getLimitationByType('background')
	}

	getBackgroundBlurLimitation()
	{
		return this.getLimitationByType('background_blur')
	}

	getRecordLimitation()
	{
		return this.getLimitationByType('record')
	}

	getScreenSharingLimitation()
	{
		return this.getLimitationByType('screen_sharing')
	}

	isDesktopCall()
	{
		return DesktopApi.isDesktop();
	}
	checkAvailableBackgroundImage()
	{
		if (!this.isDesktopCall())
		{
			return;
		}

		const {id: backgroundId} = DesktopApi.getBackgroundImage();

		if (!backgroundId || backgroundId === 'none') {
			DesktopApi.setCallBackground('none', 'none')
		}
	}

	toggleVisibilityEar()
	{
		if (this.hideEarTimer)
		{
			clearTimeout(this.hideEarTimer);
			this.hideEarTimer = null;
		}

		this.elements.ear.top?.classList.add("force-visible");
		this.elements.ear.bottom?.classList.add("force-visible");
		this.elements.pageNavigatorLeft?.classList.add("force-visible");
		this.elements.pageNavigatorRight?.classList.add("force-visible");

		this.hideEarTimer = setTimeout(() =>
		{
			this.elements.ear.top?.classList.remove("force-visible");
			this.elements.ear.bottom?.classList.remove("force-visible");
			this.elements.pageNavigatorLeft?.classList.remove("force-visible");
			this.elements.pageNavigatorRight?.classList.remove("force-visible");
		}, 5000);
	}

	toggleVisibilityChangeDocumentEvent(isActive)
	{
		const settings = (() =>
		{
			if (typeof document.hidden !== "undefined")
			{
				return {
					hidden: 'hidden',
					eventName: 'visibilitychange',
				};
			}
			else if (typeof document.msHidden !== "undefined")
			{
				return {
					hidden: 'msHidden',
					eventName: 'msvisibilitychange',
				};
			}
			else if (typeof document.webkitHidden !== "undefined")
			{
				return {
					hidden: 'webkitHidden',
					eventName: 'webkitvisibilitychange',
				};
			}
			else
			{
				return null;
			}
		})();

		if (settings) {
			document[`${isActive ? 'add' : 'remove'}EventListener`](settings.eventName, () =>
			{
				this.isDocumentHidden = document[settings.hidden];

				if (this.pictureInPictureCallWindow)
				{
					this.pictureInPictureCallWindow.setButtons(this.getPictureInPictureCallWindowGetButtonsList());
					this.pictureInPictureCallWindow.updateButtons();
				}

				if (DesktopApi.isDesktop() && !this.destroyed) {
					this.toggleStatePictureInPictureCallWindow(this.isDocumentHidden || this._isActivePiPFromController)
				}
			});
		}
	}

	init()
	{
		this.getLimitation();
		this.checkAvailableBackgroundImage();

		if (this.isFullScreenSupported())
		{
			if (Browser.isChrome() || Browser.isSafari())
			{
				window.addEventListener("fullscreenchange", this._onFullScreenChangeHandler);
				window.addEventListener("webkitfullscreenchange", this._onFullScreenChangeHandler);
			}
			else if (Browser.isFirefox())
			{
				window.addEventListener("mozfullscreenchange", this._onFullScreenChangeHandler);
			}
		}
		if (Browser.isMobile())
		{
			document.documentElement.style.setProperty('--view-height', window.innerHeight + 'px');
			window.addEventListener("orientationchange", this._onOrientationChangeHandler);
		}

		this.elements.audioContainer = Dom.create("div", {
			props: {className: "bx-messenger-videocall-audio-container"}
		});

		this.elements.screenAudioContainer = Dom.create("div", {
			props: {className: "bx-messenger-videocall-audio-container"}
		});

		if (Hardware.initialized)
		{
			this.setSpeakerId(Hardware.defaultSpeaker);
		}
		else
		{
			Hardware.subscribe(Hardware.Events.initialized, function ()
			{
				this.setSpeakerId(Hardware.defaultSpeaker);
			}.bind(this))
		}

		Hardware.subscribe(Hardware.Events.onChangeMicrophoneMuted, this.setMuted);
		Hardware.subscribe(Hardware.Events.onChangeCameraOn, this.setCameraState);

		window.addEventListener("keydown", this._onKeyDownHandler);
		window.addEventListener("keyup", this._onKeyUpHandler);

		this.onMouseMoveHandler = this.toggleVisibilityEar.bind(this);
		document.addEventListener('mousemove', this.onMouseMoveHandler);
		// TODO: Disable PiP on minimize
		// this.toggleVisibilityChangeDocumentEvent(true);
		if (Browser.isMac())
		{
			this.keyModifier = '&#8984; + Shift';
		}
		else
		{
			this.keyModifier = 'Ctrl + Shift';
		}

		this.container.appendChild(this.elements.audioContainer);
		this.container.appendChild(this.elements.screenAudioContainer);
	};

	get isActivePiPFromController()
	{
		return this._isActivePiPFromController;
	}

	set isActivePiPFromController(isActive)
	{
		this._isActivePiPFromController = isActive;
	}

	get isPreparing()
	{
		return this._isPreparing;
	};

	set isPreparing(isPreparing)
	{
		this._isPreparing = !!isPreparing;
	};

	// for testing different delay values
	get videoRerenderDelay()
	{
		return this._videoRerenderDelay > 0 ? this._videoRerenderDelay : CHANGE_VIDEO_RERENDER_DELAY;
	};

	set videoRerenderDelay(videoRerenderDelay)
	{
		this._videoRerenderDelay = videoRerenderDelay;
	};

	subscribeEvents(config)
	{
		for (let event in EventName)
		{
			if (EventName.hasOwnProperty(event) && Type.isFunction(config[event]))
			{
				this.setCallback(event, config[event]);
			}
		}
	};

	setCallback(name, cb)
	{
		if (Type.isFunction(cb) && EventName.hasOwnProperty(name))
		{
			this.eventEmitter.subscribe(name, function (event)
			{
				cb(event.data);
			});
		}
	};

	subscribe(eventName, listener)
	{
		return this.eventEmitter.subscribe(eventName, listener);
	};

	unsubscribe(eventName, listener)
	{
		return this.eventEmitter.unsubscribe(eventName, listener);
	};

	getNextPosition()
	{
		return this.lastPosition++;
	};

	/**
	 * @param {object} userStates {userId -> state}
	 */
	appendUsers(userStates)
	{
		if (!Type.isPlainObject(userStates))
		{
			return;
		}

		let userIds = Object.keys(userStates);
		for (let i = 0; i < userIds.length; i++)
		{
			let userId = userIds[i];
			this.addUser(userId, userStates[userId] ? userStates[userId] : UserState.Idle);
		}
	};

	setCentralUser(userId)
	{
		if (this.centralUser.id == userId)
		{
			return;
		}

		if (!this.users[userId] && userId != this.userId)
		{
			return;
		}

		const previousCentralUser = this.centralUser;
		this.centralUser = (userId == this.userId ? this.localUser : this.users[userId]);
		if (this.layout == Layouts.Centered || this.layout == Layouts.Mobile)
		{
			if (this.layout == Layouts.Mobile)
			{
				previousCentralUser.dismount();
			}
			this.updateUserList();
		}
		if (this.layout == Layouts.Mobile)
		{
			if (this.centralUserMobile)
			{
				this.centralUserMobile.setUserModel(this.userRegistry.get(userId));
			}
			else
			{
				this.centralUserMobile = new CallUserMobile({
					userModel: this.userRegistry.get(userId),
					onClick: () => this.showUserMenu(this.centralUser.id)
				})
				this.centralUserMobile.mount(this.elements.pinnedUserContainer);
			}
		}
		this.userRegistry.users.forEach(userModel => userModel.centralUser = (userModel.id == userId));
		this.eventEmitter.emit(EventName.onSetCentralUser, {
			userId: userId,
			stream: userId == this.userId ? this.localUser.stream : this.users[userId].stream
		})
	};

	getLeftUser(userId)
	{
		let candidateUserId = null;
		for (let i = 0; i < this.userRegistry.users.length; i++)
		{
			const userModel = this.userRegistry.users[i];
			if (userModel.id == userId && candidateUserId)
			{
				return candidateUserId
			}

			if (!userModel.localUser && userModel.state == UserState.Connected)
			{
				candidateUserId = userModel.id
			}
		}

		return candidateUserId;
	};

	getRightUser(userId)
	{
		let candidateUserId = null;
		for (let i = this.userRegistry.users.length - 1; i >= 0; i--)
		{
			const userModel = this.userRegistry.users[i];
			if (userModel.id == userId && candidateUserId)
			{
				return candidateUserId
			}

			if (!userModel.localUser && userModel.state == UserState.Connected)
			{
				candidateUserId = userModel.id
			}
		}

		return candidateUserId;
	};

	getUserCount()
	{
		return Object.keys(this.users).length;
	};

	getConnectedUserCount(withYou)
	{
		let count = this.getConnectedUsers().length;

		if (withYou)
		{
			const userId = parseInt(this.userId);
			if (!this.broadcastingMode || this.broadcastingPresenters.includes(userId))
			{
				count += 1;
			}
		}

		return count;
	};

	getUsersWithVideo()
	{
		let result = [];

		for (let userId in this.users)
		{
			if (this.users[userId].hasVideo())
			{
				result.push(userId);
			}
		}
		return result;
	};

	getConnectedUsers()
	{
		let result = [];
		for (let i = 0; i < this.userRegistry.users.length; i++)
		{
			const userModel = this.userRegistry.users[i];
			if (userModel.id != this.userId && userModel.state == UserState.Connected)
			{
				result.push(userModel.id);
			}
		}
		return result;
	};

	getDisplayedUsers()
	{
		let result = [];
		for (let i = 0; i < this.userRegistry.users.length; i++)
		{
			const userModel = this.userRegistry.users[i];
			if (userModel.id != this.userId && (userModel.id != this.centralUser.id && this.layout === Layouts.Centered || this.layout !== Layouts.Centered) && (userModel.state == UserState.Connected || userModel.state == UserState.Connecting || userModel.state == UserState.Calling))
			{
				result.push(userModel.id);
			}
		}
		return result;
	};

	getActiveUsers()
	{
		const result = [];
		for (let i = 0; i < this.userRegistry.users.length; i++)
		{
			const userModel = this.userRegistry.users[i];
			if (this.isUserHasActiveState(userModel) && this.users.hasOwnProperty(userModel.id))
			{
				result.push(userModel.id);
			}
		}
		return result;
	};

	getUsersWithCamera()
	{
		// since we don't receive streams from inactive pages
		// we can't use this.getUsersWithVideo() to get number of users with video
		return this.userRegistry.users.filter(el =>
		{
			return el.id != this.userId && el.cameraState && this.isUserHasActiveState(el) && el.state !== UserState.Calling;
		});
	};

	hasUserWithScreenSharing()
	{
		return this.userRegistry.users.some(function (userModel)
		{
			return userModel.screenState;
		})
	};

	hasCurrentUserScreenSharing()
	{
		const currentUser = this.userRegistry.get(this.userId);

		if (currentUser)
		{
			return currentUser.screenState;
		}

		return false
	}

	getPresenterUserId()
	{
		let currentPresenterId = this.presenterId || 0;
		if (currentPresenterId == this.localUser.id)
		{
			currentPresenterId = 0;
		}
		let userId; // for usage in iterators

		let currentPresenterModel = this.userRegistry.get(currentPresenterId);

		// 1. Current user, who is sharing screen has top priority
		if (currentPresenterModel && currentPresenterModel.screenState === true)
		{
			return currentPresenterId;
		}

		// 2. If current user is not sharing screen, but someone is sharing - he should become presenter
		for (userId in this.users)
		{
			if (this.users.hasOwnProperty(userId) && this.userRegistry.get(userId).screenState === true)
			{
				return parseInt(userId);
			}
		}

		// 3. If current user is talking, or stopped talking less then one second ago - he should stay presenter
		if (currentPresenterModel && currentPresenterModel.wasTalkingAgo() < 1000)
		{
			return currentPresenterId;
		}

		// 4. Return currently talking user
		let minTalkingAgo = 0;
		let minTalkingAgoUserId = 0;
		for (userId in this.users)
		{
			if (!this.users.hasOwnProperty(userId))
			{
				continue;
			}
			const userWasTalkingAgo = this.userRegistry.get(userId).wasTalkingAgo();
			if (userWasTalkingAgo < 1000)
			{
				return parseInt(userId);
			}
			if (userWasTalkingAgo < minTalkingAgo)
			{
				minTalkingAgoUserId = parseInt(userId);
			}
		}

		// 5. Return last talking user
		if (minTalkingAgoUserId)
		{
			return minTalkingAgoUserId;
		}

		// return current user in center
		return this.centralUser.id;
	};

	switchPresenter()
	{
		const currentPresenterId = this.presenterId || 0;
		const newPresenterId = this.getPresenterUserId();

		if (!newPresenterId)
		{
			return;
		}

		this.presenterId = newPresenterId;
		this.userRegistry.users.forEach(userModel => userModel.presenter = (userModel.id == this.presenterId));

		if (this.pictureInPictureCallWindow)
		{
			this.pictureInPictureCallWindow.setCurrentUser(this.getPictureInPictureCallWindowUser());
		}

		if (this.pinnedUser === null)
		{
			this.setCentralUser(newPresenterId);

			if (this.layout == Layouts.Centered && currentPresenterId !== newPresenterId)
			{
				this.eventEmitter.emit(EventName.onHasMainStream, {
					userId: this.centralUser.id
				});
			}
		}
		else if (currentPresenterId !== newPresenterId)
		{
			this.eventEmitter.emit(EventName.onHasMainStream, {
				userId: this.centralUser.id
			});
		}
	};

	switchPresenterDeferred()
	{
		clearTimeout(this.switchPresenterTimeout);
		this.switchPresenterTimeout = setTimeout(this.switchPresenter.bind(this), 1000);
	};

	cancelSwitchPresenter()
	{
		clearTimeout(this.switchPresenterTimeout);
	};

	setUiState(uiState)
	{
		if (this.uiState == uiState)
		{
			return;
		}

		this.uiState = uiState;
		if (this.uiState == UiState.Error && this.elements.container)
		{
			Dom.clean(this.elements.container);
			this.elements.container.appendChild(this.elements.overlay);
		}
		if (!this.elements.root)
		{
			return;
		}
		this.updateButtons();
	};

	setLayout(newLayout)
	{
		if (newLayout == this.layout)
		{
			return;
		}

		let useShelvedRerenderQueue = this.layout === Layouts.Centered && newLayout === Layouts.Grid;

		this.layout = newLayout;

		if (this.layout == Layouts.Centered || this.layout == Layouts.Mobile)
		{
			this.elements.root.classList.remove("bx-messenger-videocall-grid");
			this.elements.root.classList.add("bx-messenger-videocall-centered");
			this.centralUser.mount(this.elements.center);
			this.elements.container.appendChild(this.elements.userBlock);

			if (this.layout != Layouts.Mobile)
			{
				this.elements.userBlock.appendChild(this.elements.userList.container);
			}

			this.centralUser.playVideo();
			//this.centralUser.updateAvatarWidth();
		}
		if (this.layout == Layouts.Grid)
		{
			this.elements.root.classList.remove("bx-messenger-videocall-centered");
			this.elements.root.classList.add("bx-messenger-videocall-grid");

			this.elements.container.appendChild(this.elements.userList.container);
			this.elements.container.removeChild(this.elements.userBlock);
			if (this.isFullScreen && this.buttons.participants)
			{
				this.buttons.participants.update({
					foldButtonState: Buttons.ParticipantsButton.FoldButtonState.Hidden
				});
			}
			this.unpinUser();
			this.eventEmitter.emit(EventName.onHasMainStream, {
				userId: null
			});
		}
		if (this.layout == Layouts.Centered && this.isFullScreen)
		{
			this.setUserBlockFolded(true);
		}

		this.elements.root.classList.toggle("bx-messenger-videocall-fullscreen-mobile", (this.layout == Layouts.Mobile));

		this.updateUserList(useShelvedRerenderQueue);
		this.toggleEars();
		this.updateButtons();
		this.eventEmitter.emit(EventName.onLayoutChange, {
			layout: this.layout
		});
	};

	setRoomState(roomState)
	{
		if (this.roomState === roomState)
		{
			return;
		}
		this.roomState = roomState;
		if (this.buttons.microphone)
		{
			this.buttons.microphone.setSideIcon(this.getMicrophoneSideIcon(this.roomState));
		}
	}

	getMicrophoneSideIcon(roomState)
	{
		switch (roomState)
		{
			case RoomState.Speaker:
				return 'ellipsis';
			case RoomState.NonSpeaker:
				return 'pointer';
			case RoomState.None:
			default:
				return null;
		}
	}

	setCurrentPage(pageNumber)
	{
		if (pageNumber < 1 || pageNumber > this.pagesCount || pageNumber == this.currentPage)
		{
			return;
		}
		this.currentPage = pageNumber;

		this.recalculateUsersPerPage()
		if (this.elements.root)
		{
			this.elements.pageNavigatorLeftCounter.innerHTML = (this.currentPage - 1) + '&nbsp;/&nbsp;' + this.pagesCount;
			this.elements.pageNavigatorRightCounter.innerHTML = (this.currentPage + 1) + '&nbsp;/&nbsp;' + this.pagesCount;
		}
		if (!(this.layout === Layouts.Grid || this.layout === Layouts.Centered))
		{
			return;
		}

		this.renderUserList(true);
		this.toggleEars();
	};

	calculateUsersPerPage()
	{
		if (!this.elements.userList)
		{
			return 1000;
		}

		const containerSize = this.elements.userList.container.getBoundingClientRect();
		let columns = Math.floor(containerSize.width / MIN_GRID_USER_WIDTH) || 1;
		let rows = Math.floor(containerSize.height / MIN_GRID_USER_HEIGHT) || 1;

		if (this.layout === Layouts.Centered)
		{
			const rowsWithoutGap = Math.floor(containerSize.height / SIDE_USER_HEIGHT) || 1;
			const rowGap = 6;

			this.whiteSpaceInUserGrid = containerSize.height - rowsWithoutGap * SIDE_USER_HEIGHT + (rowsWithoutGap - 1) * rowGap;

			columns = 1;
			rows = this.whiteSpaceInUserGrid < 0 ? rowsWithoutGap - 1 : rowsWithoutGap;
		}

		let usersPerPage = columns * rows - 1;

		if (this.userId == this.centralUser.id && this.layout === Layouts.Centered)
		{
			usersPerPage += 1;
		}

		if (!usersPerPage)
		{
			return 1000;
		}

		if (usersPerPage <= MAX_USERS_PER_PAGE)
		{
			return usersPerPage;
		}
		else
		{
			// check if the last row should be filled up
			let elementSize = Util.findBestElementSize(
				containerSize.width,
				containerSize.height,
				MAX_USERS_PER_PAGE + 1,
				MIN_GRID_USER_WIDTH,
				MIN_GRID_USER_HEIGHT
			);
			// console.log('Optimal element size: width '+elementSize.width+' height '+elementSize.height);
			columns = Math.floor(containerSize.width / elementSize.width);
			rows = Math.floor(containerSize.height / elementSize.height);

			return columns * rows - 1;
		}
	};

	calculatePagesCount(usersPerPage)
	{
		const pages = Math.ceil((this.getDisplayedUsers().length) / usersPerPage);
		return pages > 0 ? pages : 1;
	};

	recalculateUsersPerPage()
	{
		this.usersPerPage = this.calculateUsersPerPage();

		if (this.currentPage < this.pagesCount && this.layout === Layouts.Centered && this.whiteSpaceInUserGrid > 0)
		{
			this.usersPerPage = this.usersPerPage + 1;
		}
	}

	recalculatePages()
	{
		this.usersPerPage = this.calculateUsersPerPage();
		this.pagesCount = this.calculatePagesCount(this.usersPerPage);

		if (this.currentPage > this.pagesCount)
		{
			this.currentPage = this.pagesCount;
		}

		this.recalculateUsersPerPage();

		if (this.elements.root)
		{
			this.elements.pageNavigatorLeftCounter.innerHTML = (this.currentPage - 1) + '&nbsp;/&nbsp;' + this.pagesCount;
			this.elements.pageNavigatorRightCounter.innerHTML = (this.currentPage + 1) + '&nbsp;/&nbsp;' + this.pagesCount;
		}
	};

	/**
	 * Returns page number, where the user is displayed, or 0 if user is not found
	 * @param {int} userId Id of the user
	 * @return {int}
	 */
	findUsersPage(userId)
	{
		if (userId == this.userId || this.usersPerPage === 0)
		{
			return 0;
		}
		const displayedUsers = this.getDisplayedUsers();
		let userPosition = 0;

		for (let i = 0; i < displayedUsers.length; i++)
		{
			if (displayedUsers[i] == userId)
			{
				userPosition = i + 1;
				break;
			}
		}

		return (userPosition ? Math.ceil(userPosition / this.usersPerPage) : 0);
	};

	setCameraId(cameraId)
	{
		if (this.cameraId == cameraId)
		{
			return;
		}

		if (this.localUser.stream && this.localUser.stream.getVideoTracks().length > 0)
		{
			throw new Error("Can not set camera id while having active stream")
		}
		this.cameraId = cameraId;
	};

	setMicrophoneId(microphoneId)
	{
		if (this.microphoneId == microphoneId)
		{
			return;
		}

		if (this.localUser.stream && this.localUser.stream.getAudioTracks().length > 0)
		{
			throw new Error("Can not set microphone id while having active stream")
		}
		this.microphoneId = microphoneId;
	};

	setMicrophoneLevel(level)
	{
		this.microphoneLevel = level;
		this.buttons.microphone?.setLevel(level);
	};

	setCameraState = (event) =>
	{
		if (this.isCameraOn == event.data.isCameraOn)
		{
			return;
		}

		this.isCameraOn = event.data.isCameraOn;

		if (this.buttons.camera)
		{
			if (this.isCameraOn)
			{
				this.buttons.camera.enable();
			}
			else
			{
				this.buttons.camera.disable();
			}
		}

		if (this.pictureInPictureCallWindow)
		{
			this.pictureInPictureCallWindow.setButtons(this.getPictureInPictureCallWindowGetButtonsList());
			this.pictureInPictureCallWindow.updateButtons();
		}
	};

	setMuted = (event) =>
	{
		if (this.isMuted == event.data.isMicrophoneMuted)
		{
			return;
		}

		this.isMuted = event.data.isMicrophoneMuted

		if (this.buttons.microphone)
		{
			if (this.isMuted)
			{
				this.buttons.microphone.disable();
			}
			else
			{
				this.buttons.microphone.enable();
			}
		}
		this.userRegistry.get(this.userId).microphoneState = !this.isMuted;

		if (this.pictureInPictureCallWindow)
		{
			this.pictureInPictureCallWindow.setButtons(this.getPictureInPictureCallWindowGetButtonsList());
			this.pictureInPictureCallWindow.updateButtons();
		}
	};

	setLocalUserId(userId)
	{
		if (userId == this.userId)
		{
			return;
		}

		this.userId = parseInt(userId);
		this.localUser.userModel.id = this.userId;
		this.localUser.userModel.name = this.userData[this.userId] ? this.userData[this.userId].name : '';
		this.localUser.userModel.avatar = this.userData[this.userId] ? this.userData[this.userId].avatar_hr : '';
	};

	setUserBlockFolded(isUserBlockFolded)
	{
		this.isUserBlockFolded = isUserBlockFolded;

		this.elements.userBlock?.classList.toggle("folded", this.isUserBlockFolded);
		this.elements.root?.classList.toggle("bx-messenger-videocall-userblock-folded", this.isUserBlockFolded);
		if (this.isUserBlockFolded)
		{
			if (this.buttons.participants && this.layout == Layouts.Centered)
			{
				this.buttons.participants.update({
					foldButtonState: Buttons.ParticipantsButton.FoldButtonState.Unfold
				});
			}
		}
		else
		{
			if (this.buttons.participants)
			{
				this.buttons.participants.update({
					foldButtonState: (this.isFullScreen && this.layout == Layouts.Centered) ? Buttons.ParticipantsButton.FoldButtonState.Fold : Buttons.ParticipantsButton.FoldButtonState.Hidden
				});
			}
		}
	};

	addUser(userId, state, direction)
	{
		userId = Number(userId);
		if (this.users[userId])
		{
			return;
		}

		state = state || UserState.Idle;
		if (!direction)
		{
			if (this.broadcastingPresenters.length > 0 && !this.broadcastingPresenters.includes(userId))
			{
				direction = EndpointDirection.RecvOnly;
			}
			else
			{
				direction = EndpointDirection.SendRecv
			}
		}

		let userModel = new UserModel({
			id: userId,
			name: this.userData[userId] ? this.userData[userId].name : '',
			avatar: this.userData[userId] ? this.userData[userId].avatar_hr : '',
			state: state,
			order: state == UserState.Connected ? this.getNextPosition() : newUserPosition,
			direction: direction
		});

		this.userRegistry.push(userModel);

		if (!this.elements.audio[userId])
		{
			this.elements.audio[userId] = Dom.create("audio");
			this.elements.audioContainer.appendChild(this.elements.audio[userId]);
		}

		if (!this.elements.screenAudio[userId])
		{
			this.elements.screenAudio[userId] = Dom.create("audio");
			this.elements.screenAudioContainer.appendChild(this.elements.audio[userId]);
		}

		this.users[userId] = new CallUser({
			parentContainer: this.container,
			userModel: userModel,
			audioElement: this.elements.audio[userId],
			screenAudioElement: this.elements.screenAudio[userId],
			allowPinButton: this.getConnectedUserCount() > 1,
			onClick: this._onUserClick.bind(this),
			onPin: this._onUserPin.bind(this),
			onUnPin: this._onUserUnPin.bind(this),
			onTurnOffParticipantMic: this._onTurnOffParticipantMic.bind(this),
			onTurnOffParticipantCam: this._onTurnOffParticipantCam.bind(this),
			onTurnOffParticipantScreenshare: this._onTurnOffParticipantScreenshare.bind(this),
		});

		this.screenUsers[userId] = new CallUser({
			parentContainer: this.container,
			userModel: userModel,
			allowPinButton: false,
			screenSharingUser: true,
		});

		if (this.elements.root)
		{
			this.updateUserList();
			this.updateButtons();
			this.updateUserButtons();
			this.muteSpeaker(this.speakerMuted);
		}
	};

	setUserDirection(userId, direction)
	{
		const user = this.userRegistry.get(userId);
		if (!user || user.direction == direction)
		{
			return;
		}

		user.direction = direction;
		this.updateUserList();
	};

	setLocalUserDirection(direction)
	{
		if (this.localUser.userModel.direction != direction)
		{
			this.localUser.userModel.direction = direction;
			this.updateUserList();
		}
	};

	setUserState(userId, newState)
	{
		const user = this.userRegistry.get(userId);
		if (!user)
		{
			return;
		}

		if (newState === UserState.Connected && this.uiState === UiState.Calling)
		{
			this.setUiState(UiState.Connected);
		}

		user.state = newState;

		// maybe switch central user
		if (this.centralUser.id == this.userId && newState == UserState.Connected)
		{
			this.setCentralUser(userId);
		}
		else if (userId == this.centralUser.id)
		{
			if (newState == UserState.Connecting || newState == UserState.Failed)
			{
				this.centralUser.blurVideo();
			}
			else if (newState == UserState.Connected)
			{
				this.centralUser.blurVideo(false);
			}
			else if (newState == UserState.Idle)
			{
				const usersWithVideo = this.getUsersWithVideo();
				const connectedUsers = this.getConnectedUsers();

				if (connectedUsers.length === 0)
				{
					this.setCentralUser(this.userId);
				}
				else if (usersWithVideo.length > 0)
				{
					this.setCentralUser(usersWithVideo[0]);
				}
				else //if (connectedUsers.length > 0)
				{
					this.setCentralUser(connectedUsers[0]);
				}
			}
		}


		if (newState === UserState.Connected)
		{
			const timer = setTimeout(() => {
				this.waitingForUserMediaTimeouts.delete(userId);
			}, WAITING_VIDEO_DELAY);
			this.waitingForUserMediaTimeouts.set(userId, timer);
		}
		else if (newState === UserState.Idle)
		{
			this.setUserFloorRequestState(userId, false);
			this.setUserPermissionToSpeakState(userId, false);
			clearTimeout(this.waitingForUserMediaTimeouts.get(userId));
			this.waitingForUserMediaTimeouts.delete(userId);
			this.rerenderQueue.set(userId, {
				userId,
				reason: RerenderReason.UserDisconnected,
			});
		}

		if (newState == UserState.Connected && user.order == newUserPosition)
		{
			user.order = this.getNextPosition();
		}
		else if (newState == UserState.Idle)
		{
			// reset user position to add them in the end after they reconnect
			user.prevOrder = user.order;
			user.order = newUserPosition;
			user.prevCameraState = user.cameraState;
			user.cameraState = false;
		}

		if (userId == this.localUser.id)
		{
			this.localUser.userModel.cameraState = this.localUser.hasCameraVideo();
		}

		const skippedElementsList = userId === this.localUser.id ? [] : ['panel'];

		if (userId == this.presenterId && newState !== UserState.Connected)
		{
			this.switchPresenter();
		}

		this.updateUserList();
		this.updateButtons(skippedElementsList);
		this.updateUserButtons();
	};

	setTitle(title)
	{
		this.title = title;
	};

	getUserTalking(userId)
	{
		const user = this.userRegistry.get(userId);
		if (!user)
		{
			return false;
		}

		return !!user.talking;
	}

	setUserTalking(userId, talking)
	{
		const user = this.userRegistry.get(userId);
		if (user)
		{
			user.talking = talking;
		}

		if (userId == this.userId)
		{
			return;
		}

		if (userId == this.presenterId && !talking)
		{
			this.switchPresenterDeferred();
		}
		else
		{
			this.switchPresenter();
		}

	};

	setUserStats(userId, stats)
	{
		if (this.users[userId])
		{
			this.users[userId].showStats(stats);
		}
		if (this.screenUsers[userId])
		{
			this.screenUsers[userId].showStats(stats);
		}
		if (userId == this.localUser.id)
		{
			this.localUser.showStats(stats);
		}

		this.pictureInPictureCallWindow?.setStats(userId, stats);
	}

	setTrackSubscriptionFailed(data)
	{
		if (this.users[data.participant.userId])
		{
			if(data.participant.userId && data.track){
				this.users[data.participant.userId].showTrackSubscriptionFailed(data.track);
			}
		}
	}

	setUserMicrophoneState(userId, isMicrophoneOn)
	{
		const user = this.userRegistry.get(userId);
		if (user)
		{
			user.microphoneState = isMicrophoneOn;
		}
	};

	setUserCameraState(userId, cameraState)
	{
		const user = this.userRegistry.get(userId);
		if (user)
		{
			user.cameraState = cameraState;
		}
	};

	setUserVideoPaused(userId, videoPaused)
	{
		const user = this.userRegistry.get(userId);
		if (user)
		{
			user.videoPaused = videoPaused;
			user.cameraState = !videoPaused;

			if (!user.videoPaused !== videoPaused)
			{
				return;
			}

			videoPaused
				? this.updateRerenderQueue(userId, RerenderReason.VideoDisabled)
				: this.updateRerenderQueue(userId, RerenderReason.VideoEnabled);
		}
	};

	getUserFloorRequestState(userId)
	{
		const user = this.userRegistry.get(userId);

		return user && user.floorRequestState;
	};

	setUserFloorRequestState(userId, userFloorRequestState)
	{
		const user: UserModel = this.userRegistry.get(userId);
		if (!user)
		{
			return;
		}

		if (user.floorRequestState != userFloorRequestState)
		{
			const userState = user?.state;
			const userActive = (userState !== UserState.Idle
				&& userState !== UserState.Declined
				&& userState !== UserState.Unavailable
				&& userState !== UserState.Busy
			);
			if (userFloorRequestState && !userActive)
			{
				return
			}

			user.floorRequestState = userFloorRequestState;

			if (userId != this.localUser.id)
			{
				this.updateFloorRequestNotifications(user, userFloorRequestState);
			}

			if (userId != this.localUser.id && userFloorRequestState)
			{
				this.showFloorRequestNotification(userId);
			}
		}

		if (userId == this.userId)
		{
			this.setButtonActive('floorRequest', userFloorRequestState);
		}
	};

	setUserPermissionToSpeakState(userId, permissionToSpeakState)
	{
		const user: UserModel = this.userRegistry.get(userId);
		if (!user)
		{
			return;
		}

		if (user.permissionToSpeak !== permissionToSpeakState)
		{
			user.permissionToSpeak = permissionToSpeakState;
		}
	};

	setAllUserPermissionToSpeakState(permissionToSpeakState)
	{
		this.userRegistry.users.forEach((userModel) => {userModel.permissionToSpeak = permissionToSpeakState});
	};

	pinUser(userId)
	{
		if (!(userId in this.users) && userId !== Number(this.userId))
		{
			console.error("User " + userId + " is not known");
			return;
		}
		this.pinnedUser = !this.users[userId] ? this.localUser : this.users[userId];
		this.userRegistry.users.forEach(userModel => userModel.pinned = userModel.id == userId);
		this.setCentralUser(userId);
		this.eventEmitter.emit(EventName.onUserPinned, {
			userId: userId
		});
		this.eventEmitter.emit(EventName.onHasMainStream, {
			userId: this.centralUser.id
		});
	};

	unpinUser()
	{
		this.pinnedUser = null;
		this.userRegistry.users.forEach(userModel => userModel.pinned = false);

		this.eventEmitter.emit(EventName.onUserPinned, {
			userId: null
		});
		this.switchPresenterDeferred();
	};

	updateFloorRequestNotifications(userModel, floorRequestState)
	{
		const indexFloorRequestInList = this.floorRequestNotifications.findIndex(req => req.userModel.id === userModel.id);
		const hasFloorRequestInList = indexFloorRequestInList !== -1;
		const currentUser = this.users[userModel.id];
		const currentUserData = {
			userModel,
			avatarBackgroundColor: currentUser?.avatarBackground || Util.getAvatarBackground(),
		}

		if (floorRequestState && !hasFloorRequestInList)
		{
			this.floorRequestNotifications.push(currentUserData);
		}

		if (!floorRequestState && hasFloorRequestInList)
		{
			this.floorRequestNotifications.splice(indexFloorRequestInList, 1);
		}

		this.pictureInPictureCallWindow?.updateFloorRequestState(currentUserData);
	}

	showFloorRequestNotification(userId)
	{
		const userModel: ?UserModel = this.userRegistry.get(userId);
		if (!userModel)
		{
			return;
		}

		let notification = FloorRequest.create({
			userModel,
			onAllowSpeakPermissionClicked: (_userModel) => {
				this._onAllowSpeakPermissionClickedHandler(_userModel);
			},
			onDisallowSpeakPermissionClicked: (_userModel) => {
				this._onDisallowSpeakPermissionClickedHandler(_userModel);
			},
		});

		notification.mount(this.elements.notificationPanel);
		NotificationManager.Instance.addNotification(notification);
	};
	
	updateFloorRequestNotification()
	{
		if (!NotificationManager?.Instance.notifications.length)
		{
			return;
		}
		
		NotificationManager.Instance.notifications.forEach(notification => 
		{
			notification.updatePermissionButtonState();
		});
	}
	
	_onAllowSpeakPermissionClickedHandler(_userModel)
	{
		this.setUserPermissionToSpeakState(_userModel.id, true);
		this.eventEmitter.emit(EventName.onAllowSpeakPermission, {
			userId: _userModel.id
		});		
	}

	_onDisallowSpeakPermissionClickedHandler(_userModel)
	{
		this.eventEmitter.emit(EventName.onDisallowSpeakPermission, {
			userId: _userModel.id
		});		
	}

	setUserScreenState(userId, screenState)
	{
		const user: ?UserModel = this.userRegistry.get(userId);
		if (!user)
		{
			return;
		}

		user.screenState = screenState;
		if (userId != this.userId)
		{
			if (screenState === true && this.layout === View.Layout.Grid)
			{
				this.setLayout(Layouts.Centered);
				this.returnToGridAfterScreenStopped = true;
			}
			if (screenState === false
				&& this.layout === Layouts.Centered
				&& !this.hasUserWithScreenSharing()
				&& !this.pinnedUser
				&& this.returnToGridAfterScreenStopped)
			{
				this.returnToGridAfterScreenStopped = false;
				this.setLayout(Layouts.Grid);
			}
			this.switchPresenter();
		}
	};

	flipLocalVideo(flipVideo)
	{
		this.localUser.flipVideo = !!flipVideo;
	}

	setLocalStream(streamData)
	{
		const mediaRenderer = streamData.mediaRenderer;
		const mediaStream = streamData.stream;
		const removed = streamData.removed;
		const flipVideo = streamData.flipVideo;
		if (removed)
		{
			mediaRenderer.stream = null;
		}

		if (mediaRenderer) // for Bitrix calls
		{
			this.localUser.videoRenderer = mediaRenderer;
			this.pictureInPictureCallWindow?.setVideoRenderer(this.userId, mediaRenderer);
		}
		else
		{
			const videoTrack = mediaStream.getVideoTracks().length > 0 ? mediaStream.getVideoTracks()[0] : null;
			this.localUser.videoTrack = videoTrack;
			this.pictureInPictureCallWindow?.setVideoRenderer(this.userId, new MediaRenderer({
				kind: 'video',
				track: videoTrack,
			}));
		}

		if (!Type.isUndefined(flipVideo))
		{
			this.flipLocalVideo(flipVideo);
		}
		this.localUser.userModel.cameraState = this.localUser.hasCameraVideo();

		const videoTracks = mediaStream.getVideoTracks();
		if (videoTracks.length > 0)
		{
			const videoTrackSettings = videoTracks[0].getSettings();
			this.cameraId = videoTrackSettings.deviceId || '';
		}
		else if (!mediaRenderer)
		{
			this.cameraId = '';
		}

		const audioTracks = mediaStream.getAudioTracks();
		if (audioTracks.length > 0)
		{
			const audioTrackSettings = audioTracks[0].getSettings();
			this.microphoneId = audioTrackSettings.deviceId || '';
		}

		/*if(!this.localUser.hasVideo())
		{
			return false;
		}*/

		if (this.layout !== Layouts.Grid && this.centralUser.id == this.userId)
		{
			if (mediaRenderer) // for Bitrix ca;ls
			{
				this.centralUser.videoRenderer = mediaRenderer;
			}
			else if (videoTracks.length > 0 || Object.keys(this.users).length === 0)
			{
				this.centralUser.videoTrack = videoTracks[0];
			}
			else
			{
				this.setCentralUser(Object.keys(this.users)[0]);
			}
		}
		else
		{
			this.updateUserList();
		}
	};

	setLocalStreamVideoTrack(videoTrack)
	{
		this.localStreamVideoTrack = videoTrack;

		this.pictureInPictureCallWindow?.setVideoRenderer(this.userId, new MediaRenderer({
			kind: 'sharing',
			track: videoTrack,
		}));
	}

	setSpeakerId(speakerId)
	{
		if (this.speakerId == speakerId)
		{
			return;
		}

		if (!('setSinkId' in HTMLMediaElement.prototype))
		{
			console.error("Speaker selection is not supported");
		}

		this.speakerId = speakerId;
		for (let userId in this.elements.audio)
		{
			this.elements.audio[userId].setSinkId(this.speakerId);
		}
	};

	muteSpeaker(mute)
	{
		this.speakerMuted = !!mute;

		for (let userId in this.elements.audio)
		{
			this.elements.audio[userId].volume = this.speakerMuted ? 0 : 1;
		}

		if (!this.buttons.speaker)
		{
			return;
		}

		if (this.speakerMuted)
		{
			this.buttons.speaker.disable();
			this.buttons.speaker.hideArrow()
		}
		else
		{
			this.buttons.speaker.enable();
			if (Hardware.canSelectSpeaker())
			{
				this.buttons.speaker.showArrow()
			}
		}
	};

	updateRerenderQueue(userId, reason)
	{
		if (!this.users[userId])
		{
			throw Error("User " + userId + " is not a part of this call");
		}

		if (reason === RerenderReason.VideoEnabled)
		{
			if (this.rerenderQueue.get(userId)?.reason === RerenderReason.VideoDisabled)
			{
				this.rerenderQueue.delete(userId);
				if (!this.rerenderQueue.size)
				{
					clearTimeout(this.rerenderTimeout);
					this.rerenderTimeout = null;
				}
			}
			else
			{
				if (this.waitingForUserMediaTimeouts.has(userId))
				{
					clearTimeout(this.waitingForUserMediaTimeouts.get(userId));
					this.waitingForUserMediaTimeouts.delete(userId);
					this.rerenderQueue.set(userId, {
						userId,
						reason: RerenderReason.VideoEnabled,
					});
					this.renderUserList();
				}
				else
				{
					if (!this.rerenderTimeout)
					{
						this.rerenderTimeout = setTimeout(() => {
							this.renderUserList();
						}, this.videoRerenderDelay);
					}
					this.rerenderQueue.set(userId, {
						userId,
						reason: RerenderReason.VideoEnabled,
					});
				}
			}
		}
		else if (reason === RerenderReason.VideoDisabled)
		{
			if (this.rerenderQueue.get(userId)?.reason === RerenderReason.VideoEnabled)
			{
				this.rerenderQueue.delete(userId);
				if (!this.rerenderQueue.size)
				{
					clearTimeout(this.rerenderTimeout);
					this.rerenderTimeout = null;
				}
			}
			else
			{
				if (!this.rerenderTimeout)
				{
					this.rerenderTimeout = setTimeout(() =>
					{
						this.renderUserList();
					}, this.videoRerenderDelay);
				}

				this.rerenderQueue.set(userId, {
					userId,
					reason: RerenderReason.VideoDisabled,
				});
			}
		}
	}

	setVideoRenderer(userId, mediaRenderer)
	{
		const user = this.users[userId];
		if (!user)
		{
			throw Error("User " + userId + " is not a part of this call");
		}
		if (mediaRenderer === null)
		{
			if (user.hasCameraVideo())
			{
				this.updateRerenderQueue(userId, RerenderReason.VideoDisabled);
			}
			user.videoRenderer = null;
			this.pictureInPictureCallWindow?.setVideoRenderer(userId, null);
			return;
		}

		if (!("render" in mediaRenderer) || !Type.isFunction(mediaRenderer.render))
		{
			throw Error("mediaRenderer should have method render");
		}
		if (!("kind" in mediaRenderer) || (mediaRenderer.kind !== "video" && mediaRenderer.kind !== "sharing"))
		{
			throw Error("mediaRenderer should be of video kind");
		}

		const userHasCameraVideo = user.hasCameraVideo();
		user.videoRenderer = mediaRenderer;
		this.pictureInPictureCallWindow?.setVideoRenderer(userId, mediaRenderer);

		if (mediaRenderer.stream && mediaRenderer.kind === 'video')
		{
			this.updateRerenderQueue(userId, RerenderReason.VideoEnabled);
		}
		else if (mediaRenderer.kind === 'video')
		{
			if (!userHasCameraVideo)
			{
				return;
			}
			this.updateRerenderQueue(userId, RerenderReason.VideoDisabled);
		}
	};

	setUserMedia(userId, kind, track)
	{
		if (kind === 'audio')
		{
			this.users[userId].audioTrack = track;
		}
		if (kind === 'sharingAudio')
		{
			this.users[userId].screenAudioTrack = track;
		}
		if (kind === 'video')
		{
			this.users[userId].videoTrack = track;
			this.pictureInPictureCallWindow?.setVideoRenderer(userId, new MediaRenderer({
				kind: 'video',
				track: track,
			}));
		}
		if (kind === 'screen')
		{
			this.screenUsers[userId].videoTrack = track;
			this.pictureInPictureCallWindow?.setVideoRenderer(userId, new MediaRenderer({
				kind: 'sharing',
				track: track,
			}));
			this.updateUserList();
			this.setUserScreenState(userId, track !== null);
		}
	};

	removeScreenUsers()
	{
		for (let userId in this.screenUsers)
		{
			this.screenUsers[userId].videoTrack = null;
		}
		this.updateUserList();
	};

	setBadNetworkIndicator(userId, badNetworkIndicator)
	{
		if (this.users[userId])
		{
			this.users[userId].badNetworkIndicator = badNetworkIndicator;
		}
	}

	setUserHasConnectionProblem(userId, hasConnectionProblem)
	{
		if (this.users[userId])
		{
			this.users[userId].hasConnectionProblem = hasConnectionProblem;
		}
	};

	setUserConnectionQuality(userId, connectionQuality)
	{
		if (this.users[userId])
		{
			this.users[userId].connectionQuality = connectionQuality;
		}

		if (this.localUser.id === userId)
		{
			this.localUser.connectionQuality = connectionQuality;
		}
	};

	applyIncomingVideoConstraints()
	{
		let userId;
		let user: CallUser;
		if (this.layout === Layouts.Grid)
		{
			for (userId in this.users)
			{
				user = this.users[userId];
				user.setIncomingVideoConstraints(this.userSize.width, this.userSize.height);
			}
		}
		else if (this.layout === Layouts.Centered)
		{
			for (userId in this.users)
			{
				user = this.users[userId];
				if (userId == this.centralUser.id)
				{
					const containerSize = this.elements.center.getBoundingClientRect();
					user.setIncomingVideoConstraints(Math.floor(containerSize.width), Math.floor(containerSize.height));
				}
				else
				{
					user.setIncomingVideoConstraints(SIDE_USER_WIDTH, SIDE_USER_HEIGHT);
				}
			}
		}
	};

	getDefaultRecordState()
	{
		return {
			state: RecordState.Stopped,
			userId: 0,
			date: {
				start: null,
				pause: []
			},
		};
	};

	setRecordState(recordState)
	{
		this.recordState = recordState;
		if (this.buttons.recordStatus)
		{
			this.buttons.recordStatus.update(this.recordState);
		}

		if (this.recordState.userId != this.userId)
		{
			if (this.recordState.state === RecordState.Stopped)
			{
				this.unblockButtons(['record']);
			}
			else
			{
				this.blockButtons(['record']);
			}
		}

		if (this.elements.topPanel)
		{
			if (this.recordState.state === RecordState.Stopped)
			{
				delete (this.elements.topPanel.dataset.recordState);
			}
			else
			{
				this.elements.topPanel.dataset.recordState = recordState.state;
			}
		}
	};

	show()
	{
		if (!this.elements.root)
		{
			this.render();
		}
		this.container.appendChild(this.elements.root);

		if (this.layout !== Layouts.Mobile)
		{
			this.startIntersectionObserver();
		}
		this.updateButtons();
		this.updateUserList();

		this.resumeVideo();
		this.toggleEars();
		this.visible = true;

		this.eventEmitter.emit(EventName.onShow);

		// We specifically disable the face improve feature to improve call quality.
		this.disableFaceImprove();
		this.checkPanelOverflow();
	};

	hide()
	{
		this.closeCopilotNotify();
		this.clearCallcontrolPromo();
		if (this.overflownButtonsPopup)
		{
			this.overflownButtonsPopup.close();
		}
		Dom.remove(this.elements.root);
		this.visible = false;
	};

	startIntersectionObserver()
	{
		if (!('IntersectionObserver' in window))
		{
			return;
		}

		this.intersectionObserver = new IntersectionObserver(
			this._onIntersectionChange.bind(this),
			{
				root: this.elements.userList.container,
				threshold: 0.5
			}
		);
	};

	/**
	 * @param {CallUser} callUser
	 */
	observeIntersections(callUser)
	{
		if (this.intersectionObserver && callUser.elements.root)
		{
			this.intersectionObserver.observe(callUser.elements.root);
		}
	};

	/**
	 * @param {CallUser} callUser
	 */
	unobserveIntersections(callUser)
	{
		if (this.intersectionObserver && callUser.elements.root)
		{
			this.intersectionObserver.unobserve(callUser.elements.root);
		}
	};

	showDeviceSelector(bindElement)
	{
		if (this.deviceSelector)
		{
			return;
		}

		this.deviceSelector = new DeviceSelector({
			viewElement: this.container,
			parentElement: bindElement,
			zIndex: this.baseZIndex + 500,
			microphoneEnabled: !Hardware.isMicrophoneMuted,
			microphoneId: this.microphoneId || Hardware.defaultMicrophone,
			cameraEnabled: Hardware.isCameraOn,
			cameraId: this.cameraId,
			speakerEnabled: !this.speakerMuted,
			speakerId: this.speakerId,
			allowHdVideo: Hardware.preferHdQuality,
			faceImproveEnabled: Util.isDesktop() && DesktopApi.isDesktop() && DesktopApi.getCameraSmoothingStatus(),
			allowFaceImprove: false,
			allowBackground: BackgroundDialog.isAvailable() && this.isIntranetOrExtranet,
			allowMask: BackgroundDialog.isMaskAvailable() && this.isIntranetOrExtranet,
			allowAdvancedSettings: typeof (BXIM) !== 'undefined' && this.isIntranetOrExtranet,
			switchCameraBlocked: this.blockedButtons['camera'],
			switchMicrophoneBlocked: this.blockedButtons['microphone'],
			events: {
				[DeviceSelector.Events.onMicrophoneSelect]: this._onMicrophoneSelected.bind(this),
				[DeviceSelector.Events.onMicrophoneSwitch]: this._onMicrophoneButtonClick.bind(this),
				[DeviceSelector.Events.onCameraSelect]: this._onCameraSelected.bind(this),
				[DeviceSelector.Events.onCameraSwitch]: this._onCameraButtonClick.bind(this),
				[DeviceSelector.Events.onSpeakerSelect]: this._onSpeakerSelected.bind(this),
				[DeviceSelector.Events.onSpeakerSwitch]: this._onSpeakerButtonClick.bind(this),
				[DeviceSelector.Events.onChangeHdVideo]: this._onChangeHdVideo.bind(this),
				[DeviceSelector.Events.onChangeMicAutoParams]: this._onChangeMicAutoParams.bind(this),
				[DeviceSelector.Events.onChangeFaceImprove]: this._onChangeFaceImprove.bind(this),
				[DeviceSelector.Events.onAdvancedSettingsClick]: () => this.eventEmitter.emit(EventName.onOpenAdvancedSettings),
				[DeviceSelector.Events.onDestroy]: () => this.deviceSelector = null,
				[DeviceSelector.Events.onShow]: () => this.eventEmitter.emit(EventName.onDeviceSelectorShow, {}),
			}
		});
		this.deviceSelector.show();
	};

	showCallMenu()
	{
		let menuItems = [
			{
				text: BX.message("IM_M_CALL_BTN_WANT_TO_SAY"),
				iconClass: "hand",
				onClick: this._onMobileCallMenuFloorRequestClick.bind(this)
			},
			{
				text: BX.message("IM_M_CALL_MOBILE_MENU_PARTICIPANTS_LIST"),
				iconClass: "participants",
				onClick: this._onMobileCallMenShowParticipantsClick.bind(this)
			},
			// TODO:
			/*{
				text: "Add participant",
				iconClass: "add-participant",
				onClick: function() {}
			},*/

			/*{ //DEBUG: mobile audio
				text: "Enable audio",
				iconClass: "",
				onClick: function() {
					for (var userId in this.elements.audio)
					{
						if (this.users[userId].stream)
						{
							console.log('user ' + userId + ' stream found, trying to play');
							this.elements.audio[userId].srcObject = this.users[userId].stream;
							this.elements.audio[userId].play();
						}
					}
					this.callMenu.close();
				}.bind(this)
			},*/
			{
				text: BX.message("IM_M_CALL_MOBILE_MENU_COPY_INVITE"),
				iconClass: "add-participant",
				onClick: this._onMobileCallMenuCopyInviteClick.bind(this)

			},
			!this.isIntranetOrExtranet
				?
				{
					text: BX.message("IM_M_CALL_MOBILE_MENU_CHANGE_MY_NAME"),
					iconClass: "change-name",
					onClick: () =>
					{
						this.callMenu.close();
						setTimeout(this.showRenameSlider.bind(this), 100);
					}
				}
				:
				null,
			{
				separator: true,
			},
			{
				text: BX.message("IM_M_CALL_MOBILE_MENU_CANCEL"),
				enabled: false,
				onClick: this._onMobileCallMenuCancelClick.bind(this)
			}
		];

		this.callMenu = new MobileMenu({
			parent: this.elements.root,
			items: menuItems,
			onClose: () => this.callMenu.destroy(),
			onDestroy: () => this.callMenu = null,
		});

		this.callMenu.show();
	};

	showUserMenu(userId)
	{
		const userModel: ?UserModel = this.userRegistry.get(userId);
		if (!userModel)
		{
			return false;
		}

		let pinItem = null;
		if (this.pinnedUser && this.pinnedUser.id == userId)
		{
			pinItem = {
				text: BX.message("IM_M_CALL_MOBILE_MENU_UNPIN"),
				iconClass: "unpin",
				onClick: () =>
				{
					this.userMenu.close();
					this.unpinUser();
				}
			};
		}
		else if (this.userId != userId)
		{
			pinItem = {
				text: BX.message("IM_M_CALL_MOBILE_MENU_PIN"),
				iconClass: "pin",
				onClick: () =>
				{
					this.userMenu.close();
					this.pinUser(userId);
				}
			};
		}

		let menuItems = [
			{
				userModel: userModel,
				enabled: false
			},
			{
				separator: true,
			},
			pinItem,
			this.userId == userId && !this.isIntranetOrExtranet
				?
				{
					text: BX.message("IM_M_CALL_MOBILE_MENU_CHANGE_MY_NAME"),
					iconClass: "change-name",
					onClick: () =>
					{
						this.userMenu.close();
						setTimeout(this.showRenameSlider.bind(this), 100)
					}
				}
				:
				null,
			/*{
				text: BX.message("IM_M_CALL_MOBILE_MENU_WRITE_TO_PRIVATE_CHAT"),
				iconClass: "private-chat",
				onClick: function()
				{
					this.userMenu.close();
					this.eventEmitter.emit(EventName.onButtonClick, {

					})
				}.bind(this)
			},*/
			/*{
				// TODO:
				text: "Remove user",
				iconClass: "remove-user"
			},*/
			{
				separator: true
			},
			{
				text: BX.message("IM_M_CALL_MOBILE_MENU_CANCEL"),
				enabled: false,
				onClick: () => this.userMenu.close(),
			}
		];

		this.userMenu = new MobileMenu({
			parent: this.elements.root,
			items: menuItems,
			onClose: () => this.userMenu.destroy(),
			onDestroy: () => this.userMenu = null,
		});
		this.userMenu.show();
	};

	showParticipantsMenu()
	{
		if (this.participantsMenu)
		{
			return;
		}
		let menuItems = [];
		menuItems.push({
			userModel: this.localUser.userModel,
			showSubMenu: true,
			onClick: function ()
			{
				this.participantsMenu.close();
				this.showUserMenu(this.localUser.userModel.id);
			}.bind(this)
		});
		this.userRegistry.users.forEach((userModel: UserModel) =>
		{
			if (userModel.localUser || userModel.state != UserState.Connected)
			{
				return;
			}
			if (menuItems.length > 0)
			{
				menuItems.push({
					separator: true
				});
			}
			menuItems.push({
				userModel: userModel,
				showSubMenu: true,
				onClick: () =>
				{
					this.participantsMenu.close();
					this.showUserMenu(userModel.id);
				}
			})
		});

		if (menuItems.length === 0)
		{
			return false;
		}

		this.participantsMenu = new MobileMenu({
			parent: this.elements.root,
			items: menuItems,
			header: BX.message("IM_M_CALL_PARTICIPANTS").replace("#COUNT#", this.getConnectedUserCount(true)),
			largeIcons: true,

			onClose: function ()
			{
				this.participantsMenu.destroy();
			}.bind(this),
			onDestroy: function ()
			{
				this.participantsMenu = null;
			}.bind(this)
		});

		this.participantsMenu.show();
		return true;
	};

	/**
	 * @param {Object} params
	 * @param {string} params.text
	 * @param {string} [params.subText]
	 */
	showMessage(params)
	{
		if (!this.elements.root)
		{
			this.render();
			this.container.appendChild(this.elements.root);
		}

		const statusNode = Dom.create("div", {
			props: {className: "bx-messenger-videocall-user-status bx-messenger-videocall-user-status-wide"},
		});

		if (Type.isStringFilled(params.text))
		{
			const textNode = Dom.create("div", {
				props: {className: "bx-messenger-videocall-status-text"},
				text: params.text
			});
			statusNode.appendChild(textNode);
		}

		if (this.elements.overlay.childElementCount)
		{
			Dom.clean(this.elements.overlay);
		}
		this.elements.overlay.appendChild(statusNode);
	};

	hideMessage()
	{
		this.elements.overlay.textContent = '';
	};

	renderErrorCallLayout()
	{
		if (!this.elements.root)
		{
			this.render();
			this.container.appendChild(this.elements.root);
		}

		const errorContainer = Dom.create("div", {
			props: {className: "bx-messenger-videocall-error-container"},
			children: [
				Dom.create("div", {
					props: {className: "bx-messenger-videocall-error-container-icon-alert"},
				}),
				Dom.create("div", {
					props: {className: "bx-messenger-videocall-error-message"},
					text: BX.message("CALL_CONNECTED_ERROR"),
				}),
				Dom.create("div", {
					props: {className: "bx-messenger-videocall-error-button-self-test"},
					text: BX.message("CALL_RUN_SELF_TEST"),
					events: {
						click: () =>
						{
							Util.startSelfTest();
						}
					}
				}),

			],
		})

		if (this.elements.overlay.childElementCount)
		{
			Dom.clean(this.elements.overlay);
		}
		this.elements.overlay.appendChild(errorContainer);
	}

	renderReloadPageLayout()
	{
		if (!this.elements.root)
		{
			this.render();
			this.container.appendChild(this.elements.root);
		}

		const errorContainer = Dom.create("div", {
			props: {className: 'bx-messenger-videocall-error-container'},
			children: [
				Dom.create('div', {
					props: {className: "bx-messenger-videocall-error-container-icon-alert"},
				}),
				Dom.create('div', {
					props: {className: "bx-messenger-videocall-error-message"},
					html: BX.message('CALL_SECURITY_KEY_CHANGED').replace('[break]', '<br/>'),
				}),
				Dom.create('div', {
					props: {className: 'bx-messenger-videocall-error-button-self-test'},
					text: BX.message('CALL_RELOAD_PAGE'),
					events: {
						click: () =>
						{
							this.destroy();
							location.reload();
						}
					}
				}),
			],
		})

		if (this.elements.overlay.childElementCount)
		{
			Dom.clean(this.elements.overlay);
		}
		this.elements.overlay.appendChild(errorContainer);
	};

	/**
	 * @param {Object} params
	 * @param {string} params.text
	 * @param {string} [params.subText]
	 */
	showFatalError(params)
	{
		this.renderErrorCallLayout();
		this.setUiState(UiState.Error);
		// in some cases video elements may still be shown on the error screen, let's hide them
		this.elements.userList.container.style.display = 'none';
	};

	showSecurityKeyError()
	{
		this.renderReloadPageLayout();
		this.setUiState(UiState.Error);
		// in some cases video elements may still be shown on the error screen, let's hide them
		this.elements.userList.container.style.display = 'none';
	};

	close()
	{
		if (this.buttons.recordStatus)
		{
			this.buttons.recordStatus.stopViewUpdate();
		}
		this.recordState = this.getDefaultRecordState();

		if (this.elements.root)
		{
			BX.remove(this.elements.root);
		}

		if (this.pictureInPictureCallWindow)
		{
			this.toggleStatePictureInPictureCallWindow(false)
		}

		this.visible = false;
		this.eventEmitter.emit(EventName.onClose);

		this.clearCallcontrolPromo();
	};

	setSize(size)
	{
		if (this.size == size)
		{
			return;
		}

		this.size = size;

		if (this.size == Size.Folded)
		{
			this.clearCallcontrolPromo();

			if (this.overflownButtonsPopup)
			{
				this.overflownButtonsPopup.close();
			}
			if (this.elements.panel)
			{
				this.elements.panel.classList.add('bx-messenger-videocall-panel-folded');
			}
			Dom.remove(this.elements.container);
			Dom.remove(this.elements.topPanel);
			this.elements.root.style.removeProperty('max-width');
			this.updateButtons();
		}
		else
		{
			if (this.elements.panel)
			{
				this.elements.panel.classList.remove('bx-messenger-videocall-panel-folded');
			}
			this.elements.wrap.appendChild(this.elements.topPanel);
			this.elements.wrap.appendChild(this.elements.container);
			if (this.maxWidth > 0)
			{
				this.elements.root.style.maxWidth = Math.max(this.maxWidth, MIN_WIDTH) + 'px';
			}
			this.updateButtons();
			this.updateUserList();
			this.resumeVideo();
		}

		if (this.pictureInPictureCallWindow)
		{
			this.pictureInPictureCallWindow.setButtons(this.getPictureInPictureCallWindowGetButtonsList());
			this.pictureInPictureCallWindow.updateButtons();
		}
	};

	isButtonBlocked(buttonName)
	{
		switch (buttonName)
		{
			case 'camera':
				return (this.uiState !== UiState.Preparing && this.uiState !== UiState.Connected) || this.blockedButtons[buttonName] === true || !Util.havePermissionToBroadcast('cam');
			case 'chat':
				return !this.showChatButtons || this.blockedButtons[buttonName] === true;
			case 'microphone':
				return !Util.havePermissionToBroadcast('mic');
			case 'floorRequest':
				return (this.uiState !== UiState.Connected) || this.blockedButtons[buttonName] === true;
			case 'screen':
				return !this.showShareButton || (!this.isScreenSharingSupported() || this.isFullScreen) || this.blockedButtons[buttonName] === true || !Util.havePermissionToBroadcast('screenshare');
			case 'users':
				return !this.showUsersButton || this.blockedButtons[buttonName] === true;
			case 'record':
				return !this.showRecordButton || this.blockedButtons[buttonName] === true;
			case 'document':
				return !this.showDocumentButton || this.blockedButtons[buttonName] === true;
			case 'copilot':
				return !this.showCopilotButton || this.blockedButtons[buttonName] === true;
			default:
				return this.blockedButtons[buttonName] === true;
		}
	};

	isButtonHidden(buttonName)
	{
		return this.hiddenButtons[buttonName] === true;
	};

	showButton(buttonCode)
	{
		this.showButtons([buttonCode]);
	};

	hideButton(buttonCode)
	{
		this.hideButtons([buttonCode]);
	};

	/**
	 * @return {bool} Returns true if buttons update is required
	 */
	checkPanelOverflow()
	{
		const delta = this.elements.panel.scrollWidth - this.elements.panel.offsetWidth
		const mediumButtonMinWidth = 60; // todo: move to constants maybe? or maybe even calculate dynamically somehow?
		if (delta > 0)
		{
			let countOfButtonsToHide = Math.ceil(delta / mediumButtonMinWidth);
			if (Object.keys(this.overflownButtons).length === 0)
			{
				countOfButtonsToHide += 1;
			}

			const buttons = this.getButtonList();

			for (let i = buttons.length - 1; i > 0; i--)
			{
				if (buttons[i] === 'hangupOptions' || buttons[i] === 'hangup' || buttons[i] === 'close' || buttons[i] === 'more')
				{
					continue;
				}

				this.overflownButtons[buttons[i]] = true;
				countOfButtonsToHide -= 1;
				if (!countOfButtonsToHide)
				{
					break;
				}
			}
			return true;
		}
		else
		{
			const hiddenButtonsCount = Object.keys(this.overflownButtons).length;
			if (hiddenButtonsCount > 0)
			{
				const unusedPanelSpace = this.calculateUnusedPanelSpace();
				if (unusedPanelSpace > 320)
				{
					let countOfButtonsToShow = Math.min(Math.floor(unusedPanelSpace / mediumButtonMinWidth), hiddenButtonsCount);
					let buttonsLeftHidden = hiddenButtonsCount - countOfButtonsToShow;
					if (buttonsLeftHidden === 1)
					{
						countOfButtonsToShow += 1;
					}

					if (countOfButtonsToShow == hiddenButtonsCount)
					{
						// show all buttons;
						this.overflownButtons = {};
					}
					else
					{
						for (let i = 0; i < countOfButtonsToShow; i++)
						{
							delete this.overflownButtons[Object.keys(this.overflownButtons)[0]]
						}
					}
					return true;
				}
			}
		}

		return false;
	};

	/**
	 * @param {string[]} buttons Array of buttons names to show
	 */
	showButtons(buttons)
	{
		if (!Type.isArray(buttons))
		{
			console.error("buttons should be array")
		}

		buttons.forEach((buttonName) =>
		{
			if (this.hiddenButtons.hasOwnProperty(buttonName))
			{
				delete this.hiddenButtons[buttonName];
			}
		})

		this.updateButtons();
	};

	/**
	 * @param {string[]} buttons Array of buttons names to hide
	 */
	hideButtons(buttons)
	{
		if (!Type.isArray(buttons))
		{
			console.error("buttons should be array")
		}

		buttons.forEach((buttonName) => this.hiddenButtons[buttonName] = true);
		this.updateButtons();
	};

	blockAddUser()
	{
		this.blockButtons(['add']);
		if (this.elements.userList.addButton)
		{
			Dom.remove(this.elements.userList.addButton);
		}
	};

	unblockAddUser()
	{
		this.unblockButtons(['add']);

		this.updateButtons();
	};

	blockUsersButton()
	{
		this.blockButtons(['users']);

		this.updateButtons();
	};

	unblockUsersButton()
	{
		this.unblockButtons(['users']);

		this.updateButtons();
	};

	blockSwitchCamera()
	{
		this.blockButtons(['camera']);
		if (this.deviceSelector)
		{
			this.deviceSelector.toggleCameraAvailability(false);
		}
	};

	unblockSwitchCamera()
	{
		this.unblockButtons(['camera']);
		if (this.deviceSelector)
		{
			this.deviceSelector.toggleCameraAvailability(true);
		}
	};

	blockSwitchMicrophone()
	{
		this.blockButtons(['microphone']);
		if (this.deviceSelector)
		{
			this.deviceSelector.toggleMicrophoneAvailability(false);
		}
	};

	unblockSwitchMicrophone()
	{
		this.unblockButtons(['microphone']);
		if (this.deviceSelector)
		{
			this.deviceSelector.toggleMicrophoneAvailability(true);
		}
	};

	blockScreenSharing()
	{
		this.blockButtons(['screen']);
	};

	blockHistoryButton()
	{
		this.blockButtons(['history']);
	};

	/**
	 * @param {string[]} buttons Array of buttons names to block
	 */

	blockButtons(buttons)
	{
		if (!Type.isArray(buttons))
		{
			console.error("buttons should be array ")
		}

		buttons.forEach((buttonName) =>
		{
			this.blockedButtons[buttonName] = true;
			if (this.buttons[buttonName])
			{
				this.buttons[buttonName].setBlocked(true);
			}
		})

		if (this.pictureInPictureCallWindow)
		{
			this.pictureInPictureCallWindow.updateBlockButtons(this.getBlockedButtonsListPictureInPictureCallWindow());
		}
	};

	/**
	 * @param {string[]} buttons Array of buttons names to unblock
	 */
	unblockButtons(buttons)
	{
		if (!Type.isArray(buttons))
		{
			console.error("buttons should be array")
		}

		buttons.forEach((buttonName) =>
		{
			delete this.blockedButtons[buttonName];
			if (this.buttons[buttonName])
			{
				this.buttons[buttonName].setBlocked(this.isButtonBlocked(buttonName));
			}
		});

		if (this.pictureInPictureCallWindow)
		{
			this.pictureInPictureCallWindow.updateBlockButtons(this.getBlockedButtonsListPictureInPictureCallWindow());
		}
	};

	disableMediaSelection()
	{
		this.mediaSelectionBlocked = true;
	};

	enableMediaSelection()
	{
		this.mediaSelectionBlocked = false;
		if (this.buttons.microphone && this.isMediaSelectionAllowed())
		{
			this.buttons.microphone.showArrow();
		}
		if (this.buttons.camera && this.isMediaSelectionAllowed())
		{
			this.buttons.camera.showArrow();
		}
	};

	isMediaSelectionAllowed()
	{
		return this.layout != Layouts.Mobile && (this.uiState == UiState.Preparing || this.uiState == UiState.Connected) && !this.mediaSelectionBlocked && !this.isFullScreen;
	};

	getButtonList()
	{
		if (this.uiState == UiState.Error)
		{
			return ['close'];
		}
		if (this.uiState == UiState.Initializing)
		{
			return ['hangup'];
		}

		if (this.size == Size.Folded)
		{
			return ['title', 'spacer', 'returnToCall', 'hangup'];
		}

		let result = [];

		result.push('microphone');
		result.push('camera');

		if (this.layout != Layouts.Mobile)
		{
			result.push('speaker');
		}
		else
		{
			result.push('mobileMenu');
		}

		result.push('chat');
		result.push('users');

		if (this.layout != Layouts.Mobile)
		{
			result.push('floorRequest');
			result.push('screen');
			result.push('record');
			result.push('document');
		}

		if (this.layout !== Layouts.Mobile && CallAI.serviceEnabled)
		{
			result.push('copilot');
		}

		result = result.filter((buttonCode) =>
		{
			return !this.hiddenButtons.hasOwnProperty(buttonCode) && !this.overflownButtons.hasOwnProperty(buttonCode);
		});

		if (Object.keys(this.overflownButtons).length > 0)
		{
			result.push('more');
		}

		if (this.uiState == UiState.Preparing)
		{
			result.push('close');
		}
		else
		{
			result.push('hangup');
		}

		if (!this.hiddenButtons.hasOwnProperty('hangupOptions') && this.isIntranetOrExtranet)
		{
			result.push('hangupOptions');
		}

		return result;
	};

	getTopButtonList()
	{
		let result = [];

		if (this.layout == Layouts.Mobile)
		{
			return ['participantsMobile'];
		}
		result.push('watermark');
		result.push('protected');
		result.push('recordStatus');
		result.push('spacer');

		let separatorNeeded = false;
		if (this.uiState === UiState.Connected && this.layout != Layouts.Mobile)
		{
			result.push('grid');
		}

		if (this.uiState != UiState.Preparing && this.isFullScreenSupported() && this.layout != Layouts.Mobile)
		{
			result.push('fullscreen');
		}

		if (this.uiState === UiState.Connected && this.layout != Layouts.Mobile)
		{
			result.push('feedback');
		}

		if (
			this.uiState === UiState.Connected
			&& this.layout != Layouts.Mobile
			&& Util.canControlChangeSettings()
			&& Util.isUserControlFeatureEnabled()
		)
		{
			result.push('callcontrol');
		}

		if (this.uiState != UiState.Preparing)
		{
			if (separatorNeeded)
			{
				result.push('separator');
			}
			result.push('participants');
		}

		let previousButtonCode = '';
		result = result.filter((buttonCode) =>
		{
			if (previousButtonCode === 'spacer' && buttonCode === 'separator')
			{
				return true;
			}

			previousButtonCode = buttonCode;

			return !this.hiddenTopButtons.hasOwnProperty(buttonCode);
		});

		return result;
	};

	render()
	{
		this.elements.root = Dom.create("div", {
			props: {className: "bx-messenger-videocall bx-messenger-videocall-scope"},
			children: [
				this.elements.wrap = Dom.create("div", {
					props: {className: `bx-messenger-videocall-wrap ${this.isCopilotActive ? 'bx-messenger-videocall-wrap-with-copilot' : ''}`},
					children: [
						this.elements.container = Dom.create("div", {
							props: {className: "bx-messenger-videocall-inner"},
							children: [
								this.elements.center = Dom.create("div", {
									props: {className: "bx-messenger-videocall-central-user"},
									events: {
										touchstart: this._onCenterTouchStart.bind(this),
										touchend: this._onCenterTouchEnd.bind(this),
									}
								}),
								this.elements.pageNavigatorLeft = Dom.create("div", {
									props: {className: "bx-messenger-videocall-page-navigator left"},
									children: [
										this.elements.pageNavigatorLeftCounter = Dom.create("div", {
											props: {className: "bx-messenger-videocall-page-navigator-counter left"},
											html: (this.currentPage - 1) + '&nbsp;/&nbsp;' + this.pagesCount
										}),
										Dom.create("div", {
											props: {className: "bx-messenger-videocall-page-navigator-icon left"}
										}),
									],
									events: {
										click: this._onLeftPageNavigatorClick.bind(this)
									}
								}),
								this.elements.pageNavigatorRight = Dom.create("div", {
									props: {className: "bx-messenger-videocall-page-navigator right"},
									children: [
										this.elements.pageNavigatorRightCounter = Dom.create("div", {
											props: {className: "bx-messenger-videocall-page-navigator-counter right"},
											html: (this.currentPage + 1) + '&nbsp;/&nbsp;' + this.pagesCount
										}),
										Dom.create("div", {
											props: {className: "bx-messenger-videocall-page-navigator-icon right"}
										})
									],
									events: {
										click: this._onRightPageNavigatorClick.bind(this)
									}
								}),
							]
						}),
						this.elements.topPanel = Dom.create("div", {
							props: {className: "bx-messenger-videocall-top-panel"},
						}),
						this.elements.notificationPanel = Dom.create("div", {
							props: {className: "bx-messenger-videocall-notification-panel"},
						}),
						this.elements.bottom = Dom.create("div", {
							props: {className: "bx-messenger-videocall-bottom"},
							children: [
								this.elements.userSelectorContainer = Dom.create("div", {
									props: {className: "bx-messenger-videocall-bottom-user-selector-container"}
								}),
								this.elements.pinnedUserContainer = Dom.create("div", {
									props: {className: "bx-messenger-videocall-bottom-pinned-user-container"}
								}),
							]
						}),
					]
				}),
			],
			events: {
				click: this._onBodyClick.bind(this)
			}
		});

		if (this.showButtonPanel)
		{
			this.elements.panel = Dom.create("div", {
				props: {className: "bx-messenger-videocall-panel"},
			});
			this.elements.bottom.appendChild(this.elements.panel);
		}
		else
		{
			this.elements.root.classList.add("bx-messenger-videocall-no-button-panel");
		}

		if (this.layout == Layouts.Mobile)
		{
			this.userSelector = new UserSelectorMobile({
				userRegistry: this.userRegistry
			});
			this.userSelector.mount(this.elements.userSelectorContainer);

			this.elements.ear.left = Dom.create("div", {
				props: {
					className: "bx-messenger-videocall-mobile-ear left"
				},
				events: {
					click: this._onLeftEarClick.bind(this)
				}
			});
			this.elements.ear.right = Dom.create("div", {
				props: {
					className: "bx-messenger-videocall-mobile-ear right"
				},
				events: {
					click: this._onRightEarClick.bind(this)
				}
			});
			this.elements.localUserMobile = Dom.create("div", {
				props: {className: "bx-messenger-videocall-local-user-mobile"}
			});

			if (window.innerHeight < window.innerWidth)
			{
				this.elements.root.classList.add("orientation-landscape");
			}

			this.elements.wrap.appendChild(this.elements.ear.left);
			this.elements.wrap.appendChild(this.elements.ear.right);
			this.elements.wrap.appendChild(this.elements.localUserMobile);
		}

		this.centralUser.mount(this.elements.center);

		this.elements.overlay = Dom.create("div", {
			props: {className: "bx-messenger-videocall-overlay"}
		});

		this.elements.userBlock = Dom.create("div", {
			props: {className: "bx-messenger-videocall-user-block"},
			children: [
				this.elements.ear.top = Dom.create("div", {
					props: {className: "bx-messenger-videocall-ear bx-messenger-videocall-ear-top"},
					children: [
						Dom.create("div", {
							props: {className: "bx-messenger-videocall-ear-icon"}
						})
					],
					events: {
						click: this._onTopPageNavigatorClick.bind(this)
					}
				}),
				this.elements.ear.bottom = Dom.create("div", {
					props: {className: "bx-messenger-videocall-ear bx-messenger-videocall-ear-bottom"},
					children: [
						Dom.create("div", {
							props: {className: "bx-messenger-videocall-ear-icon"}
						})
					],
					events: {
						click: this._onBottomPageNavigatorClick.bind(this)
					}
				})
			]
		});

		this.elements.userList.container = Dom.create("div", {
			props: {
				className: "bx-messenger-videocall-user-list"
			},
			events: {
				scroll: Runtime.debounce(this.toggleEars.bind(this), 300),
				wheel: (e) => this.elements.userList.container.scrollTop += e.deltaY
			}
		});

		this.elements.userList.addButton = Dom.create("div", {
			props: {className: "bx-messenger-videocall-user-add"},
			children: [
				Dom.create("div", {
					props: {className: "bx-messenger-videocall-user-add-inner"}
				})
			],
			style: {
				order: addButtonPosition
			},
			events: {
				click: this._onAddButtonClick.bind(this)
			}
		});

		if (this.layout == Layouts.Centered || this.layout == Layouts.Mobile)
		{
			this.centralUser.mount(this.elements.center);
			this.eventEmitter.emit(EventName.onHasMainStream, {
				userId: this.centralUser.id
			});
			this.elements.root.classList.add("bx-messenger-videocall-centered");
			if (this.layout != Layouts.Mobile)
			{
				this.elements.container.appendChild(this.elements.userBlock);
			}
		}
		if (this.layout == Layouts.Grid)
		{
			this.elements.root.classList.add("bx-messenger-videocall-grid");
		}
		if (this.layout == Layouts.Mobile)
		{
			this.elements.root.classList.add("bx-messenger-videocall-fullscreen-mobile");
		}

		this.resizeObserver.observe(this.elements.root);
		this.resizeObserver.observe(this.container);
		return this.elements.root;
	};

	toggleSubscribingVideoInRenderUserList(participantIds, showVideo)
	{
		if (!!participantIds.length)
		{
			this.eventEmitter.emit(EventName.onToggleSubscribe, {
				participantIds: participantIds,
				showVideo: showVideo
			});
		}
	}

	getOrderingRules()
	{
		const rules = {
			videoEnabled: [],
			videoDisabled: [],
			userDisconnected: null,
		};

		this.rerenderQueue.forEach((el) =>
		{
			if (el.reason === RerenderReason.UserDisconnected)
			{
				rules.userDisconnected = {
					id: el.userId,
					order: this.userRegistry.get(el.userId).prevOrder,
				};
			}
			else if (el.reason === RerenderReason.VideoEnabled)
			{
				rules.videoEnabled.push({
					id: el.userId,
					order: this.userRegistry.get(el.userId).order,
				});
			}
			else if (el.reason === RerenderReason.VideoDisabled)
			{
				rules.videoDisabled.push({
					id: el.userId,
					order: this.userRegistry.get(el.userId).order,
				});
			}
		});

		this.rerenderQueue.clear();
		rules.videoEnabled.sort((a, b) => a.order - b.order);
		rules.videoDisabled.sort((a, b) => a.order - b.order);

		return rules;
	};

	applyOrderChanges(changes)
	{
		if (!Type.isArray(changes))
		{
			return;
		}

		changes.forEach(change =>
		{
			if (change.type === SwapType.Direct)
			{
				change.to.userModel.order = change.to.order;
			}
			else if (change.type === SwapType.Replace && change.to && change.from)
			{
				change.to.userModel.order = change.from.order;
				change.to.userModel.prevOrder = 0;
				change.from.userModel.order = change.to.order;
			}
		});
	};

	isUserHasActiveState(userModel)
	{
		return (userModel.state !== UserState.Idle
			&& userModel.state !== UserState.Declined
			&& userModel.state !== UserState.Unavailable
			&& userModel.state !== UserState.Busy
			&& userModel.direction !== EndpointDirection.RecvOnly
		);
	};

	processVideoRules(rules, params)
	{
		const diffBetweenChanges = rules.videoEnabled.length - rules.videoDisabled.length;
		const lessChangesField = diffBetweenChanges > 0 ? 'videoDisabled' : 'videoEnabled';
		const moreChangesField = diffBetweenChanges > 0 ? 'videoEnabled' : 'videoDisabled';

		if (rules.videoEnabled.length && rules.videoDisabled.length)
		{
			rules[lessChangesField].forEach((el, index) =>
			{
				const toUser = this.userRegistry.get(el.id);
				const fromUser = this.userRegistry.get(rules[moreChangesField][index].id);

				params.orderChanges.push({
					type: SwapType.Replace,
					to: {
						userModel: fromUser,
						order: fromUser.order,
					},
					from: {
						userModel: toUser,
						order: toUser.order,
					},
				});
			});
		}

		this.applyOrderChanges(params.orderChanges);
		params.orderChanges.length = 0;

		if (diffBetweenChanges !== 0)
		{
			rules[moreChangesField].splice(0, rules[moreChangesField].length - Math.abs(diffBetweenChanges));
			rules[lessChangesField].length = 0;

			if (moreChangesField === 'videoEnabled')
			{
				rules.videoEnabled.forEach((el) =>
				{
					params.orderChanges.push({
						type: SwapType.Replace,
						from: {
							userModel: this.userRegistry.get(el.id),
							order: this.userRegistry.get(el.id).order,
						},
					});
					params.incompleteSwaps.push(params.orderChanges.length);
				});
			}
		}
		else
		{
			rules.videoEnabled.length = 0;
			rules.videoDisabled.length = 0;
		}
	};

	processDisconnectRules(rules, params)
	{
		if (!rules.userDisconnected)
		{
			return;
		}

		const userModel = this.userRegistry.get(rules.userDisconnected.id);

		if (userModel.prevCameraState)
		{
			params.disconnectedUserHadVideo = true;
		}
	};

	completeVideoEnableSwap(userModel, rules, params)
	{
		const swapRemains = params.incompleteSwaps.length;

		if (userModel.state === UserState.Calling)
		{
			return;
		}
		else if (params.usersWithEnabledVideo.includes(userModel.id))
		{
			params.incompleteSwaps.pop();
			params.usersWithEnabledVideo.splice(params.usersWithEnabledVideo.indexOf(userModel.id), 1);
			params.usersToKeepActive.push(userModel.id);
		}
		else if (!userModel.cameraState)
		{
			const index = params.incompleteSwaps[swapRemains - 1] - 1;
			const userEnabledVideo = params.orderChanges[index].from;
			const currenUserFromCurrentPage = params.possibleActiveUsers?.includes(userModel.id);
			const changedUserFromCurrentPage = params.possibleActiveUsers?.includes(userEnabledVideo.userModel.id);
			const skipDeactivation = changedUserFromCurrentPage || (currenUserFromCurrentPage && changedUserFromCurrentPage);

			params.orderChanges[index].to = {
				userModel,
				order: userModel.order,
			};

			if (!skipDeactivation)
			{
				params.currentPageUsers.pop();
				params.usersToDeactivate++;
			}
			else if (changedUserFromCurrentPage && !currenUserFromCurrentPage)
			{
				params.usersToForceDeactivation.push(userEnabledVideo.userModel.id);
			}
			else if (currenUserFromCurrentPage && changedUserFromCurrentPage)
			{
				params.usersToKeepActive.push(userModel.id);
			}

			params.incompleteSwaps.pop();
		}
	};

	completeVideoDisabledSwap(rules, params)
	{
		let usersProceed = 0;

		rules.videoDisabled.forEach((el, index) =>
		{
			const userWithoutVideo = this.userRegistry.get(el.id);
			const userWithoutVideoIndex = params.activeUsers.indexOf(el.id);
			const userWithoutVideoPage = Math.ceil((userWithoutVideoIndex + 1) / this.usersPerPage);
			const skipUsers = (userWithoutVideoPage - 1) * this.usersPerPage;
			const numberOfUsersWithVideoForSwap = params.usersWithVideo.length - skipUsers;
			const userToSwap = params.usersWithVideo[params.usersWithVideo.length - 1 - index];
			const canCompleteVideoSwap = userToSwap && userToSwap.order > el.order;

			if (canCompleteVideoSwap && (numberOfUsersWithVideoForSwap - usersProceed >= rules.videoDisabled.length - index))
			{
				usersProceed++;
				params.orderChanges.push({
					type: SwapType.Replace,
					to: {
						userModel: userWithoutVideo,
						order: userWithoutVideo.order,
					},
					from: {
						userModel: userToSwap,
						order: userToSwap.order,
					},
				})

				const userToSwapIndex = params.activeUsers.indexOf(userToSwap.id);
				const userToSwapPage = Math.ceil((userToSwapIndex + 1) / this.usersPerPage);

				if (userWithoutVideoPage === this.currentPage && userToSwapPage > this.currentPage)
				{
					params.usersToKeepActive.push(userToSwap.id);
					params.usersToForceDeactivation.push(el.id);
					params.usersToDeactivate++;
				}
				else if (userToSwapPage === this.currentPage && userToSwapPage > userWithoutVideoPage)
				{
					params.usersToKeepActive.push(el.id);
					params.usersToForceDeactivation.push(userToSwap.id);
					params.usersToDeactivate++;
				}
			}
		});
	};

	calculateUserActive(userModel, status, userSkipped, params)
	{
		if (params.usersWithEnabledVideo.includes(userModel.id) && !userSkipped && !params.possibleActiveUsers.includes(userModel.id))
		{
			params.currentPageUsers.push(userModel);
			params.usersToDeactivate--;
			status = true;
		}
		else if (params.currentPageUsers.length + params.usersToDeactivate > this.usersPerPage)
		{
			params.currentPageUsers.pop();
			status = false;
		}

		return status;
	};

	completeDisconnectSwap(rules, params)
	{
		const lowerOrderOnCurrentPage = this.userRegistry.get(params.possibleActiveUsers[0])?.order;
		const higherOrderOnCurrentPage = this.userRegistry.get(params.possibleActiveUsers[params.possibleActiveUsers.length - 1])?.order;
		let disconnectedUserFromCurrentPage = false;
		if (this.currentPage === 1)
		{
			disconnectedUserFromCurrentPage = rules.userDisconnected.order < lowerOrderOnCurrentPage || (rules.userDisconnected.order > lowerOrderOnCurrentPage && rules.userDisconnected.order < higherOrderOnCurrentPage);
		}
		else
		{
			const skipUsers = this.currentPage > 1 ? (this.currentPage - 2) * this.usersPerPage : 0;
			const activeUsersFromPreviousPage = params.activeUsers.slice(skipUsers, skipUsers + this.usersPerPage);
			const lastActiveUserFromPreviousPage = this.userRegistry.get(activeUsersFromPreviousPage[activeUsersFromPreviousPage.length - 1]);
			disconnectedUserFromCurrentPage = (rules.userDisconnected.order > lowerOrderOnCurrentPage && rules.userDisconnected.order < higherOrderOnCurrentPage)
				|| (rules.userDisconnected.order < lowerOrderOnCurrentPage && rules.userDisconnected.order > lastActiveUserFromPreviousPage?.order);
		}

		const userToSwap = params.disconnectedUserHadVideo
			? params.usersWithVideo[params.usersWithVideo.length - 1]
			: this.userRegistry.get(params.activeUsers[params.activeUsers.length - 1]);

		if (!userToSwap || userToSwap.order <= rules.userDisconnected.order)
		{
			return;
		}

		params.orderChanges.push({
			type: SwapType.Direct,
			to: {
				userModel: userToSwap,
				order: rules.userDisconnected.order,
			},
		});

		if (this.currentPage !== this.pagesCount && disconnectedUserFromCurrentPage && !params.possibleActiveUsers.includes(userToSwap.id))
		{
			params.usersToKeepActive.push(userToSwap.id);
			params.usersToDeactivate++;
		}
	};

	renderAddUserButtonInList()
	{
		const showAdd = this.showAddUserButtonInList && this.layout == Layouts.Centered && this.uiState === UiState.Connected && !this.isButtonBlocked("add") && this.getConnectedUserCount() < this.userLimit - 1 && !this.isFullScreen && this.elements.userList.addButton;

		if (showAdd)
		{
			this.elements.userList.container.appendChild(this.elements.userList.addButton);
			return;
		}

		Dom.remove(this.elements.userList.addButton);
	};

	renderUserList(pageChange)
	{
		clearTimeout(this.rerenderTimeout);
		this.rerenderTimeout = null;
		this.activeUsers = [];
		this.inactiveUsers = [];

		const showLocalUser = this.shouldShowLocalUser();
		let userCount = 0;
		let skipUsers = 0;
		let skippedUsers = 0;
		let renderedUsers = 0;

		const orderingRules = this.getOrderingRules();
		const orderingParams = {
			usersWithVideo: [],
			usersWithEnabledVideo: [],
			usersWithDisabledVideo: [],
			possibleActiveUsers: null,
			usersToKeepActive: [],
			usersToForceDeactivation: [],
			currentPageUsers: [],
			orderChanges: [],
			incompleteSwaps: [],
			disconnectedUserHadVideo: false,
			usersToDeactivate: 0,
			videoDisabledProceed: false,
		};

		if ((this.layout === Layouts.Grid || this.layout === Layouts.Centered) && this.pagesCount > 1)
		{
			skipUsers = (this.currentPage - 1) * this.usersPerPage;
		}

		if (this.layout === Layouts.Grid)
		{
			this.processVideoRules(orderingRules, orderingParams);
			this.processDisconnectRules(orderingRules, orderingParams);
			orderingParams.usersWithEnabledVideo = orderingRules.videoEnabled.map(el => el.id);
			orderingParams.usersWithDisabledVideo = orderingRules.videoDisabled.map(el => el.id);

			orderingParams.activeUsers = this.getActiveUsers();
			orderingParams.possibleActiveUsers = orderingParams.activeUsers.slice(skipUsers, skipUsers + this.usersPerPage);
			orderingParams.usersWithVideo = this.getUsersWithCamera();

			this.completeVideoDisabledSwap(orderingRules, orderingParams);
			if (orderingRules.userDisconnected)
			{
				this.completeDisconnectSwap(orderingRules, orderingParams);
			}
		}
		else if (this.layout === Layouts.Centered)
		{
			// new grid logic is applied only in the Layouts.Grid layout
			// so we need to save some rules for later
			orderingRules.videoEnabled.forEach(user => this.shelvedRerenderQueue.set(user.id, {
				userId: user.id,
				reason: RerenderReason.VideoEnabled,
			}));
			orderingRules.videoDisabled.forEach(user => this.shelvedRerenderQueue.set(user.id, {
				userId: user.id,
				reason: RerenderReason.VideoDisabled,
			}));
		}

		for (let i = 0; i < this.userRegistry.users.length; i++)
		{
			const userModel: UserModel = this.userRegistry.users[i];
			const userId = userModel.id;
			if (!this.users.hasOwnProperty(userId))
			{
				continue;
			}

			const user: CallUser = this.users[userId];
			const screenUser: CallUser = this.screenUsers[userId];
			if (userId == this.centralUser.id && (this.layout == Layouts.Centered || this.layout == Layouts.Mobile))
			{
				if (this.layout == Layouts.Centered)
				{
					this.activeUsers.push(userId);
				}
				this.unobserveIntersections(user);
				if (screenUser.hasVideo())
				{
					screenUser.mount(this.elements.center);
					screenUser.visible = true;
					user.mount(this.elements.userList.container);
				}
				else
				{
					user.visible = true;
					user.mount(this.elements.center);
					screenUser.dismount();
				}

				continue;
			}
			let userActive = this.isUserHasActiveState(userModel);
			let userSkipped = false;

			if (userActive && skipUsers > 0 && skippedUsers < skipUsers)
			{
				// skip users on previous pages
				skippedUsers++;
				userActive = false;
				userSkipped = true;
			}

			if (userActive && this.layout === Layouts.Grid && this.usersPerPage > 0 && renderedUsers < this.usersPerPage)
			{
				orderingParams.currentPageUsers.push(userModel);
			}

			if (this.layout === Layouts.Grid)
			{
				if (orderingRules.videoEnabled.length)
				{
					if ((userActive || userSkipped) && orderingParams.incompleteSwaps.length)
					{
						const previousIncompleteSwaps = orderingParams.incompleteSwaps.length;
						const index = orderingParams.incompleteSwaps[0] - 1;
						const userEnabledVideo = orderingParams.orderChanges[index].from;
						const currentUserFromCurrentPage = orderingParams.possibleActiveUsers?.includes(userModel.id);
						const changedUserFromCurrentPage = orderingParams.possibleActiveUsers?.includes(userEnabledVideo.userModel.id);
						const currentUserFromNextPage = userModel.order > orderingParams.possibleActiveUsers[orderingParams.possibleActiveUsers.length-1].order;

						this.completeVideoEnableSwap(userModel, orderingRules, orderingParams);
						const swapCompleted = previousIncompleteSwaps !== orderingParams.incompleteSwaps.length;

						if (swapCompleted && userActive && !changedUserFromCurrentPage && !orderingParams.usersToKeepActive.includes(userModel.id))
						{
							userActive = false;
						}
						else if (swapCompleted && ((!userSkipped && !currentUserFromCurrentPage) || (userSkipped && changedUserFromCurrentPage)))
						{
							userActive = true;
						}
					}

					if (orderingParams.usersToDeactivate)
					{
						userActive = this.calculateUserActive(userModel, userActive, userSkipped, orderingParams);
					}

					if (orderingParams.usersToForceDeactivation.includes(userModel.id))
					{
						userActive = false;
					}
				}
				else if (orderingRules.videoDisabled.length)
				{
					if (orderingParams.usersToKeepActive.includes(userModel.id))
					{
						userActive = true;
						orderingParams.usersToDeactivate--;
					}
					else if (orderingParams.usersToForceDeactivation.includes(userModel.id)
						|| (orderingParams.currentPageUsers.length + orderingParams.usersToDeactivate > this.usersPerPage)
					)
					{
						userActive = false;
						orderingParams.currentPageUsers.pop();
					}
				}
				else if (orderingRules.userDisconnected)
				{
					if (orderingParams.usersToKeepActive.includes(userModel.id))
					{
						userActive = true;
						orderingParams.usersToDeactivate--;
					}
					else if (orderingParams.currentPageUsers.length + orderingParams.usersToDeactivate > this.usersPerPage)
					{
						userActive = false;
						orderingParams.currentPageUsers.pop();
					}
				}
			}

			if (userActive && (this.layout === Layouts.Grid || this.layout === Layouts.Centered) && this.usersPerPage > 0 && renderedUsers >= this.usersPerPage)
			{
				// skip users on following pages
				userActive = false;
			}

			if (userActive)
			{
				this.activeUsers.push(userId)
			}
			else
			{
				this.inactiveUsers.push(userId)
			}

			if (!userActive)
			{
				user.dismount();
				this.unobserveIntersections(user);
				screenUser.dismount();
				continue;
			}

			if (screenUser.hasVideo())
			{
				screenUser.mount(this.elements.userList.container);
				userCount++;
			}
			else
			{
				screenUser.dismount();
			}
			user.mount(this.elements.userList.container);
			if (!this.isPreparing)
			{
				this.observeIntersections(user);
			}
			renderedUsers++;
			userCount++;
		}

		this.applyOrderChanges(orderingParams.orderChanges);

		if (showLocalUser)
		{
			if (this.layout == Layouts.Centered && this.userId == this.centralUser.id || this.layout == Layouts.Mobile)
			{
				// this.unobserveIntersections(this.localUser);
				this.localUser.mount(this.elements.center, true);
				this.localUser.visible = true;
			}
			else
			{
				// using force true to always move self to the end of the list
				this.localUser.mount(this.elements.userList.container);
				if (this.layout == Layouts.Centered && this.intersectionObserver)
				{
					// this.observeIntersections(this.localUser);
				}
				else
				{
					this.localUser.visible = true;
				}
			}

			userCount++;
		}
		else
		{
			this.localUser.dismount();
			// this.unobserveIntersections(this.localUser);
		}

		if (this.layout == Layouts.Grid)
		{
			this.updateGridUserSize(userCount);
		}
		else
		{
			this.elements.userList.container.classList.add("bx-messenger-videocall-user-list-small");
			this.elements.userList.container.style.removeProperty('--avatar-size');
			this.elements.userList.container.style.removeProperty('--avatar-text-size');
			this.updateCentralUserAvatarSize();
		}
		this.applyIncomingVideoConstraints();

		this.renderAddUserButtonInList();

		this.elements.root.classList.toggle("bx-messenger-videocall-user-list-empty", (this.elements.userList.container.childElementCount === 0));
		this.localUser.updatePanelDeferred();

		const currentActiveUsers = this.currentPiPUserId ? [...this.activeUsers, this.currentPiPUserId] : this.activeUsers;
		const currentInactiveUsers = [...this.inactiveUsers];
		const currentPiPUserIndexInInactiveUsers = this.currentPiPUserId ? currentInactiveUsers.indexOf(this.currentPiPUserId) : -1;

		if (currentPiPUserIndexInInactiveUsers !== -1)
		{
			currentInactiveUsers.splice(currentPiPUserIndexInInactiveUsers, 1);
		}

		this.toggleSubscribingVideoInRenderUserList(currentActiveUsers, true)
		this.toggleSubscribingVideoInRenderUserList(currentInactiveUsers, false)
	};

	shouldShowLocalUser()
	{
		return (
			this.localUser.userModel.state != UserState.Idle
			&& this.localUser.userModel.direction != EndpointDirection.RecvOnly
		);
	};

	updateGridUserSize(userCount)
	{
		const containerSize = this.elements.userList.container.getBoundingClientRect();
		this.userSize = Util.findBestElementSize(
			containerSize.width,
			containerSize.height,
			userCount,
			MIN_GRID_USER_WIDTH,
			MIN_GRID_USER_HEIGHT
		);

		//Change the size to make it possible to make indents between users
		let rows = Math.floor(containerSize.height / MIN_GRID_USER_HEIGHT) || 1;
		this.userSize.width -= 5 * rows;
		this.userSize.height -= 2.75 * rows;
		const avatarSize = Math.round(this.userSize.height * 0.45);
		const avatarTextSize = Math.round(avatarSize * 0.45);
		this.elements.userList.container.style.setProperty('--grid-user-width', this.userSize.width + 'px');
		this.elements.userList.container.style.setProperty('--grid-user-height', this.userSize.height + 'px');
		this.elements.userList.container.style.setProperty('--avatar-size', avatarSize + 'px');
		this.elements.userList.container.style.setProperty('--avatar-text-size', avatarTextSize + 'px');
		if (this.userSize.width < 220)
		{
			this.elements.userList.container.classList.add("bx-messenger-videocall-user-list-small");
		}
		else
		{
			this.elements.userList.container.classList.remove("bx-messenger-videocall-user-list-small");
		}
	};

	updateCentralUserAvatarSize()
	{
		let containerSize;
		let avatarSize;
		if (this.layout == Layouts.Mobile)
		{
			containerSize = this.elements.root.getBoundingClientRect();
			avatarSize = Math.round(containerSize.width * 0.55);
		}
		else if (this.layout == Layouts.Centered)
		{
			containerSize = this.elements.center.getBoundingClientRect();
			avatarSize = Math.min(Math.round(containerSize.height * 0.45), Math.round(containerSize.width * 0.45));
			this.centralUser.setIncomingVideoConstraints(Math.floor(containerSize.width), Math.floor(containerSize.height));
		}
		const avatarTextSize = Math.round(avatarSize * 0.45);
		this.elements.center.style.setProperty('--avatar-size', avatarSize + 'px');
		this.elements.center.style.setProperty('--avatar-text-size', avatarTextSize + 'px');
	};

	renderButtons(buttons): HTMLElement
	{
		let panelInner, left, center, right;

		panelInner = Dom.create("div", {
			props: {className: "bx-messenger-videocall-panel-inner"}
		});

		if (this.layout === Layouts.Mobile || this.size === Size.Folded)
		{
			left = panelInner;
			center = panelInner;
			right = panelInner;
		}
		else
		{
			left = Dom.create("div", {
				props: {className: "bx-messenger-videocall-panel-inner-left"},
			});
			center = Dom.create("div", {
				props: {className: "bx-messenger-videocall-panel-inner-center"},
			});
			right = Dom.create("div", {
				props: {className: "bx-messenger-videocall-panel-inner-right"},
			});
			panelInner.appendChild(left);
			panelInner.appendChild(center);
			panelInner.appendChild(right);
		}

		for (let i = 0; i < buttons.length; i++)
		{
			switch (buttons[i])
			{
				case "title":
					this.buttons.title = new Buttons.TitleButton({
						text: this.title,
						isGroupCall: Object.keys(this.users).length > 1
					});
					left.appendChild(this.buttons.title.render());
					break;
				/*case "grid":
					this.buttons.grid = new SimpleButton({
						class: "grid",
						text: BX.message("IM_M_CALL_BTN_GRID"),
						onClick: this._onGridButtonClick.bind(this)
					});
					panelInner.appendChild(this.buttons.grid.render());
					break;*/
				/*case "add":
					this.buttons.add = new SimpleButton({
						class: "add",
						text: BX.message("IM_M_CALL_BTN_ADD"),
						onClick: this._onAddButtonClick.bind(this)
					});
					leftSubPanel.appendChild(this.buttons.add.render());
					break;*/
				case "share":
					this.buttons.share = new Buttons.SimpleButton({
						class: "share",
						text: BX.message("IM_M_CALL_BTN_LINK"),
						onClick: this._onShareButtonClick.bind(this)
					});
					center.appendChild(this.buttons.share.render());
					break;
				case "microphone":
					this.buttons.microphone = new Buttons.DeviceButton({
						class: "microphone",
						text: BX.message("IM_M_CALL_BTN_MIC"),
						enabled: !Hardware.isMicrophoneMuted,
						arrowHidden: this.layout == Layouts.Mobile,
						arrowEnabled: this.isMediaSelectionAllowed(),
						showPointer: true, //todo
						blocked: this.isButtonBlocked("microphone"),
						showLevel: true,
						sideIcon: this.getMicrophoneSideIcon(this.roomState),
						onClick: (e) =>
						{
							this._onMicrophoneButtonClick(e);
							this._showMicrophoneHint(e);
						},
						onArrowClick: this._onMicrophoneArrowClick.bind(this),
						onMouseOver: this._showMicrophoneHint.bind(this),
						onMouseOut: () => this._destroyHotKeyHint(),
						onSideIconClick: this._onMicrophoneSideIconClick.bind(this),
					});
					left.appendChild(this.buttons.microphone.render());
					break;
				case "camera":
					this.buttons.camera = new Buttons.DeviceButton({
						class: "camera",
						text: BX.message("IM_M_CALL_BTN_CAMERA"),
						enabled: Hardware.isCameraOn,
						arrowHidden: this.layout == Layouts.Mobile,
						arrowEnabled: this.isMediaSelectionAllowed(),
						blocked: this.isButtonBlocked("camera"),
						onClick: this._onCameraButtonClick.bind(this),
						onArrowClick: this._onCameraArrowClick.bind(this),
						onMouseOver: (e) =>
						{
							this._showHotKeyHint(e.currentTarget.firstChild, "camera", this.keyModifier + " + V");
						},
						onMouseOut: () =>
						{
							this._destroyHotKeyHint();
						}
					});
					left.appendChild(this.buttons.camera.render());
					break;
				case "screen":
					if (!this.buttons.screen)
					{
						this.buttons.screen = new Buttons.SimpleButton({
							class: "screen",
							backgroundClass: "bx-messenger-videocall-panel-background-screen",
							text: BX.message("IM_M_CALL_BTN_SCREEN"),
							blocked: this.isButtonBlocked("screen"),
							onClick: this._onScreenButtonClick.bind(this),
							onMouseOver: (e) =>
							{
								this._showHotKeyHint(e.currentTarget, "screen", this.keyModifier + " + S");
							},
							onMouseOut: () =>
							{
								this._destroyHotKeyHint();
							}
						});
					}
					else
					{
						this.buttons.screen.setBlocked(this.isButtonBlocked("screen"));
					}
					center.appendChild(this.buttons.screen.render());
					break;
				case "record":
					if (!this.buttons.record)
					{
						this.buttons.record = new Buttons.SimpleButton({
							class: "record",
							backgroundClass: "bx-messenger-videocall-panel-background-record",
							text: this.recordState.state === View.RecordState.Started || this.recordState.state === View.RecordState.Resumed
								? BX.message("CALL_M_BTN_TITLE_STOP_RECORD")
								: BX.message("IM_M_CALL_BTN_RECORD"),
							blocked: this.isButtonBlocked("record"),
							onClick: this._onRecordToggleClick.bind(this),
							onMouseOver: (e) =>
							{
								if (this.isRecordingHotKeySupported())
								{
									this._showHotKeyHint(e.currentTarget, "record", this.keyModifier + " + R");
								}
							},
							onMouseOut: () =>
							{
								if (this.isRecordingHotKeySupported())
								{
									this._destroyHotKeyHint();
								}
							}
						});
					}
					else
					{
						this.buttons.record.setBlocked(this.isButtonBlocked('record'));
					}
					center.appendChild(this.buttons.record.render());
					break;
				case "document":
					if (!this.buttons.document)
					{
						this.buttons.document = new Buttons.SimpleButton({
							class: "document",
							backgroundClass: "bx-messenger-videocall-panel-background-document",
							text: BX.message("IM_M_CALL_BTN_DOCUMENT"),
							blocked: this.isButtonBlocked("document"),
							onClick: this._onDocumentButtonClick.bind(this)
						});
					}
					else
					{
						this.buttons.document.setBlocked(this.isButtonBlocked('document'));
					}
					center.appendChild(this.buttons.document.render());
					break;
				case "copilot":
					if (!this.buttons.copilot)
					{
						this.buttons.copilot = new Buttons.SimpleButton({
							class: "copilot",
							backgroundClass: "bx-messenger-videocall-panel-background-copilot",
							text: BX.message("CALL_BUTTON_COPILOT_TITLE"),
							blocked: this.isButtonBlocked("copilot"),
							onClick: this._onCopilotButtonClick.bind(this),
							isComingSoon: !this.isCopilotFeaturesEnabled,
							onMouseOver: e =>
							{
								this.hintManager.popupParameters.events = null;
								this.hintManager.popupParameters.events = {
									onShow: function onShow(event) {
										const popup = event.getTarget();
										const elementOffsetWidth = e.currentTarget?.offsetWidth;
										const popupOffsetWidth = popup.getPopupContainer()?.offsetWidth;

										if (!elementOffsetWidth || !popupOffsetWidth)
										{
											return;
										}

										const offsetLeft = (elementOffsetWidth / 2 - popupOffsetWidth / 2);

										popup.setOffset({
											offsetLeft,
										});
									},
								};
								const hintText = this.isCopilotActive
									? Loc.getMessage('CALL_COPILOT_BUTTON_ON_HINT_V2')
									: Loc.getMessage('CALL_COPILOT_BUTTON_OFF_HINT')
								;
								this.hintManager.show(e.currentTarget, hintText);
							},
							onMouseOut: e => {
								if (!e.relatedTarget || !e.currentTarget.contains(e.relatedTarget))
								{
									this.hintManager.hide();
								}
							},
						});
					}
					else
					{
						this.buttons.copilot.setBlocked(this.isButtonBlocked('copilot'));
					}

					if (this.isCopilotActive)
					{
						this.buttons.copilot.setActive(true);
					}
					center.appendChild(this.buttons.copilot.render());
					break;
				case "returnToCall":
					this.buttons.returnToCall = new Buttons.SimpleButton({
						class: "returnToCall",
						text: BX.message("IM_M_CALL_BTN_RETURN_TO_CALL"),
						onClick: this._onBodyClick.bind(this)
					});
					right.appendChild(this.buttons.returnToCall.render());
					break;
				case "hangup":
					this.buttons.hangup = new Buttons.SimpleButton({
						class: "hangup",
						backgroundClass: "bx-messenger-videocall-panel-icon-background-hangup",
						text: Object.keys(this.users).length > 1 ? BX.message("IM_M_CALL_BTN_DISCONNECT") : BX.message("IM_M_CALL_BTN_HANGUP"),
						onClick: this._onHangupButtonClick.bind(this)
					});

					right.appendChild(this.buttons.hangup.render());
					break;
				case "hangupOptions":
					this.buttons.hangupOptions = new Buttons.SimpleButton({
						class: "hangup-options",
						backgroundClass: "bx-messenger-videocall-panel-icon-background-hangup-options",
						onClick: this._onHangupOptionsButtonClick.bind(this)
					});

					right.appendChild(this.buttons.hangupOptions.render());
					break;
				case "close":
					this.buttons.close = new Buttons.SimpleButton({
						class: "close",
						backgroundClass: "bx-messenger-videocall-panel-icon-background-hangup",
						text: BX.message("IM_M_CALL_BTN_CLOSE"),
						onClick: this._onCloseButtonClick.bind(this)
					});
					right.appendChild(this.buttons.close.render());
					break;
				case "speaker":
					/*this.buttons.speaker = new Buttons.DeviceButton({
						class: "speaker",
						text: BX.message("IM_M_CALL_BTN_SPEAKER"),
						enabled: !this.speakerMuted,
						arrowEnabled: Hardware.canSelectSpeaker() && this.isMediaSelectionAllowed(),
						onClick: this._onSpeakerButtonClick.bind(this),
						onArrowClick: this._onSpeakerArrowClick.bind(this)
					});
					rightSubPanel.appendChild(this.buttons.speaker.render());*/
					break;
				case "mobileMenu":
					if (!this.buttons.mobileMenu)
					{
						this.buttons.mobileMenu = new Buttons.SimpleButton({
							class: "sandwich",
							text: BX.message("IM_M_CALL_BTN_MENU"),
							onClick: this._onMobileMenuButtonClick.bind(this)
						})
					}
					center.appendChild(this.buttons.mobileMenu.render());
					break;
				case "chat":
					if (!this.buttons.chat)
					{
						this.buttons.chat = new Buttons.SimpleButton({
							class: "chat",
							backgroundClass: "bx-messenger-videocall-panel-background-chat",
							text: BX.message("IM_M_CALL_BTN_CHAT"),
							blocked: this.isButtonBlocked("chat"),
							onClick: this._onChatButtonClick.bind(this),
							onMouseOver: (e) =>
							{
								this._showHotKeyHint(e.currentTarget, "chat", this.keyModifier + " + C");
							},
							onMouseOut: () =>
							{
								this._destroyHotKeyHint();
							}
						});
					}
					else
					{
						this.buttons.chat.setBlocked(this.isButtonBlocked('chat'));
					}
					center.appendChild(this.buttons.chat.render());
					break;
				case "floorRequest":
					if (!this.buttons.floorRequest)
					{
						this.buttons.floorRequest = new Buttons.SimpleButton({
							class: "floor-request",
							backgroundClass: "bx-messenger-videocall-panel-background-floor-request",
							text: BX.message("IM_M_CALL_BTN_WANT_TO_SAY"),
							blocked: this.isButtonBlocked("floorRequest"),
							onClick: this._onFloorRequestButtonClick.bind(this),
							onMouseOver: (e) =>
							{
								this._showHotKeyHint(e.currentTarget, "floorRequest", this.keyModifier + " + H");
							},
							onMouseOut: () => this._destroyHotKeyHint()

						});
					}
					else
					{
						this.buttons.floorRequest.setBlocked(this.isButtonBlocked('floorRequest'));
					}
					center.appendChild(this.buttons.floorRequest.render());
					break;
				case "more":
					if (!this.buttons.more)
					{
						this.buttons.more = new Buttons.SimpleButton({
							class: "more",
							onClick: this._onMoreButtonClick.bind(this)
						})
					}
					center.appendChild(this.buttons.more.render());
					break;
				case "spacer":
					panelInner.appendChild(Dom.create("div", {
						props: {className: "bx-messenger-videocall-panel-spacer"}
					}));
					break;
				/*case "history":
					this.buttons.history = new Buttons.SimpleButton({
						class: "history",
						text: BX.message("IM_M_CALL_BTN_HISTORY"),
						onClick: this._onHistoryButtonClick.bind(this)
					});
					rightSubPanel.appendChild(this.buttons.history.render());
					break;*/
			}
		}

		return panelInner;
	};

	renderTopButtons(buttons)
	{
		let result = BX.createFragment();

		for (let i = 0; i < buttons.length; i++)
		{
			switch (buttons[i])
			{
				case "watermark":
					this.buttons.waterMark = new Buttons.WaterMarkButton({
						language: this.language
					});
					result.appendChild(this.buttons.waterMark.render());
					break;
				case "protected":
					this.buttons.protected = new Buttons.TopFramelessButton({
						iconClass: "protected",
						textClass: "protected",
						text: BX.message("IM_M_CALL_PROTECTED").toLowerCase(),
						onMouseOver: (e) =>
						{
							this.hintManager.popupParameters.events = null;
							this.hintManager.show(e.currentTarget, BX.message("IM_M_CALL_PROTECTED_HINT"));
						},
						onMouseOut: () =>
						{
							this.hintManager.hide();
						}
					});
					result.appendChild(this.buttons.protected.render());
					break;
				case "recordStatus":
					if (this.buttons.recordStatus)
					{
						this.buttons.recordStatus.updateView();
					}
					else
					{
						this.buttons.recordStatus = new Buttons.RecordStatusButton({
							userId: this.userId,
							recordState: this.recordState,
							onPauseClick: this._onRecordPauseClick.bind(this),
							onStopClick: this._onRecordStopClick.bind(this),
							onMouseOver: this._onRecordMouseOver.bind(this),
							onMouseOut: this._onRecordMouseOut.bind(this),
						});
					}
					result.appendChild(this.buttons.recordStatus.render());
					break;
				case "grid":
					this.buttons.grid = new Buttons.TopButton({
						iconClass: this.layout == Layouts.Grid ? "speaker" : "grid",
						text: this.layout == Layouts.Grid ? BX.message("IM_M_CALL_SPEAKER_MODE") : BX.message("IM_M_CALL_GRID_MODE"),
						onClick: this._onGridButtonClick.bind(this),
						onMouseOver: (e) =>
						{
							this._showHotKeyHint(e.currentTarget, "grid", this.keyModifier + " + W", {position: "bottom"});
						},
						onMouseOut: () =>
						{
							this._destroyHotKeyHint();
						}
					});
					result.appendChild(this.buttons.grid.render());
					break;
				case "fullscreen":
					this.buttons.fullscreen = new Buttons.TopButton({
						iconClass: this.isFullScreen ? "fullscreen-leave" : "fullscreen-enter",
						text: this.isFullScreen ? BX.message("IM_M_CALL_WINDOW_MODE") : BX.message("IM_M_CALL_FULLSCREEN_MODE"),
						onClick: this._onFullScreenButtonClick.bind(this)
					});
					result.appendChild(this.buttons.fullscreen.render());
					break;
				case "feedback":
					this.buttons.feedback = new Buttons.TopButton({
						iconClass: 'feedback',
						text: BX.message('IM_OL_COMMENT_HEAD_BUTTON_VOTE'),
						onClick: this._onFeedbackButtonClick.bind(this)
					})
					result.appendChild(this.buttons.feedback.render());
					break;
				case "callcontrol":					
					this.buttons.callcontrol = new Buttons.TopButton({
						iconClass: 'callcontrol',
						text: BX.message('CALL_CALLCONTROL_BUTTON_LABEL'),
						onClick: this._onCallcontrolButtonClick.bind(this)
					})
					
					result.appendChild(this.buttons.callcontrol.render(), this.elements.topPanel);				
					break;
				case "participants":
					let foldButtonState;

					if (this.isFullScreen && this.layout == Layouts.Centered)
					{
						foldButtonState = this.isUserBlockFolded ? Buttons.ParticipantsButton.FoldButtonState.Unfold : Buttons.ParticipantsButton.FoldButtonState.Fold
					}
					else if (this.showUsersButton)
					{
						foldButtonState = Buttons.ParticipantsButton.FoldButtonState.Active;
					}
					else
					{
						foldButtonState = Buttons.ParticipantsButton.FoldButtonState.Hidden;
					}

					if (this.buttons.participants)
					{
						this.buttons.participants.update({
							foldButtonState: foldButtonState,
							allowAdding: !this.isButtonBlocked("add"),
							count: this.getConnectedUserCount(true),
						});
					}
					else
					{
						this.buttons.participants = new Buttons.ParticipantsButton({
							foldButtonState: foldButtonState,
							allowAdding: !this.isButtonBlocked("add"),
							count: this.getConnectedUserCount(true),
							onListClick: this._onParticipantsButtonListClick.bind(this),
							onAddClick: this._onAddButtonClick.bind(this)
						});
					}

					result.appendChild(this.buttons.participants.render());
					break;
				case "participantsMobile":
					this.buttons.participantsMobile = new Buttons.ParticipantsButtonMobile({
						count: this.getConnectedUserCount(true),
						onClick: this._onParticipantsButtonMobileListClick.bind(this),
					});
					result.appendChild(this.buttons.participantsMobile.render());
					break;
				case "separator":
					result.appendChild(Dom.create("div", {
						props: {className: "bx-messenger-videocall-top-separator"}
					}));
					break;
				case "spacer":
					result.appendChild(Dom.create("div", {
						props: {className: "bx-messenger-videocall-top-panel-spacer"}
					}));
					break;
			}
		}
		return result;
	};

	updateCopilotState(isActive)
	{
		this.isCopilotActive = isActive;

		this.setButtonActive('copilot', this.isCopilotActive);

		if (this.elements.wrap)
		{
			this.elements.wrap.classList[this.isCopilotActive ? 'add' : 'remove']('bx-messenger-videocall-wrap-with-copilot')
		}
	}

	updateCopilotFeatureState(isEnabled)
	{
		this.isCopilotFeaturesEnabled = isEnabled;

		if (!this.buttons.copilot)
		{
			return;
		}

		this.buttons.copilot.setIsComingSoon(!this.isCopilotFeaturesEnabled);
	}

	showCopilotNotify(callId = 0, errorCode = '')
	{
		let notifyType = '';

		if (!errorCode)
		{
			notifyType = CopilotNotifyType[this.isCopilotActive ? 'COPILOT_ENABLED' : 'COPILOT_DISABLED'];
		}

		this.copilotNotify = this.createCopilotNotify(notifyType, callId);

		if (this.copilotNotify)
		{
			this.copilotNotify.show();
		}
	}

	closeCopilotNotify()
	{
		if (this.copilotNotify)
		{
			this.copilotNotify.close();
		}
	}

	showCopilotResultNotify()
	{
		this.copilotNotify = this.createCopilotNotify(CopilotNotifyType.COPILOT_RESULT);

		if (this.copilotNotify)
		{
			this.copilotNotify.show();
		}
	}

	showCopilotErrorNotify(errorType)
	{
		this.copilotNotify = this.createCopilotNotify(CopilotNotifyType[errorType]);

		if (this.copilotNotify)
		{
			this.copilotNotify.show();
		}
	}

	createCopilotNotify(notifyType, callId)
	{
		if (!this.buttons.copilot)
		{
			return null;
		}

		return new CopilotNotify({
			type: notifyType,
			bindElement: this.buttons.copilot.elements.root,
			onClose: () => {
				this.copilotNotify = null;
			},
			callId,
		});
	}

	createAhaMomentNotifyCallcontrol()
	{
		if (!this.buttons.callcontrol)
		{
			return;
		}

		if (this.ahaMomentNotifyCallcontrol)
		{
			this.ahaMomentNotifyCallcontrol.show();
			return this.ahaMomentNotifyCallcontrol;
		}

		this.ahaMomentNotifyCallcontrol = new AhaMomentNotify({
			notifyTitle: BX.message("CALL_CALLCONTROL_AXA_MOMENT_TITLE"),
			notifyText: BX.message("CALL_CALLCONTROL_AXA_MOMENT_TEXT"),
			bindElement: this.buttons.callcontrol.elements.root,
			promoId: CALLCONTROL_PROMO_ID,
			onClose: () => {
				this.needToShowCallcontrolPromo = false;
				this.ahaMomentNotifyCallcontrol = null;
			}
		});

		this.ahaMomentNotifyCallcontrol.show();

		return this.ahaMomentNotifyCallcontrol;
	}

	calculateUnusedPanelSpace(buttonList)
	{
		if (!buttonList)
		{
			buttonList = this.getButtonList();
		}

		let totalButtonWidth = 0;
		for (let i = 0; i < buttonList.length; i++)
		{
			const button = this.buttons[buttonList[i]];
			if (!button)
			{
				continue;
			}
			const buttonWidth = button.elements.root ? button.elements.root.getBoundingClientRect().width : 0;
			totalButtonWidth += buttonWidth;
		}

		return this.elements.panel.scrollWidth - totalButtonWidth - 32;
	};


	setWindowFocusState(isActive)
	{
		if (isActive === this.isWindowFocus)
		{
			return;
		}

		this.isWindowFocus = isActive;

		if (this.pictureInPictureCallWindow)
		{
			this.pictureInPictureCallWindow.setButtons(this.getPictureInPictureCallWindowGetButtonsList());
			this.pictureInPictureCallWindow.updateButtons();
		}
	}

	getPictureInPictureCallWindowGetButtonsList()
	{
		const buttonsList = ["microphone", "camera"];

		if (this.getButtonActive('screen'))
		{
			buttonsList.push("stop-screen");
		}

		if (this.size === View.Size.Folded || this.isDocumentHidden)
		{
			buttonsList.push("returnToCall");
		}

		// if (this.getButtonList().includes('copilot'))
		// {
		// 	buttonsList.push("copilot");
		// }

		return buttonsList;
	}

	getPictureInPictureCallWindowUser()
	{
		const currentUserId = this.presenterId || this.centralUser?.userModel.id || this.userId;
		const isLocalUser = +this.userId === +currentUserId;
		const currentUser = isLocalUser ? this.localUser : this.users[currentUserId];

		const isCurrentPiPUser = !!this.currentPiPUserId && currentUserId === this.currentPiPUserId;

		if (isCurrentPiPUser)
		{
			return;
		}

		if (!this.activeUsers.includes(currentUserId) && !isLocalUser)
		{
			this.toggleSubscribingVideoInRenderUserList([currentUserId], true);
		}

		if (this.currentPiPUserId && +this.userId !== +this.currentPiPUserId && !this.activeUsers.includes(this.currentPiPUserId))
		{
			this.toggleSubscribingVideoInRenderUserList([this.currentPiPUserId], false);
		}

		this.currentPiPUserId = currentUserId;

		const modifiedCurrentUser =  {
			userModel: this.userRegistry.get(currentUserId),
			avatarBackground: currentUser.avatarBackground,
			videoRenderer: currentUser.videoRenderer,
			previewRenderer: currentUser.previewRenderer,
		};

		if (currentUser.videoTrack)
		{
			modifiedCurrentUser.videoRenderer = new MediaRenderer({
				kind: 'video',
				track: currentUser.videoTrack,
			});
		}

		if (!isLocalUser && this.screenUsers[currentUserId]?.videoTrack)
		{
			modifiedCurrentUser.previewRenderer = new MediaRenderer({
				kind: 'sharing',
				track: this.screenUsers[currentUserId].videoTrack,
			});
		}

		if (isLocalUser && this.localStreamVideoTrack)
		{
			modifiedCurrentUser.previewRenderer = new MediaRenderer({
				kind: 'sharing',
				track: this.localStreamVideoTrack,
			});
		}

		return modifiedCurrentUser;
	}

	getBlockedButtonsListPictureInPictureCallWindow()
	{
		const blockedButtons = [];

		if (this.isButtonBlocked('camera'))
		{
			blockedButtons.push('camera');
		}

		if (this.isButtonBlocked('microphone'))
		{
			blockedButtons.push('microphone');
		}

		if (this.isButtonBlocked('screen'))
		{
			blockedButtons.push('screen');
		}

		return blockedButtons;
	}

	toggleStatePictureInPictureCallWindow(isActive)
	{
		if (isActive && !this.pictureInPictureCallWindow && Util.isPictureInPictureFeatureEnabled())
		{
			this.pictureInPictureCallWindow = new PictureInPictureWindow({
				currentUser: this.getPictureInPictureCallWindowUser(),
				isCopilotFeaturesEnabled: this.isCopilotFeaturesEnabled,
				buttons: this.getPictureInPictureCallWindowGetButtonsList(),
				blockedButtons: this.getBlockedButtonsListPictureInPictureCallWindow(),
				allowPinButton: false,
				allowBackgroundItem: BackgroundDialog.isAvailable() && this.isIntranetOrExtranet,
				allowMaskItem: BackgroundDialog.isMaskAvailable() && this.isIntranetOrExtranet,
				preferInitialWindowPlacement: this.preferInitialWindowPlacementPictureInPicture,
				floorRequestNotifications: this.floorRequestNotifications,
				onClose: () =>
				{
					this.pictureInPictureCallWindow = null;
					this.currentPiPUserId = null;
				},
				onButtonClick: ({ buttonName, event }) =>
				{
					switch (buttonName)
					{
						case "microphone":
							this._onMicrophoneButtonClick(event);
							break;
						case "camera":
							this._onCameraButtonClick(event);
							break;
						case "returnToCall":
							this._onBodyClick(event);
							break;
						case "stop-screen":
							this._onScreenButtonClick(event);
							break;
						default:
							break;
					}
				}
			});
			this.pictureInPictureCallWindow.checkAvailableAndCreate()
				.then(() => {
					this.preferInitialWindowPlacementPictureInPicture = false;
				});
		}

		if (!isActive && this.pictureInPictureCallWindow)
		{
			this.pictureInPictureCallWindow.close();
		}
	}

	setButtonActive(buttonName, isActive)
	{
		if (!this.buttons[buttonName])
		{
			return;
		}

		this.buttons[buttonName].setActive(isActive);

		if (this.pictureInPictureCallWindow)
		{
			this.pictureInPictureCallWindow.setButtons(this.getPictureInPictureCallWindowGetButtonsList());
			this.pictureInPictureCallWindow.updateButtons();
		}

	};

	getButtonActive(buttonName)
	{
		if (!this.buttons || !this.buttons[buttonName])
		{
			return false;
		}

		return this.buttons[buttonName].isActive;
	};

	setButtonCounter(buttonName, counter)
	{
		if (!this.buttons[buttonName])
		{
			return;
		}

		this.buttons[buttonName].setCounter(counter);
	};

	updateUserList(useShelvedRerenderQueue)
	{
		if (this.layout == Layouts.Mobile)
		{
			if (this.localUser != this.centralUser)
			{
				if (this.localUser.hasVideo())
				{
					this.localUser.mount(this.elements.localUserMobile);
					this.localUser.visible = true;
				}
				else
				{
					this.localUser.dismount();
				}

				this.centralUser.mount(this.elements.center);
				this.eventEmitter.emit(EventName.onHasMainStream, {
					userId: this.centralUser.id
				});
				this.centralUser.visible = true;
			}
			return;
		}
		/* if (this.layout == Layouts.Grid && this.size == Size.Full)
		{
			this.recalculatePages();
		} */

		if ((this.layout == Layouts.Grid || this.layout == Layouts.Centered) && this.size == Size.Full)
		{
			this.recalculatePages();
		}

		if (useShelvedRerenderQueue)
		{
			this.shelvedRerenderQueue.forEach((el) =>
			{
				if (el.reason === RerenderReason.VideoEnabled)
				{
					this.updateRerenderQueue(el.userId, el.reason);
				}
				else if (el.reason === RerenderReason.VideoDisabled)
				{
					this.updateRerenderQueue(el.userId, el.reason);
				}
			});

			this.shelvedRerenderQueue.clear();
		}

		this.renderUserList();

		if (this.layout == Layouts.Centered)
		{
			if (!this.elements.userList.container.parentElement)
			{
				this.elements.userBlock.appendChild(this.elements.userList.container);
			}
			//this.centralUser.setFullSize(this.elements.userList.container.childElementCount === 0);

		}
		else if (this.layout == Layouts.Grid)
		{
			if (!this.elements.userList.container.parentElement)
			{
				this.elements.container.appendChild(this.elements.userList.container);
			}
		}
		this.toggleEars();
	};

	showOverflownButtonsPopup()
	{
		if (this.overflownButtonsPopup)
		{
			this.overflownButtonsPopup.show();
			return;
		}

		const bindElement = this.buttons.more && this.buttons.more.elements.root ? this.buttons.more.elements.root : this.elements.panel;

		this.overflownButtonsPopup = new Popup({
			id: 'bx-call-buttons-popup',
			bindElement: bindElement,
			targetContainer: this.container,
			content: this.renderButtons(Object.keys(this.overflownButtons)),
			cacheable: false,
			closeIcon: false,
			autoHide: true,
			overlay: {backgroundColor: 'white', opacity: 0},
			bindOptions: {
				position: 'top'
			},
			angle: {position: 'bottom', offset: 49},
			className: 'bx-call-buttons-popup',
			contentBackground: 'unset',
			events: {
				onPopupDestroy: () =>
				{
					this.overflownButtonsPopup = null;
					this.buttons.more.setActive(false);
				},
			}
		});
		this.overflownButtonsPopup.show();
	}

	resumeVideo()
	{
		for (let userId in this.users)
		{
			const user = this.users[userId];
			user.playVideo()
			const screenUser = this.screenUsers[userId];
			screenUser.playVideo();
		}
		this.localUser.playVideo();
	};

	updateUserButtons()
	{
		for (let userId in this.users)
		{
			if (this.users.hasOwnProperty(userId))
			{
				this.users[userId].allowPinButton = this.getConnectedUserCount() > 1;
			}
		}
	};

	updateButtons(skippedElementsList = [])
	{
		if (!this.elements.panel)
		{
			return;
		}

		if (!skippedElementsList.includes('panel'))
		{
			Dom.clean(this.elements.panel);
			this.elements.panel.appendChild(this.renderButtons(this.getButtonList()));
		}

		Dom.clean(this.elements.topPanel);
		if (this.elements.topPanel)
		{
			this.elements.topPanel.appendChild(this.renderTopButtons(this.getTopButtonList()));
		}
		if (this.buttons.participantsMobile)
		{
			this.buttons.participantsMobile.setCount(this.getConnectedUserCount(true));
		}

		if (this.pictureInPictureCallWindow)
		{
			this.pictureInPictureCallWindow.updateButtons();
		}

		if (this.showCallcontrolPromoPopupTimeout)
		{
			clearTimeout(this.showCallcontrolPromoPopupTimeout);
		}

		if (this.needToShowCallcontrolPromo)
		{
			this.showCallcontrolPromoPopupTimeout = setTimeout(() =>
			{
				if (this.size !== View.Size.Folded)
				{
					this.createAhaMomentNotifyCallcontrol();
				}
			}, 1500);
		}

		this.renderAddUserButtonInList();
	};

	updateUserData(userData)
	{
		for (let userId in userData)
		{
			if (!this.userData[userId])
			{
				this.userData[userId] = {
					name: '',
					avatar_hr: '',
					gender: 'M'
				}
			}
			if (userData[userId].name)
			{
				this.userData[userId].name = userData[userId].name;
			}

			if (userData[userId].avatar_hr)
			{
				this.userData[userId].avatar_hr = Util.isAvatarBlank(userData[userId].avatar_hr) ? '' : userData[userId].avatar_hr;
			}
			else if (userData[userId].avatar)
			{
				this.userData[userId].avatar_hr = Util.isAvatarBlank(userData[userId].avatar) ? '' : userData[userId].avatar;
			}

			if (userData[userId].gender)
			{
				this.userData[userId].gender = userData[userId].gender === 'F' ? 'F' : 'M';
			}

			const userModel = this.userRegistry.get(userId);
			if (userModel)
			{
				userModel.name = this.userData[userId].name;
				userModel.avatar = this.userData[userId].avatar_hr;
			}
		}
	};

	isScreenSharingSupported()
	{
		return navigator.mediaDevices && typeof (navigator.mediaDevices.getDisplayMedia) === "function" || typeof (BXDesktopSystem) !== "undefined";
	};

	isRecordingHotKeySupported()
	{
		return typeof (BXDesktopSystem) !== "undefined" && BXDesktopSystem.ApiVersion() >= 60;
	};

	isFullScreenSupported()
	{
		if (BX.browser.IsChrome() || BX.browser.IsSafari())
		{
			return document.webkitFullscreenEnabled === true;
		}
		else if (BX.browser.IsFirefox())
		{
			return document.fullscreenEnabled === true;
		}
		else
		{
			return false;
		}
	};

	toggleEars()
	{
		this.toggleTopEar();
		this.toggleBottomEar();

		if (this.layout == Layouts.Grid && this.pagesCount > 1 && this.currentPage > 1)
		{
			this.elements.pageNavigatorLeft.classList.add("active");
		}
		else
		{
			this.elements.pageNavigatorLeft.classList.remove("active");
		}

		if (this.layout == Layouts.Grid && this.pagesCount > 1 && this.currentPage < this.pagesCount)
		{
			this.elements.pageNavigatorRight.classList.add("active");
		}
		else
		{
			this.elements.pageNavigatorRight.classList.remove("active");
		}
	};

	toggleTopEar()
	{
		if (
			this.layout !== Layouts.Grid &&
			this.pagesCount > 1
		)
		{
			this.elements.ear.top.classList.add("active");
		}
		else
		{
			this.elements.ear.top.classList.remove("active");
		}
	};

	toggleBottomEar()
	{
		if (
			this.layout !== Layouts.Grid &&
			this.pagesCount > 1
		)
		{
			this.elements.ear.bottom.classList.add("active");
		}
		else
		{
			this.elements.ear.bottom.classList.remove("active");
		}
	};

	scrollUserListUp()
	{
		this.stopScroll();
		this.scrollInterval = setInterval(
			() => this.elements.userList.container.scrollTop -= 10,
			20
		);
	};

	scrollUserListDown()
	{
		this.stopScroll();
		this.scrollInterval = setInterval(
			() => this.elements.userList.container.scrollTop += 10,
			20
		);
	};

	stopScroll()
	{
		if (this.scrollInterval)
		{
			clearInterval(this.scrollInterval);
			this.scrollInterval = 0;
		}
	};

	toggleRenameSliderInputLoader()
	{
		this.elements.renameSlider.button.classList.add('ui-btn-wait');
	};

	setHotKeyTemporaryBlock(isActive, force)
	{
		if (!!isActive)
		{
			this.hotKeyTemporaryBlock++;
		}
		else
		{

			this.hotKeyTemporaryBlock--;
			if (this.hotKeyTemporaryBlock < 0 || force)
			{
				this.hotKeyTemporaryBlock = 0;
			}
		}
	}

	setHotKeyActive(name, isActive)
	{
		if (typeof this.hotKey[name] === 'undefined')
		{
			return;
		}

		this.hotKey[name] = !!isActive;
	};

	isHotKeyActive(name)
	{
		if (!this.hotKey['all'])
		{
			return false;
		}

		if (this.hotKeyTemporaryBlock > 0)
		{
			return false;
		}

		if (this.isButtonHidden(name))
		{
			return false;
		}

		if (this.isButtonBlocked(name))
		{
			return false;
		}

		return !!this.hotKey[name];
	}

	// event handlers

	_onBodyClick()
	{
		this.eventEmitter.emit(EventName.onBodyClick);
	};

	_onCenterTouchStart(e)
	{
		this.centerTouchX = e.pageX;
	};

	_onCenterTouchEnd(e)
	{
		const delta = e.pageX - this.centerTouchX;

		if (delta > 100)
		{
			this.pinUser(this.getRightUser(this.centralUser.id));
			e.preventDefault();
		}
		if (delta < -100)
		{
			this.pinUser(this.getLeftUser(this.centralUser.id));
			e.preventDefault();
		}
	};

	_onFullScreenChange()
	{
		if ("webkitFullscreenElement" in document)
		{
			this.isFullScreen = (!!document.webkitFullscreenElement);
		}
		else if ("fullscreenElement" in document)
		{
			this.isFullScreen = (!!document.fullscreenElement);
		}
		else
		{
			return;
		}

		// safari workaround
		setTimeout(function ()
		{
			if (!this.elements.root)
			{
				return;
			}
			if (this.isFullScreen)
			{
				this.elements.root.classList.add("bx-messenger-videocall-fullscreen");
			}
			else
			{
				this.elements.root.classList.remove("bx-messenger-videocall-fullscreen");
			}
			this.updateUserList();
			this.updateButtons();
			this.setUserBlockFolded(this.isFullScreen);

		}.bind(this), 0);
	};

	_onIntersectionChange(entries)
	{
		let t = {};
		entries.forEach(function (intersectionEntry)
		{
			t[intersectionEntry.target.dataset.userId] = intersectionEntry.isIntersecting;
		});
		for (let userId in t)
		{
			if (this.users[userId])
			{
				this.users[userId].visible = t[userId];
			}
			if (userId == this.localUser.id)
			{
				this.localUser.visible = t[userId];
			}
		}
	};

	_onResize()
	{
		// this.resizeCalled++;
		// this.reportResizeCalled();

		if (!this.elements.root)
		{
			return;
		}
		if (this.centralUser)
		{
			//this.centralUser.updateAvatarWidth();
		}
		if (BX.browser.IsMobile())
		{
			document.documentElement.style.setProperty('--view-height', window.innerHeight + 'px');
		}
		if (this.layout == Layouts.Grid || this.layout == Layouts.Centered)
		{
			this.updateUserList();
		}
		else
		{
			this.updateCentralUserAvatarSize();
			this.toggleEars();
		}

		const rootDimensions = this.elements.root.getBoundingClientRect()
		this.elements.root.classList.toggle("bx-messenger-videocall-width-lt-450", rootDimensions.width < 450);
		this.elements.root.classList.toggle("bx-messenger-videocall-width-lt-550", rootDimensions.width < 550);
		this.elements.root.classList.toggle("bx-messenger-videocall-width-lt-650", rootDimensions.width < 650);
		this.elements.root.classList.toggle("bx-messenger-videocall-width-lt-700", rootDimensions.width < 700);
		this.elements.root.classList.toggle("bx-messenger-videocall-width-lt-850", rootDimensions.width < 850);
		this.elements.root.classList.toggle("bx-messenger-videocall-width-lt-900", rootDimensions.width < 900);

		/*if (this.maxWidth === 0)
		{
			this.elements.root.style.maxWidth = this.container.clientWidth + 'px';
		}*/

		if (this.checkPanelOverflow())
		{
			this.updateButtons();
			if (this.overflownButtonsPopup && !Object.keys(this.overflownButtons).length)
			{
				this.overflownButtonsPopup.close();
			}
		}
	};

	_onOrientationChange()
	{
		if (!this.elements.root)
		{
			return;
		}
		if (window.innerHeight > window.innerWidth)
		{
			this.elements.root.classList.remove("orientation-landscape");
		}
		else
		{
			this.elements.root.classList.add("orientation-landscape");
		}
	};

	_showHotKeyHint(targetNode, name, text, options)
	{
		const existingHint = BX.PopupWindowManager.getPopupById('ui-hint-popup');
		if (existingHint)
		{
			existingHint.destroy();
		}

		if (!this.isHotKeyActive(name))
		{
			return;
		}

		options = options || {};
		this.hintManager.popupParameters.events = {
			onShow: function onShow(event) {
				let popup = event.getTarget();
				let offsetLeft = (targetNode.offsetWidth / 2 - popup.getPopupContainer().offsetWidth / 2) + 23;

				if (options?.additionalOffsetLeft)
				{
					offsetLeft += options.additionalOffsetLeft;
				}
				// hack to get hint sizes
				popup.getPopupContainer().style.display = 'block';
				if (options.position === 'bottom') {
					popup.setOffset({
						offsetTop: 10,
						offsetLeft,
					});
				} else {
					popup.setOffset({
						offsetLeft,
					});
				}
			}
		};

		this.hintManager.show(
			targetNode,
			text
		);
	}

	_destroyHotKeyHint()
	{
		if (!Util.isDesktop())
		{
			return;
		}

		if (!this.hintManager.popup)
		{
			return;
		}

		// we need to destroy, not .hide for onShow event handler (see method _showHotKeyHint).
		this.hintManager.popup.destroy();
		this.hintManager.popup = null;
	}

	_showMicrophoneHint(e)
	{
		this.hintManager.hide();

		if (!this.isHotKeyActive("microphone"))
		{
			return;
		}

		let micHotkeys = '';
		let additionalOffsetLeft = 0;
		if (Hardware.isMicrophoneMuted && this.isHotKeyActive("microphoneSpace"))
		{
			micHotkeys = BX.message("IM_SPACE_HOTKEY") + '<br>';
			additionalOffsetLeft = 20;
		}
		micHotkeys += this.keyModifier + ' + A';

		this._showHotKeyHint(e.currentTarget.firstChild, "microphone", micHotkeys, {additionalOffsetLeft});
	}

	_onKeyDown(e)
	{
		if (!Util.isDesktop())
		{
			return;
		}
		if (!(e.shiftKey && (e.ctrlKey || e.metaKey)) && !(e.code === 'Space'))
		{
			return;
		}
		if (event.repeat)
		{
			return;
		}

		const callMinimized = this.size === View.Size.Folded;

		if (
			e.code === 'KeyA'
			&& this.isHotKeyActive('microphone')
		)
		{
			e.preventDefault();
			if (this.deviceSelector)
			{
				this.deviceSelector.destroy();
			}
			this._onMicrophoneButtonClick(e);
		}
		else if (
			e.code === 'Space' && Hardware.isMicrophoneMuted
			&& this.isHotKeyActive('microphoneSpace')
		)
		{
			if (!callMinimized)
			{
				e.preventDefault();
				this.pushToTalk = true;
				this.microphoneHotkeyTimerId = setTimeout(function ()
				{
					if (this.deviceSelector)
					{
						this.deviceSelector.destroy();
					}
					this._onMicrophoneButtonClick(e);
				}.bind(this), 100);
			}
		}
		else if (
			e.code === 'KeyS'
			&& this.isHotKeyActive('screen')
		)
		{
			e.preventDefault();
			this._onScreenButtonClick(e);
		}
		else if (
			e.code === 'KeyV'
			&& this.isHotKeyActive('camera')
		)
		{
			e.preventDefault();
			if (this.deviceSelector)
			{
				this.deviceSelector.destroy();
			}
			this._onCameraButtonClick(e);
		}
		else if (
			e.code === 'KeyU'
			&& this.isHotKeyActive('users')
		)
		{
			e.preventDefault();
			this._onUsersButtonClick(e);
		}
		else if (
			e.code === 'KeyR'
			&& this.isRecordingHotKeySupported()
			&& this.isHotKeyActive('record')
		)
		{
			e.preventDefault();
			this._onForceRecordToggleClick(e);
		}
		else if (
			e.code === 'KeyH'
			&& this.isHotKeyActive('floorRequest')
		)
		{
			e.preventDefault();
			this._onFloorRequestButtonClick(e);
		}
		else if (
			e.code === 'KeyC'
			&& this.isHotKeyActive('chat')
		)
		{
			e.preventDefault();
			if (callMinimized)
			{
				this._onBodyClick(e);
			}
			else
			{
				this._onChatButtonClick(e);
				this._destroyHotKeyHint();
			}
		}
		else if (
			e.code === 'KeyM'
			&& this.isHotKeyActive('muteSpeaker')
		)
		{
			e.preventDefault();
			this.eventEmitter.emit(EventName.onButtonClick, {
				buttonName: "toggleSpeaker",
				speakerMuted: this.speakerMuted,
				fromHotKey: true,
			});
		}
		else if (
			e.code === 'KeyW'
			&& this.isHotKeyActive('grid')
		)
		{
			e.preventDefault();
			this.setLayout(this.layout == Layouts.Centered ? Layouts.Grid : Layouts.Centered);
		}
	};

	_onKeyUp(e)
	{
		if (!Util.isDesktop())
		{
			return;
		}

		clearTimeout(this.microphoneHotkeyTimerId);
		if (this.pushToTalk && !Hardware.isMicrophoneMuted && e.code === 'Space')
		{
			e.preventDefault();
			this.pushToTalk = false;
			if (this.deviceSelector)
			{
				this.deviceSelector.destroy();
			}
			this._onMicrophoneButtonClick(e);
		}
	};

	_onUserClick(e)
	{
		const userId = e.userId;

		if (userId == this.centralUser.id && this.layout != Layouts.Grid)
		{
			this.elements.root.classList.toggle("bx-messenger-videocall-hidden-panels");
		}

		if (this.layout == Layouts.Centered && userId != this.centralUser.id)
		{
			this.pinUser(userId);
		}
		else
		{
			(this.pinnedUser && this.pinnedUser.id === userId) ? this._onUserUnPin() : this._onUserPin({userId});
		}

		this.eventEmitter.emit(EventName.onUserClick, {
			userId: userId,
			stream: userId == this.userId ? this.localUser.stream : this.users[userId].stream,
			layout: this.layout,
		});
	};

	_onUserRename(newName)
	{
		this.eventEmitter.emit(EventName.onUserRename, {newName: newName});
	};

	_onUserRenameInputFocus()
	{
		this.setHotKeyTemporaryBlock(true);
	};

	_onUserRenameInputBlur()
	{
		this.setHotKeyTemporaryBlock(false);
	};

	_onUserPin(e)
	{
		if (this.layout == Layouts.Grid)
		{
			this.setLayout(Layouts.Centered)
		}
		this.pinUser(e.userId);
	};

	_onUserUnPin()
	{
		if (this.layout == Layouts.Centered)
		{
			this.setLayout(Layouts.Grid)
		}
		this.unpinUser();
	};

	_onTurnOffParticipantMic(e)
	{
		this.eventEmitter.emit(EventName.onTurnOffParticipantMic, {
			userId: e.userId
		});
	};

	_onTurnOffParticipantCam(e)
	{
		this.eventEmitter.emit(EventName.onTurnOffParticipantCam, {
			userId: e.userId
		});
	};
	
	_onTurnOffParticipantScreenshare(e)
	{
		this.eventEmitter.emit(EventName.onTurnOffParticipantScreenshare, {
			userId: e.userId
		});
	};

	_onRecordToggleClick(e)
	{
		const limitObj = this.getRecordLimitation();

		this.onClickButtonWithLimit(limitObj, () => {
			if (this.recordState.state === View.RecordState.Stopped)
			{
				this._onRecordStartClick(e);
			}
			else
			{
				this._onRecordStopClick(e);
			}
		})
	}

	_onForceRecordToggleClick(e)
	{
		const limitObj = this.getRecordLimitation();

		this.onClickButtonWithLimit(limitObj, () => {
			if (this.recordState.state === View.RecordState.Stopped)
			{
				this._onForceRecordStartClick(View.RecordType.Video);
			}
			else
			{
				this._onRecordStopClick(e);
			}
		})
	}

	_onForceRecordStartClick(recordType)
	{
		if (typeof recordType === 'undefined')
		{
			recordType = View.RecordType.None;
		}

		this.eventEmitter.emit(EventName.onButtonClick, {
			buttonName: "record",
			recordState: View.RecordState.Started,
			forceRecord: recordType, // none, video, audio
			node: null
		});
	}

	_onRecordStartClick(e)
	{
		this.eventEmitter.emit(EventName.onButtonClick, {
			buttonName: "record",
			recordState: View.RecordState.Started,
			node: e.currentTarget
		});
	}

	_onRecordPauseClick(e)
	{
		let recordState;
		if (this.recordState.state === View.RecordState.Paused)
		{
			this.recordState.state = View.RecordState.Started;
			recordState = View.RecordState.Resumed;
		}
		else
		{
			this.recordState.state = View.RecordState.Paused;
			recordState = this.recordState.state;
		}

		this.buttons.recordStatus.update(this.recordState);

		this.eventEmitter.emit(EventName.onButtonClick, {
			buttonName: "record",
			recordState: recordState,
			node: e.currentTarget
		});
	};

	_onRecordStopClick(e)
	{
		this.recordState.state = View.RecordState.Stopped;
		this.buttons.recordStatus.update(this.recordState);

		this.eventEmitter.emit(EventName.onButtonClick, {
			buttonName: "record",
			recordState: this.recordState.state,
			node: e.currentTarget
		});
	};

	_onRecordMouseOver(e)
	{
		if (this.recordState.userId == this.userId || !this.userData[this.recordState.userId])
		{
			return;
		}

		const recordingUserName = Text.encode(this.userData[this.recordState.userId].name);
		this.hintManager.show(e.currentTarget, BX.message("IM_M_CALL_RECORD_HINT").replace("#USER_NAME#", recordingUserName));
	};

	_onRecordMouseOut()
	{
		this.hintManager.hide();
	};

	_onDocumentButtonClick(e)
	{
		e.stopPropagation();
		this.eventEmitter.emit(EventName.onButtonClick, {
			buttonName: 'document',
			node: e.target
		});
	};

	_onCopilotButtonClick(e)
	{
		e.stopPropagation();
		this.eventEmitter.emit(EventName.onButtonClick, {
			buttonName: 'copilot',
			node: e.target
		});
	};

	_onGridButtonClick()
	{
		this.setLayout(this.layout == Layouts.Centered ? Layouts.Grid : Layouts.Centered);
		if (this.layout == Layouts.Centered && this.localUser.id !== this.centralUser.id)
		{
			this.eventEmitter.emit(EventName.onHasMainStream, {
				userId: this.centralUser.id
			});
		}
	};

	_onAddButtonClick(e)
	{
		e.stopPropagation();
		this.eventEmitter.emit(EventName.onButtonClick, {
			buttonName: "inviteUser",
			node: e.currentTarget
		});
	};

	_onShareButtonClick(e)
	{
		e.stopPropagation();
		this.eventEmitter.emit(EventName.onButtonClick, {
			buttonName: "share",
			node: e.currentTarget
		});
	};

	_onMicrophoneButtonClick(e)
	{
		if (this.isButtonBlocked('microphone'))
		{
			return;
		}
		if ("stopPropagation" in e)
		{
			e.stopPropagation();
		}
		this.eventEmitter.emit(EventName.onButtonClick, {
			buttonName: "toggleMute",
			muted: !Hardware.isMicrophoneMuted
		});
	};

	_onMicrophoneArrowClick(e)
	{
		e.stopPropagation();
		this.showDeviceSelector(e.currentTarget);
	};

	_onMicrophoneSideIconClick(e)
	{
		e.stopPropagation();
		this.eventEmitter.emit(EventName.onButtonClick, {
			buttonName: "microphoneSideIcon",
		});
	};

	_onMicrophoneSelected(e)
	{
		this.eventEmitter.emit(EventName.onReplaceMicrophone, {
			deviceId: e.data.deviceId
		});
	};

	_onCameraButtonClick(e)
	{
		if (this.isButtonBlocked('camera'))
		{
			return;
		}
		if ("stopPropagation" in e)
		{
			e.stopPropagation();
		}
		this.eventEmitter.emit(EventName.onButtonClick, {
			buttonName: "toggleVideo",
			video: !Hardware.isCameraOn
		});
	};

	_onCameraArrowClick(e)
	{
		e.stopPropagation();
		this.showDeviceSelector(e.currentTarget);
	};

	_onCameraSelected(e)
	{
		this.eventEmitter.emit(EventName.onReplaceCamera, {
			deviceId: e.data.deviceId
		});
	};

	_onSpeakerButtonClick()
	{
		this.eventEmitter.emit(EventName.onButtonClick, {
			buttonName: "toggleSpeaker",
			speakerMuted: this.speakerMuted
		});
	};

	_onChangeHdVideo(e)
	{
		this.eventEmitter.emit(EventName.onChangeHdVideo, e.data);
	};

	_onChangeMicAutoParams(e)
	{
		this.eventEmitter.emit(EventName.onChangeMicAutoParams, e.data);
	};

	_onChangeFaceImprove(e)
	{
		this.eventEmitter.emit(EventName.onChangeFaceImprove, e.data);
	};

	disableFaceImprove()
	{
		if (
			Util.isDesktop()
			&& DesktopApi.isDesktop()
			&& DesktopApi.getCameraSmoothingStatus()
		)
		{
			this.eventEmitter.emit(EventName.onChangeFaceImprove, {
				faceImproveEnabled: false
			});
		}
	}

	_onSpeakerSelected(e)
	{
		this.setSpeakerId(e.data.deviceId);

		this.eventEmitter.emit(EventName.onReplaceSpeaker, {
			deviceId: e.data.deviceId
		});
	};

	_onScreenButtonClick(e)
	{
		e.stopPropagation();

		const limitObj = this.getScreenSharingLimitation();

		this.onClickButtonWithLimit(limitObj, () => {
			this.eventEmitter.emit(EventName.onButtonClick, {
				buttonName: 'toggleScreenSharing',
				node: e.target
			});
		})
	};

	_onChatButtonClick(e)
	{
		this.hintManager.hide();
		e.stopPropagation();
		this.eventEmitter.emit(EventName.onButtonClick, {
			buttonName: 'showChat',
			node: e.target
		});
	};

	_onUsersButtonClick(e)
	{
		this.hintManager.hide();
		e.stopPropagation();
		this.eventEmitter.emit(EventName.onButtonClick, {
			buttonName: 'toggleUsers',
			node: e.target
		});
	};

	_onMobileMenuButtonClick(e)
	{
		e.stopPropagation();
		this.showCallMenu();
	};

	_onFloorRequestButtonClick(e)
	{
		e.stopPropagation();
		this.eventEmitter.emit(EventName.onButtonClick, {
			buttonName: 'floorRequest',
			node: e.target
		});
	};

	_onMoreButtonClick(e)
	{
		e.stopPropagation();
		if (this.overflownButtonsPopup)
		{
			this.overflownButtonsPopup.close();
			this.buttons.more.setActive(false);
		}
		else
		{
			this.showOverflownButtonsPopup();
			this.buttons.more.setActive(true);
		}
	};

	_onHistoryButtonClick(e)
	{
		e.stopPropagation();
		this.eventEmitter.emit(EventName.onButtonClick, {
			buttonName: 'showHistory',
			node: e.target
		});
	};

	_onHangupButtonClick(e)
	{
		e.stopPropagation();
		this.clearNewLogicRules();
		this.eventEmitter.emit(EventName.onButtonClick, {
			buttonName: 'hangup',
			node: e.target
		});
	};

	_onHangupOptionsButtonClick(e)
	{
		e.stopPropagation();
		this.eventEmitter.emit(EventName.onButtonClick, {
			buttonName: 'hangupOptions',
			node: e.target
		});
	};

	_onCloseButtonClick(e)
	{
		e.stopPropagation();
		this.eventEmitter.emit(EventName.onButtonClick, {
			buttonName: 'close',
			node: e.target
		});
	};

	_onFullScreenButtonClick(e)
	{
		e.stopPropagation();
		this.eventEmitter.emit(EventName.onButtonClick, {
			buttonName: 'fullscreen',
			node: e.target
		});
	};

	_onFeedbackButtonClick(e)
	{
		e.stopPropagation();
		this.eventEmitter.emit(EventName.onButtonClick, {
			buttonName: 'feedback',
			node: e.target
		});
	}
	
	_onCallcontrolButtonClick(e)
	{
		e.stopPropagation();
		this.eventEmitter.emit(EventName.onButtonClick, {
			buttonName: 'callcontrol',
			node: e.target
		});
		
		if (this.ahaMomentNotifyCallcontrol)
		{
			PromoManager.getInstance().markAsWatched(CALLCONTROL_PROMO_ID);
		}
		
		this.clearCallcontrolPromo();
	}

	_onParticipantsButtonListClick(event)
	{
		if (!this.isButtonBlocked('users'))
		{
			this._onUsersButtonClick(event);
			return;
		}

		if (!this.isFullScreen)
		{
			return;
		}

		this.setUserBlockFolded(!this.isUserBlockFolded);
	};

	_onParticipantsListButtonClick(e)
	{
		e.stopPropagation();

		const viewEvent = new BaseEvent({
			data: {
				buttonName: 'participantsList',
				node: e.target
			},
			compatData: ['participantsList', e.target],
		});
		this.eventEmitter.emit(EventName.onButtonClick, viewEvent);

		if (viewEvent.isDefaultPrevented())
		{
			return;
		}

		UserSelector.create({
			parentElement: e.currentTarget,
			zIndex: this.baseZIndex + 500,
			userList: Object.values(this.users),
			current: this.centralUser.id,
			onSelect: (userId) => this.setCentralUser(userId)
		}).show();
	};

	_onParticipantsButtonMobileListClick()
	{
		this.showParticipantsMenu();
	};

	_onMobileCallMenuFloorRequestClick()
	{
		this.callMenu.close();
		this.eventEmitter.emit(EventName.onButtonClick, {
			buttonName: 'floorRequest',
		});
	};

	_onMobileCallMenShowParticipantsClick()
	{
		this.callMenu.close();
		this.showParticipantsMenu();
	};

	_onMobileCallMenuCopyInviteClick()
	{
		this.callMenu.close();
		this.eventEmitter.emit(EventName.onButtonClick, {
			buttonName: "share",
			node: null
		})
	};

	showRenameSlider()
	{
		if (!this.renameSlider)
		{
			this.renameSlider = new MobileSlider({
				parent: this.elements.root,
				content: this.renderRenameSlider(),
				onClose: () => this.renameSlider.destroy(),
				onDestroy: () => this.renameSlider = null,
			});
		}

		this.renameSlider.show();
		setTimeout(
			() =>
			{
				this.elements.renameSlider.input.focus();
				this.elements.renameSlider.input.select();
			},
			400
		);
	};

	renderRenameSlider()
	{
		return Dom.create("div", {
			props: {
				className: "bx-videocall-mobile-rename-slider-wrap"
			},
			children: [
				Dom.create("div", {
					props: {
						className: "bx-videocall-mobile-rename-slider-title"
					},
					text: BX.message("IM_M_CALL_MOBILE_MENU_CHANGE_MY_NAME")
				}),
				this.elements.renameSlider.input = Dom.create("input", {
					props: {
						className: "bx-videocall-mobile-rename-slider-input"
					},
					attrs: {
						type: "text",
						value: this.localUser.userModel.name
					}
				}),
				this.elements.renameSlider.button = Dom.create("button", {
					props: {
						className: "bx-videocall-mobile-rename-slider-button ui-btn ui-btn-md ui-btn-primary"
					},
					text: BX.message("IM_M_CALL_MOBILE_RENAME_CONFIRM"),
					events: {
						click: this._onMobileUserRename.bind(this)
					}
				})
			]
		});
	};

	_onMobileUserRename(event)
	{
		event.stopPropagation();

		const inputValue = this.elements.renameSlider.input.value;
		const newName = inputValue.trim();
		let needToUpdate = true;
		if (newName === this.localUser.userModel.name || newName === '')
		{
			needToUpdate = false;
		}

		if (needToUpdate)
		{
			this.toggleRenameSliderInputLoader();
			this._onUserRename(newName)
		}
		else
		{
			this.renameSlider.close();
		}
	};

	_onMobileCallMenuCancelClick()
	{
		this.callMenu.close();
	};

	_onLeftEarClick()
	{
		this.pinUser(this.getLeftUser(this.centralUser.id));
	};

	_onRightEarClick()
	{
		this.pinUser(this.getRightUser(this.centralUser.id));
	};

	_onLeftPageNavigatorClick(e)
	{
		e.stopPropagation();
		this.setCurrentPage(this.currentPage - 1)
	};

	_onRightPageNavigatorClick(e)
	{
		e.stopPropagation();
		this.setCurrentPage(this.currentPage + 1)
	};

	_onTopPageNavigatorClick(e)
	{
		e.stopPropagation();
		this.setCurrentPage(this.currentPage !== 1 ? this.currentPage - 1 : this.pagesCount);
	};

	_onBottomPageNavigatorClick(e)
	{
		e.stopPropagation();
		this.setCurrentPage(this.currentPage !== this.pagesCount ? this.currentPage + 1 : 1);
	};

	setMaxWidth(maxWidth)
	{
		if (this.maxWidth !== maxWidth)
		{
			const MAX_WIDTH_SPEAKER_MODE = 650;
			if (maxWidth < MAX_WIDTH_SPEAKER_MODE
				&& (!this.maxWidth || this.maxWidth > MAX_WIDTH_SPEAKER_MODE)
				&& this.layout === Layouts.Centered
			)
			{
				this.setLayout(Layouts.Grid)
			}

			const animateUnsetProperty = this.maxWidth === null;
			this.maxWidth = maxWidth;
			if (this.size !== View.Size.Folded)
			{
				this._applyMaxWidth(animateUnsetProperty);
			}
		}
	};

	removeMaxWidth()
	{
		this.setMaxWidth(null);
	}

	_applyMaxWidth(animateUnsetProperty)
	{
		const containerDimensions = this.container.getBoundingClientRect();
		if (this.maxWidth !== null)
		{
			if (!this.elements.root.style.maxWidth && animateUnsetProperty)
			{
				this.elements.root.style.maxWidth = containerDimensions.width + 'px';
			}
			setTimeout(
				() => this.elements.root.style.maxWidth = Math.max(this.maxWidth, MIN_WIDTH) + 'px',
				0,
			);
		}
		else
		{
			this.elements.root.style.maxWidth = containerDimensions.width + 'px';
			this.elements.root.addEventListener('transitionend',
				() => this.elements.root.style.removeProperty('max-width'),
				{once: true},
			)
		}
	};

	releaseLocalMedia()
	{
		if (!this.hasCurrentUserScreenSharing())
		{
			this.localUser.releaseStream();
		}

		if (this.centralUser.id == this.userId)
		{
			this.centralUser.releaseStream();
		}
	};

	clearNewLogicRules()
	{
		clearTimeout(this.rerenderTimeout);
		this.rerenderTimeout = null;
		this.waitingForUserMediaTimeouts.forEach(timeout => clearTimeout(timeout));
		this.waitingForUserMediaTimeouts.clear();
		this.rerenderQueue.clear();
	}

	clearCallcontrolPromo()
	{
		if (this.showCallcontrolPromoPopupTimeout)
		{
			clearTimeout(this.showCallcontrolPromoPopupTimeout);
		}

		if (this.ahaMomentNotifyCallcontrol)
		{
			this.needToShowCallcontrolPromo = false;
			this.ahaMomentNotifyCallcontrol.close();
			this.ahaMomentNotifyCallcontrol = null;
		}

	}

	destroy()
	{
		this.destroyed = true;

		this.closeCopilotNotify();
		if (this.overflownButtonsPopup)
		{
			this.overflownButtonsPopup.close();
		}

		this.preferInitialWindowPlacementPictureInPicture = true;

		if (this.elements.root)
		{
			Dom.remove(this.elements.root);
			this.elements.root = null;
		}
		this.visible = false;

		this.clearNewLogicRules();

		window.removeEventListener("webkitfullscreenchange", this._onFullScreenChangeHandler);
		window.removeEventListener("mozfullscreenchange", this._onFullScreenChangeHandler);
		window.removeEventListener("orientationchange", this._onOrientationChangeHandler);
		window.removeEventListener("keydown", this._onKeyDownHandler);
		window.removeEventListener("keyup", this._onKeyUpHandler);

		document.removeEventListener('mousemove', this.onMouseMoveHandler);

		// TODO: Disable PiP on minimize
		// this.toggleVisibilityChangeDocumentEvent(false);
		this.resizeObserver.disconnect();
		this.resizeObserver = null;
		if (this.intersectionObserver)
		{
			this.intersectionObserver.disconnect();
			this.intersectionObserver = null;
		}
		for (let userId in this.users)
		{
			if (this.users.hasOwnProperty(userId))
			{
				this.users[userId].destroy();
			}
		}
		this.userData = null;
		this.centralUser.destroy();
		this.hintManager.hide();
		this.hintManager = null;

		clearTimeout(this.switchPresenterTimeout);

		if (this.buttons.recordStatus)
		{
			this.buttons.recordStatus.stopViewUpdate();
		}
		this.recordState = this.getDefaultRecordState();
		this.buttons = null;

		this.eventEmitter.emit(EventName.onDestroy);
		this.eventEmitter.unsubscribeAll();

		Hardware.unsubscribe(Hardware.Events.onChangeMicrophoneMuted, this.setMuted);
		Hardware.unsubscribe(Hardware.Events.onChangeCameraOn, this.setCameraState);

		this.clearCallcontrolPromo();
	};

	static Layout = Layouts;
	static Size = Size;
	static RecordState = RecordState;
	static RecordType = RecordType;

	static RecordSource = {
		Chat: 'BXCLIENT_CHAT'
	};

	static UiState = UiState;
	static Event = EventName;
	static RoomState = RoomState;
	static DeviceSelector = DeviceSelector;
	static NotificationManager = NotificationManager;
	static MIN_WIDTH = MIN_WIDTH
}