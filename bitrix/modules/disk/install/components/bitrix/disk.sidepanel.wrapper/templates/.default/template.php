<?php
if(!defined('B_PROLOG_INCLUDED') || B_PROLOG_INCLUDED !== true) die();

/** @var CMain $APPLICATION */
/** @var array $arResult*/
/** @var array $arParams*/

global $APPLICATION;
CJSCore::Init(['sidepanel', 'ui.fonts.opensans']);

?><!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="<?=LANGUAGE_ID ?>" lang="<?=LANGUAGE_ID ?>">
<head>
	<script>
		// Prevent loading page without header and footer
		if(window == window.top)
		{
			window.location = "<?=CUtil::JSEscape($APPLICATION->GetCurPageParam('', array('IFRAME'))); ?>";
		}
	</script>
	<?$APPLICATION->ShowHead();?>
	<title><?$APPLICATION->ShowTitle()?></title>
</head>
<body class="disk-slider-frame-popup bitrix24-default-theme template-<?= SITE_TEMPLATE_ID ?> <? $APPLICATION->ShowProperty('BodyClass'); ?>">
	<?php
	$APPLICATION->IncludeComponent('bitrix:ui.toolbar', '', []);
	?>

	<div id="disk-frame-popup-workarea">
		<div id="sidebar"><? $APPLICATION->ShowViewContent("sidebar"); ?></div>
		<div id="workarea-content">
			<div class="disk-workarea-content-paddings">
				<?
				$APPLICATION->IncludeComponent(
					$arParams['POPUP_COMPONENT_NAME'],
					$arParams['POPUP_COMPONENT_TEMPLATE_NAME'],
					$arParams['POPUP_COMPONENT_PARAMS']
				);
				?>
			</div>
		</div>
	</div>
</body>
</html>