<?php

use Bitrix\Crm\Service\Container;
use Bitrix\Main\Loader;
use Bitrix\Main\Localization\Loc;

$siteID = isset($_REQUEST['site'])? mb_substr(preg_replace('/[^a-z0-9_]/i', '', $_REQUEST['site']), 0, 2) : '';
if($siteID !== '')
{
	define('SITE_ID', $siteID);
}

require($_SERVER['DOCUMENT_ROOT'].'/bitrix/modules/main/include/prolog_before.php');

Loc::loadMessages(__FILE__);

/** @var array $arParams */
/** @var array $arResult */
/** @global CMain $APPLICATION */
/** @global CDatabase $DB */
/** @var CBitrixComponentTemplate $this */
/** @var CCrmEntityPopupComponent $component */

$APPLICATION->RestartBuffer();
?><!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="<?=LANGUAGE_ID ?>" lang="<?=LANGUAGE_ID ?>">
<head>
	<script>
		// Prevent loading page without header and footer
		if(window === window.top)
		{
			window.location = "<?=CUtil::JSEscape($APPLICATION->GetCurPageParam('', array('IFRAME'))); ?>";
		}
	</script>
	<?php
	$APPLICATION->ShowHead();
	?>
	<style>.task-iframe-popup,
		.task-iframe-popup.task-form-page,
		.task-iframe-popup.task-detail-page{
			background: #eef2f4 !important;
			padding: 0 15px 21px 21px;
		}</style>
</head>
<body class="crm-iframe-popup crm-detail-page template-<?=SITE_TEMPLATE_ID?> crm-iframe-popup-no-scroll crm-order-shipment-voucher-wrapper <?php $APPLICATION->ShowProperty('BodyClass'); ?>" onload="window.top.BX.onCustomEvent(window.top, 'crmEntityIframeLoad');" onunload="window.top.BX.onCustomEvent(window.top, 'crmEntityIframeUnload');">

<div class="crm-iframe-header">
	<div class="pagetitle-wrap">
		<div class="pagetitle-inner-container">
			<div class="pagetitle">
			<span id="pagetitle" class="pagetitle-item"><?php
				$APPLICATION->ShowTitle();
			?></span>
			</div>
		</div>
	</div>
</div>

<div class="crm-iframe-workarea" id="crm-content-outer">
	<div class="crm-iframe-sidebar"><?php
		$APPLICATION->ShowViewContent("sidebar");
	?></div>
	<div class="crm-iframe-content"><?php

if (!Loader::includeModule('crm'))
{
	ShowError(GetMessage('CRM_MODULE_NOT_INSTALLED'));
}
elseif (!Loader::includeModule('sale'))
{
	ShowError(GetMessage('SALE_MODULE_NOT_INSTALLED'));
}
else
{
	$shipmentId = $_REQUEST['shipment_id'] ?? 0;
	$shipment = \Bitrix\Crm\Order\Manager::getShipmentObject((int)$shipmentId);

	$serviceContainer = Container::getInstance();
	if (empty($shipment))
	{
		$checkPermissions = $serviceContainer
			->getUserPermissions()
			->entityType()
			->canAddItems(\CCrmOwnerType::Order)
		;
	}
	else
	{
		$checkPermissions = $serviceContainer
			->getUserPermissions()
			->item()
			->canUpdate(\CCrmOwnerType::Order, $shipment->getParentOrderId())
		;
	}

	if (!(check_bitrix_sessid()
		&& \Bitrix\Crm\Security\EntityAuthorization::IsAuthorized()
		&& $checkPermissions)
	)
	{
		ShowError(GetMessage('CRM_ACCESS_DENIED'));
	}
	else
	{
		if (isset($_REQUEST['ENTITY_DATA']))
		{
			$componentParams['ENTITY_DATA'] = $_REQUEST['ENTITY_DATA'];
		}
		$componentParams['ENTITY_ID'] = $shipmentId;
		$componentParams['POPUP_MODE'] = 'Y';
		$componentParams['EXTERNAL_CONTEXT_ID'] = $_REQUEST['external_context_id'] ?? '';

		$APPLICATION->IncludeComponent(
			'bitrix:crm.order.shipment.document',
			'',
			$componentParams,
			false
		);
	}
}

?></div>
</div>
</body>
</html><?php
require($_SERVER['DOCUMENT_ROOT'].'/bitrix/modules/main/include/epilog_after.php');
