import { Loc } from 'main.core';

import { Core } from 'im.v2.application.core';
import { BaseMenu } from 'im.v2.lib.menu';
import { SendingService } from 'im.v2.provider.service.sending';
import { MessageService } from 'im.v2.provider.service.message';
import { UploadingService } from 'im.v2.provider.service.uploading';

import type { MenuItem } from 'im.v2.lib.menu';
import type { ImModelMessage } from 'im.v2.model';

export class RetryContextMenu extends BaseMenu
{
	context: ImModelMessage & {dialogId: string};

	constructor()
	{
		super();

		this.id = 'bx-im-message-retry-context-menu';
	}

	getMenuItems(): MenuItem[]
	{
		return [
			this.getRetryItem(),
			this.getDeleteItem(),
		];
	}

	getRetryItem(): MenuItem
	{
		if (!this.#isOwnMessage() || !this.#hasError())
		{
			return null;
		}

		return {
			text: Loc.getMessage('IM_MESSENGER_MESSAGE_CONTEXT_MENU_RETRY'),
			onclick: () => {
				this.#retrySend();
				this.menuInstance.close();
			},
		};
	}

	getDeleteItem(): ?MenuItem
	{
		if (!this.#isOwnMessage() || !this.#hasError())
		{
			return null;
		}

		const phrase = Loc.getMessage('IM_MESSENGER_MESSAGE_CONTEXT_MENU_DELETE');

		return {
			html: `<span class="bx-im-message-retry-button__context-menu-delete">${phrase}</span>`,
			onclick: () => {
				const messageService = new MessageService({ chatId: this.context.chatId });
				messageService.deleteMessages([this.context.id]);
				this.menuInstance.close();
			},
		};
	}

	#isOwnMessage(): boolean
	{
		return this.context.authorId === Core.getUserId();
	}

	#hasError(): boolean
	{
		return this.context.error;
	}

	#hasFiles(): boolean
	{
		return this.context.files.length > 0;
	}

	#retrySend()
	{
		if (this.#hasFiles())
		{
			const uploadingService: UploadingService = UploadingService.getInstance();
			const uploaderId: string = uploadingService.getUploaderIdByFileId(this.context.files[0]);

			uploadingService.retry(uploaderId);

			return;
		}

		this.#retrySendMessage();
	}

	#retrySendMessage()
	{
		void (new SendingService()).retrySendMessage({
			tempMessageId: this.context.id,
			dialogId: this.context.dialogId,
		});
	}
}
