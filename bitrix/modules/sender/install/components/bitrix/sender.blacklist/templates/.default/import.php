<?
if (!defined("B_PROLOG_INCLUDED") || B_PROLOG_INCLUDED!==true)die();

/** @var CMain $APPLICATION*/
/** @var array $arResult*/
/** @var array $arParams*/

use Bitrix\Sender\Security;

global $APPLICATION;
$componentParameters = array(
	'ID' => $arResult['ID'],
	'NAME_TEMPLATE' => $arResult['NAME_TEMPLATE'],
	'PATH_TO_USER_PROFILE' => $arResult['PATH_TO_USER_PROFILE'] ?? '',
	'PATH_TO_LIST' => $arResult['PATH_TO_LIST'] ?? '',
	'PATH_TO_IMPORT' => $arResult['PATH_TO_IMPORT'] ?? '',
	'BLACKLIST' => 'Y',
	'CAN_EDIT' => Security\Access::getInstance()->canModifyBlacklist(),
);
if (isset($_REQUEST['IFRAME']) && $_REQUEST['IFRAME'] == 'Y')
{
	$componentParameters['IFRAME'] = $_REQUEST['IFRAME'] == 'Y' ? 'Y' : 'N';
	$APPLICATION->IncludeComponent(
		"bitrix:ui.sidepanel.wrapper",
		"",
		array(
			'POPUP_COMPONENT_NAME' => "bitrix:sender.contact.import",
			"POPUP_COMPONENT_TEMPLATE_NAME" => "",
			"POPUP_COMPONENT_PARAMS" => $componentParameters,
			"USE_UI_TOOLBAR" => "Y",
			"USE_PADDING" => false,
		)
	);
}
else
{
	$APPLICATION->IncludeComponent(
		"bitrix:sender.contact.import",
		"",
		$componentParameters
	);
}