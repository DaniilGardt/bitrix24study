<?php

if (!defined('B_PROLOG_INCLUDED') || B_PROLOG_INCLUDED !== true)
{
	die();
}

\Bitrix\Main\UI\Extension::load(
	[
		'ui.dialogs.messagebox',
		'ui.alerts',
	]
);

$bodyClass = $APPLICATION->GetPageProperty("BodyClass");
$APPLICATION->SetPageProperty("BodyClass", ($bodyClass ? $bodyClass." " : "") . "no-all-paddings no-hidden no-background");
if($this->getComponent()->getErrors())
{
	foreach($this->getComponent()->getErrors() as $error)
	{
		/** @var \Bitrix\Main\Error $error */
		?>
		<div class="ui-alert ui-alert-danger">
			<span class="ui-alert-message"><?=$error->getMessage();?></span>
		</div>
		<?php
	}

	return;
}
/** @see \Bitrix\Crm\Component\Base::addTopPanel() */
$this->getComponent()->addTopPanel($this);

/** @see \Bitrix\Crm\Component\Base::addToolbar() */
$this->getComponent()->addToolbar($this);
?>

<div class="ui-alert ui-alert-danger" style="display: none;">
	<span class="ui-alert-message" id="crm-type-item-list-error-text-container"></span>
	<span class="ui-alert-close-btn" onclick="this.parentNode.style.display = 'none';"></span>
</div>

<?php

$headerSections = [
	[
		'id'=> $arResult['entityTypeName'],
		'name' => $arResult['entityTypeDescription'],
		'default' => true,
		'selected' => true,
	]
];

$APPLICATION->IncludeComponent(
	'bitrix:crm.kanban',
	'',
	[
		'ENTITY_TYPE' => $arResult['entityTypeName'],
		'SHOW_ACTIVITY' => $arResult['isCountersEnabled'] ? 'Y' : 'N',
		'EXTRA' => [
			'CATEGORY_ID' => $arResult['categoryId'],
			'ADD_ITEM_PERMITTED_BY_TARIFF' => $arResult['addItemPermittedByTariff'],
			'ANALYTICS' => $arResult['analytics'] ?? [],
		],
		'HEADERS_SECTIONS' => $headerSections,
		'PERFORMANCE' => $arResult['performance'],
		'PATH_TO_MERGE' => $arResult['pathToMerge'],
	],
	$component
);
