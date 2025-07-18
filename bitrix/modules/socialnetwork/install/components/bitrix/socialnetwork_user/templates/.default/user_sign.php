<?php

if (!defined("B_PROLOG_INCLUDED") || B_PROLOG_INCLUDED !== true)
{
	die;
}

/** @var CBitrixComponentTemplate $this */
/** @var array $arParams */
/** @var array $arResult */
/** @var array $tagSliderParams */
/** @var CBitrixComponent $component */
/** @global CDatabase $DB */
/** @global CUser $USER */
/** @global CMain $APPLICATION */

use Bitrix\Main\Localization\Loc;
use Bitrix\Main\Loader;
use Bitrix\Main\ModuleManager;

$pageId = "user_sign";
include("util_menu.php");
include("util_profile.php");

Loc::loadLanguageFile($_SERVER['DOCUMENT_ROOT'] . $this->getFolder() . '/result_modifier.php');

if (Loader::includeModule('sign'))
{
	$componentParams = [
		'ENTITY_ID' => $arResult['VARIABLES']['user_id'],
		'COMPONENT_TYPE' => 'personal',
	];

	$signVersion = (string)ModuleManager::getVersion('sign');
	$componentName = (version_compare($signVersion, '24.1200.0') === -1)
		? 'bitrix:sign.document.list'
		: 'bitrix:sign.my-documents.list';

	$APPLICATION->IncludeComponent(
		"bitrix:ui.sidepanel.wrapper",
		"",
		[
			'POPUP_COMPONENT_NAME' => $componentName,
			"POPUP_COMPONENT_TEMPLATE_NAME" => "",
			"POPUP_COMPONENT_PARAMS" => $componentParams,
			"POPUP_COMPONENT_PARENT" => $component,
			'USE_PADDING' => false,
			'USE_UI_TOOLBAR' => 'Y',
			'POPUP_COMPONENT_USE_BITRIX24_THEME' => 'Y',
		],
	);
}
