import { Store } from 'ui.vue3.vuex';
import { RestClient } from 'rest.client';

import { Core } from 'im.v2.application.core';
import { RestMethod } from 'im.v2.const';
import { Logger } from 'im.v2.lib.logger';

export class PinService
{
	#store: Store;
	#restClient: RestClient;

	constructor()
	{
		this.#store = Core.getStore();
		this.#restClient = Core.getRestClient();
	}

	pinChat(dialogId: string): void
	{
		Logger.warn('PinService: pinChat', dialogId);
		void this.#store.dispatch('recent/pin', {
			id: dialogId,
			action: true,
		});
		const queryParams = { DIALOG_ID: dialogId, ACTION: 'Y' };
		this.#restClient.callMethod(RestMethod.imRecentPin, queryParams)
			.catch((result: RestResult) => {
				console.error('PinService: error pinning chat', result.error());
				void this.#store.dispatch('recent/pin', { id: dialogId, action: false });
			});
	}

	unpinChat(dialogId: string): void
	{
		Logger.warn('PinService: unpinChat', dialogId);
		void this.#store.dispatch('recent/pin', {
			id: dialogId,
			action: false,
		});
		const queryParams = { DIALOG_ID: dialogId, ACTION: 'N' };
		this.#restClient.callMethod(RestMethod.imRecentPin, queryParams)
			.catch((result: RestResult) => {
				console.error('PinService: error unpinning chat', result.error());
				void this.#store.dispatch('recent/pin', { id: dialogId, action: true });
			});
	}
}
