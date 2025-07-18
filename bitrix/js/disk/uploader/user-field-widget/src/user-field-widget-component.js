import { Type, Loc } from 'main.core';
import type { Menu } from 'main.popup';
import type { BaseEvent } from 'main.core.events';

import { VueUploaderComponent } from 'ui.uploader.vue';
import { TileWidgetComponent, TileWidgetSlot, TileWidgetOptions, TileWidgetItem } from 'ui.uploader.tile-widget';
import type { BitrixVueComponentProps } from 'ui.vue3';
import type { UploaderOptions } from 'ui.uploader.core';

import UserFieldWidget from './user-field-widget';
import UserFieldControl from './user-field-control';
import ItemMenu from './item-menu';
import SettingsMenu from './settings-menu';
import { ControlPanel } from './components/control-panel';
import { DocumentPanel } from './components/document-panel';
import type { UserFieldWidgetOptions } from './user-field-widget-options';

import './css/user-field-widget-component.css';

/**
 * @memberof BX.Disk.Uploader
 * @vue/component
 */
export const UserFieldWidgetComponent: BitrixVueComponentProps = {
	name: 'UserFieldWidget',
	components: {
		TileWidgetComponent,
		DocumentPanel,
	},
	extends: VueUploaderComponent,
	provide(): Object
	{
		return {
			userFieldControl: this.userFieldControl,
			postForm: this.userFieldControl.getMainPostForm(),
			getMessage: this.getMessage,
		};
	},
	props: {
		visibility: {
			type: String,
			default(props): string
			{
				const mainPostFormContext = Type.isElementNode(props.widgetOptions.eventObject);

				return mainPostFormContext ? 'hidden' : 'both';
			},
		},
	},
	setup(): Object
	{
		return {
			customUploaderOptions: UserFieldWidget.getDefaultUploaderOptions(),
		};
	},
	data(): Object
	{
		return {
			documentsCollapsed: this.visibility === 'both',
			priorityVisibility: null,
		};
	},
	computed: {
		tileWidgetOptions(): TileWidgetOptions {
			const widgetOptions: UserFieldWidgetOptions = this.widgetOptions;
			const tileWidgetOptions: TileWidgetOptions = (
				Type.isPlainObject(widgetOptions.tileWidgetOptions)
					? { ...widgetOptions.tileWidgetOptions }
					: {}
			);

			tileWidgetOptions.slots = Type.isPlainObject(tileWidgetOptions.slots) ? tileWidgetOptions.slots : {};

			if (widgetOptions.withControlPanel !== false)
			{
				tileWidgetOptions.slots[TileWidgetSlot.AFTER_TILE_LIST] = ControlPanel;
			}
			tileWidgetOptions.insertIntoText = (
				Type.isBoolean(widgetOptions.insertIntoText)
					? widgetOptions.insertIntoText
					: this.userFieldControl.getMainPostForm() !== null
			);

			tileWidgetOptions.showItemMenuButton = true;

			tileWidgetOptions.events = tileWidgetOptions.events || {};
			tileWidgetOptions.events['TileItem:onMenuCreate'] = (event: BaseEvent): void => {
				const { item, menu }: { item: TileWidgetItem, menu: Menu } = event.getData();
				const itemMenu: ItemMenu = new ItemMenu(this.userFieldControl, item, menu);
				itemMenu.build();
			};

			if (this.userFieldControl.getMainPostForm() !== null)
			{
				tileWidgetOptions.events.onInsertIntoText = (event: BaseEvent): void => {
					const { item }: { item: TileWidgetItem } = event.getData();
					this.userFieldControl.getMainPostForm().insertIntoText(item);
				};

				tileWidgetOptions.enableDropzone = false;
			}

			const settingsMenu: SettingsMenu = new SettingsMenu(this.userFieldControl);
			if (settingsMenu.hasItems())
			{
				tileWidgetOptions.showSettingsButton = true;
				tileWidgetOptions.events['SettingsButton:onClick'] = (event: BaseEvent): void => {
					const { button } = event.getData();
					settingsMenu.toggle(button);
				};
			}

			return tileWidgetOptions;
		},
		shouldShowCreateDocumentLink(): boolean
		{
			return (
				this.userFieldControl.canCreateDocuments()
				&& this.documentsCollapsed
				&& this.finalVisibility === 'both'
			);
		},
		shouldShowDocuments(): boolean
		{
			return (
				this.userFieldControl.canCreateDocuments()
				&& (
					this.finalVisibility === 'documents'
					|| (this.finalVisibility === 'both' && !this.documentsCollapsed)
				)
			);
		},
		finalVisibility(): string
		{
			if (this.priorityVisibility !== null)
			{
				return this.priorityVisibility;
			}

			return this.visibility;
		},
	},
	beforeCreate(): void
	{
		this.userFieldControl = new UserFieldControl(this);
	},
	beforeUnmount(): void
	{
		this.userFieldControl.destroy();
	},
	methods: {
		getMessage(code: string, replacements?: Object<string, string>): ?string
		{
			return Loc.getMessage(code, replacements);
		},

		enableAutoCollapse(): void
		{
			this.$refs.tileWidget.enableAutoCollapse();
		},

		getUploaderOptions(): UploaderOptions
		{
			return UserFieldWidget.prepareUploaderOptions(this.uploaderOptions);
		},
		getUserFieldControl(): UserFieldControl
		{
			return this.userFieldControl;
		},
	},
	template: `
		<div
			class="disk-user-field-control"
			:class="{ '--has-files': items.length > 0, '--embedded': widgetOptions.isEmbedded }"
			:style="{ display: finalVisibility === 'hidden' ? 'none' : 'block' }"
			ref="container"
		>
			<div 
				class="disk-user-field-uploader-panel"
				:class="[{ '--hidden': finalVisibility !== 'uploader' && finalVisibility !== 'both' }]"
				ref="uploader-container"
			>
				<TileWidgetComponent
					:widgetOptions="tileWidgetOptions"
					:uploader-adapter="adapter"
					ref="tileWidget"
				/>
			</div>
			<div
				class="disk-user-field-create-document"
				v-if="shouldShowCreateDocumentLink"
				@click="documentsCollapsed = false"
			>{{ getMessage('DISK_UF_WIDGET_CREATE_DOCUMENT') }}</div>
			<div
				class="disk-user-field-document-panel"
				:class="{ '--single': finalVisibility !== 'both' }"
				ref="document-container"
				v-if="shouldShowDocuments"
			>
				<DocumentPanel />
			</div>
		</div>
	`,
};
