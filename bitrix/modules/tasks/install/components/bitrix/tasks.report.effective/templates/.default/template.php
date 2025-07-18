<?php
if (!defined("B_PROLOG_INCLUDED") || B_PROLOG_INCLUDED !== true){die();}

use Bitrix\Main\Localization\Loc;
use Bitrix\Main\UI\Extension;
use Bitrix\Main\Web\Json;
use Bitrix\Tasks\Helper\RestrictionUrl;
use Bitrix\Tasks\Integration\Bitrix24\FeatureDictionary;
use Bitrix\UI\Toolbar\Facade\Toolbar;
use Bitrix\UI\Buttons;
use Bitrix\UI\Toolbar\ButtonLocation;

Extension::load([
	"ui.graph.circle",
	"ui.buttons.icons",
	"ui.design-tokens",
	"ui.fonts.opensans",
]);

$isV2Form = \Bitrix\Tasks\V2\FormV2Feature::isOn('miniform');

if ($isV2Form)
{
	Extension::load('tasks.v2.application.task-card');
}

$isIFrame = (isset($_REQUEST['IFRAME']) && $_REQUEST['IFRAME'] === 'Y');

/** intranet-settings-support */
if (($arResult['IS_TOOL_AVAILABLE'] ?? null) === false)
{
	$APPLICATION->IncludeComponent("bitrix:tasks.error", "limit", [
		'LIMIT_CODE' => RestrictionUrl::TASK_LIMIT_OFF_SLIDER_URL,
		'SOURCE' => 'effective',
	]);

	return;
}

if (isset($arResult["ERROR"]) && !empty($arResult["ERROR"]))
{
	foreach ($arResult["ERROR"] as $error)
	{
		?><div class="task-message-label error"><?=htmlspecialcharsbx($error["MESSAGE"])?></div><?
	}

	return;
}

CJSCore::Init(array('amcharts', 'amcharts_funnel', 'amcharts_serial', 'task_graph_circle'));
CJSCore::Init(array('amcharts_pie', 'fx', 'drag_drop', 'popup', 'date', 'ajax'));
CJSCore::Init("sidepanel");
CJSCore::init("spotlight");

Loc::loadMessages(__FILE__);
$bodyClass = $APPLICATION->GetPageProperty('BodyClass');
$APPLICATION->SetPageProperty('BodyClass', ($bodyClass ? $bodyClass.' ' : '').' no-background no-all-paddings pagetitle-toolbar-field-view ');

$taskLimitExceeded = $arResult['TASK_LIMIT_EXCEEDED'];

$APPLICATION->IncludeComponent(
	'bitrix:tasks.interface.topmenu',
	'',
	array(
		'USER_ID' => $arParams['USER_ID'],

		'SECTION_URL_PREFIX' => '',
		'MARK_SECTION_EFFECTIVE' => 'Y',

		'PATH_TO_USER_TASKS' => $arParams['PATH_TO_USER_TASKS'],
		'PATH_TO_USER_TASKS_TASK' => $arParams['PATH_TO_USER_TASKS_TASK'],
		'PATH_TO_USER_TASKS_VIEW' => $arParams['PATH_TO_USER_TASKS_VIEW'],
		'PATH_TO_USER_TASKS_REPORT' => $arParams['PATH_TO_USER_TASKS_REPORT'],
		'PATH_TO_USER_TASKS_TEMPLATES' => $arParams['PATH_TO_USER_TASKS_TEMPLATES'],
		'PATH_TO_USER_TASKS_PROJECTS_OVERVIEW' => $arParams['PATH_TO_USER_TASKS_PROJECTS_OVERVIEW'],

		'PATH_TO_CONPANY_DEPARTMENT' => $arParams['PATH_TO_CONPANY_DEPARTMENT']
	),
	$component,
	array('HIDE_ICONS' => true)
);
?>

<?php
$addTaskPath = new \Bitrix\Main\Web\Uri($arParams['PATH_TO_TASK_ADD']);
$addTaskPath->addParams([
	'ta_sec' => \Bitrix\Tasks\Helper\Analytics::SECTION['tasks'],
	'ta_sub' => \Bitrix\Tasks\Helper\Analytics::SUB_SECTION['efficiency'],
	'ta_el' => \Bitrix\Tasks\Helper\Analytics::ELEMENT['create_button'],
]);

if ($isV2Form)
{
	$addTaskPath->addParams([
		'miniform' => true,
	]);
}

Toolbar::addFilter([
	'FILTER_ID' => 'TASKS_REPORT_EFFECTIVE_GRID',
	'FILTER' => $arResult['FILTERS'],
	'FILTER_PRESETS' => $arResult['PRESETS'],
	'ENABLE_LABEL' => true,
	'ENABLE_LIVE_SEARCH' => (!isset($arParams['USE_LIVE_SEARCH']) || $arParams['USE_LIVE_SEARCH'] !== 'N'),
	'RESET_TO_DEFAULT_MODE' => true,
	'DISABLE_SEARCH'=>true,
	'VALUE_REQUIRED_MODE' => true,
]);

$addBtn = new Buttons\Button([
	'color' => Buttons\Color::PRIMARY,
	'text' => Loc::getMessage('TASKS_ADD_TASK'),
	'icon' => Buttons\Icon::ADD,
	'tag' => Buttons\Tag::LINK,
]);
$addBtn->addAttribute('href', $addTaskPath);
Toolbar::addButton($addBtn, ButtonLocation::RIGHT);
?>
<div class="<?=(($arResult['TASK_LIMIT_EXCEEDED'] || !$arResult['tasksEfficiencyEnabled']) ? 'task-report-locked' : '')?>" id="<?=$arResult['HELPER']->getScopeId()?>">
	<div class="task-report-row task-report-row-50-50">
		<div class="task-report-container">
			<div class="task-report-container-title">
				<span class="task-report-container-title-text"><?=GetMessage('TASKS_CIRCLE_EFFECTIVE_TITLE')?></span>
			</div>
			<div class="task-report-container-content task-report-container-content-graph js-id-effective-circle" id="effective-circle"></div>
			<div class="task-report-container-help">
				<span onclick="top.BX.Helper.show('redirect=detail&code=6576263');">
					<?=GetMessage('TASKS_EFFECTIVE_HELP_TEXT');?>
				</span>
			</div>
		</div>
		<div class="task-report-container task-report-container-widget">
			<div class="task-report-widget-row">
				<div class="task-report-widget-container task-report-widget-container-blue">
					<div class="task-report-widget-container-title"><?=GetMessage('TASKS_IN_PROGRESS')?></div>
					<div class="task-report-widget-container-content js-id-effective-in-progress"></div>
					<a style="display: block;position: absolute;width: 100%;height: 100%;" href="/company/personal/user/<?=$arParams['USER_ID']?>/tasks/effective/inprogress/"></a>
				</div>
			</div>
			<div class="task-report-widget-row task-report-widget-50-50">
				<div class="task-report-widget-container task-report-widget-container-green">
					<div class="task-report-widget-container-title"><?=GetMessage('TASKS_COMPLETED')?></div>
					<div class="task-report-widget-container-content js-id-effective-completed"></div>
				</div>
				<div class="task-report-widget-container task-report-widget-container-yellow">
					<div class="task-report-widget-container-title">
						<a class="js-id-effective-violation-url" href="/company/personal/user/<?=$arParams['USER_ID']?>/tasks/effective/show/"><?=GetMessage('TASKS_VIOLATION')?></a>
					</div>
					<div class="task-report-widget-container-content js-id-effective-violations"></div>

					<span id="tasks-effective-more" class="task-report-widget-container-content-more"><?=GetMessage('TASKS_EFFECTIVE_MORE')?></span>
					<a style="display: block;position: absolute;width: 100%;height: 100%;" href="/company/personal/user/<?=$arParams['USER_ID']?>/tasks/effective/show/"></a>

				</div>
			</div>

		</div>
	</div>

	<div class="task-report-row">
		<div class="task-report-container">
			<div class="task-report-container-title task-report-container-title-config">
				<?=GetMessage('TASKS_MY_EFFECTIVE_BY_DAY')?>
<!--				<span class="task-report-container-title-config-icon"></span>-->
			</div>
			<div class="task-report-container-content">
				<div id="effective-amchart" class="js-id-effective-amchart"></div>
			</div>
		</div>
	</div>
</div>


<?php

if (isset($arResult['FILTERS']) && is_array($arResult['FILTERS']))
{
	$selectors = array();

	foreach ($arResult['FILTERS'] as $filterItem)
	{
		if (!(isset($filterItem['type']) &&
			  $filterItem['type'] === 'custom_entity' &&
			  isset($filterItem['selector']) &&
			  is_array($filterItem['selector']))
		)
		{
			continue;
		}

		$selector = $filterItem['selector'];
		$selectorType = ($selector['TYPE'] ?? '');
		$selectorData = (isset($selector['DATA']) && is_array($selector['DATA']) ? $selector['DATA'] : null);
		$selectorData['MODE'] = $selectorType;
		$selectorData['MULTI'] = (isset($filterItem['params']['multiple']) && $filterItem['params']['multiple'] === 'Y');

		if (!empty($selectorData) && $selectorType == 'user')
		{
			$selectors[] = $selectorData;
		}
		if (!empty($selectorData) && $selectorType == 'group')
		{
			$selectors[] = $selectorData;
		}
	}

	if (!empty($selectors))
	{
		\CUtil::initJSCore(
			array(
				'tasks_integration_socialnetwork'
			)
		);
	}

	if (!empty($selectors))
	{
		?>
		<script><?
			foreach ($selectors as $groupSelector)
			{
			$selectorID = $groupSelector['ID'];
			$selectorMode = $groupSelector['MODE'];
			$fieldID = $groupSelector['FIELD_ID'];
			$multi = $groupSelector['MULTI'];
			?>BX.ready(
				function()
				{
					BX.FilterEntitySelector.create(
						"<?= \CUtil::JSEscape($selectorID)?>",
						{
							fieldId: "<?= \CUtil::JSEscape($fieldID)?>",
							mode: "<?= \CUtil::JSEscape($selectorMode)?>",
							multi: <?= $multi ? 'true' : 'false'?>
						}
					);
				}
			);<?
			}
			?></script><?
	}
}
?>

<?=$arResult['HELPER']->initializeExtension()?>

<script>
	BX.ready(function() {
		const tasksEfficiencyEnabled = <?= Json::encode($arResult['tasksEfficiencyEnabled']) ?>;

		if (!tasksEfficiencyEnabled)
		{
			BX.Runtime.loadExtension('tasks.limit').then((exports) => {
				const { Limit } = exports;
				Limit.showInstance({
					featureId: '<?=FeatureDictionary::TASK_EFFICIENCY?>',
					limitAnalyticsLabels: {
						module: 'tasks',
						source: 'view',
					},
				});
			});
		}
	});
</script>
