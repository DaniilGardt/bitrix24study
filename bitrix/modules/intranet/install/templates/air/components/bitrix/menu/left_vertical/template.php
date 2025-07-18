<?php

use Bitrix\Intranet\MainPage;
use Bitrix\Main\Localization\Loc;
use Bitrix\UI\Counter\Counter;
use Bitrix\UI\Counter\CounterSize;

if (!defined("B_PROLOG_INCLUDED") || B_PROLOG_INCLUDED !== true)
{
	die();
}
CJSCore::Init([
	'ui.dialogs.messagebox',
	'intranet.menu.analytics',
	'ui.icon-set',
	'ui.icon-set.outline',
]);
$isCompositeMode = defined("USE_HTML_STATIC_CACHE") ? true : false;
$this->setFrameMode(true);

if (empty($arResult))
{
	return;
}

$sumHiddenCounters = 0;
$arHiddenItemsCounters = array();
$arAllItemsCounters = array();
$mainPage = new \Bitrix\Intranet\Site\FirstPage\MainFirstPage();
$siteUrl = htmlspecialcharsbx(SITE_DIR);

?>
<div class="menu-items-block menu-items-view-mode" id="menu-items-block">
	<div class="menu-items-header">
		<div class="menu-items-header__menu-swticher">
			<div class="menu-switcher">
				<span class="menu-switcher__icon"></span>
			</div>
		</div>
		<a href="<?= $siteUrl ?>" class="menu-items-header__logo">
			<span class="menu-items-header__logo-text"><?=Loc::getMessage('MENU_HEADER_LOGO_TEXT')?></span>
			<span class="menu-items-header__logo-number">24</span>
		</a>
		<div class="menu-items-header-title"><?=Loc::getMessage("MENU_EXPAND")?></div>
	</div>

	<div class="menu-items-body">
		<div class="menu-items-body-inner"><?
		foreach (array("show", "hide") as $status)
		{
			if ($status === "hide")
			{
				?><div class="menu-item-favorites-more" id="left-menu-hidden-items-block"><?
					?><ul class="menu-items-fav-more-block" id="left-menu-hidden-items-list"><?
						?><li class="menu-item-separator" id="left-menu-hidden-separator">
							<span class="menu-item-sepor-text-line"></span><?
							?><span class="menu-item-sepor-text"><?=Loc::getMessage("MENU_HIDDEN_ITEMS")?></span>
							<span class="menu-item-sepor-text-line"></span><?
						?></li><?
			}
			else
			{
				?><ul class="menu-items"><?
					?><li class="menu-items-empty-li" id="left-menu-empty-item"></li><?
			}

			if (isset($arResult["ITEMS"][$status]) && is_array($arResult["ITEMS"][$status]))
			{
				$chain = [];
				foreach ($arResult["ITEMS"][$status] as $item)
				{
					if ($item["PERMISSION"] <= "D")
					{
						continue;
					}

					$counterId = "";
					$counter = 0;
					if (array_key_exists("counter_id", $item["PARAMS"]) && $item["PARAMS"]["counter_id"] <> '')
					{
						switch ($item['PARAMS']['counter_id'])
						{
							case 'live-feed':
								$counterId = \CUserCounter::LIVEFEED_CODE;
								break;
							default:
								$counterId = $item['PARAMS']['counter_id'];
						}

						$counter = array_key_exists($counterId, $arResult["COUNTERS"]) ? $arResult["COUNTERS"][$counterId] : 0;
					}

					if ($counterId)
					{
						if ($counter > 0)
						{
							$arAllItemsCounters[$counterId] = $counter;
						}

						if ($status == "hide")
						{
							$sumHiddenCounters += $counter;
							$arHiddenItemsCounters[] = $counterId;
						}
					}

					$addLinks = "";
					if (isset($item["ADDITIONAL_LINKS"]) && is_array($item["ADDITIONAL_LINKS"]))
					{
						$addLinks = implode(",", $item["ADDITIONAL_LINKS"]);
					}

					if (isset($item["PARAMS"]["real_link"]))
					{
						$addLinks .= ($addLinks === "" ? "" : ",").$item["LINK"];
					}

					$curLink = '';
					if (isset($item["PARAMS"]["real_link"]) && is_string($item["PARAMS"]["real_link"]))
					{
						$curLink = $item["PARAMS"]["real_link"];
					}
					else
					{
						$curLink = isset($item["LINK"]) && is_string($item["LINK"]) ? $item["LINK"] : '';
					}

					if (preg_match("~^".SITE_DIR."index\\.php~i", $curLink))
					{
						$curLink = SITE_DIR;
					}
					elseif (isset($item["PARAMS"]["onclick"]) && !empty($item["PARAMS"]["onclick"]))
					{
						$curLink = "";
					}

					if ($curLink === $GLOBALS['APPLICATION']->getCurPage(false))
					{
						\Bitrix\UI\Toolbar\Facade\Toolbar::deleteFavoriteStar();
					}

					$itemId = $item["PARAMS"]["menu_item_id"];
					$isCustomItem = preg_match("/^[0-9]+$/", $itemId) === 1;
					$isCustomSection =
						isset($item['PARAMS']['is_custom_section'])
							? (bool)$item['PARAMS']['is_custom_section']
							: false
					;

					$itemClass = "menu-item-block";
					if (!$isCustomItem)
					{
						$itemClass .= " ".str_replace("_", "-", $itemId);
					}

					if ($isCompositeMode === false && $counter > 0 && $counterId <> '')
					{
						$itemClass .= " menu-item-with-index";
					}

					if (IsModuleInstalled("bitrix24") && $item["PARAMS"]["menu_item_id"] == "menu_live_feed")
					{
						$itemClass .= " menu-item-live-feed";
					}

					if (isset($item['IS_GROUP']) && $item['IS_GROUP'] === 'Y')
					{
						$itemClass .= " menu-item-group";
					}
					else if (!in_array($item["ITEM_TYPE"], ['default', 'main']) || $isCustomItem || $isCustomSection)
					{
						$itemClass .= " menu-item-no-icon-state";
					}

					while ($lastParent = end($chain))
					{
						if (isset($item['GROUP_ID'])
							&& $item['GROUP_ID'] === $lastParent)
						{
							break;
						}
							array_shift($chain);
						?></ul><?
					?></li><?
					}
					?><li id="bx_left_menu_<?=$itemId?>"
						data-status="<?=$status?>"
						data-id="<?=$item["PARAMS"]["menu_item_id"]?>"
						data-role="<?= isset($item['IS_GROUP']) && $item['IS_GROUP'] === 'Y' ? 'group' : 'item' ?>"
						<? if (isset($item['IS_GROUP']) && $item['IS_GROUP'] === 'Y'):?>
							data-collapse-mode="<?=$item['PARAMS']['collapse_mode']?>"
						<?endif ?>
						data-storage="<?= $item['PARAMS']['storage'] ?? '' ?>"
						data-counter-id="<?=$counterId?>"
						data-link="<?=htmlspecialcharsbx($curLink)?>"
						data-all-links="<?=$addLinks?>"
						data-type="<?=$item["ITEM_TYPE"]?>"
						data-delete-perm="<?=$item["DELETE_PERM"]?>"
						<? if (isset($item["PARAMS"]["is_application"])):?>
							data-app-id="<?=$item["PARAMS"]["app_id"]?>"
						<?endif ?>
						<? if (isset($item["PARAMS"]["top_menu_id"])):?>
							data-top-menu-id="<?=$item["PARAMS"]["top_menu_id"]?>"
						<?endif ?>
						data-new-page="<?=(isset($item["OPEN_IN_NEW_PAGE"]) && $item["OPEN_IN_NEW_PAGE"] === "Y" ? "Y" : "N")?>"
						<? if (array_key_exists("can_be_first_item", $item["PARAMS"]) && !$item["PARAMS"]["can_be_first_item"]) :?>
						data-disable-first-item="Y"
						<? endif ?>
						class="<?=$itemClass?>"
					><? if ($item['ITEM_TYPE'] !== 'main'):
						?><span
							class="menu-favorites-btn menu-favorites-draggable"
						><?
							?><span class="menu-fav-draggable-icon"></span>
						</span><?endif;

						if (isset($item["PARAMS"]["sub_link"])):
							?><a href="<?=htmlspecialcharsbx($item["PARAMS"]["sub_link"])?>" class="menu-item-plus">
								<span class="menu-item-plus-icon"></span>
							</a><?
						elseif (isset($item["PARAMS"]["sub_link_onclick"])):
							?><a href="javascript:void(0)" class="menu-item-plus"
								 onclick="<?=htmlspecialcharsbx($item["PARAMS"]["sub_link_onclick"])?>">
								<span class="menu-item-plus-icon"></span>
							</a><?
						endif
						?><a
							class="menu-item-link"
							href="<?=(isset($item["PARAMS"]["onclick"])) ? "javascript:void(0)" : htmlspecialcharsbx($curLink)?>"
							<?if (isset($item["OPEN_IN_NEW_PAGE"]) && ($item["OPEN_IN_NEW_PAGE"] === "Y")):?>
								target="_blank"
								data-slider-ignore-autobinding="true"
							<?endif?>
							onclick="<?if (isset($item["PARAMS"]["onclick"])):?>
								<?=htmlspecialcharsbx($item["PARAMS"]["onclick"])?>
							<?endif?>">
							<span class="menu-item-icon-box"><span class="menu-item-icon"></span></span><?
							?><span class="menu-item-link-text <? echo isset($item["PARAMS"]["is_beta"]) ? ' menu-item-link-beta' : ''?>" data-role="item-text">
							<?= htmlspecialcharsbx($item['TEXT']) ?>
							</span><?
							if (isset($item["PARAMS"]["is_beta"]))
							{
								?><span class="menu-item-beta">beta</span><?
							}
							if ($counterId <> '')
							{
								$valueCounter = 0;

								if ($isCompositeMode === false)
								{
									$valueCounter = (int)$counter;
								}

								?>
								<span class="menu-item-index-wrap">
									<?php
										$counter = new Counter(
											useAirDesign: true,
											value: $valueCounter,
											size: CounterSize::SMALL,
											id: 'menu-counter-' . mb_strtolower($item["PARAMS"]["counter_id"]),
											hideIfZero: true,
										);

										echo $counter->render();
									?>
								</span>
							<?
							}
							if (isset($item['IS_GROUP']) && $item['IS_GROUP'] === 'Y'):?>
								<span class="menu-item-link-arrow">
									<span class="ui-icon-set --chevron-down-l"></span>
								</span>
							<?endif ?>
						</a><?
						$editBtnHideClass = "";
						if ($item["PARAMS"]["menu_item_id"] === "menu_all_groups" && $arResult["GROUP_COUNT"] > 0):
							$editBtnHideClass = " menu-fav-editable-btn-hide";
							?><span class="menu-item-show-link" id="menu-all-groups-link"><?=Loc::getMessage("MENU_SHOW")?></span><?
						endif;
						if ($item['ITEM_TYPE'] !== 'main' || $arResult['IS_ADMIN']):
						?><span data-role="item-edit-control" class="menu-fav-editable-btn menu-favorites-btn<?=$editBtnHideClass?>"><?
							?><span class="menu-favorites-btn-icon"></span><?
						?></span><?php endif;
					?></li><?

					if (isset($item['IS_GROUP']) && $item['IS_GROUP'] === 'Y')
					{
						$chain[] = $item['ID'];

					?><li class="menu-item-group-more" id="bx_left_menu_<?=$itemId?>_parent" data-group-id="<?=$itemId?>" data-role="group-content"><?
						?><ul class="menu-item-group-more-ul"><?
					}
				}
				while ($lastParent = array_shift($chain))
				{
						?></ul><?
					?></li><?
				}
			}

			if ($status === "hide")
			{
						?><li class="menu-items-hidden-empty-li" id="left-menu-hidden-empty-item"></li><?
					?></ul><?
				?></div><?
			}
			else
			{
			?>
				</ul>
			<?
			}
		}
		?>
	</div>
		<button class="menu-item-block menu-expand --footer <?php if (empty($arResult["ITEMS"]["hide"])):?> menu-favorites-more-btn-hidden<?php endif?>"
			data-role="expand-menu-item"
			data-storage=""
		>
			<span class="menu-item-link">
					<span class="menu-item-icon-box" style="">
						<span class="menu-item-icon"></span>
					</span>
				<span class="menu-item-link-text" id="menu-more-btn-text" data-role="item-text" style=""><?=Loc::getMessage("MENU_MORE_ITEMS_EXPAND")?></span>
				<?php if ($isCompositeMode || $sumHiddenCounters <= 0): ?>
					<span class="menu-item-index-wrap">
							<?php
							$counter = new Counter(
								useAirDesign: true,
								value: 0,
								size: CounterSize::SMALL,
								id: 'menu-hidden-counter',
								hideIfZero: true,
							);

							echo $counter->render();
							?>
						</span>
				<?php else: ?>
					<span class="menu-item-index-wrap">
					<?php
						$counter = new Counter(
							useAirDesign: true,
							value: $sumHiddenCounters,
							size: CounterSize::SMALL,
							id: 'menu-hidden-counter',
							hideIfZero: true,
						);

						echo $counter->render();
					?>
					</span>
				<?php endif; ?>
			</span>
		</button>
	</div>
	<div class="menu-items-footer">
		<div class="menu-items-footer-inner">
			<div class="menu-settings-save-btn">
				<button class="ui-btn --air --wide ui-btn-no-caps --style-outline-accent-2">
					<?=Loc::getMessage("MENU_EDIT_READY_FULL")?>
				</button>
			</div>
			<?php if ($arResult['CURRENT_PRESET_ID'] !== 'collab'): ?>
			<button class="menu-item-block menu-settings --footer"
				data-role="menu-settings-item"
				data-storage=""
			>
				<span class="menu-item-link" style="">
					<span class="menu-item-icon-box" style="">
						<span class="menu-item-icon"></span>
					</span>
					<span class="menu-item-link-text" id="menu-more-btn-text" data-role="item-text" style=""><?=Loc::getMessage("LEFT_MENU_SETTINGS")?></span>
				</span>
			</button>
			<?php endif; ?>
			<?php if (isset($arResult['SHOW_LICENSE_BUTTON']) && $arResult['SHOW_LICENSE_BUTTON']): ?>
				<div class="menu-license-all-wrapper"></div>
			<?php endif; ?>
			<?php if($arResult['SHOW_MARTA'] ?? true): ?>
				<div class="menu-marta-wrapper">
					<div id="js-menu-marta-container" class="menu-marta"></div>
				</div>
			<?php endif; ?>
		</div>
	</div>
</div>
<div class="menu-items-stub menu-items-block__scope"></div>
<?
include($_SERVER["DOCUMENT_ROOT"].$this->GetFolder()."/menu_popup.php");

$arJSParams = array(
	"ajaxPath" => $this->GetFolder()."/ajax.php",
	"isAdmin" => $arResult["IS_ADMIN"],
	"isExtranet" => $arResult["IS_EXTRANET"] ? "Y" : "N",
	"isExtranetInstalled" => \Bitrix\Main\ModuleManager::isModuleInstalled('extranet') ? "Y" : "N",
	"isCollapsedMode" => \Bitrix\Intranet\UI\LeftMenu\Menu::isCollapsed(),
	"isCustomPresetAvailable" => $arResult["IS_CUSTOM_PRESET_AVAILABLE"] ? "Y" : "N",
	"customPresetExists" => !empty($arResult["CUSTOM_PRESET_EXISTS"]) ? "Y" : "N",
	'availablePresetTools' => $arResult['PRESET_TOOLS_AVAILABILITY'],
	'settingsPath' => $arResult['SETTINGS_PATH'],
	'isMainPageEnabled' => $mainPage->isEnabled() ? 'Y' : 'N',
	'inviteDialogLink' => CModule::IncludeModule("bitrix24") && CBitrix24::isInvitingUsersAllowed()
		? CIntranetInviteDialog::GetInviteDialogLink([
			'analyticsLabel' => [
				'analyticsLabel[source]' => 'leftMenu',
			]
		]) : '',
	'showMarta' => '',
	'showSitemapMenuItem' => $arResult['SHOW_SITEMAP_BUTTON'],
	'showLicenseButton' => $arResult['SHOW_LICENSE_BUTTON'] ?? false,
	'licenseButtonPath' => $arResult['B24_LICENSE_PATH'] ?? '',
);
?>

<script>
BX.message({
	add_to_favorite: '<?=CUtil::JSEscape(GetMessage('MENU_ADD_TO_FAVORITE'))?>',
	delete_from_favorite: '<?=CUtil::JSEscape(GetMessage('MENU_DELETE_FROM_FAVORITE'))?>',
	hide_item: '<?=CUtil::JSEscape(GetMessage('MENU_HIDE_ITEM_MSGVER_1'))?>',
	show_item: '<?=CUtil::JSEscape(GetMessage('MENU_SHOW_ITEM_MSGVER_1'))?>',
	delete_from_favorite_all: '<?=CUtil::JSEscape(GetMessage('MENU_DELETE_FROM_FAVORITE_ALL'))?>',
	MENU_SET_MAIN_PAGE: '<?=GetMessageJS("MENU_SET_MAIN_PAGE_MSGVER_1")?>',
	MENU_OPEN_SETTINGS_MAIN_PAGE: '<?=GetMessageJS("MENU_OPEN_SETTINGS_MAIN_PAGE")?>',
	more_items_hide: '<?=CUtil::JSEscape(GetMessage('MENU_MORE_ITEMS_COLLAPSE'))?>',
	more_items_show: '<?=CUtil::JSEscape(GetMessage('MENU_MORE_ITEMS_EXPAND'))?>',
	edit_error: '<?=CUtil::JSEscape(GetMessage('MENU_ITEM_EDIT_ERROR'))?>',
	set_rights: '<?=CUtil::JSEscape(GetMessage('MENU_ITEM_SET_RIGHTS'))?>',
	menu_show: '<?=CUtil::JSEscape(GetMessage('MENU_SHOW'))?>',
	menu_hide: '<?=CUtil::JSEscape(GetMessage('MENU_HIDE'))?>',
	SORT_ITEMS: '<?=GetMessageJS("MENU_SORT_ITEMS")?>',
	LEFT_MENU_SETTINGS_ITEM_B24_SETTINGS: '<?=GetMessageJS("LEFT_MENU_SETTINGS_ITEM_B24_SETTINGS")?>',
	LEFT_MENU_SETTINGS_ITEM_MESSENGER_SETTINGS: '<?=GetMessageJS("LEFT_MENU_SETTINGS_ITEM_MESSENGER_SETTINGS")?>',
	LEFT_MENU_SETTINGS_ITEM_MENU_SETTINGS: '<?=GetMessageJS("LEFT_MENU_SETTINGS_ITEM_MENU_SETTINGS")?>',
	MENU_ADD_SELF_PAGE: '<?=GetMessageJS("MENU_ADD_SELF_PAGE")?>',
	MENU_EDIT_SELF_PAGE: '<?=GetMessageJS("MENU_EDIT_SELF_PAGE")?>',
	MENU_SET_DEFAULT: '<?=GetMessageJS("MENU_SET_DEFAULT")?>',
	MENU_SET_DEFAULT2: '<?=GetMessageJS("MENU_SET_DEFAULT2")?>',
	MENU_ADD_BUTTON: '<?=GetMessageJS("MENU_ADD_BUTTON")?>',
	MENU_ITEM_NAME: '<?=GetMessageJS("MENU_ITEM_NAME")?>',
	MENU_ITEM_LINK: '<?=GetMessageJS("MENU_ITEM_LINK")?>',
	MENU_SET_DEFAULT_CONFIRM: '<?=GetMessageJS("MENU_SET_DEFAULT_CONFIRM")?>',
	MENU_SET_DEFAULT_CONFIRM_BUTTON: '<?=GetMessageJS("MENU_SET_DEFAULT_CONFIRM_BUTTON")?>',
	MENU_DELETE_SELF_ITEM: '<?=GetMessageJS("MENU_DELETE_SELF_ITEM")?>',
	MENU_DELETE_SELF_ITEM_CONFIRM: '<?=GetMessageJS("MENU_DELETE_SELF_ITEM_CONFIRM")?>',
	MENU_ADD_ITEM_TO_ALL: '<?=GetMessageJS("MENU_ADD_ITEM_TO_ALL")?>',
	MENU_DELETE_ITEM_FROM_ALL: '<?=GetMessageJS("MENU_DELETE_ITEM_FROM_ALL")?>',
	MENU_REMOVE_STANDARD_ITEM: '<?=GetMessageJS("MENU_REMOVE_STANDARD_ITEM")?>',
	MENU_OPEN_IN_NEW_PAGE: '<?=GetMessageJS("MENU_OPEN_IN_NEW_PAGE")?>',
	MENU_ADD_PAGE_TO_LEFT_MENU: '<?=GetMessageJS("MENU_ADD_PAGE_TO_LEFT_MENU")?>',
	MENU_DELETE_PAGE_FROM_LEFT_MENU: '<?=GetMessageJS("MENU_DELETE_PAGE_FROM_LEFT_MENU")?>',
	MENU_CANCEL: '<?=GetMessageJS("MENU_CANCEL")?>',
	MENU_DELETE: '<?=GetMessageJS("MENU_DELETE")?>',
	MENU_ERROR_OCCURRED: '<?=GetMessageJS("MENU_ERROR_OCCURRED")?>',
	MENU_ITEM_WAS_ADDED_TO_LEFT: '<?=GetMessageJS("MENU_ITEM_WAS_ADDED_TO_LEFT")?>',
	MENU_ITEM_WAS_DELETED_FROM_LEFT: '<?=GetMessageJS("MENU_ITEM_WAS_DELETED_FROM_LEFT")?>',
	MENU_ITEM_WAS_ADDED_TO_ALL: '<?=GetMessageJS("MENU_ITEM_WAS_ADDED_TO_ALL")?>',
	MENU_ITEM_WAS_DELETED_FROM_ALL: '<?=GetMessageJS("MENU_ITEM_WAS_DELETED_FROM_ALL")?>',
	MENU_ITEM_MAIN_PAGE: '<?=GetMessageJS("MENU_ITEM_MAIN_PAGE")?>',
	MENU_EDIT_ITEM: '<?=GetMessageJS("MENU_EDIT_ITEM")?>',
	MENU_RENAME_ITEM: '<?=GetMessageJS("MENU_RENAME_ITEM")?>',
	MENU_SAVE_BUTTON: '<?=GetMessageJS("MENU_SAVE_BUTTON")?>',
	MENU_EMPTY_FORM_ERROR: '<?=GetMessageJS("MENU_EMPTY_FORM_ERROR")?>',
	MENU_SELF_ITEM_FIRST_ERROR: '<?=GetMessageJS("MENU_SELF_ITEM_FIRST_ERROR")?>',
	MENU_FIRST_ITEM_ERROR: '<?=GetMessageJS("MENU_FIRST_ITEM_ERROR_MSGVER_1")?>',
	MENU_COLLAPSE: '<?=GetMessageJS("MENU_COLLAPSE")?>',
	MENU_EXPAND: '<?=GetMessageJS("MENU_EXPAND")?>',
	MENU_CONFIRM_BUTTON: '<?=GetMessageJS("MENU_CONFIRM_BUTTON")?>',
	MENU_DELAY_BUTTON: '<?=GetMessageJS("MENU_DELAY_BUTTON")?>',
	MENU_STAR_TITLE_DEFAULT_PAGE: '<?=GetMessageJS("MENU_STAR_TITLE_DEFAULT_PAGE")?>',
	MENU_STAR_TITLE_DEFAULT_PAGE_DELETE_ERROR: '<?=GetMessageJS("MENU_STAR_TITLE_DEFAULT_PAGE_DELETE_ERROR")?>',
	MENU_ADD_TO_LEFT_MENU: '<?=GetMessageJS("MENU_ADD_TO_LEFT_MENU")?>',
	MENU_DELETE_FROM_LEFT_MENU: '<?=GetMessageJS("MENU_DELETE_FROM_LEFT_MENU")?>',
	MENU_ITEM_MAIN_SECTION_PAGE: '<?=GetMessageJS("MENU_ITEM_MAIN_SECTION_PAGE")?>',
	MENU_TOP_ITEM_LAST_HIDDEN: '<?=GetMessageJS("MENU_TOP_ITEM_LAST_HIDDEN")?>',
	MENU_SAVE_CUSTOM_PRESET: '<?=GetMessageJS("MENU_SAVE_CUSTOM_PRESET2")?>',
	MENU_EDIT_TOOLS: '<?=GetMessageJS("MENU_EDIT_TOOLS")?>',
	MENU_DELETE_CUSTOM_PRESET: '<?=GetMessageJS("MENU_DELETE_CUSTOM_PRESET")?>',
	MENU_CUSTOM_PRESET_POPUP_TITLE: '<?=GetMessageJS("MENU_CUSTOM_PRESET_POPUP_TITLE2")?>',
	MENU_CUSTOM_PRESET_CURRENT_USER: '<?=GetMessageJS("MENU_CUSTOM_PRESET_CURRENT_USER")?>',
	MENU_CUSTOM_PRESET_NEW_USER: '<?=GetMessageJS("MENU_CUSTOM_PRESET_NEW_USER")?>',
	MENU_SET_CUSTOM_PRESET: '<?=GetMessageJS("MENU_SET_CUSTOM_PRESET")?>',
	MENU_CUSTOM_PRESET_SEPARATOR: '<?=GetMessageJS("MENU_CUSTOM_PRESET_SEPARATOR")?>',
	MENU_DELETE_CUSTOM_PRESET_CONFIRM: '<?=GetMessageJS("MENU_DELETE_CUSTOM_PRESET_CONFIRM")?>',
	MENU_CUSTOM_PRESET_SUCCESS: '<?=GetMessageJS("MENU_CUSTOM_PRESET_SUCCESS2")?>',
	MENU_DELETE_CUSTOM_ITEM_FROM_ALL: '<?=GetMessageJS("MENU_DELETE_CUSTOM_ITEM_FROM_ALL")?>',
	MENU_SETTINGS_MODE: '<?=GetMessageJS("MENU_SETTINGS_MODE")?>',
	MENU_EDIT_READY_FULL: '<?=GetMessageJS("MENU_EDIT_READY_FULL")?>',
	MENU_UNAVAILABLE_TOOL_POPUP_DESCRIPTION: '<?=GetMessageJS("MENU_UNAVAILABLE_TOOL_POPUP_DESCRIPTION")?>',
	MENU_SITE_MAP: '<?=GetMessageJS("MENU_SITE_MAP")?>',
	MENU_HELP: '<?=GetMessageJS("MENU_HELP")?>',
	MENU_INVITE_USERS: '<?=GetMessageJS("MENU_INVITE_USERS")?>',
	MENU_MY_WORKGROUPS: '<?=GetMessageJS("MENU_MY_WORKGROUPS")?>',
	MENU_MY_WORKGROUPS_EXTRANET: '<?=GetMessageJS("MENU_MY_WORKGROUPS_EXTRANET")?>',
	MENU_MY_WORKGROUPS_FAVORITES: '<?=GetMessageJS("MENU_MY_WORKGROUPS_FAVORITES")?>',
	mainpage_settings_path: '<?= (new Bitrix\Intranet\Site\FirstPage\MainFirstPage())->getSettingsPath() ?>',
	MENU_LICENSE_ALL: '<?=GetMessageJS("MENU_LICENSE_ALL")?>',
});
BX.Intranet.LeftMenu = new BX.Intranet.Menu(<?=CUtil::PhpToJSObject($arJSParams)?>);
<?

if ($arResult["SHOW_PRESET_POPUP"] === true)
{
?>BX.Intranet.LeftMenu.showGlobalPreset();
<?
	if (isset($arResult["SHOW_IMPORT_CONFIGURATION"]))
	{
	?>
BX.addCustomEvent(BX.Intranet.LeftMenu, 'BX.Intranet.LeftMenu::onPresetIsPostponed', function() {
	BX.SidePanel.Instance.open('<?=\CUtil::JSEscape($arResult["URL_IMPORT_CONFIGURATION"])?>');
});<?
	}
}
else if (isset($arResult["SHOW_IMPORT_CONFIGURATION"]))
{
?>BX.SidePanel.Instance.open('<?=\CUtil::JSEscape($arResult["URL_IMPORT_CONFIGURATION"])?>');<?
}
?>
</script>
<?php
// for a composite
$js = <<<HTML

<script>
if (
	BX.Intranet
	&& BX.Intranet.LeftMenu
	&& !BX.Intranet.LeftMenu.initPagetitleStar()
)
{
	BX.ready(function() {
		BX.Intranet.LeftMenu.initPagetitleStar()
	});
}
</script>
HTML;


$APPLICATION->AddViewContent("below_pagetitle", $js, 10);


$frame = $this->createFrame()->begin('');
$counters = $isCompositeMode ? \CUtil::PhpToJSObject($arAllItemsCounters) : '{}';
?>
	<script>BX.Intranet.LeftMenu.updateCounters(<?=$counters?>);</script>
<?
$frame->end();
