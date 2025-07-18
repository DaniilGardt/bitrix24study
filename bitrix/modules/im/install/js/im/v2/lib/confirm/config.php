<?php
if (!defined("B_PROLOG_INCLUDED") || B_PROLOG_INCLUDED !== true)
{
	die();
}

return [
	'css' => 'dist/registry.bundle.css',
	'js' => 'dist/registry.bundle.js',
	'rel' => [
		'main.popup',
		'ui.dialogs.messagebox',
		'im.v2.lib.channel',
		'im.v2.application.core',
		'im.v2.const',
		'main.core',
	],
	'skip_core' => false,
];
