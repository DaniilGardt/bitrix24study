<?php
if (!defined('B_PROLOG_INCLUDED') || B_PROLOG_INCLUDED !== true)
{
	die();
}

return [
	'css' => 'dist/task-chat-creation.bundle.css',
	'js' => 'dist/task-chat-creation.bundle.js',
	'rel' => [
		'main.polyfill.core',
		'im.v2.component.message.base',
	],
	'skip_core' => true,
];