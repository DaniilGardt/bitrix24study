<?php

/**
 * @deprecated ATTENTION! This component is no longer used or maintained.
 * This is a dead code that remains only for backwards compatibility.
 */

define('NO_KEEP_STATISTIC', 'Y');
define('NO_AGENT_STATISTIC','Y');
define('NO_AGENT_CHECK', true);
define('PUBLIC_AJAX_MODE', true);
define('DisableEventsCheck', true);

$siteID = isset($_REQUEST['site'])? mb_substr(preg_replace('/[^a-z0-9_]/i', '', $_REQUEST['site']), 0, 2) : '';
if($siteID !== '')
{
	define('SITE_ID', $siteID);
}

require_once($_SERVER['DOCUMENT_ROOT'].'/bitrix/modules/main/include/prolog_before.php');
if(!defined("B_PROLOG_INCLUDED") || B_PROLOG_INCLUDED !== true)
{
	die();
}

if (!CModule::IncludeModule('crm') || !CCrmSecurityHelper::IsAuthorized() || !check_bitrix_sessid())
{
	die();
}

$componentData = isset($_REQUEST['PARAMS']) && is_array($_REQUEST['PARAMS']) ? $_REQUEST['PARAMS'] : [];
$componentParams = [];
if (isset($componentData['signedParameters']))
{
	$componentParams = \CCrmInstantEditorHelper::unsignComponentParams(
		(string)$componentData['signedParameters'],
		'crm.client.portrait'
	);
	if (is_null($componentParams))
	{
		ShowError('Wrong component signed parameters');
		die();
	}
}
elseif (isset($componentData['params']) && is_array($componentData['params']))
{
	ShowError('Component params must be signed');
	die();
}

//For custom reload with params
$ajaxLoaderParams = array(
	'url' => '',
	'method' => 'POST',
	'dataType' => 'ajax',
	'data' => array('PARAMS' => $componentData)
);

global $APPLICATION;
Header('Content-Type: text/html; charset='.LANG_CHARSET);
$APPLICATION->ShowAjaxHead();

$componentParams['ENABLE_CONTROL_PANEL'] = false;

//Force AJAX mode
$componentParams['AJAX_MODE'] = 'Y';
$componentParams['AJAX_OPTION_JUMP'] = 'N';
$componentParams['AJAX_OPTION_HISTORY'] = 'N';
$componentParams['AJAX_LOADER'] = $ajaxLoaderParams;

$APPLICATION->IncludeComponent('bitrix:crm.client.portrait',
	isset($componentData['template']) ? $componentData['template'] : '',
	$componentParams,
	false,
	array('HIDE_ICONS' => 'Y', 'ACTIVE_COMPONENT'=>'Y')
);

require_once($_SERVER['DOCUMENT_ROOT'].'/bitrix/modules/main/include/epilog_after.php');
die();
