import { Runtime } from 'main.core';
import { EventEmitter } from 'main.core.events';

import { Logger } from 'im.v2.lib.logger';
import { EventType, SidebarDetailBlock } from 'im.v2.const';
import { Loader } from 'im.v2.component.elements.loader';

import { MessageSearch } from '../../../classes/panels/search/message-search';
import { SearchItem } from './search-item';
import { SearchHeader } from './search-header';
import { DateGroup } from '../../elements/date-group/date-group';
import { TariffLimit } from '../../elements/tariff-limit/tariff-limit';
import { DetailEmptyState as StartState } from '../../elements/detail-empty-state/detail-empty-state';
import { DetailEmptySearchState } from '../../elements/detail-empty-search-state/detail-empty-search-state';
import { SidebarCollectionFormatter } from '../../../classes/sidebar-collection-formatter';

import './css/message-search-panel.css';

import type { JsonObject } from 'main.core';
import type { ImModelChat } from 'im.v2.model';

// @vue/component
export const MessageSearchPanel = {
	name: 'MessageSearchPanel',
	components: { DateGroup, SearchItem, Loader, StartState, SearchHeader, DetailEmptySearchState, TariffLimit },
	props: {
		dialogId: {
			type: String,
			required: true,
		},
		secondLevel: {
			type: Boolean,
			default: false,
		},
	},
	data(): JsonObject
	{
		return {
			searchQuery: '',
			isLoading: false,
			searchResult: [],
			currentServerQueries: 0,
		};
	},
	computed:
	{
		SidebarDetailBlock: () => SidebarDetailBlock,
		formattedCollection(): Array
		{
			const messages = this.searchResult.map((messageId) => {
				return this.$store.getters['messages/getById'](messageId);
			}).filter((item) => Boolean(item));

			return this.collectionFormatter.format(messages);
		},
		isEmptyState(): boolean
		{
			return this.preparedQuery.length > 0 && this.formattedCollection.length === 0;
		},
		preparedQuery(): string
		{
			return this.searchQuery.trim().toLowerCase();
		},
		dialog(): ImModelChat
		{
			return this.$store.getters['chats/get'](this.dialogId, true);
		},
		chatId(): number
		{
			return this.dialog.chatId;
		},
		hasHistoryLimit(): boolean
		{
			return this.$store.getters['sidebar/messageSearch/isHistoryLimitExceeded'](this.chatId);
		},
	},
	watch:
	{
		preparedQuery(newQuery: string, previousQuery: string)
		{
			if (newQuery === previousQuery)
			{
				return;
			}

			this.service.resetSearchState();
			this.searchResult = [];
			this.startSearch(newQuery);
		},
	},
	created()
	{
		this.service = new MessageSearch({ dialogId: this.dialogId });
		this.collectionFormatter = new SidebarCollectionFormatter();
		this.searchOnServerDelayed = Runtime.debounce(this.searchOnServer, 500, this);
	},
	beforeUnmount()
	{
		this.collectionFormatter.destroy();
	},
	methods:
	{
		searchOnServer(query: string)
		{
			this.currentServerQueries++;

			this.service.searchOnServer(query).then((messageIds: string[]) => {
				if (query !== this.preparedQuery)
				{
					this.isLoading = false;

					return;
				}

				this.searchResult = this.mergeResult(messageIds);
			}).catch((error) => {
				console.error(error);
			}).finally(() => {
				this.currentServerQueries--;
				this.stopLoader();
			});
		},
		startSearch(query: string)
		{
			if (query.length < 3)
			{
				return;
			}

			if (query.length >= 3)
			{
				this.isLoading = true;
				this.searchOnServerDelayed(query);
			}

			if (query.length === 0)
			{
				this.cleanSearchResult();
			}
		},
		stopLoader()
		{
			if (this.currentServerQueries > 0)
			{
				return;
			}

			this.isLoading = false;
		},
		cleanSearchResult()
		{
			this.searchResult = [];
		},
		needToLoadNextPage(event)
		{
			const target = event.target;

			return target.scrollTop + target.clientHeight >= target.scrollHeight - target.clientHeight;
		},
		onScroll(event)
		{
			if (this.isLoading || this.preparedQuery.length === 0)
			{
				return;
			}

			if (!this.needToLoadNextPage(event) || !this.service.hasMoreItemsToLoad)
			{
				return;
			}

			this.isLoading = true;
			this.service.loadNextPage().then((messageIds) => {
				this.searchResult = this.mergeResult(messageIds);
				this.isLoading = false;
			}).catch((error) => {
				Logger.warn('Message Search: loadNextPage error', error);
			});
		},
		mergeResult(messageIds: string[]): string[]
		{
			return [...this.searchResult, ...messageIds].sort((a, z) => z - a);
		},
		onChangeQuery(query: string)
		{
			this.searchQuery = query;
		},
		onClickBack()
		{
			EventEmitter.emit(EventType.sidebar.close, { panel: SidebarDetailBlock.messageSearch });
		},
		loc(phraseCode: string, replacements: {[p: string]: string} = {}): string
		{
			return this.$Bitrix.Loc.getMessage(phraseCode, replacements);
		},
	},
	template: `
		<div class="bx-im-message-search-detail__scope">
			<SearchHeader :secondLevel="secondLevel" @changeQuery="onChangeQuery" @back="onClickBack" />
			<div class="bx-im-message-search-detail__container bx-im-sidebar-detail__container" @scroll="onScroll">
				<StartState 
					v-if="!isLoading && preparedQuery.length === 0"
					:title="loc('IM_SIDEBAR_SEARCH_MESSAGE_START_TITLE')"
					:iconType="SidebarDetailBlock.messageSearch"
				/>
				<DetailEmptySearchState
					v-if="!isLoading && isEmptyState"
					:title="loc('IM_SIDEBAR_MESSAGE_SEARCH_NOT_FOUND')"
					:subTitle="loc('IM_SIDEBAR_MESSAGE_SEARCH_NOT_FOUND_DESCRIPTION')"
				/>
				<Loader v-if="isLoading && isEmptyState" class="bx-im-message-search-detail__loader" />
				<div v-for="dateGroup in formattedCollection" class="bx-im-message-search-detail__date-group_container">
					<DateGroup :dateText="dateGroup.dateGroupTitle" />
					<SearchItem
						v-for="item in dateGroup.items"
						:messageId="item.id"
						:dialogId="dialogId"
						:query="preparedQuery"
					/>
				</div>
				<TariffLimit
					v-if="hasHistoryLimit"
					:dialogId="dialogId"
					:panel="SidebarDetailBlock.messageSearch"
					class="bx-im-message-search-detail__tariff-limit-container"
				/>
			</div>
		</div>
	`,
};
