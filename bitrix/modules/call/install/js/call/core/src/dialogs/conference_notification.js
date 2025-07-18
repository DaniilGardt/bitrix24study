import {Dom, Text, Type} from 'main.core';
import {Popup} from 'main.popup';
import {DesktopApi} from 'im.v2.lib.desktop-api';
import Util from '../util';
import { Utils } from 'im.v2.lib.utils';

const Events = {
	onButtonClick: "ConferenceNotification::onButtonClick"
};

/**
 *
 * @param {Object} config
 * @param {string} config.callerName
 * @param {string} config.callerAvatar
 * @param {number} config.zIndex
 * @param {function} config.onClose
 * @param {function} config.onDestroy
 * @param {function} config.onButtonClick
 * @constructor
 */
export class ConferenceNotifications
{
	constructor(config)
	{
		this.popup = null;
		this.window = null;

		this.callerAvatar = Type.isStringFilled(config.callerAvatar) ? config.callerAvatar : "";
		this.zIndex = config.zIndex;
		if (Util.isAvatarBlank(this.callerAvatar))
		{
			this.callerAvatar = "";
		}

		this.callerName = config.callerName;
		this.callerColor = config.callerColor;

		this.callbacks = {
			onClose: Type.isFunction(config.onClose) ? config.onClose : BX.DoNothing,
			onDestroy: Type.isFunction(config.onDestroy) ? config.onDestroy : BX.DoNothing,
			onButtonClick: Type.isFunction(config.onButtonClick) ? config.onButtonClick : BX.DoNothing
		};

		this._onContentButtonClickHandler = this._onContentButtonClick.bind(this);
		if (DesktopApi.isDesktop())
		{
			DesktopApi.subscribe(Events.onButtonClick, this._onContentButtonClickHandler);
		}
	};

	show()
	{
		if (DesktopApi.isChatWindow())
		{
			var params = {
				callerAvatar: this.callerAvatar,
				callerName: this.callerName,
				callerColor: this.callerColor
			};

			if (this.window)
			{
				this.window.BXDesktopWindow.ExecuteCommand("show");
			}
			else
			{
				const js = `
					window.conferenceNotification = new BX.Call.NotificationConferenceContent(${JSON.stringify(params)});
					window.conferenceNotification.showInDesktop();
				`;
				const html = DesktopApi.prepareHtml('', js);
				this.window = DesktopApi.createTopmostWindow(html);
			}
		}
		else
		{
			this.content = new NotificationConferenceContent({
				callerAvatar: this.callerAvatar,
				callerName: this.callerName,
				callerColor: this.callerColor,
				onClose: this.callbacks.onClose,
				onDestroy: this.callbacks.onDestroy,
				onButtonClick: this.callbacks.onButtonClick
			});
			this.createPopup(this.content.render());
			this.popup.show();
			window.addEventListener('resize', () =>
			{
				this.onResize();
			});
		}
	};

	onResize()
	{
		if (this.popup)
		{
			this.popup.setMaxHeight(document.body.clientHeight);
		}
	}

	createPopup(content)
	{
		this.popup = new Popup({
			id: "bx-messenger-call-notify",
			targetContainer: document.body,
			content: content,
			closeIcon: false,
			noAllPaddings: true,
			zIndex: this.zIndex,
			offsetLeft: 0,
			offsetTop: 0,
			closeByEsc: false,
			draggable: {restrict: false},
			borderRadius: '25px',
			disableScroll: true,
			maxHeight: document.body.clientHeight,
			overlay: {backgroundColor: 'black', opacity: 30},
			events: {
				onPopupClose: function ()
				{
					window.removeEventListener('resize', () =>
					{
						this.onResize();
					});
					this.callbacks.onClose();
				}.bind(this),
				onPopupDestroy: function ()
				{
					this.popup = null;
				}.bind(this)
			}
		});
	};

	close()
	{
		if (this.popup)
		{
			this.popup.close();
		}
		if (this.window)
		{
			this.window.BXDesktopWindow.ExecuteCommand("hide");
		}
		this.callbacks.onClose();
	};

	destroy()
	{
		if (this.popup)
		{
			this.popup.destroy();
			this.popup = null;
		}
		if (this.window)
		{
			this.window.BXDesktopWindow.ExecuteCommand("close");
			this.window = null;
		}

		if (DesktopApi.isDesktop())
		{
			DesktopApi.unsubscribe(Events.onButtonClick, this._onContentButtonClickHandler);
		}
		this.callbacks.onDestroy();
	}

	_onContentButtonClick(e)
	{
		this.callbacks.onButtonClick(e);
	}
}

export class NotificationConferenceContent
{
	constructor(config)
	{
		this.callerAvatar = config.callerAvatar || '';
		this.callerName = config.callerName || BX.message('IM_CL_USER');
		this.callerColor = config.callerColor || '#525252';

		this.elements = {
			root: null,
			avatar: null
		};

		this.callbacks = {
			onClose: Type.isFunction(config.onClose) ? config.onClose : BX.DoNothing,
			onDestroy: Type.isFunction(config.onDestroy) ? config.onDestroy : BX.DoNothing,
			onButtonClick: Type.isFunction(config.onButtonClick) ? config.onButtonClick : BX.DoNothing
		};
	};

	render()
	{
		var avatarImageStyles;
		let avatarImageText = '';
		if (this.callerAvatar)
		{
			avatarImageStyles = {
				backgroundImage: "url('" + this.callerAvatar + "')",
				backgroundColor: '#fff',
				backgroundSize: 'cover',
			}
		}
		else
		{
			avatarImageStyles = {
				backgroundImage: 'none',
				backgroundColor: this.callerColor,
				backgroundSize: '80px',
				backgroundRepeat: 'no-repeat',
				backgroundPosition: 'center center',
			}
			avatarImageText = Utils.text.getFirstLetters(this.callerName).toUpperCase();
		}

		this.elements.root = Dom.create("div", {
			props: {className: "bx-messenger-call-window" + (DesktopApi.isDesktop() ? ' desktop' : '')},
			children: [
				Dom.create("div", {
					props: {className: "bx-messenger-call-window-body"},
					children: [
						Dom.create("div", {
							props: {className: "bx-messenger-call-window-top"},
							children: [
								Dom.create("div", {
									props: {className: "bx-messenger-call-window-photo bx-messenger-videocall-incoming-call-avatar-pulse"},
									children: [
										Dom.create("div", {
											props: {className: "bx-messenger-call-window-photo-left"},
											children: [
												this.elements.avatar = Dom.create("div", {
													props: {className: "bx-messenger-call-window-photo-block"},
													style: avatarImageStyles,
													text: avatarImageText,
												}),
											]
										}),
										Dom.create("div", {
											props: {className: "bx-messenger-videocall-incoming-call-pulse-element", style: "animation-delay: -2s;"}
										}),
										Dom.create("div", {
											props: {className: "bx-messenger-videocall-incoming-call-pulse-element", style: "animation-delay: -1.5s;"}
										}),
										Dom.create("div", {
											props: {className: "bx-messenger-videocall-incoming-call-pulse-element", style: "animation-delay: -1s;"}
										}),
										Dom.create("div", {
											props: {className: "bx-messenger-videocall-incoming-call-pulse-element", style: "animation-delay: -0.5s;"}
										}),
									]
								}),
								Dom.create("div", {
									props: {className: "bx-messenger-call-window-title"},
									children: [
										Dom.create("div", {
											props: {className: "bx-messenger-call-window-title-block"},
											children: [
												Dom.create("div", {
													props: {className: "bx-messenger-call-overlay-title-caller-prefix"},
													text: BX.message("IM_M_VIDEO_CALL_FROM")
												}),
												Dom.create("div", {
													text: Text.encode(this.callerName),
													props: {className: "bx-messenger-call-overlay-title-caller"}
												})
											]
										}),
									]
								}),
							]
						}),
						Dom.create("div", {
							props: {className: "bx-messenger-call-window-bottom"},
							children: [
								Dom.create("div", {
									props: {className: "bx-messenger-call-window-buttons"},
									children: [
										this.elements.buttonsBlock = Dom.create("div", {
											props: {className: "bx-messenger-call-window-buttons-block"},
											children: []
										}),
									]
								}),
							]
						})
					]
				})
			]
		});

		this.elements.buttonsBlock.append(...[
			Dom.create("div", {
				props: {className: "bx-messenger-call-window-button bx-messenger-call-window-button-danger"},
				children: [
					Dom.create("div", {
						props: {
							className: "bx-messenger-call-window-button-icon bx-messenger-call-window-button-icon-phone-down",
							title: BX.message("IM_M_CALL_BTN_SKIP_CONFERENCE"),
						},
					}),
				],
				events: {click: this._onSkipConferenceButtonClick.bind(this)}
			}),
			Dom.create("div", {
				props: {className: "bx-messenger-call-window-button" + (this.withBlur ? ' with-blur' : '')},
				children: [
					Dom.create("div", {
						props: {
							className: "bx-messenger-call-window-button-icon bx-messenger-call-window-button-icon-phone-up",
							title: BX.message("IM_M_CALL_BTN_ANSWER_CONFERENCE"),
						},
					}),
				],
				events: {click: this._onAnswerConferenceButtonClick.bind(this)}
			}),
		]);

		return this.elements.root;
	};

	showInDesktop()
	{
		const width = 460;
		const height = 580;
		this.render();
		document.body.appendChild(this.elements.root);
		DesktopApi.setWindowPosition({
			x: STP_CENTER,
			y: STP_VCENTER,
			width,
			height
		});
	};

	_onAnswerConferenceButtonClick(e)
	{
		if (DesktopApi.isDesktop())
		{
			DesktopApi.closeWindow();
			DesktopApi.emitToMainWindow(Events.onButtonClick, [{
				button: 'answerConference',
			}]);
		}
		else
		{
			this.callbacks.onButtonClick({
				button: 'answerConference',
			});
		}
	};

	_onSkipConferenceButtonClick(e)
	{
		if (DesktopApi.isDesktop())
		{
			DesktopApi.closeWindow();
			DesktopApi.emitToMainWindow(Events.onButtonClick, [{
				button: 'skipConference',
			}]);
		}
		else
		{
			this.callbacks.onButtonClick({
				button: 'skipConference'
			});
		}
	};

}
