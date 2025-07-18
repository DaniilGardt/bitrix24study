<?php

if (!defined('B_PROLOG_INCLUDED') || B_PROLOG_INCLUDED !== true)
{
	die();
}

/** @var CBitrixComponentTemplate $this */
/** @var CBitrixComponent $component */
/** @var array $arParams */
/** @var array $arResult */
/** @global CDatabase $DB */
/** @global CUser $USER */
/** @global CMain $APPLICATION */
/** @var string $pageId */

if (
	$pageId !== 'group_create'
	&& (
		(SITE_TEMPLATE_ID !== 'bitrix24' && SITE_TEMPLATE_ID !== 'air')
		|| (int) ($arResult['VARIABLES']['user_id'] ?? null) !== (int) $USER->getId()
		|| $pageId === 'user'
		|| !$USER->isAuthorized()
	)
)
{
	$APPLICATION->IncludeComponent(
		"bitrix:socialnetwork.user_menu",
		"",
		Array(
			"USER_VAR" => $arResult["ALIASES"]["user_id"] ?? '',
			"PAGE_VAR" => $arResult["ALIASES"]["page"] ?? '',
			"PATH_TO_USER" => $arResult["PATH_TO_USER"],
			"PATH_TO_USER_EDIT" => $arResult["PATH_TO_USER_PROFILE_EDIT"],
			"PATH_TO_USER_FRIENDS" => $arResult["PATH_TO_USER_FRIENDS"],
			"PATH_TO_USER_GROUPS" => $arResult["PATH_TO_USER_GROUPS"],
			"PATH_TO_USER_FRIENDS_ADD" => $arResult["PATH_TO_USER_FRIENDS_ADD"],
			"PATH_TO_USER_FRIENDS_DELETE" => $arResult["PATH_TO_USER_FRIENDS_DELETE"],
			"PATH_TO_MESSAGE_FORM" => $arResult["PATH_TO_MESSAGE_FORM"],
			"PATH_TO_MESSAGES_INPUT" => $arResult["PATH_TO_MESSAGES_INPUT"],
			"PATH_TO_USER_BLOG" => $arResult["PATH_TO_USER_BLOG"],
			"PATH_TO_USER_PHOTO" => $arResult["PATH_TO_USER_PHOTO"],
			"PATH_TO_USER_FORUM" => $arResult["PATH_TO_USER_FORUM"],
			"PATH_TO_USER_CALENDAR" => $arResult["PATH_TO_USER_CALENDAR"],
			"PATH_TO_USER_FILES" => $arResult["PATH_TO_USER_FILES"],
			"PATH_TO_USER_DISK" => $arResult["PATH_TO_USER_DISK"] ?? null,
			"PATH_TO_USER_TASKS" => $arResult["PATH_TO_USER_TASKS"],
			"PATH_TO_USER_SIGN" => $arResult["PATH_TO_USER_SIGN"],
			"PATH_TO_USER_CONTENT_SEARCH" => $arResult["PATH_TO_USER_CONTENT_SEARCH"],
			"PATH_TO_LOG" => $arResult["PATH_TO_LOG"],
			"FILES_USER_IBLOCK_ID" => $arParams["FILES_USER_IBLOCK_ID"] ?? null,
			"ID" => $arResult["VARIABLES"]["user_id"] ?? null,
			"PAGE_ID" => $pageId,
			"USE_MAIN_MENU" => $arParams["USE_MAIN_MENU"],
			"MAIN_MENU_TYPE" => $arParams["MAIN_MENU_TYPE"] ?? '',
		),
		$component,
		array("HIDE_ICONS" => "Y")
	);
}

$APPLICATION->IncludeComponent(
	"bitrix:socialnetwork.admin.set",
	"",
	Array(),
	$component,
	array("HIDE_ICONS" => "Y")
);
