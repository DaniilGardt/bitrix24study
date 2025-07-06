import { Core } from 'im.v2.application.core';
import { RestMethod } from 'im.v2.const';
import { Logger } from 'im.v2.lib.logger';
import { runAction } from 'im.v2.lib.rest';

export class SettingsService
{
	changeSetting(settingName: string, value: any): void
	{
		Logger.warn('SettingsService: changeSetting', settingName, value);
		void Core.getStore().dispatch('application/settings/set', {
			[settingName]: value,
		});

		const payload = {
			data: {
				userId: Core.getUserId(),
				name: settingName,
				value,
			},
		};

		runAction(RestMethod.imV2SettingsGeneralUpdate, payload)
			.catch(([error]) => {
				console.error('SettingsService: changeSetting error', error);
			});
	}
}
