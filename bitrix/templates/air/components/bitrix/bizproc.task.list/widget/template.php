<? if (!defined("B_PROLOG_INCLUDED") || B_PROLOG_INCLUDED !== true)	die();

$this->addExternalCss(SITE_TEMPLATE_PATH."/css/sidebar.css");

/*
Usage example
<?
if(CModule::IncludeModule('bizproc')):
	$APPLICATION->IncludeComponent(
		"bitrix:bizproc.task.list",
		"widget",
		array(
			"COUNTERS_ONLY" => 'Y',
			"USER_ID" => $USER->GetID(),
			"PATH_TO_BP_TASKS" => "/company/personal/bizproc/",
			"PATH_TO_MY_PROCESSES" => "/company/personal/processes/",
		),
		null,
		array("HIDE_ICONS" => "N")
	);
endif;?>
*/
$this->setFrameMode(true);
$this->SetViewTarget("sidebar", 199); // before tasks widget
$frame = $this->createFrame()->begin();

$tasksUrl = '/bizproc/userprocesses/'; /* @override $arParams["PATH_TO_BP_TASKS"] */

if (!empty($arResult['COUNTERS_RUNNING']['lists']['BizprocDocument']) || !empty($arResult['COUNTERS']['*']))
{
	$whiteList = array(
		'lists'  => array('LABEL' => GetMessage('BPTLWGT_MODULE_LISTS'), 'URL' => $tasksUrl.'?SYSTEM_PRESET=active_task&MODULE_ID=lists&apply_filter=Y'),
		'crm'    => array('LABEL' => 'CRM', 'URL' => $tasksUrl.'?SYSTEM_PRESET=active_task&MODULE_ID=crm&apply_filter=Y'),
		'disk'   => array('LABEL' => GetMessage('BPTLWGT_MODULE_DISK'), 'URL' => $tasksUrl.'?SYSTEM_PRESET=active_task&MODULE_ID=disk&apply_filter=Y'),
		'iblock' => array('LABEL' => GetMessage('BPTLWGT_MODULE_IBLOCK'), 'URL' => $tasksUrl.'??SYSTEM_PRESET=active_task&MODULE_ID=lists&apply_filter=Y'),
	)
	?>
	<div class="sidebar-widget sidebar-widget-bp">
		<div class="sidebar-widget-top">
			<div class="sidebar-widget-top-title"><?= GetMessage('BPTLWGT_TITLE') ?></div>
			<!--<div class="plus-icon"></div>-->
		</div>
		<div class="sidebar-widget-content">
		<span class="sidebar-widget-item-list task-item-list">
			<span class="sidebar-widget-item --with-separator">
				<a href="<?= htmlspecialcharsbx($tasksUrl) ?>" class="task-item <?= $arResult['COUNTERS']['*'] === 0 ? '--zero' : '' ?>">
					<span class="task-item-text"><?= GetMessage('BPTLWGT_RUNNING') ?></span>
					<span class="task-item-index-wrap">
						<span class="task-item-index"><?= $arResult['COUNTERS']['*'] < 100 ? $arResult['COUNTERS']['*'] : '99+' ?></span>
					</span>
				</a>
			</span>
			<? foreach ($arResult['COUNTERS'] as $module => $data):
				if (!isset($whiteList[$module]) || empty($data['*']))
					continue;
				?>
				<span class="sidebar-widget-item">
					<a href="<?= htmlspecialcharsbx($whiteList[$module]['URL']) ?>" class="task-item <?= $arResult['COUNTERS'][$module]['*'] === 0 ? '--zero' : '' ?>">
					<span class="task-item-text"><?= htmlspecialcharsbx($whiteList[$module]['LABEL']) ?></span>
					<span class="task-item-index-wrap">
						<span class="task-item-index"><?= $arResult['COUNTERS'][$module]['*'] < 100 ? $arResult['COUNTERS'][$module]['*'] : '99+' ?></span>
					</span>
				</a>
				</span>
			<? endforeach;?>
		</span>
		<? if (!empty($arResult['COUNTERS_RUNNING']['lists']['BizprocDocument'])): ?>
			<div class="sidebar-widget-item --with-separator">
				<a class="task-item" href="<?= htmlspecialcharsbx($tasksUrl) ?>">
					<span class="task-item-text"><?= GetMessage('BPTLWGT_MY_PROCESSES_1') ?></span>
					<span class="task-item-index-wrap">
					<span class="task-item-index"><?= $arResult['COUNTERS_RUNNING']['lists']['BizprocDocument'] < 100 ? $arResult['COUNTERS_RUNNING']['lists']['BizprocDocument'] : '99+' ?></span>
				</span>
				</a>
			</div>
		<? endif?>
		</div>
	</div>
	<?
}

$frame->end();
$this->EndViewTarget();
